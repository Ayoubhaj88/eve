import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Platform, Switch,
} from 'react-native';

const C = {
  bg:           '#0A0A0F',
  bgCard:       '#13131A',
  bgCardLight:  '#1A1A26',
  bgElevated:   '#1E1E2E',
  accent:       '#00E5FF',
  accentGlow:   'rgba(0,229,255,0.10)',
  success:      '#00E676',
  danger:       '#FF1744',
  dangerDim:    'rgba(255,23,68,0.12)',
  white:        '#FFFFFF',
  textSecondary:'#8A8A9A',
  textMuted:    '#4A4A5A',
  border:       '#1E1E2E',
  borderAccent: 'rgba(0,229,255,0.25)',
};
const F = { xs: 11, sm: 12, md: 14, lg: 16, xl: 20 };
const S = { xs: 4, sm: 6, md: 10, lg: 16, xl: 20, xxl: 28 };

// ─── Components ───────────────────────────────────────────

function SettingRow({ icon, label, desc, value, onPress, type = 'arrow' }) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.settingIcon}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <View style={styles.settingBody}>
        <Text style={styles.settingLabel}>{label}</Text>
        {desc && <Text style={styles.settingDesc}>{desc}</Text>}
      </View>
      <View style={styles.settingRight}>
        {type === 'arrow' && (
          <>
            {value && <Text style={styles.settingValue}>{value}</Text>}
            <Text style={styles.arrow}>›</Text>
          </>
        )}
        {type === 'switch' && (
          <Switch
            value={value}
            onValueChange={onPress}
            trackColor={{ false: C.bgElevated, true: C.accent }}
            thumbColor={value ? C.bg : C.textMuted}
            ios_backgroundColor={C.bgElevated}
          />
        )}
        {type === 'badge' && (
          <View style={styles.versionBadge}>
            <Text style={styles.versionBadgeText}>{value}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function SettingsGroup({ title, children }) {
  return (
    <View style={styles.group}>
      {title && <Text style={styles.groupTitle}>{title}</Text>}
      <View style={styles.groupCard}>{children}</View>
    </View>
  );
}

function ProfileCard({ name, scooterId, status }) {
  return (
    <View style={styles.profileCard}>
      <View style={styles.avatar}>
        <Text style={{ fontSize: 28 }}>🛵</Text>
      </View>
      <View style={styles.profileInfo}>
        <Text style={styles.profileName}>{name}</Text>
        <Text style={styles.profileId}>ID: {scooterId}</Text>
      </View>
      <View style={[styles.profileStatus, status === 'online' && styles.profileStatusOn]}>
        <Text style={[styles.profileStatusText, status === 'online' && styles.profileStatusTextOn]}>
          {status === 'online' ? '● En ligne' : '○ Hors ligne'}
        </Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────
export default function SettingsScreen() {
  const [notifs, setNotifs]       = useState(true);
  const [darkMode, setDarkMode]   = useState(true);
  const [gpsAlways, setGpsAlways] = useState(false);
  const [autoAlarm, setAutoAlarm] = useState(true);
  const [mqttLog, setMqttLog]     = useState(false);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Paramètres</Text>
          <Text style={styles.pageSubtitle}>Configuration & Préférences</Text>
        </View>

        {/* ── Profile / Scooter ── */}
        <ProfileCard
          name="Mon Scooter Électrique"
          scooterId="SCT-001-2025"
          status="offline"
        />

        {/* ── Connexion ── */}
        <SettingsGroup title="Connexion">
          <SettingRow icon="📡" label="Broker MQTT"     desc="emqx.cloud:1883"       value="Configuré" />
          <SettingRow icon="📶" label="Réseau SIM"      desc="SIM800H / GPRS"        value="APN: internet" />
          <SettingRow icon="🔄" label="Intervalle envoi" desc="Fréquence des données" value="5 sec" />
        </SettingsGroup>

        {/* ── Seuils de sécurité ── */}
        <SettingsGroup title="Seuils de sécurité">
          <SettingRow icon="📐" label="Angle chute"        desc="Alerte si dépassé"  value="> 45°" />
          <SettingRow icon="🚀" label="Vitesse max"        desc="Alerte si dépassée" value="30 km/h" />
          <SettingRow icon="📍" label="Rayon géofence"     desc="Zone autorisée"     value="500 m" />
          <SettingRow icon="🔵" label="Pression min pneu"  desc="Seuil bas"          value="1.8 bar" />
          <SettingRow icon="🔵" label="Pression max pneu"  desc="Seuil haut"         value="3.0 bar" />
          <SettingRow icon="⏱️" label="Inactivité alarme"  desc="Délai avant alarme" value="5 min" />
        </SettingsGroup>

        {/* ── Notifications ── */}
        <SettingsGroup title="Notifications">
          <SettingRow
            icon="🔔" label="Notifications push" desc="Alertes en temps réel"
            type="switch" value={notifs} onPress={() => setNotifs(v => !v)}
          />
          <SettingRow
            icon="⚡" label="Alarme auto"  desc="Déclencher l'alarme automatiquement"
            type="switch" value={autoAlarm} onPress={() => setAutoAlarm(v => !v)}
          />
          <SettingRow
            icon="📍" label="GPS permanent" desc="Suivi continu (consomme plus)"
            type="switch" value={gpsAlways} onPress={() => setGpsAlways(v => !v)}
          />
        </SettingsGroup>

        {/* ── Application ── */}
        <SettingsGroup title="Application">
          <SettingRow
            icon="🌙" label="Mode sombre" desc="Interface sombre"
            type="switch" value={darkMode} onPress={() => setDarkMode(v => !v)}
          />
          <SettingRow
            icon="🔧" label="Logs MQTT" desc="Afficher les logs de connexion"
            type="switch" value={mqttLog} onPress={() => setMqttLog(v => !v)}
          />
          <SettingRow icon="🌍" label="Langue" value="Français" />
        </SettingsGroup>

        {/* ── À propos ── */}
        <SettingsGroup title="À propos">
          <SettingRow icon="📱" label="Version app"    type="badge" value="v1.0.0" />
          <SettingRow icon="🧠" label="Version modèle IA" type="badge" value="v2.1" />
          <SettingRow icon="📄" label="Documentation"  desc="Guide d'utilisation" />
          <SettingRow icon="📧" label="Contact"        desc="support@scooter-iot.app" />
        </SettingsGroup>

        {/* ── Danger zone ── */}
        <SettingsGroup title="Zone dangereuse">
          <TouchableOpacity style={styles.dangerBtn}>
            <Text style={styles.dangerBtnText}>🗑️  Réinitialiser toutes les données</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dangerBtn, styles.dangerBtnFill]}>
            <Text style={[styles.dangerBtnText, { color: C.bg }]}>🔌  Déconnecter le scooter</Text>
          </TouchableOpacity>
        </SettingsGroup>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: S.xl, paddingTop: Platform.OS === 'ios' ? 60 : 40 },

  header:       { marginBottom: S.xxl },
  pageTitle:    { fontSize: 32, fontWeight: '900', color: C.white, letterSpacing: -1 },
  pageSubtitle: { fontSize: F.md, color: C.textMuted, marginTop: 2 },

  // Profile
  profileCard: {
    backgroundColor: C.bgCard, borderRadius: 20, padding: S.xl,
    flexDirection: 'row', alignItems: 'center', gap: S.lg,
    borderWidth: 1, borderColor: C.border, marginBottom: S.xl,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.bgElevated, borderWidth: 2, borderColor: C.borderAccent,
    justifyContent: 'center', alignItems: 'center',
  },
  profileInfo:          { flex: 1 },
  profileName:          { fontSize: F.lg, fontWeight: '800', color: C.white },
  profileId:            { fontSize: F.sm, color: C.textMuted, marginTop: 2 },
  profileStatus: {
    paddingHorizontal: S.md, paddingVertical: S.sm,
    borderRadius: 12, backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border,
  },
  profileStatusOn:     { backgroundColor: 'rgba(0,230,118,0.12)', borderColor: C.success },
  profileStatusText:   { fontSize: F.xs, fontWeight: '700', color: C.textMuted },
  profileStatusTextOn: { color: C.success },

  // Groups
  group:      { marginBottom: S.xl },
  groupTitle: {
    fontSize: F.sm, fontWeight: '800', color: C.textMuted,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: S.md, paddingLeft: 4,
  },
  groupCard: {
    backgroundColor: C.bgCard, borderRadius: 18,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },

  // Setting row
  settingRow: {
    flexDirection: 'row', alignItems: 'center', padding: S.lg,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  settingIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.bgElevated, justifyContent: 'center', alignItems: 'center',
    marginRight: S.md,
  },
  settingBody:  { flex: 1 },
  settingLabel: { fontSize: F.md, fontWeight: '700', color: C.white },
  settingDesc:  { fontSize: F.xs, color: C.textMuted, marginTop: 1 },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  settingValue: { fontSize: F.sm, fontWeight: '600', color: C.textSecondary },
  arrow:        { fontSize: 20, color: C.textMuted, marginLeft: 2 },

  // Version badge
  versionBadge: {
    backgroundColor: C.accentGlow, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: C.borderAccent,
  },
  versionBadgeText: { fontSize: F.xs, fontWeight: '700', color: C.accent },

  // Danger
  dangerBtn: {
    padding: S.lg, alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: C.dangerDim,
  },
  dangerBtnFill:  { backgroundColor: C.danger, borderBottomWidth: 0 },
  dangerBtnText:  { fontSize: F.md, fontWeight: '800', color: C.danger },
});