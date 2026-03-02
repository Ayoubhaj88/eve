import React, { useState, useCallback } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity,
  RefreshControl, StyleSheet, StatusBar, Platform,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
// ─── Design Tokens ────────────────────────────────────────
const C = {
  bg:           '#0A0A0F',
  bgCard:       '#13131A',
  bgCardLight:  '#1A1A26',
  bgElevated:   '#1E1E2E',
  accent:       '#00E5FF',
  accentGlow:   'rgba(0,229,255,0.10)',
  success:      '#00E676',
  successDim:   'rgba(0,230,118,0.12)',
  warning:      '#FFB300',
  danger:       '#FF1744',
  white:        '#FFFFFF',
  textPrimary:  '#FFFFFF',
  textSecondary:'#8A8A9A',
  textMuted:    '#4A4A5A',
  border:       '#1E1E2E',
  borderAccent: 'rgba(0,229,255,0.25)',
};
const F = { xs: 11, sm: 12, md: 14, lg: 16, xl: 20, xxl: 38 };
const S = { xs: 4, sm: 6, md: 10, lg: 16, xl: 20, xxl: 28 };

// ─── Sub-components ───────────────────────────────────────

function StatCard({ icon, value, unit, label, badge, badgeColor }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statTop}>
        <Text style={styles.statIcon}>{icon}</Text>
        {badge && (
          <View style={[styles.badge, { borderColor: badgeColor, backgroundColor: badgeColor + '22' }]}>
            <Text style={[styles.badgeText, { color: badgeColor }]}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.statValue, !value && styles.statEmpty]}>
        {value ?? '—'}
        {value != null && <Text style={styles.statUnit}> {unit}</Text>}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MapCard({ address, lastUpdate }) {
  return (
    <View style={styles.mapCard}>
      <View style={styles.mapArea}>
        {/* Grid lines */}
        <View style={styles.gridV}>
          {[0,1,2,3,4,5].map(i => <View key={i} style={styles.gridLineV} />)}
        </View>
        <View style={styles.gridH}>
          {[0,1,2,3,4].map(i => <View key={i} style={styles.gridLineH} />)}
        </View>
        {/* Pin */}
        <View style={styles.pin}>
          <View style={styles.pinPulse} />
          <View style={styles.pinRing} />
          <View style={styles.pinCore}>
            <Text style={{ fontSize: 18 }}>🛵</Text>
          </View>
        </View>
        {/* Chip */}
        <View style={styles.locationChip}>
          <Text style={styles.locationChipText}>
            📍 {address ?? 'Localisation en attente…'}
          </Text>
        </View>
      </View>
      <View style={styles.mapFooter}>
        <View style={[styles.dot, { backgroundColor: lastUpdate ? C.success : C.textMuted }]} />
        <Text style={styles.mapFooterText}>
          {lastUpdate ? `Mis à jour ${lastUpdate}` : 'En attente du GPS…'}
        </Text>
        <TouchableOpacity style={styles.mapBtn}>
          <Text style={styles.mapBtnText}>Voir carte →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ToggleCard({ icon, label, status, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.toggleCard, active && styles.toggleCardOn]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={styles.toggleIcon}>{icon}</Text>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Text style={[styles.toggleStatus, active && { color: C.accent }]}>{status}</Text>
      <View style={[styles.toggle, active && styles.toggleOn]}>
        <View style={[styles.thumb, active && styles.thumbOn]} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────
export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [alarm, setAlarm]     = useState(false);
  const [starter, setStarter] = useState(false);

  // TODO: remplacer par MQTT / API temps réel
  const scooter = {
    connected: false,
    model:     null,
    battery:   null,
    charging:  false,
    speed:     null,
    range:     null,
    temp:      null,
    gps: { address: null, lastUpdate: null },
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.accent}
            colors={[C.accent]}
            progressBackgroundColor={C.bgCard}
          />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Bonjour 👋</Text>
            <Text style={styles.subtitle}>{scooter.model ?? 'Aucun appareil'}</Text>
          </View>
          <View style={[styles.statusBadge, scooter.connected && styles.statusOn]}>
            <View style={[styles.dot, { backgroundColor: scooter.connected ? C.success : C.textMuted }]} />
            <Text style={[styles.statusText, scooter.connected && { color: C.success }]}>
              {scooter.connected ? 'Connecté' : 'Hors ligne'}
            </Text>
          </View>
        </View>

        {/* ── Map GPS ── */}
        <Text style={styles.sectionTitle}>Localisation</Text>
        <MapCard address={scooter.gps.address} lastUpdate={scooter.gps.lastUpdate} />

        {/* ── Controls ── */}
        <Text style={styles.sectionTitle}>Contrôles</Text>
        <View style={styles.controlsRow}>
          <ToggleCard
            icon="🔒" label="Alarme"
            status={alarm ? 'Armée' : 'Désarmée'}
            active={alarm} onPress={() => setAlarm(v => !v)}
          />
          <ToggleCard
            icon="⚡" label="Démarrage"
            status={starter ? 'Actif' : 'Inactif'}
            active={starter} onPress={() => setStarter(v => !v)}
          />
        </View>

        {/* ── Live Stats ── */}
        <Text style={styles.sectionTitle}>Stats en direct</Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon="🔋" value={scooter.battery} unit="%" label="BATTERIE"
            badge={scooter.charging ? '⚡ Charge' : null}
            badgeColor={C.success}
          />
          <StatCard icon="🚀" value={scooter.speed}   unit="km/h" label="VITESSE" />
          <StatCard icon="🛣️" value={scooter.range}   unit="km"   label="AUTONOMIE" />
          <StatCard icon="🌡️" value={scooter.temp}    unit="°C"   label="TEMPÉRATURE" />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: C.bg },
  scroll:   { padding: S.xl, paddingTop: Platform.OS === 'ios' ? 60 : 40 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: S.xxl,
  },
  greeting: { fontSize: F.xxl * 0.6, fontWeight: '800', color: C.white, letterSpacing: -0.5 },
  subtitle: { fontSize: F.md, color: C.textMuted, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.bgCard, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: C.border,
  },
  statusOn:   { backgroundColor: C.successDim, borderColor: C.success },
  statusText: { fontSize: F.sm, fontWeight: '700', color: C.textMuted, letterSpacing: 0.3 },
  dot: { width: 7, height: 7, borderRadius: 4 },

  // Section title
  sectionTitle: {
    fontSize: F.lg, fontWeight: '800', color: C.white,
    marginBottom: S.md, marginTop: S.sm, letterSpacing: -0.3,
  },

  // Map
  mapCard: {
    backgroundColor: C.bgCard, borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: C.border, marginBottom: S.xl,
  },
  mapArea: {
    height: 200, backgroundColor: C.bgCardLight,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  gridV: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: 'row', justifyContent: 'space-evenly',
  },
  gridLineV: { width: 1, height: '100%', backgroundColor: '#1E1E2E' },
  gridH: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'space-evenly',
  },
  gridLineH: { width: '100%', height: 1, backgroundColor: '#1E1E2E' },
  pin: { alignItems: 'center', justifyContent: 'center' },
  pinPulse: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(0,229,255,0.06)', borderWidth: 1, borderColor: 'rgba(0,229,255,0.1)',
  },
  pinRing: {
    position: 'absolute', width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.accentGlow, borderWidth: 1.5, borderColor: C.borderAccent,
  },
  pinCore: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: C.bgCard,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: C.accent,
    shadowColor: C.accent, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 10, elevation: 8,
  },
  locationChip: {
    position: 'absolute', bottom: 12, left: 12,
    backgroundColor: C.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  locationChipText: { fontSize: F.sm, fontWeight: '700', color: C.bg },
  mapFooter: {
    flexDirection: 'row', alignItems: 'center', padding: S.lg, gap: 8,
  },
  mapFooterText: { flex: 1, fontSize: F.md, fontWeight: '600', color: C.textSecondary },
  mapBtn: {
    backgroundColor: C.bgElevated, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
  },
  mapBtnText: { fontSize: F.sm, fontWeight: '700', color: C.accent },

  // Controls
  controlsRow: { flexDirection: 'row', gap: S.md, marginBottom: S.xl },
  toggleCard: {
    flex: 1, backgroundColor: C.bgCard, borderRadius: 18, padding: S.lg,
    borderWidth: 1, borderColor: C.border, alignItems: 'center', gap: 6,
  },
  toggleCardOn: { backgroundColor: C.bgCardLight, borderColor: C.borderAccent },
  toggleIcon:   { fontSize: 26 },
  toggleLabel:  { fontSize: F.sm, fontWeight: '800', color: C.white },
  toggleStatus: { fontSize: F.xs, color: C.textMuted, fontWeight: '600' },
  toggle: {
    width: 46, height: 26, borderRadius: 13, backgroundColor: C.bgElevated,
    padding: 3, justifyContent: 'center', marginTop: 4,
  },
  toggleOn: { backgroundColor: C.accent },
  thumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.textMuted },
  thumbOn: { backgroundColor: C.bg, alignSelf: 'flex-end' },

  // Stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md, marginBottom: S.xl },
  statCard: {
    width: '47.5%', backgroundColor: C.bgCard, borderRadius: 18,
    padding: S.lg, borderWidth: 1, borderColor: C.border, minHeight: 120,
    justifyContent: 'space-between',
  },
  statTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statIcon:  { fontSize: 22 },
  badge: {
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, borderWidth: 1,
  },
  badgeText: { fontSize: F.xs, fontWeight: '700' },
  statValue: { fontSize: F.xxl, fontWeight: '900', color: C.white, letterSpacing: -1 },
  statEmpty: { color: C.textMuted },
  statUnit:  { fontSize: F.md, fontWeight: '600', color: C.textSecondary },
  statLabel: {
    fontSize: F.xs, fontWeight: '700', color: C.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
});