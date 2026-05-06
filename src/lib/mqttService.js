import mqtt from 'mqtt';

const MQTT_URL = 'wss://c7251af39df04cc98f2402df7b6e00ab.s1.eu.hivemq.cloud:8884/mqtt';

const options = {
  clientId: 'EVE_APP_' + Math.random().toString(16).substr(2, 8),
  username: 'scooter1',
  password: 'Test12345',
  keepalive: 20,
  clean: true,
  reconnectPeriod: 1000,
  connectTimeout: 10000,
  resubscribe: true,
  queueQoSZero: false,
  will: { topic: 'clients/status', payload: 'offline', qos: 1, retain: false },
};

export const mqttClient = mqtt.connect(MQTT_URL, options);

mqttClient.on('error', (err) => console.log('MQTT error:', err.message));
