import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Platform,
} from 'react-native';

// ─── Constantes ───────────────────────────────────────────
const C = {
  bg:           '#0A0A0F',
  bgCard:       '#13131A',
  bgElevated:   '#1E1E2E',
  accent:       '#00E5FF',
  success:      '#00E676',
  successDim:   'rgba(0,230,118,0.12)',
  warning:      '#FFB300',
  warningDim:   'rgba(255,179,0,0.12)',
  danger:       '#FF1744',
  dangerDim:    'rgba(255,23,68,0.12)',
  white:        '#FFFFFF',
  textSecondary:'#8A8A9A',
  textMuted:    '#4A4A5A',
  border:       '#1E1E2E',
};

const STATUS = {
  online:   { color: C.success,   bg: C.successDim,  label: 'En ligne'   },
  offline:  { color: C.textMuted, bg: 'transparent', label: 'Hors ligne' },
  charging: { color: C.warning,   bg: C.warningDim,  label: 'En charge'  },
};

function battColor(v) {
  if (v == null) return C.textMuted;
  if (v > 50)   return C.success;
  if (v > 20)   return C.warning;
  return C.danger;
}

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return `il y a ${diff}s`;
  if (diff < 3600)  return `il y a ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  return `il y a ${Math.floor(diff / 86400)}j`;
}

// ─── Barre batterie ───────────────────────────────────────
function BatteryBar({ value }) {
  const color = battColor(value);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <View style={{
        width: 52, height: 12, borderRadius: 3,
        borderWidth: 1.5, borderColor: color + '88',
        backgroundColor: C.bgElevated, overflow: 'hidden', padding: 2,
      }}>
        <View style={{
          width: value != null ? `${value}%` : '0%',
          height: '100%', borderRadius: 1.5, backgroundColor: color,
        }} />
      </View>
      <View style={{ width: 3, height: 6, borderRadius: 1, backgroundColor: color + '99' }} />
    </View>
  );
}

// ─── Card stat ────────────────────────────────────────────
function StatCard({ icon, label, value, unit, color }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color: color ?? C.white }]}>
        {value ?? '—'}
        {value != null && unit
          ? <Text style={styles.statUnit}> {unit}</Text>
          : null}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Toggle ───────────────────────────────────────────────
function ToggleCard({ icon, label, status, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.toggleCard, active && styles.toggleCardOn]}
      onPress={onPress} activeOpacity={0.75}
    >
      <Text style={styles.toggleIcon}>{icon}</Text>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Text style={[styles.toggleStatus, active && { color: C.accent }]}>{status}</Text>
      <View style={[styles.track, active && styles.trackOn]}>
        <View style={[styles.thumb, active && styles.thumbOn]} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Map ─────────────────────────────────────────────────
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
            <View style={styles.pinCore}>
              <Text style={{ fontSize: 18 }}>🛵</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.offlineText}>Hors ligne — GPS non disponible</Text>
        )}
        {address ? (
          <View style={styles.locationChip}>
            <Text style={styles.chipText}>📍 {address}</Text>
          </View>
        ) : null}
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

// ─── Screen principal ─────────────────────────────────────
export default function DashboardScreen({ route, navigation }) {
  const scooter = route.params?.scooter;

  // ── État telemetry — colonnes exactes de ta table Supabase ──
  const [tel, setTel] = useState({
    battery:     scooter?.battery     ?? null,   // int4
    charging:    scooter?.charging    ?? false,  // bool
    speed:       scooter?.speed       ?? null,   // float8
    range:       scooter?.range       ?? null,   // float8
    temp:        scooter?.temp        ?? null,   // float8
    latitude:    scooter?.latitude    ?? null,   // float8
    longitude:   scooter?.longitude   ?? null,   // float8
    address:     scooter?.address     ?? null,   // text
    alarm:       scooter?.alarm       ?? false,  // bool
    starter:     scooter?.starter     ?? false,  // bool
    status:      scooter?.status      ?? 'offline', // text
    recorded_at: scooter?.recorded_at ?? scooter?.last_update ?? null, // timestamp
  });

  // ── Chargement initial + listener temps réel ─────────────
  useEffect(() => {
    if (!scooter?.id) return;

    // 1. Charger la dernière ligne telemetry pour ce scooter
    supabase
      .from('telemetry')
      .select('battery, charging, speed, range, temp, latitude, longitude, address, alarm, starter, status, recorded_at')
      .eq('scooter_id', scooter.id)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data, error }) => {
        if (data && !error) setTel(prev => ({ ...prev, ...data }));
      });

    // 2. Écouter les nouveaux INSERTs en temps réel
    const channel = supabase
      .channel(`dashboard-${scooter.id}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'telemetry',
          filter: `scooter_id=eq.${scooter.id}`,
        },
        ({ new: d }) => {
          setTel(prev => ({
            battery:     d.battery     ?? prev.battery,
            charging:    d.charging    ?? prev.charging,
            speed:       d.speed       ?? prev.speed,
            range:       d.range       ?? prev.range,
            temp:        d.temp        ?? prev.temp,
            latitude:    d.latitude    ?? prev.latitude,
            longitude:   d.longitude   ?? prev.longitude,
            address:     d.address     ?? prev.address,
            alarm:       d.alarm       ?? prev.alarm,
            starter:     d.starter     ?? prev.starter,
            status:      d.status      ?? prev.status,
            recorded_at: d.recorded_at ?? prev.recorded_at,
          }));
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [scooter?.id]);

  // ── Guard ────────────────────────────────────────────────
  if (!scooter) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
        <Text style={{ color: C.white, fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Données indisponibles</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}
          style={{ backgroundColor: C.bgElevated, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8 }}>
          <Text style={{ color: C.accent, fontWeight: '700' }}>← Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sc = STATUS[tel.status] ?? STATUS.offline;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Retour ── */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>

        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={styles.heroLeft}>
            <View style={[styles.statusBadge, { borderColor: sc.color + '44', backgroundColor: sc.bg }]}>
              <View style={[styles.dot, { backgroundColor: sc.color }]} />
              <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
            </View>
            <Text style={styles.heroName}>{scooter.name ?? 'Scooter'}</Text>
            <Text style={styles.heroModel}>{scooter.model ?? ''}</Text>
            {scooter.reference
              ? <Text style={{ fontSize: 10, color: C.accent, marginTop: 2 }}>#{scooter.reference}</Text>
              : null}
          </View>
          <Text style={styles.heroEmoji}>🛵</Text>
        </View>

        {/* ── Batterie hero ── */}
        <View style={styles.battHero}>
          <BatteryBar value={tel.battery} />
          <Text style={[styles.battHeroValue, { color: battColor(tel.battery) }]}>
            {tel.battery != null ? `${tel.battery}%` : '—'}
          </Text>
          {tel.charging && (
            <View style={styles.chargeBadge}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: C.warning }}>⚡ En charge</Text>
            </View>
          )}
          <Text style={styles.battHeroLabel}>Batterie</Text>
        </View>

        {/* ── Stats en direct ── */}
        <Text style={styles.sectionTitle}>Stats en direct</Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon="⚡"
            label="VITESSE"
            value={tel.speed != null ? tel.speed.toFixed(1) : null}
            unit="km/h"
            color={C.accent}
          />
          <StatCard
            icon="🛣️"
            label="AUTONOMIE"
            value={tel.range != null ? tel.range.toFixed(0) : null}
            unit="km"
            color={C.success}
          />
          <StatCard
            icon="🌡️"
            label="TEMP"
            value={tel.temp != null ? tel.temp.toFixed(1) : null}
            unit="°C"
            color={tel.temp != null && tel.temp > 60 ? C.danger : C.white}
          />
        </View>

        {/* ── Localisation ── */}
        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Localisation</Text>
        <MapCard
          address={tel.address}
          lastUpdate={timeAgo(tel.recorded_at)}
          connected={tel.status !== 'offline'}
        />

        {/* ── Contrôles ── */}
        <Text style={styles.sectionTitle}>Contrôles</Text>
        <View style={styles.row}>
          <ToggleCard
            icon="🔒"
            label="Alarme"
            status={tel.alarm ? 'Armée' : 'Désarmée'}
            active={tel.alarm}
            onPress={() => setTel(prev => ({ ...prev, alarm: !prev.alarm }))}
          />
          <ToggleCard
            icon="⚡"
            label="Démarrage"
            status={tel.starter ? 'Actif' : 'Inactif'}
            active={tel.starter}
            onPress={() => setTel(prev => ({ ...prev, starter: !prev.starter }))}
          />
        </View>

        {/* ── Dernière MAJ ── */}
        {tel.recorded_at ? (
          <Text style={{ fontSize: 10, color: C.textMuted, textAlign: 'center', marginTop: 4 }}>
            Dernière télémétrie {timeAgo(tel.recorded_at)}
          </Text>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40 },

  backBtn:  { alignSelf: 'flex-start', backgroundColor: C.bgElevated, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: C.border, marginBottom: 20 },
  backText: { fontSize: 12, fontWeight: '700', color: C.textSecondary },

  hero:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  heroLeft:  { flex: 1 },
  heroName:  { fontSize: 28, fontWeight: '900', color: C.white, letterSpacing: -1, marginTop: 8 },
  heroModel: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  heroEmoji: { fontSize: 48 },

  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  dot:         { width: 7, height: 7, borderRadius: 4 },
  statusText:  { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  battHero:      { backgroundColor: C.bgCard, borderRadius: 18, padding: 20, alignItems: 'center', gap: 8, marginBottom: 24, borderWidth: 1, borderColor: C.border },
  battHeroValue: { fontSize: 52, fontWeight: '900', letterSpacing: -2 },
  battHeroLabel: { fontSize: 9, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5 },
  chargeBadge:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: C.warningDim, borderWidth: 1, borderColor: C.warning + '55' },

  sectionTitle: { fontSize: 11, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, marginTop: 4 },

  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard:  { flex: 1, backgroundColor: C.bgCard, borderRadius: 16, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: C.border },
  statIcon:  { fontSize: 20 },
  statValue: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  statUnit:  { fontSize: 10, fontWeight: '600', color: C.textSecondary },
  statLabel: { fontSize: 7, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1 },

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
});