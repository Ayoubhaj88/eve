import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';

// ── Configuration notifications locales ──────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ── Demander permission ──────────────────────────────────────

export async function requestPermissions() {
  if (!Device.isDevice) return; // Simulateur = pas de notifs
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing !== 'granted') {
    await Notifications.requestPermissionsAsync();
  }
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('alerts', {
      name: 'Alertes Scooter',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }
}

// ── Envoyer notification locale ──────────────────────────────

async function sendLocalNotif(title, body, data = {}) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      data,
      ...(Platform.OS === 'android' ? { channelId: 'alerts' } : {}),
    },
    trigger: null, // immédiat
  });
}

// ── Sauvegarder dans l'historique local ──────────────────────

async function saveToHistory(notif) {
  try {
    const json = await AsyncStorage.getItem('notif_history');
    const history = json ? JSON.parse(json) : [];
    history.unshift({
      ...notif,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
    });
    // Garder max 100 notifications
    await AsyncStorage.setItem('notif_history', JSON.stringify(history.slice(0, 100)));
  } catch {}
}

export async function getHistory() {
  try {
    const json = await AsyncStorage.getItem('notif_history');
    return json ? JSON.parse(json) : [];
  } catch { return []; }
}

export async function clearHistory() {
  await AsyncStorage.setItem('notif_history', JSON.stringify([]));
}

// ── Charger les seuils configurés ────────────────────────────

async function getSettings(key) {
  try {
    const json = await AsyncStorage.getItem(`settings_${key}`);
    return json ? JSON.parse(json) : null;
  } catch { return null; }
}

// ── Vérifier et déclencher les alertes ───────────────────────

async function checkAlerts(telemetry, scooterName) {
  const sid = telemetry.scooter_id;

  // ── CHUTE (Gyroscope) ──
  if (telemetry.fallen) {
    const gyroSettings = await getSettings('notif_gyroscope');
    const son = gyroSettings?.son !== false;
    const msg = gyroSettings?.msg || 'Chute détectée !';
    if (son) await sendLocalNotif(`${scooterName} — Chute`, msg, { scooter_id: sid, type: 'fall' });
    await saveToHistory({ scooter_id: sid, scooter_name: scooterName, type: 'fall', message: msg });
  }

  // ── SABOTAGE ──
  const tamper = telemetry.tamper_points;
  if (tamper && tamper.some(Boolean)) {
    const sabSettings = await getSettings('notif_sabotage');
    const son = sabSettings?.son !== false;
    const points = ['Siège', 'Avant', 'Batterie'].filter((_, i) => tamper[i]).join(', ');
    const msg = sabSettings?.msg || `Sabotage détecté : ${points}`;
    if (son) await sendLocalNotif(`${scooterName} — Sabotage`, msg, { scooter_id: sid, type: 'tamper' });
    await saveToHistory({ scooter_id: sid, scooter_name: scooterName, type: 'tamper', message: msg });
  }

  // ── BATTERIE FAIBLE ──
  const battSettings = await getSettings('notif_batterie');
  if (battSettings?.alarme) {
    const seuil = parseFloat(battSettings.alarme) || 20;
    // Récupérer les batteries du scooter
    const { data: batts } = await supabase.from('batteries').select('soc, serial_number')
      .eq('scooter_id', sid).not('soc', 'is', null);
    if (batts) {
      for (const b of batts) {
        if (b.soc != null && b.soc <= seuil) {
          const son = battSettings?.son !== false;
          const msg = battSettings?.msg || `Batterie ${b.serial_number} à ${b.soc}%`;
          if (son) await sendLocalNotif(`${scooterName} — Batterie faible`, msg, { scooter_id: sid, type: 'battery_low' });
          await saveToHistory({ scooter_id: sid, scooter_name: scooterName, type: 'battery_low', message: msg });
          break; // Une seule notif par cycle
        }
      }
    }
  }

  // ── TPMS ──
  const tpmsSettings = await getSettings('notif_tpms');
  if (tpmsSettings) {
    const critique = parseFloat(tpmsSettings.critique) || 1.5;
    const wf = telemetry.wheel_front;
    const wr = telemetry.wheel_rear;
    if ((wf != null && wf < critique) || (wr != null && wr < critique)) {
      const son = tpmsSettings?.son !== false;
      const roue = wf < critique ? 'AV' : 'AR';
      const val = wf < critique ? wf : wr;
      const msg = tpmsSettings?.msg || `Pression ${roue} critique : ${val?.toFixed(1)} bar`;
      if (son) await sendLocalNotif(`${scooterName} — TPMS`, msg, { scooter_id: sid, type: 'tpms' });
      await saveToHistory({ scooter_id: sid, scooter_name: scooterName, type: 'tpms', message: msg });
    }
  }

  // ── ALARME ON (scooter laissé sans alarme) ──
  const alarmeSettings = await getSettings('notif_alarmeOn');
  if (alarmeSettings && telemetry.alarm === false && telemetry.status === 'offline') {
    const son = alarmeSettings?.son !== false;
    const msg = alarmeSettings?.msg || 'Scooter laissé sans alarme activée';
    if (son) await sendLocalNotif(`${scooterName} — Alarme`, msg, { scooter_id: sid, type: 'alarm' });
    await saveToHistory({ scooter_id: sid, scooter_name: scooterName, type: 'alarm', message: msg });
  }
}

// ── Listener global Realtime — à appeler une seule fois ──────

let channel = null;
let scooterMap = {};

export async function startNotificationListener() {
  // Charger les scooters pour les noms
  const { data } = await supabase.from('scooters').select('id, name');
  (data ?? []).forEach(s => { scooterMap[s.id] = s.name; });

  // Écouter les INSERT sur telemetry
  if (channel) supabase.removeChannel(channel);
  channel = supabase.channel('notif-listener')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'telemetry',
    }, (payload) => {
      const t = payload.new;
      const name = scooterMap[t.scooter_id] || 'Scooter';
      checkAlerts(t, name);
    })
    .subscribe();
}

export function stopNotificationListener() {
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
  }
}
