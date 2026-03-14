/*
 * ESP32 — Multi-Battery BMS Monitor (XiaoXiang / JBD) → Supabase
 *
 * Lit les donnees BMS via UART (protocole XiaoXiang)
 * et PATCH la table batteries dans Supabase toutes les 10s.
 *
 * Branchement:
 *   Battery 1 BMS TX → GPIO16 (Serial2 RX)
 *   Battery 2 BMS TX → GPIO17 (Serial1 RX)  (optionnel)
 *   Battery 3 BMS TX → GPIO4  (SoftSerial)   (optionnel)
 *
 * Protocole XiaoXiang (JBD):
 *   Requete:  DD A5 [reg] 00 FF [checksum] 77
 *   Reponse:  DD [reg] 00 [len] [data...] [checksum_hi] [checksum_lo] 77
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ── Config WiFi ────────────────────────────────────────────
const char* WIFI_SSID = "TON_SSID";
const char* WIFI_PASS = "TON_MOT_DE_PASSE";

// ── Config Supabase ────────────────────────────────────────
const char* SUPABASE_URL  = "https://tegdcvbfpymmlidvuian.supabase.co";
const char* SUPABASE_KEY  = "TON_ANON_KEY";

// ── IDs des batteries dans Supabase ────────────────────────
// Recupere les UUIDs depuis la table batteries apres ajout via l'app
const char* BATTERY_IDS[] = {
  "uuid-batterie-1",  // Slot 1
  "uuid-batterie-2",  // Slot 2
  "uuid-batterie-3",  // Slot 3
};
const int NUM_BATTERIES = 1;  // Nombre de batteries connectees (1 a 3)

// ── Intervalle d'envoi (ms) ────────────────────────────────
const unsigned long SEND_INTERVAL = 10000;

// ── UART pins ──────────────────────────────────────────────
#define BMS1_RX 16
#define BMS1_TX 17

// ── Structure BMS ──────────────────────────────────────────
struct BmsData {
  bool     valid;
  float    soc;              // %
  float    soh;              // % (estime depuis cycles)
  float    voltage;          // V total pack
  float    current_a;        // A (positif = charge, negatif = decharge)
  float    power_w;          // W
  float    temperature;      // C moyenne des sondes NTC
  float    cell_voltages[24];
  float    cell_temps[8];
  int      cell_count;
  int      temp_count;
  int      cycles;
  String   bms_status;       // "charging" / "discharging" / "idle" / "error"
  // Protection flags (registre 0x03, octets 16-17)
  bool     overvoltage;
  bool     undervoltage;
  bool     overcurrent_charge;
  bool     overcurrent_discharge;
  bool     overtemp;
  bool     short_circuit;
};

// ── Buffer reception ───────────────────────────────────────
#define RX_BUF_SIZE 128
uint8_t rxBuf[RX_BUF_SIZE];

unsigned long lastSend = 0;

// ── Commandes XiaoXiang ────────────────────────────────────
// Registre 0x03 : infos generales (voltage, courant, SOC, protection...)
// Registre 0x04 : tensions cellules individuelles
const uint8_t CMD_BASIC[] = { 0xDD, 0xA5, 0x03, 0x00, 0xFF, 0xFD, 0x77 };
const uint8_t CMD_CELLS[] = { 0xDD, 0xA5, 0x04, 0x00, 0xFF, 0xFC, 0x77 };

// ── Helpers ────────────────────────────────────────────────

HardwareSerial* getPort(int index) {
  // Pour multi-batteries, adapter selon le cablage
  // index 0 → Serial2, index 1 → Serial1, etc.
  return &Serial2;
}

// Lire une trame XiaoXiang complete. Retourne la longueur totale, 0 si timeout.
int readFrame(HardwareSerial* port, uint8_t* buf, int maxLen, unsigned long timeout) {
  unsigned long t0 = millis();
  int idx = 0;
  bool started = false;

  while (millis() - t0 < timeout && idx < maxLen) {
    if (!port->available()) { delay(1); continue; }
    uint8_t b = port->read();

    if (!started) {
      if (b == 0xDD) { buf[idx++] = b; started = true; }
      continue;
    }

    buf[idx++] = b;
    if (b == 0x77 && idx >= 7) return idx;  // fin de trame
  }
  return 0;
}

// Extraire uint16 big-endian
uint16_t u16(uint8_t* p) { return (p[0] << 8) | p[1]; }

// Extraire int16 big-endian (signe)
int16_t s16(uint8_t* p) { return (int16_t)((p[0] << 8) | p[1]); }

// ── Lecture registre 0x03 (infos generales) ────────────────

bool readBasicInfo(HardwareSerial* port, BmsData& d) {
  // Vider le buffer
  while (port->available()) port->read();

  port->write(CMD_BASIC, sizeof(CMD_BASIC));
  int len = readFrame(port, rxBuf, RX_BUF_SIZE, 500);

  // Verifier trame valide : DD 03 00 [len] [data] [chk_hi] [chk_lo] 77
  if (len < 27 || rxBuf[0] != 0xDD || rxBuf[1] != 0x03 || rxBuf[2] != 0x00) {
    return false;
  }

  uint8_t dataLen = rxBuf[3];
  uint8_t* data = &rxBuf[4];  // debut des donnees

  // Octets 0-1 : tension pack (10mV)
  d.voltage = u16(&data[0]) / 100.0;

  // Octets 2-3 : courant (10mA, signe)
  d.current_a = s16(&data[2]) / 100.0;

  // Octets 4-5 : capacite restante (10mAh)
  float remainCap = u16(&data[4]) / 100.0;

  // Octets 6-7 : capacite nominale (10mAh)
  float nomCap = u16(&data[6]) / 100.0;

  // Octets 8-9 : cycles
  d.cycles = u16(&data[8]);

  // Octet 19 : SOC (%)
  d.soc = data[19];

  // SOH estime : base sur cycles (2000 cycles = 0%)
  d.soh = max(0.0f, 100.0f - (d.cycles / 20.0f));

  // Puissance
  d.power_w = d.voltage * fabs(d.current_a);

  // Octets 16-17 : protection status (16 bits)
  uint16_t prot = u16(&data[16]);
  d.overvoltage           = (prot & 0x0001) || (prot & 0x0004);  // cell OV ou pack OV
  d.undervoltage          = (prot & 0x0002) || (prot & 0x0008);  // cell UV ou pack UV
  d.overcurrent_charge    = (prot & 0x0100);
  d.overcurrent_discharge = (prot & 0x0200);
  d.overtemp              = (prot & 0x0010) || (prot & 0x0040);  // charge OT ou discharge OT
  d.short_circuit         = (prot & 0x0400);

  // Octet 21 : nombre de cellules
  d.cell_count = data[21];

  // Octet 22 : nombre de sondes NTC
  d.temp_count = data[22];

  // Octets 23+ : temperatures NTC (2 octets chacune, en 0.1K)
  float tempSum = 0;
  for (int t = 0; t < d.temp_count && t < 8; t++) {
    int offset = 23 + t * 2;
    if (offset + 1 < dataLen) {
      float tempK = u16(&data[offset]) / 10.0;
      d.cell_temps[t] = tempK - 273.15;  // Kelvin → Celsius
      tempSum += d.cell_temps[t];
    }
  }
  d.temperature = d.temp_count > 0 ? tempSum / d.temp_count : 0;

  // Status BMS
  bool hasProtection = prot != 0;
  if (hasProtection) {
    d.bms_status = "error";
  } else if (d.current_a > 0.1) {
    d.bms_status = "charging";
  } else if (d.current_a < -0.1) {
    d.bms_status = "discharging";
  } else {
    d.bms_status = "idle";
  }

  return true;
}

// ── Lecture registre 0x04 (tensions cellules) ──────────────

bool readCellVoltages(HardwareSerial* port, BmsData& d) {
  while (port->available()) port->read();

  port->write(CMD_CELLS, sizeof(CMD_CELLS));
  int len = readFrame(port, rxBuf, RX_BUF_SIZE, 500);

  // DD 04 00 [len] [cell1_hi] [cell1_lo] ... [chk] 77
  if (len < 7 || rxBuf[0] != 0xDD || rxBuf[1] != 0x04 || rxBuf[2] != 0x00) {
    return false;
  }

  uint8_t dataLen = rxBuf[3];
  uint8_t* data = &rxBuf[4];
  int numCells = dataLen / 2;

  if (numCells > 24) numCells = 24;
  d.cell_count = numCells;

  for (int c = 0; c < numCells; c++) {
    // Tension en mV
    d.cell_voltages[c] = u16(&data[c * 2]) / 1000.0;
  }

  return true;
}

// ── Lecture BMS complete ───────────────────────────────────

BmsData readBms(int index) {
  BmsData d;
  memset(&d, 0, sizeof(d));
  d.valid = false;

  HardwareSerial* port = getPort(index);

  if (!readBasicInfo(port, d)) {
    Serial.printf("BMS %d: pas de reponse (basic)\n", index + 1);
    return d;
  }

  if (!readCellVoltages(port, d)) {
    Serial.printf("BMS %d: pas de reponse (cells)\n", index + 1);
    // On continue quand meme, les infos de base sont valides
  }

  d.valid = true;
  Serial.printf("BMS %d: %.1fV %.1fA SOC=%d%% %dS %d cycles [%s]\n",
    index + 1, d.voltage, d.current_a, (int)d.soc,
    d.cell_count, d.cycles, d.bms_status.c_str());

  return d;
}

// ── Envoi PATCH Supabase ───────────────────────────────────

void patchSupabase(const char* batteryId, BmsData& d) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi deconnecte, skip");
    return;
  }

  HTTPClient http;
  String url = String(SUPABASE_URL) + "/rest/v1/batteries?id=eq." + batteryId;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", "Bearer " + String(SUPABASE_KEY));
  http.addHeader("Prefer", "return=minimal");

  JsonDocument doc;
  doc["soc"]         = round(d.soc * 10) / 10.0;
  doc["soh"]         = round(d.soh * 10) / 10.0;
  doc["voltage"]     = round(d.voltage * 100) / 100.0;
  doc["current_a"]   = round(d.current_a * 100) / 100.0;
  doc["power_w"]     = round(d.power_w * 10) / 10.0;
  doc["temperature"] = round(d.temperature * 10) / 10.0;
  doc["cycles"]      = d.cycles;
  doc["bms_status"]  = d.bms_status;

  JsonArray cells = doc["cell_voltages"].to<JsonArray>();
  for (int c = 0; c < d.cell_count; c++) {
    cells.add(round(d.cell_voltages[c] * 1000) / 1000.0);
  }

  JsonArray temps = doc["cell_temps"].to<JsonArray>();
  for (int t = 0; t < d.temp_count; t++) {
    temps.add(round(d.cell_temps[t] * 10) / 10.0);
  }

  JsonObject prot = doc["protection"].to<JsonObject>();
  prot["overvoltage"]           = d.overvoltage;
  prot["undervoltage"]          = d.undervoltage;
  prot["overcurrent_charge"]    = d.overcurrent_charge;
  prot["overcurrent_discharge"] = d.overcurrent_discharge;
  prot["overtemp"]              = d.overtemp;
  prot["short_circuit"]         = d.short_circuit;

  String body;
  serializeJson(doc, body);

  int code = http.PATCH(body);

  if (code == 204) {
    Serial.printf("PATCH %s: OK (%.1fV, %.0f%%, %.1fA)\n",
      batteryId, d.voltage, d.soc, d.current_a);
  } else {
    Serial.printf("PATCH %s: ERREUR %d\n", batteryId, code);
    Serial.println(http.getString());
  }

  http.end();
}

// ── Setup & Loop ───────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, BMS1_RX, BMS1_TX);

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" OK: " + WiFi.localIP().toString());
}

void loop() {
  if (millis() - lastSend >= SEND_INTERVAL) {
    lastSend = millis();

    for (int i = 0; i < NUM_BATTERIES; i++) {
      BmsData bms = readBms(i);
      if (bms.valid) {
        patchSupabase(BATTERY_IDS[i], bms);
      }
    }
  }
}
