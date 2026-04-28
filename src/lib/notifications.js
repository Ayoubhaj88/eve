import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';
import { mqttManager } from './mqttManager';

// ── Configuration notifications locales (SDK 54) ─────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ── Demander permission ──────────────────────────────────────

export async function requestPermissions() {
  if (!Device.isDevice) {
    console.log('[NOTIF] not a real device — permissions skipped');
    return false;
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const r = await Notifications.requestPermissionsAsync();
    status = r.status;
  }
  console.log(`[NOTIF] permission status: ${status}`);
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('alerts', {
      name: 'Alertes Scooter',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }
  return status === 'granted';
}

// ── Enregistrement du token Expo Push dans Supabase ──────────

export async function registerPushToken() {
  try {
    if (!Device.isDevice) return;
    const granted = await requestPermissions();
    if (!granted) return;

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;
    if (!projectId) {
      console.log('[push] projectId manquant dans app.json');
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData?.data;
    if (!token) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Upsert : un seul row par token
    const { error } = await supabase.from('push_tokens').upsert(
      {
        user_id: user.id,
        token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'token' },
    );
    if (error) console.log('[push] upsert token error:', error.message);
    else console.log('[push] token enregistre');
  } catch (e) {
    console.log('[push] registerPushToken error:', e?.message);
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
    trigger: null,
  });
}

// ── Historique local ─────────────────────────────────────────

async function saveToHistory(notif) {
  try {
    const json = await AsyncStorage.getItem('notif_history');
    const history = json ? JSON.parse(json) : [];
    history.unshift({
      ...notif,
      id: Date.now().toString() + '_' + Math.random().toString(36).slice(2, 6),
      created_at: new Date().toISOString(),
    });
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

// ── Settings ─────────────────────────────────────────────────

async function getSettings(key) {
  try {
    const json = await AsyncStorage.getItem(`settings_${key}`);
    return json ? JSON.parse(json) : null;
  } catch { return null; }
}

// ── Anti-spam: 1 notif par (scooter, type) toutes les 30s ────

const COOLDOWN_MS = 30_000;
const lastFired = new Map(); // key: `${scooter_id}:${type}` → timestamp

function shouldFire(scooter_id, type) {
  const key = `${scooter_id}:${type}`;
  const now = Date.now();
  const last = lastFired.get(key) ?? 0;
  if (now - last < COOLDOWN_MS) return false;
  lastFired.set(key, now);
  return true;
}

// ── Trigger une alerte (notif + historique) ──────────────────

async function fireAlert({ scooter_id, scooter_name, type, message, settingsKey }) {
  if (!shouldFire(scooter_id, type)) {
    console.log(`[NOTIF] cooldown skip ${scooter_name}/${type}`);
    return;
  }
  const settings = await getSettings(settingsKey);
  const son = settings?.son !== false;
  const customMsg = settings?.msg?.trim() || message;
  console.log(`[NOTIF] 🔔 fireAlert ${scooter_name} / ${type} / "${customMsg}" / son=${son}`);
  if (son) {
    try {
      await sendLocalNotif(scooter_name, customMsg, { scooter_id, type });
      console.log(`[NOTIF] ✅ scheduleNotificationAsync OK`);
    } catch (e) {
      console.log(`[NOTIF] ❌ scheduleNotificationAsync error:`, e?.message);
    }
  }
  await saveToHistory({ scooter_id, scooter_name, type, message: customMsg });
}

// ── Map id_scooter → name ────────────────────────────────────

let scooterMap = {};       // dbId → { id, name }
let scooterByMqttId = {};  // normalizedId (no dashes, lowercase) → scooter

const normalizeScooterId = (id) => {
  if (!id) return '';
  return String(id).trim().toLowerCase().replace(/-/g, '');
};

async function refreshScooters() {
  const { data } = await supabase.from('scooters').select('id, name');
  scooterMap = {};
  scooterByMqttId = {};
  (data ?? []).forEach(s => {
    scooterMap[s.id] = s;
    scooterByMqttId[normalizeScooterId(s.id)] = s;
  });
}

function findScooterByMqttId(mqttId) {
  const norm = normalizeScooterId(mqttId);
  if (scooterByMqttId[norm]) return scooterByMqttId[norm];
  // Match partiel (id BD contient l'id MQTT ou inverse)
  for (const [k, sc] of Object.entries(scooterByMqttId)) {
    if (k.includes(norm) || norm.includes(k)) return sc;
  }
  return null;
}

// ── Détection MQTT (chute + sabotage) ────────────────────────

const FALL_THRESHOLD_DEFAULT = 55;

const mqttHandler = async (topic, message) => {
  try {
    const parts = String(topic).split('/');
    const mqttScooterId = parts[1];
    const sc = findScooterByMqttId(mqttScooterId);
    if (!sc) {
      console.log(`[NOTIF] mqtt no match for ${mqttScooterId} (known: ${Object.keys(scooterByMqttId).join(',')})`);
      return;
    }

    const text = message.toString();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { type: 'contact', value: text === '1' ? 1 : 0 };
    }

    // ── CHUTE ──
    const hasAccel = payload.accel !== undefined
      || payload.accel_x !== undefined
      || payload.accel_y !== undefined
      || payload.accel_z !== undefined;
    if (hasAccel) {
      const gyroSettings = await getSettings('notif_gyroscope');
      const seuil = parseFloat(gyroSettings?.seuil) || FALL_THRESHOLD_DEFAULT;
      const ax = payload.accel_x ?? payload.accel ?? 0;
      if (Math.abs(Number(ax) || 0) > seuil) {
        fireAlert({
          scooter_id: sc.id,
          scooter_name: sc.name,
          type: 'fall',
          title: 'Chute',
          message: 'Chute détectée !',
          settingsKey: 'notif_gyroscope',
        });
      }
    } else if (payload.fallen === true) {
      fireAlert({
        scooter_id: sc.id,
        scooter_name: sc.name,
        type: 'fall',
        title: 'Chute',
        message: 'Chute détectée !',
        settingsKey: 'notif_gyroscope',
      });
    }

    // ── SABOTAGE (contact switch) ──
    if (payload.type === 'contact' && payload.value === 1) {
      fireAlert({
        scooter_id: sc.id,
        scooter_name: sc.name,
        type: 'tamper',
        title: 'Sabotage',
        message: 'Sabotage détecté : Siège',
        settingsKey: 'notif_sabotage',
      });
    }
  } catch (e) {
    console.log('[notifications] mqtt parse error:', e?.message);
  }
};

// ── Détection Supabase (batterie / TPMS / alarme) ────────────

async function checkSupabaseAlerts(telemetry) {
  const sc = scooterMap[telemetry.scooter_id];
  if (!sc) return;
  const sid = telemetry.scooter_id;
  const name = sc.name;

  // ── BATTERIE FAIBLE (default 20%) ──
  const battSettings = await getSettings('notif_batterie');
  const seuil = parseFloat(battSettings?.alarme) || 20;
  const { data: batts } = await supabase.from('batteries')
    .select('soc, slot')
    .eq('scooter_id', sid)
    .not('soc', 'is', null);
  if (batts) {
    for (const b of batts) {
      if (b.soc != null && b.soc <= seuil) {
        await fireAlert({
          scooter_id: sid,
          scooter_name: name,
          type: 'battery_low',
          message: `Batterie ${b.slot ?? '?'} à ${b.soc}%`,
          settingsKey: 'notif_batterie',
        });
        break;
      }
    }
  }

  // ── TPMS ──
  const tpmsSettings = await getSettings('notif_tpms');
  if (tpmsSettings?.critique) {
    const critique = parseFloat(tpmsSettings.critique) || 1.5;
    const wf = telemetry.wheel_front;
    const wr = telemetry.wheel_rear;
    const lowFront = wf != null && wf < critique;
    const lowRear  = wr != null && wr < critique;
    if (lowFront || lowRear) {
      const roue = lowFront ? 'AV' : 'AR';
      const val = lowFront ? wf : wr;
      await fireAlert({
        scooter_id: sid,
        scooter_name: name,
        type: 'tpms',
        title: 'TPMS',
        message: `Pression ${roue} critique : ${val?.toFixed?.(1)} bar`,
        settingsKey: 'notif_tpms',
      });
    }
  }

  // ── ALARME — B + C ──
  await checkAlarmAlert(telemetry, sid, name);
}

// ── ALARME : detection B (offline+off avec delai) et C (siren) ─

// Etat precedent par scooter (en RAM) pour detecter les transitions
const alarmState = new Map(); // scooter_id -> { alarm, status }
// Timers pendants pour B (offline+off avec delai)
const alarmPendingTimers = new Map(); // scooter_id -> timeoutId

async function checkAlarmAlert(t, sid, name) {
  const prev = alarmState.get(sid) ?? {};
  const curr = { alarm: !!t.alarm, status: t.status ?? 'offline' };
  alarmState.set(sid, curr);

  const settings = await getSettings('notif_alarmeOn');

  // ── C : SIRENE — alarm passe de false a true ──
  if (curr.alarm === true && prev.alarm === false) {
    await fireAlert({
      scooter_id: sid,
      scooter_name: name,
      type: 'alarm_siren',
      message: 'Alarme déclenchée — intrusion détectée',
      settingsKey: 'notif_alarmeOn',
    });
  }

  // ── B : OFFLINE + alarme OFF — declenche apres `delai` secondes ──
  const isIdle = curr.alarm === false && curr.status === 'offline';
  const wasIdle = prev.alarm === false && prev.status === 'offline';

  if (isIdle && !wasIdle) {
    // On vient d'entrer dans l'etat "oublie d'armer"
    const delaiSec = parseFloat(settings?.delai) || 30;
    // Annule un eventuel timer precedent
    clearTimeout(alarmPendingTimers.get(sid));
    const timerId = setTimeout(async () => {
      alarmPendingTimers.delete(sid);
      const latest = alarmState.get(sid);
      // Verifie qu'on est toujours dans le meme etat
      if (latest?.alarm === false && latest?.status === 'offline') {
        await fireAlert({
          scooter_id: sid,
          scooter_name: name,
          type: 'alarm',
          message: 'Scooter laissé sans alarme activée',
          settingsKey: 'notif_alarmeOn',
        });
      }
    }, delaiSec * 1000);
    alarmPendingTimers.set(sid, timerId);
  } else if (!isIdle && wasIdle) {
    // L'etat a change avant la fin du delai -> annule
    const t = alarmPendingTimers.get(sid);
    if (t) { clearTimeout(t); alarmPendingTimers.delete(sid); }
  }
}

// ── BATTERIE : déclenché par UPDATE/INSERT sur batteries ─────

async function checkBatteryAlert(battRow, oldBatt) {
  if (!battRow?.scooter_id || battRow.soc == null) return;
  const sc = scooterMap[battRow.scooter_id];
  if (!sc) return;

  const battSettings = await getSettings('notif_batterie');
  const seuil = parseFloat(battSettings?.alarme) || 20;

  const soc = Number(battRow.soc);
  const oldSoc = oldBatt?.soc != null ? Number(oldBatt.soc) : 999;

  // Trigger uniquement quand on PASSE sous le seuil (ou insertion direct sous le seuil)
  const crossed = soc <= seuil && oldSoc > seuil;
  const insertedLow = soc <= seuil && oldBatt == null;
  if (!crossed && !insertedLow) return;

  await fireAlert({
    scooter_id: battRow.scooter_id,
    scooter_name: sc.name,
    type: 'battery_low',
    message: `Batterie ${battRow.slot ?? '?'} à ${soc}%`,
    settingsKey: 'notif_batterie',
  });
}

// ── Listener global — appelé depuis App.js ───────────────────

let supabaseChannel = null;
let scooterChannel = null;
let batteryChannel = null;
let mqttRegistered = false;

export async function startNotificationListener() {
  await refreshScooters();
  console.log(`[NOTIF] startNotificationListener — ${Object.keys(scooterByMqttId).length} scooters loaded`);

  // 1. Listener MQTT (chute + sabotage) — persistant
  if (!mqttRegistered) {
    mqttManager.addPersistentListener(mqttHandler);
    mqttRegistered = true;
    console.log(`[NOTIF] persistent MQTT listener registered`);
  }

  // 2. Listener Supabase telemetry (batterie / TPMS / alarme)
  if (supabaseChannel) supabase.removeChannel(supabaseChannel);
  supabaseChannel = supabase.channel('notif-listener-telemetry')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'telemetry',
    }, (payload) => {
      checkSupabaseAlerts(payload.new);
    })
    .subscribe();

  // 3. Garder la map à jour si l'admin ajoute/renomme un scooter
  if (scooterChannel) supabase.removeChannel(scooterChannel);
  scooterChannel = supabase.channel('notif-listener-scooters')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'scooters',
    }, () => { refreshScooters(); })
    .subscribe();

  // 4. Listener Supabase batteries (batterie faible)
  if (batteryChannel) supabase.removeChannel(batteryChannel);
  batteryChannel = supabase.channel('notif-listener-batteries')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'batteries',
    }, (payload) => {
      checkBatteryAlert(payload.new, payload.old);
    })
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'batteries',
    }, (payload) => {
      checkBatteryAlert(payload.new, null);
    })
    .subscribe();
}

export function stopNotificationListener() {
  if (supabaseChannel) { supabase.removeChannel(supabaseChannel); supabaseChannel = null; }
  if (scooterChannel)  { supabase.removeChannel(scooterChannel);  scooterChannel  = null; }
  if (batteryChannel)  { supabase.removeChannel(batteryChannel);  batteryChannel  = null; }
  if (mqttRegistered) {
    mqttManager.removePersistentListener(mqttHandler);
    mqttRegistered = false;
  }
  lastFired.clear();
}
