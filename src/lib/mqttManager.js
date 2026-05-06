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
}

export const mqttManager = new MQTTManager();
