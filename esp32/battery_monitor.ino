/*
 * ESP32 — Multi-Battery BMS Monitor → Supabase
 *
 * Lit les donnees BMS de 1 a 3 batteries via UART
 * et les envoie a Supabase via PATCH REST API toutes les 10s.
 *
 * Branchement:
 *   Battery 1 BMS TX → GPIO16 (Serial2 RX)
 *   Battery 2 BMS TX → GPIO17 (Serial1 RX)  (optionnel)
 *   Battery 3 BMS TX → GPIO4  (SoftSerial)   (optionnel)
 *
 * Adapte le protocole BMS selon ton modele (JBD, Daly, etc.)
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

// ── IDs des batteries dans Supabase (a remplacer) ──────────
// Recupere les UUIDs depuis la table batteries apres ajout via l'app
const char* BATTERY_IDS[] = {
  "uuid-batterie-1",  // Slot 1
  "uuid-batterie-2",  // Slot 2
  "uuid-batterie-3",  // Slot 3
};
const int NUM_BATTERIES = 1;  // Nombre de batteries connectees (1 a 3)

// ── Intervalle d'envoi (ms) ────────────────────────────────
const unsigned long SEND_INTERVAL = 10000;  // 10 secondes

// ── Structure BMS ──────────────────────────────────────────
struct BmsData {
  bool     valid;
  float    soc;             // %
  float    soh;             // %
  float    voltage;         // V total pack
  float    current_a;       // A (positif = charge)
  float    power_w;         // W
  float    temperature;     // °C moyenne
  float    cell_voltages[24]; // max 24 cellules
  float    cell_temps[4];   // max 4 sondes
  int      cell_count;
  int      temp_count;
  int      cycles;
  String   bms_status;      // "charging" / "discharging" / "idle" / "error"
  // Protection
  bool     overvoltage;
  bool     undervoltage;
  bool     overcurrent_charge;
  bool     overcurrent_discharge;
  bool     overtemp;
  bool     short_circuit;
};

// ── UART pour BMS ──────────────────────────────────────────
// Battery 1 sur Serial2 (GPIO16 RX, GPIO17 TX)
#define BMS1_RX 16
#define BMS1_TX 17

unsigned long lastSend = 0;

void setup() {
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, BMS1_RX, BMS1_TX);

  // Connexion WiFi
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

// ── Lecture BMS ────────────────────────────────────────────
// ADAPTE cette fonction a ton protocole BMS (JBD, Daly, etc.)
BmsData readBms(int index) {
  BmsData d;
  d.valid = false;

  // =====================================================
  // EXEMPLE: Protocole JBD (tres courant)
  // Commande lecture: 0xDD 0xA5 0x03 0x00 0xFF 0xFD 0x77
  // Adapte selon ta documentation BMS
  // =====================================================

  HardwareSerial* port = &Serial2;  // Adapte pour multi-batteries

  // Envoyer la commande de lecture
  uint8_t cmd[] = { 0xDD, 0xA5, 0x03, 0x00, 0xFF, 0xFD, 0x77 };
  port->write(cmd, sizeof(cmd));

  // Attendre la reponse (timeout 500ms)
  unsigned long t0 = millis();
  while (port->available() < 20 && millis() - t0 < 500) {
    delay(10);
  }

  if (port->available() < 20) {
    Serial.printf("BMS %d: pas de reponse\n", index + 1);
    return d;
  }

  // =====================================================
  // ICI: Parse la reponse selon ton protocole BMS
  // L'exemple ci-dessous est un PLACEHOLDER
  // Remplace par le vrai parsing de ton BMS
  // =====================================================

  // Simuler des donnees pour test (A REMPLACER)
  d.valid      = true;
  d.soc        = 78.5;
  d.soh        = 95.0;
  d.voltage    = 52.8;
  d.current_a  = -2.3;  // negatif = decharge
  d.power_w    = d.voltage * abs(d.current_a);
  d.temperature = 28.5;
  d.cell_count = 16;
  d.temp_count = 2;
  d.cycles     = 142;
  d.bms_status = d.current_a > 0.1 ? "charging" : (d.current_a < -0.1 ? "discharging" : "idle");

  // Tensions cellules (simulees)
  for (int c = 0; c < d.cell_count; c++) {
    d.cell_voltages[c] = 3.28 + random(0, 30) / 1000.0;
  }

  // Temperatures (simulees)
  d.cell_temps[0] = 27.5;
  d.cell_temps[1] = 28.1;

  // Protection (simulees)
  d.overvoltage = false;
  d.undervoltage = false;
  d.overcurrent_charge = false;
  d.overcurrent_discharge = false;
  d.overtemp = false;
  d.short_circuit = false;

  // Vider le buffer
  while (port->available()) port->read();

  return d;
}

// ── Envoi PATCH Supabase ───────────────────────────────────
void patchSupabase(const char* batteryId, BmsData& d) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi deconnecte, skip");
    return;
  }

  HTTPClient http;

  // URL: PATCH /rest/v1/batteries?id=eq.UUID
  String url = String(SUPABASE_URL) + "/rest/v1/batteries?id=eq." + batteryId;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", "Bearer " + String(SUPABASE_KEY));
  http.addHeader("Prefer", "return=minimal");

  // Construire le JSON
  JsonDocument doc;
  doc["soc"]         = round(d.soc * 10) / 10.0;
  doc["soh"]         = round(d.soh * 10) / 10.0;
  doc["voltage"]     = round(d.voltage * 100) / 100.0;
  doc["current_a"]   = round(d.current_a * 100) / 100.0;
  doc["power_w"]     = round(d.power_w * 10) / 10.0;
  doc["temperature"] = round(d.temperature * 10) / 10.0;
  doc["cycles"]      = d.cycles;
  doc["bms_status"]  = d.bms_status;

  // Cell voltages array
  JsonArray cells = doc["cell_voltages"].to<JsonArray>();
  for (int c = 0; c < d.cell_count; c++) {
    cells.add(round(d.cell_voltages[c] * 1000) / 1000.0);
  }

  // Cell temps array
  JsonArray temps = doc["cell_temps"].to<JsonArray>();
  for (int t = 0; t < d.temp_count; t++) {
    temps.add(round(d.cell_temps[t] * 10) / 10.0);
  }

  // Protection object
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
    Serial.printf("BMS %s: OK (%.1fV, %.0f%%, %.1fA)\n",
      batteryId, d.voltage, d.soc, d.current_a);
  } else {
    Serial.printf("BMS %s: ERREUR %d\n", batteryId, code);
    Serial.println(http.getString());
  }

  http.end();
}
