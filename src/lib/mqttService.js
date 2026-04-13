import mqtt from 'mqtt';

// 🔥 URL HiveMQ Cloud (WebSocket sécurisé)
const MQTT_URL = 'wss://c7251af39df04cc98f2402df7b6e00ab.s1.eu.hivemq.cloud:8884/mqtt';

// 🔥 Options optimisées mobile + GSM (SIM800L)
const options = {
  clientId: 'EVE_APP_' + Math.random().toString(16).substr(2, 8),

  username: 'scooter1',
  password: 'Test12345',

  keepalive: 20,           // ping rapide (important GSM)
  clean: true,             // session propre
  reconnectPeriod: 1000,   // reconnexion rapide
  connectTimeout: 10000,   // tolérance réseau mobile

  resubscribe: true,       // resub auto après reconnect
  queueQoSZero: false,     // évite backlog (réduit délai)

  will: {
    topic: 'clients/status',
    payload: 'offline',
    qos: 1,
    retain: false,
  },
};

// 🔥 Création client MQTT
export const mqttClient = mqtt.connect(MQTT_URL, options);

// ─────────────────────────────
// 🔥 EVENTS (debug + stabilité)
// ─────────────────────────────

mqttClient.on('connect', () => {
  console.log('✅ MQTT connecté');
});

mqttClient.on('reconnect', () => {
  console.log('🔄 Reconnexion MQTT...');
});

mqttClient.on('close', () => {
  console.log('⚠️ Connexion MQTT fermée');
});

mqttClient.on('offline', () => {
  console.log('📴 MQTT hors ligne');
});

mqttClient.on('error', (err) => {
  console.log('❌ MQTT Error:', err.message);
});

// 🔥 DEBUG GLOBAL (très important pour toi)
mqttClient.on('message', (topic, message) => {
  console.log('📩 MQTT RAW:', topic, message.toString());
});