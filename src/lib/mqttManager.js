import { mqttClient } from './mqttService';

const TOPICS = [
  'scooter/+/telemetry',
  'scooter/+/contact',
  'scooter/+/gyro',
];

class MQTTManager {
  constructor() {
    this.isSetup = false;
    this.screenListener = null;
    this.persistentListeners = [];
  }

  setupGlobal() {
    if (this.isSetup) return;
    this.isSetup = true;
    TOPICS.forEach(t => mqttClient.subscribe(t));
    mqttClient.on('connect', () => {
      TOPICS.forEach(t => mqttClient.subscribe(t));
    });
  }

  addPersistentListener(cb) {
    if (!this.isSetup) this.setupGlobal();
    if (this.persistentListeners.includes(cb)) return;
    this.persistentListeners.push(cb);
    mqttClient.on('message', cb);
  }

  removePersistentListener(cb) {
    const idx = this.persistentListeners.indexOf(cb);
    if (idx === -1) return;
    this.persistentListeners.splice(idx, 1);
    try { mqttClient.removeListener('message', cb); } catch {}
  }

  updateCallback(newCallback) {
    if (!this.isSetup) this.setupGlobal();
    if (this.screenListener) {
      try { mqttClient.removeListener('message', this.screenListener); } catch {}
    }
    this.screenListener = newCallback;
    mqttClient.on('message', newCallback);
  }

  /**
   * Publish a command to a scooter
   * @param {string} scooterId - The scooter UUID or short ID
   * @param {string} action    - "lock" | "unlock" | "bell" | "thunder"
   */
  sendCommand(scooterId, action) {
    const topic = `scooter/${scooterId}/command`;
    const payload = JSON.stringify({ action, timestamp: Date.now() });

    mqttClient.publish(topic, payload, { qos: 1 }, (err) => {
      if (err) {
        console.log('MQTT publish error:', err.message);
      } else {
        console.log(`MQTT command sent: ${action} → ${topic}`);
      }
    });
  }
}

export const mqttManager = new MQTTManager();
