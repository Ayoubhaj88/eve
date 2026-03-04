import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Platform,
} from 'react-native';
import { C, STATUS, battColor } from '../constants';

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
      <Text style={[styles.statValue, value == null && styles.statEmpty]}>
        {value ?? '—'}
        {value != null && <Text style={styles.statUnit}> {unit}</Text>}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ToggleCard({ icon, label, status, active, onPress }) {
  return (
    <TouchableOpacity style={[styles.toggleCard, active && styles.toggleCardOn]} onPress={onPress} activeOpacity={0.75}>
      <Text style={styles.toggleIcon}>{icon}</Text>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Text style={[styles.toggleStatus, active && { color: C.accent }]}>{status}</Text>
      <View style={[styles.track, active && styles.trackOn]}>
        <View style={[styles.thumb, active && styles.thumbOn]} />
      </View>
    </TouchableOpacity>
  );
}

function MapCard({ address, lastUpdate, connected }) {
  return (
    <View style={styles.mapCard}>
      <View style={styles.mapArea}>
        {[0,1,2,3,4,5].map(i => (
          <View key={`v${i}`} style={[styles.gridLine, styles.gridV, { left: `${i * 20}%` }]} />
        ))}
        {[0,1,2,3,4].map(i => (
          <View key={`h${i}`} style={[styles.gridLine, styles.gridH, { top: `${i * 25}%` }]} />
        ))}
        {connected ? (
          <View style={styles.pin}>
            <View style={styles.pinPulse} />
            <View style={styles.pinRing} />
            <View style={styles.pinCore}><Text style={{ fontSize: 18 }}>🛵</Text></View>
          </View>
        ) : (
          <Text style={styles.offlineText}>Hors ligne — GPS non disponible</Text>
        )}
        {address && (
          <View style={styles.locationChip}>
            <Text style={styles.chipText}>📍 {address}</Text>
          </View>
        )}
      </View>
      <View style={styles.mapFooter}>
        <View style={[styles.dot, { backgroundColor: connected ? C.success : C.textMuted }]} />
        <Text style={styles.mapFooterText}>
          {lastUpdate ? `Mis à jour ${lastUpdate}` : 'En attente du GPS…'}
        </Text>
        {connected && (
          <TouchableOpacity style={styles.mapBtn}>
            <Text style={styles.mapBtnText}>Voir carte →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────
export default function DashboardScreen({ route, navigation }) {
  const s = route.params?.scooter;
  const [alarm,   setAlarm]   = useState(s?.alarm   ?? false);
  const [starter, setStarter] = useState(s?.starter ?? false);

  if (!s) return null;

  const sc = STATUS[s.status];

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Back */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroLeft}>
            <View style={[styles.statusBadge, { borderColor: sc.color + '44', backgroundColor: sc.bg }]}>
              <View style={[styles.dot, { backgroundColor: sc.color }]} />
              <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
            </View>
            <Text style={styles.heroName}>{s.name}</Text>
            <Text style={styles.heroModel}>{s.model}</Text>
          </View>
          <Text style={styles.heroEmoji}>🛵</Text>
        </View>

        {/* Hero stats */}
        <View style={styles.heroStats}>
          {[
            { label: 'Batterie',  value: s.battery != null ? `${s.battery}%` : '—', color: battColor(s.battery) },
            { label: 'Trajets',   value: `${s.trips}`,                               color: C.white },
            { label: 'Total km',  value: `${(s.totalKm/1000).toFixed(1)}k`,          color: C.white },
          ].map(({ label, value, color }) => (
            <View key={label} style={styles.heroStat}>
              <Text style={[styles.heroStatValue, { color }]}>{value}</Text>
              <Text style={styles.heroStatLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Map */}
        <Text style={styles.sectionTitle}>Localisation</Text>
        <MapCard
          address={s.gps.address}
          lastUpdate={s.gps.lastUpdate}
          connected={s.status !== 'offline'}
        />

        {/* Controls */}
        <Text style={styles.sectionTitle}>Contrôles</Text>
        <View style={styles.row}>
          <ToggleCard icon="🔒" label="Alarme"    status={alarm   ? 'Armée'  : 'Désarmée'} active={alarm}   onPress={() => setAlarm(v => !v)} />
          <ToggleCard icon="⚡" label="Démarrage" status={starter ? 'Actif'  : 'Inactif'}  active={starter} onPress={() => setStarter(v => !v)} />
        </View>

        {/* Stats — sans Vitesse */}
        <Text style={styles.sectionTitle}>Stats en direct</Text>
        <View style={styles.statsGrid}>
          <StatCard icon="🔋" value={s.battery} unit="%" label="BATTERIE"
            badge={s.charging ? '⚡ Charge' : null} badgeColor={C.success} />
          <StatCard icon="🌡️" value={s.temp}    unit="°C"  label="TEMPÉRATURE" />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40 },

  backBtn: {
    alignSelf: 'flex-start', backgroundColor: C.bgElevated,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: C.border, marginBottom: 20,
  },
  backText: { fontSize: 12, fontWeight: '700', color: C.textSecondary },

  hero:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  heroLeft:  { flex: 1 },
  heroName:  { fontSize: 28, fontWeight: '900', color: C.white, letterSpacing: -1, marginTop: 8 },
  heroModel: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  heroEmoji: { fontSize: 48 },

  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  dot:         { width: 7, height: 7, borderRadius: 4 },
  statusText:  { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  heroStats:      { flexDirection: 'row', gap: 8, marginBottom: 28 },
  heroStat:       { flex: 1, backgroundColor: C.bgElevated, borderRadius: 14, padding: 12, alignItems: 'center' },
  heroStatValue:  { fontSize: 16, fontWeight: '800', color: C.white, letterSpacing: -0.5 },
  heroStatLabel:  { fontSize: 8, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: 3 },

  sectionTitle: { fontSize: 11, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, marginTop: 4 },

  mapCard:      { backgroundColor: C.bgCard, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: C.border, marginBottom: 20 },
  mapArea:      { height: 180, backgroundColor: '#13131A', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  gridLine:     { position: 'absolute', backgroundColor: '#1E1E2E' },
  gridV:        { width: 1, height: '100%' },
  gridH:        { width: '100%', height: 1 },
  offlineText:  { fontSize: 11, color: C.textMuted, textAlign: 'center' },
  pin:          { alignItems: 'center', justifyContent: 'center' },
  pinPulse:     { position: 'absolute', width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(0,229,255,0.05)', borderWidth: 1, borderColor: 'rgba(0,229,255,0.1)' },
  pinRing:      { position: 'absolute', width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,229,255,0.08)', borderWidth: 1.5, borderColor: 'rgba(0,229,255,0.25)' },
  pinCore:      { width: 40, height: 40, borderRadius: 20, backgroundColor: C.bgCard, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: C.accent },
  locationChip: { position: 'absolute', bottom: 10, left: 10, backgroundColor: C.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 },
  chipText:     { fontSize: 10, fontWeight: '700', color: C.bg },
  mapFooter:    { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 8 },
  mapFooterText:{ flex: 1, fontSize: 12, color: C.textSecondary },
  mapBtn:       { backgroundColor: C.bgElevated, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  mapBtnText:   { fontSize: 10, fontWeight: '700', color: C.accent },

  row:          { flexDirection: 'row', gap: 10, marginBottom: 20 },
  toggleCard:   { flex: 1, backgroundColor: C.bgCard, borderRadius: 18, padding: 16, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.border },
  toggleCardOn: { backgroundColor: '#1A1A26', borderColor: 'rgba(0,229,255,0.25)' },
  toggleIcon:   { fontSize: 24 },
  toggleLabel:  { fontSize: 11, fontWeight: '800', color: C.white },
  toggleStatus: { fontSize: 10, color: C.textMuted },
  track:        { width: 42, height: 24, borderRadius: 12, backgroundColor: C.bgElevated, padding: 3, justifyContent: 'center', marginTop: 4 },
  trackOn:      { backgroundColor: C.accent },
  thumb:        { width: 18, height: 18, borderRadius: 9, backgroundColor: C.textMuted },
  thumbOn:      { backgroundColor: C.bg, alignSelf: 'flex-end' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard:  { width: '47.5%', backgroundColor: C.bgCard, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border, minHeight: 110, justifyContent: 'space-between' },
  statTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statIcon:  { fontSize: 20 },
  badge:     { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  badgeText: { fontSize: 9, fontWeight: '700' },
  statValue: { fontSize: 32, fontWeight: '900', color: C.white, letterSpacing: -1.5 },
  statEmpty: { color: C.textMuted, fontSize: 24 },
  statUnit:  { fontSize: 12, fontWeight: '600', color: C.textSecondary },
  statLabel: { fontSize: 8, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5 },
});