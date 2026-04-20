// mqttManager.js - FIXED VERSION

import { mqttClient } from './mqttService';

class MQTTManager {
  constructor() {
    this.isSetup = false;
    this.listeners = {
      onMessage: null,
    };
    this.callCount = 0;
    this.managerId = Math.random().toString(36).substr(2, 9);
    console.log(`🔧 [mqttManager-${this.managerId}] Constructor called`);
  }

  /**
   * Setup MQTT globally (run once, never clean up)
   */
  setupGlobal() {
    if (this.isSetup) {
      console.log(`🔧 [mqttManager-${this.managerId}] ⚠️ setupGlobal already called, skipping`);
      return;
    }

    console.log(`🔧 [mqttManager-${this.managerId}] 🔴 setupGlobal() RUNNING`);

    // ✅ SUBSCRIBE TO ALL RELEVANT TOPICS
    const topics = [
      'scooter/+/telemetry',  // For telemetry data
      'scooter/+/contact',    // For contact switch (tamper)
      'scooter/+/gyro',       // For gyroscope data
    ];

    topics.forEach(topic => {
      console.log(`🔧 [mqttManager-${this.managerId}] 📡 Subscribing to: ${topic}`);
      try {
        mqttClient.subscribe(topic);
        console.log(`🔧 [mqttManager-${this.managerId}] ✅ Subscribed to ${topic}`);
      } catch (e) {
        console.log(`🔧 [mqttManager-${this.managerId}] ❌ Subscribe error for ${topic}:`, e.message);
      }
    });

    // Status listeners
    mqttClient.on('connect', () => {
      console.log(`🔧 [mqttManager-${this.managerId}] 🟢 MQTT CONNECTED`);
      // Re-subscribe on reconnect
      topics.forEach(topic => {
        mqttClient.subscribe(topic, (err) => {
          if (err) console.log(`🔧 [mqttManager-${this.managerId}] Re-subscribe error for ${topic}:`, err);
          else console.log(`🔧 [mqttManager-${this.managerId}] Re-subscribed to ${topic}`);
        });
      });
    });

    mqttClient.on('close', () => {
      console.log(`🔧 [mqttManager-${this.managerId}] ⚪ MQTT CLOSED`);
    });

    mqttClient.on('error', (err) => {
      console.log(`🔧 [mqttManager-${this.managerId}] 🔴 MQTT ERROR:`, err.message);
    });

    this.isSetup = true;
    console.log(`🔧 [mqttManager-${this.managerId}] ✅ Setup complete`);
  }

  /**
   * Update the message callback (when screen changes)
   * AUTO-CALLS setupGlobal if not yet initialized
   */
  updateCallback(newCallback) {
    this.callCount++;
    const callNum = this.callCount;

    console.log(`\n🔧 [mqttManager-${this.managerId}] updateCallback() called #${callNum}`);
    console.log(`🔧 [mqttManager-${this.managerId}] Current state: isSetup=${this.isSetup}, hasListener=${!!this.listeners.onMessage}`);

    // ✅ Auto-setup if needed
    if (!this.isSetup) {
      console.log(`🔧 [mqttManager-${this.managerId}] Bus not setup yet, calling setupGlobal()`);
      this.setupGlobal();
    } else {
      console.log(`🔧 [mqttManager-${this.managerId}] Bus already setup, just updating callback`);
    }

    // Remove old listener
    if (this.listeners.onMessage) {
      console.log(`🔧 [mqttManager-${this.managerId}] 🗑️ Removing old listener`);
      try {
        mqttClient.removeListener('message', this.listeners.onMessage);
        console.log(`🔧 [mqttManager-${this.managerId}] ✅ Old listener removed`);
      } catch (e) {
        console.log(`🔧 [mqttManager-${this.managerId}] ❌ Error removing listener:`, e.message);
      }
    } else {
      console.log(`🔧 [mqttManager-${this.managerId}] No old listener to remove`);
    }

    // Attach new listener
    this.listeners.onMessage = newCallback;
    console.log(`🔧 [mqttManager-${this.managerId}] ➕ Attaching NEW listener (call #${callNum})`);

    try {
      // Add the listener
      mqttClient.on('message', this.listeners.onMessage);
      console.log(`🔧 [mqttManager-${this.managerId}] ✅ NEW listener attached successfully`);

      // Debug: Check how many listeners are now attached
      const listenerCount = mqttClient.listenerCount('message');
      console.log(`🔧 [mqttManager-${this.managerId}] 📊 Total 'message' listeners now: ${listenerCount}`);

      // ✅ Also log the first few messages to see what's coming in
      const originalListener = this.listeners.onMessage;
      this.listeners.onMessage = (topic, message) => {
        console.log(`🔧 [mqttManager-${this.managerId}] 📨 RECEIVED: ${topic} = ${message.toString().substring(0, 100)}`);
        originalListener(topic, message);
      };

    } catch (e) {
      console.log(`🔧 [mqttManager-${this.managerId}] ❌ Error attaching listener:`, e.message);
    }
  }

  /**
   * Debug method - show current state
   */
  debugState() {
    const listenerCount = mqttClient?.listenerCount('message') ?? 'unknown';
    console.log(`\n🔧 [mqttManager-${this.managerId}] DEBUG STATE:`);
    console.log(`   isSetup: ${this.isSetup}`);
    console.log(`   hasListener: ${!!this.listeners.onMessage}`);
    console.log(`   updateCallback calls: ${this.callCount}`);
    console.log(`   Total message listeners: ${listenerCount}`);
  }
}

// Singleton instance
export const mqttManager = new MQTTManager();

// Also export debug function for easy access
export const debugMqttManager = () => {
  mqttManager.debugState();
};
