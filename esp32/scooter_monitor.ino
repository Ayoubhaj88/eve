/*
 * ESP32 — Scooter Monitor Complet → Supabase
 *
 * Capteurs:
 *   - BMS (XiaoXiang/JBD) via UART → batteries.soc
 *   - MPU6050 (Gyroscope/Accel) via I2C → accel_x/y/z, fallen
 *   - GPS (NEO-6M) via UART → latitude, longitude, speed
 *   - TPMS (433MHz receiver) → wheel_front, wheel_rear, tpms_temp
 *   - Switches sabotage (3x digital) → tamper_points
 *   - Alarme (1x digital) → alarm
 *
 * Branchement ESP32:
 *   BMS TX       → GPIO16 (Serial2 RX)
 *   GPS TX       → GPIO4  (Serial1 RX)
 *   MPU6050 SDA  → GPIO21
 *   MPU6050 SCL  → GPIO22
 *   TPMS DATA    → GPIO34 (input only)
 *   Tamper Siege → GPIO25
 *   Tamper Avant → GPIO26
 *   Tamper Batt  → GPIO27
 *   Alarme       → GPIO32
 *   LED Status   → GPIO2
 *
 * Envoie vers Supabase toutes les 10s :
 *   - INSERT dans telemetry (tous les capteurs)
 *   - PATCH batteries.soc (pour chaque batterie)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <TinyGPS++.h>

// ══════════════════════════════════════════════════════════════
//  CONFIGURATION — A MODIFIER
// ══════════════════════════════════════════════════════════════

const char* WIFI_SSID = "TON_SSID";
const char* WIFI_PASS = "TON_MOT_DE_PASSE";

const char* SUPABASE_URL = "https://tegdcvbfpymmlidvuian.supabase.co";
const char* SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZ2RjdmJmcHltbWxpZHZ1aWFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0OTY0NDYsImV4cCI6MjA4ODA3MjQ0Nn0.pbEaTGdWOp2o43bn8pPcyuq9oEwmaE1Jot1rO3mhi9M";

// UUID du scooter (depuis la table scooters dans Supabase)
const char* SCOOTER_ID = "6bcc0edd-00b7-4097-860e-fd0094cb087e";

// UUIDs des batteries assignees a ce scooter
const char* BATTERY_IDS[] = {
  "6840bbd1-de24-4cf6-b208-d9b7093613bd",  // Slot 1
};
const int NUM_BATTERIES = 1;

const unsigned long SEND_INTERVAL = 10000; // 10s

// ══════════════════════════════════════════════════════════════
//  PINS
// ══════════════════════════════════════════════════════════════

#define BMS_RX      16
#define BMS_TX      17
#define GPS_RX      4
#define GPS_TX      -1   // On n'envoie rien au GPS

#define MPU_SDA     21
#define MPU_SCL     22
#define MPU_ADDR    0x68

#define PIN_TAMPER_SIEGE  25
#define PIN_TAMPER_AVANT  26
#define PIN_TAMPER_BATT   27
#define PIN_ALARM         32
#define PIN_LED           2

// ══════════════════════════════════════════════════════════════
//  VARIABLES GLOBALES
// ══════════════════════════════════════════════════════════════

TinyGPSPlus gps;
HardwareSerial gpsSerial(1);

unsigned long lastSend = 0;

// Donnees capteurs
float accel_x = 0, accel_y = 0, accel_z = 0;
float gyro_x = 0, gyro_y = 0, gyro_z = 0;
bool  fallen = false;
float latitude = 0, longitude = 0, speed_kmh = 0;
bool  gpsValid = false;
float wheel_front = 0, wheel_rear = 0, tpms_temp = 0;
bool  tamper[3] = {false, false, false};
bool  alarm_on = false;
float bms_soc = 0;
bool  bms_valid = false;

// Seuil de chute (en g, configurable via fall_threshold dans scooters)
float fallThreshold = 2.5;

// ══════════════════════════════════════════════════════════════
//  BMS — Protocole XiaoXiang (JBD)
// ══════════════════════════════════════════════════════════════

const uint8_t CMD_BASIC[] = {0xDD, 0xA5, 0x03, 0x00, 0xFF, 0xFD, 0x77};
uint8_t rxBuf[128];

uint16_t u16(uint8_t* p) { return (p[0] << 8) | p[1]; }

int readFrame(HardwareSerial* port, uint8_t* buf, int maxLen, unsigned long timeout) {
  unsigned long t0 = millis();
  int idx = 0;
  bool started = false;
  while (millis() - t0 < timeout && idx < maxLen) {
    if (!port->available()) { delay(1); continue; }
    uint8_t b = port->read();
    if (!started) { if (b == 0xDD) { buf[idx++] = b; started = true; } continue; }
    buf[idx++] = b;
    if (b == 0x77 && idx >= 7) return idx;
  }
  return 0;
}

void readBMS() {
  while (Serial2.available()) Serial2.read();
  Serial2.write(CMD_BASIC, sizeof(CMD_BASIC));
  int len = readFrame(&Serial2, rxBuf, 128, 500);
  if (len < 27 || rxBuf[0] != 0xDD || rxBuf[1] != 0x03 || rxBuf[2] != 0x00) {
    bms_valid = false;
    return;
  }
  uint8_t* data = &rxBuf[4];
  bms_soc = data[19]; // SOC en %
  bms_valid = true;
  Serial.printf("[BMS] SOC: %.0f%%\n", bms_soc);
}

// ══════════════════════════════════════════════════════════════
//  MPU6050 — Gyroscope + Accelerometre
// ══════════════════════════════════════════════════════════════

void setupMPU() {
  Wire.begin(MPU_SDA, MPU_SCL);
  // Reveil du MPU6050
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B); // PWR_MGMT_1
  Wire.write(0x00); // Wake up
  Wire.endTransmission(true);
  delay(100);
}

void readMPU() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B); // ACCEL_XOUT_H
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, 14, true);

  if (Wire.available() < 14) return;

  int16_t ax = (Wire.read() << 8) | Wire.read();
  int16_t ay = (Wire.read() << 8) | Wire.read();
  int16_t az = (Wire.read() << 8) | Wire.read();
  Wire.read(); Wire.read(); // Temperature (skip)
  int16_t gx = (Wire.read() << 8) | Wire.read();
  int16_t gy = (Wire.read() << 8) | Wire.read();
  int16_t gz = (Wire.read() << 8) | Wire.read();

  // Convertir en g (range +/- 2g = 16384 LSB/g)
  float ax_g = ax / 16384.0;
  float ay_g = ay / 16384.0;
  float az_g = az / 16384.0;

  // Convertir en degres/s (range +/- 250deg/s = 131 LSB/deg/s)
  gyro_x = gx / 131.0;
  gyro_y = gy / 131.0;
  gyro_z = gz / 131.0;

  // Angles d'inclinaison (en degres)
  accel_x = atan2(ay_g, sqrt(ax_g * ax_g + az_g * az_g)) * 180.0 / PI; // Droite/Gauche
  accel_y = atan2(ax_g, sqrt(ay_g * ay_g + az_g * az_g)) * 180.0 / PI; // Avant/Arriere
  accel_z = atan2(sqrt(ax_g * ax_g + ay_g * ay_g), az_g) * 180.0 / PI; // Inclinaison totale

  // Detection de chute : magnitude acceleration
  float magnitude = sqrt(ax_g * ax_g + ay_g * ay_g + az_g * az_g);
  fallen = (magnitude > fallThreshold) || (magnitude < 0.3); // Chute ou chute libre

  Serial.printf("[MPU] X:%.1f° Y:%.1f° Z:%.1f° mag:%.2fg %s\n",
    accel_x, accel_y, accel_z, magnitude, fallen ? "CHUTE!" : "OK");
}

// ══════════════════════════════════════════════════════════════
//  GPS — NEO-6M via TinyGPS++
// ══════════════════════════════════════════════════════════════

void readGPS() {
  while (gpsSerial.available()) {
    gps.encode(gpsSerial.read());
  }
  if (gps.location.isValid()) {
    latitude  = gps.location.lat();
    longitude = gps.location.lng();
    gpsValid  = true;
  }
  if (gps.speed.isValid()) {
    speed_kmh = gps.speed.kmph();
  }
  Serial.printf("[GPS] %s lat:%.6f lon:%.6f spd:%.1f km/h\n",
    gpsValid ? "FIX" : "NO FIX", latitude, longitude, speed_kmh);
}

// ══════════════════════════════════════════════════════════════
//  TPMS — 433MHz (simulation si pas de receiver)
// ══════════════════════════════════════════════════════════════

void readTPMS() {
  // Si tu as un vrai recepteur TPMS 433MHz, decoder ici.
  // Pour l'instant : valeurs simulees realistes
  // Remplacer par ton decodage reel quand le hardware est pret.

  // Simulation : pression normale 2.0-2.5 bar, temp 25-35°C
  wheel_front = 2.2 + (random(-5, 5) / 10.0);
  wheel_rear  = 2.3 + (random(-5, 5) / 10.0);
  tpms_temp   = 28.0 + (random(-3, 3));

  Serial.printf("[TPMS] AV:%.1f bar  AR:%.1f bar  T:%.0f°C\n",
    wheel_front, wheel_rear, tpms_temp);
}

// ══════════════════════════════════════════════════════════════
//  SABOTAGE + ALARME — Switches digitaux
// ══════════════════════════════════════════════════════════════

void readSwitches() {
  tamper[0] = digitalRead(PIN_TAMPER_SIEGE) == HIGH; // Siege
  tamper[1] = digitalRead(PIN_TAMPER_AVANT) == HIGH; // Avant
  tamper[2] = digitalRead(PIN_TAMPER_BATT)  == HIGH; // Batterie
  alarm_on  = digitalRead(PIN_ALARM) == HIGH;

  Serial.printf("[SWITCH] Tamper: S=%d A=%d B=%d  Alarm: %d\n",
    tamper[0], tamper[1], tamper[2], alarm_on);
}

// ══════════════════════════════════════════════════════════════
//  ENVOI SUPABASE — INSERT telemetry + PATCH batteries
// ══════════════════════════════════════════════════════════════

void sendTelemetry() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi deconnecte, skip envoi");
    return;
  }

  HTTPClient http;

  // ── 1. INSERT dans telemetry ───────────────────────────────
  String url = String(SUPABASE_URL) + "/rest/v1/telemetry";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  http.addHeader("Prefer", "return=minimal");

  JsonDocument doc;
  doc["scooter_id"] = SCOOTER_ID;

  // Status
  if (speed_kmh > 2) {
    doc["status"] = "online";
  } else if (bms_valid && bms_soc > 0) {
    doc["status"] = "online";
  } else {
    doc["status"] = "offline";
  }

  // Gyroscope
  doc["accel_x"] = round(accel_x * 10) / 10.0;
  doc["accel_y"] = round(accel_y * 10) / 10.0;
  doc["accel_z"] = round(accel_z * 10) / 10.0;
  doc["fallen"]  = fallen;

  // GPS
  if (gpsValid) {
    doc["latitude"]  = latitude;
    doc["longitude"] = longitude;
    doc["speed"]     = round(speed_kmh * 10) / 10.0;
  }

  // TPMS
  doc["wheel_front"] = round(wheel_front * 10) / 10.0;
  doc["wheel_rear"]  = round(wheel_rear * 10) / 10.0;
  doc["tpms_temp"]   = round(tpms_temp);

  // Sabotage (boolean array → PostgreSQL boolean[])
  JsonArray tp = doc["tamper_points"].to<JsonArray>();
  tp.add(tamper[0]);
  tp.add(tamper[1]);
  tp.add(tamper[2]);

  // Alarme
  doc["alarm"] = alarm_on;

  // Charge (du BMS)
  doc["charging"] = false;
  doc["temp"]     = tpms_temp;

  String body;
  serializeJson(doc, body);

  int code = http.POST(body);
  if (code == 201 || code == 204) {
    Serial.println("[SUPA] Telemetry INSERT OK");
  } else {
    Serial.printf("[SUPA] Telemetry ERREUR %d: %s\n", code, http.getString().c_str());
  }
  http.end();

  // ── 2. PATCH batteries.soc ─────────────────────────────────
  if (bms_valid) {
    for (int i = 0; i < NUM_BATTERIES; i++) {
      String battUrl = String(SUPABASE_URL) + "/rest/v1/batteries?id=eq." + BATTERY_IDS[i];
      http.begin(battUrl);
      http.addHeader("Content-Type", "application/json");
      http.addHeader("apikey", SUPABASE_KEY);
      http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
      http.addHeader("Prefer", "return=minimal");

      String battBody = "{\"soc\":" + String(bms_soc, 0) + "}";
      int battCode = http.PATCH(battBody);

      if (battCode == 204) {
        Serial.printf("[SUPA] Battery %d SOC:%.0f%% OK\n", i + 1, bms_soc);
      } else {
        Serial.printf("[SUPA] Battery %d ERREUR %d\n", i + 1, battCode);
      }
      http.end();
    }
  }
}

// ══════════════════════════════════════════════════════════════
//  SETUP
// ══════════════════════════════════════════════════════════════

void setup() {
  Serial.begin(115200);
  Serial.println("\n══ EVE Scooter Monitor ══");

  // Pins
  pinMode(PIN_TAMPER_SIEGE, INPUT_PULLDOWN);
  pinMode(PIN_TAMPER_AVANT, INPUT_PULLDOWN);
  pinMode(PIN_TAMPER_BATT,  INPUT_PULLDOWN);
  pinMode(PIN_ALARM,        INPUT_PULLDOWN);
  pinMode(PIN_LED,          OUTPUT);

  // UART BMS
  Serial2.begin(9600, SERIAL_8N1, BMS_RX, BMS_TX);

  // UART GPS
  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);

  // MPU6050
  setupMPU();

  // WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("WiFi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" OK: " + WiFi.localIP().toString());
    digitalWrite(PIN_LED, HIGH);
  } else {
    Serial.println(" ECHEC — continuera en local");
  }

  Serial.println("Capteurs prets. Envoi toutes les 10s...\n");
}

// ══════════════════════════════════════════════════════════════
//  LOOP
// ══════════════════════════════════════════════════════════════

void loop() {
  // Lire GPS en continu (les trames NMEA arrivent sans arret)
  while (gpsSerial.available()) {
    gps.encode(gpsSerial.read());
  }

  if (millis() - lastSend >= SEND_INTERVAL) {
    lastSend = millis();
    Serial.println("────────────────────────────────────");

    readBMS();
    readMPU();
    readGPS();
    readTPMS();
    readSwitches();
    sendTelemetry();

    Serial.println();
  }
}
