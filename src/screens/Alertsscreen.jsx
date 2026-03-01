import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Platform,
} from 'react-native';

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
  warningDim:   'rgba(255,179,0,0.12)',
  danger:       '#FF1744',
  dangerDim:    'rgba(255,23,68,0.12)',
  white:        '#FFFFFF',
  textPrimary:  '#FFFFFF',
  textSecondary:'#8A8A9A',
  textMuted:    '#4A4A5A',
  border:       '#1E1E2E',
  borderAccent: 'rgba(0,229,255,0.25)',
};
const F = { xs: 11, sm: 12, md: 14, lg: 16, xl: 20, xxl: 38 };
const S = { xs: 4, sm: 6, md: 10, lg: 16, xl: 20, xxl: 28 };

// ─── Données de démonstration ─────────────────────────────
const DEMO_ALERTS = [
  {
    id: 1, type: 'danger', icon: '🚨',
    title: 'Chute détectée',
    desc: 'Angle d\'inclinaison > 45° détecté',
    time: 'Il y a 2 min', value: '67°', resolved: false,
  },
  {
    id: 2, type: 'warning', icon: '🔋',
    title: 'Batterie faible',
    desc: 'Niveau batterie critique',
    time: 'Il y a 15 min', value: '12%', resolved: false,
  },
  {
    id: 3, type: 'warning', icon: '🔵',
    title: 'Pression pneu basse',
    desc: 'Pression avant en dessous du seuil',
    time: 'Il y a 1h', value: '1.5 bar', resolved: false,
  },
  {
    id: 4, type: 'danger', icon: '📍',
    title: 'Sortie de zone',
    desc: 'Le scooter a quitté la zone autorisée',
    time: 'Il y a 3h', value: '+850m', resolved: true,
  },
  {
    id: 5, type: 'success', icon: '✅',
    title: 'Système nominal',
    desc: 'Tous les capteurs fonctionnent normalement',
    time: 'Il y a 5h', value: 'OK', resolved: true,
  },
];

const SECURITY_ITEMS = [
  { id: 1, icon: '🔒', label: 'Alarme antivol',      active: true },
  { id: 2, icon: '📡', label: 'Géofence active',      active: true },
  { id: 3, icon: '📍', label: 'Suivi GPS temps réel', active: false },
  { id: 4, icon: '🔔', label: 'Notifications push',   active: true },
];

// ─── Components ───────────────────────────────────────────

function AlertBadge({ count, color }) {
  if (!count) return null;
  return (
    <View style={[styles.alertBadge, { backgroundColor: color }]}>
      <Text style={styles.alertBadgeText}>{count}</Text>
    </View>
  );
}

function AlertCard({ item, onResolve }) {
  const colors = {
    danger:  { bg: C.dangerDim,  border: C.danger,  text: C.danger },
    warning: { bg: C.warningDim, border: C.warning, text: C.warning },
    success: { bg: C.successDim, border: C.success, text: C.success },
  };
  const col = colors[item.type];

  return (
    <View style={[styles.alertCard, { borderLeftColor: col.border, backgroundColor: item.resolved ? C.bgCard : col.bg }]}>
      <View style={styles.alertCardLeft}>
        <Text style={styles.alertCardIcon}>{item.icon}</Text>
        <View style={styles.alertCardBody}>
          <View style={styles.alertCardTitleRow}>
            <Text style={styles.alertCardTitle}>{item.title}</Text>
            {item.resolved && (
              <View style={styles.resolvedBadge}>
                <Text style={styles.resolvedBadgeText}>Résolu</Text>
              </View>
            )}
          </View>
          <Text style={styles.alertCardDesc}>{item.desc}</Text>
          <Text style={styles.alertCardTime}>{item.time}</Text>
        </View>
      </View>
      <View style={styles.alertCardRight}>
        <Text style={[styles.alertCardValue, { color: col.text }]}>{item.value}</Text>
        {!item.resolved && (
          <TouchableOpacity style={styles.resolveBtn} onPress={() => onResolve(item.id)}>
            <Text style={styles.resolveBtnText}>✓</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function SecurityToggle({ item, onToggle }) {
  return (
    <TouchableOpacity
      style={[styles.secCard, item.active && styles.secCardOn]}
      onPress={() => onToggle(item.id)}
      activeOpacity={0.75}
    >
      <Text style={styles.secIcon}>{item.icon}</Text>
      <Text style={styles.secLabel}>{item.label}</Text>
      <View style={[styles.toggle, item.active && styles.toggleOn]}>
        <View style={[styles.thumb, item.active && styles.thumbOn]} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────
export default function AlertsScreen() {
  const [alerts, setAlerts]   = useState(DEMO_ALERTS);
  const [security, setSecurity] = useState(SECURITY_ITEMS);
  const [filter, setFilter]   = useState('all'); // all | active | resolved

  const activeAlerts = alerts.filter(a => !a.resolved);
  const dangerCount  = activeAlerts.filter(a => a.type === 'danger').length;
  const warnCount    = activeAlerts.filter(a => a.type === 'warning').length;

  const filtered = alerts.filter(a => {
    if (filter === 'active')   return !a.resolved;
    if (filter === 'resolved') return a.resolved;
    return true;
  });

  const onResolve = (id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a));
  };

  const onToggleSecurity = (id) => {
    setSecurity(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Alertes</Text>
          <Text style={styles.pageSubtitle}>Sécurité & Surveillance</Text>
        </View>

        {/* ── Summary ── */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderColor: C.danger }]}>
            <Text style={[styles.summaryNum, { color: C.danger }]}>{dangerCount}</Text>
            <Text style={styles.summaryLabel}>Critiques</Text>
          </View>
          <View style={[styles.summaryCard, { borderColor: C.warning }]}>
            <Text style={[styles.summaryNum, { color: C.warning }]}>{warnCount}</Text>
            <Text style={styles.summaryLabel}>Avertissements</Text>
          </View>
          <View style={[styles.summaryCard, { borderColor: C.success }]}>
            <Text style={[styles.summaryNum, { color: C.success }]}>
              {alerts.filter(a => a.resolved).length}
            </Text>
            <Text style={styles.summaryLabel}>Résolus</Text>
          </View>
        </View>

        {/* ── Security Controls ── */}
        <Text style={styles.sectionTitle}>Sécurité</Text>
        <View style={styles.secGrid}>
          {security.map(item => (
            <SecurityToggle key={item.id} item={item} onToggle={onToggleSecurity} />
          ))}
        </View>

        {/* ── Alerts List ── */}
        <View style={styles.filterRow}>
          <Text style={styles.sectionTitle}>Historique</Text>
          <View style={styles.filters}>
            {['all','active','resolved'].map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.filterBtn, filter === f && styles.filterBtnOn]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterText, filter === f && styles.filterTextOn]}>
                  {f === 'all' ? 'Tout' : f === 'active' ? 'Actives' : 'Résolus'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {filtered.map(item => (
          <AlertCard key={item.id} item={item} onResolve={onResolve} />
        ))}

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

  // Summary
  summaryRow: { flexDirection: 'row', gap: S.md, marginBottom: S.xl },
  summaryCard: {
    flex: 1, backgroundColor: C.bgCard, borderRadius: 16,
    padding: S.lg, alignItems: 'center', borderWidth: 1.5,
  },
  summaryNum:   { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  summaryLabel: { fontSize: F.xs, fontWeight: '700', color: C.textMuted, marginTop: 2, textTransform: 'uppercase' },

  sectionTitle: {
    fontSize: F.lg, fontWeight: '800', color: C.white,
    marginBottom: S.md, letterSpacing: -0.3,
  },

  // Security grid
  secGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md, marginBottom: S.xl },
  secCard: {
    width: '47.5%', backgroundColor: C.bgCard, borderRadius: 16,
    padding: S.lg, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', gap: S.sm,
  },
  secCardOn:  { backgroundColor: '#13131A', borderColor: C.borderAccent },
  secIcon:    { fontSize: 24 },
  secLabel:   { fontSize: F.sm, fontWeight: '700', color: C.white, textAlign: 'center' },
  toggle: {
    width: 46, height: 26, borderRadius: 13, backgroundColor: C.bgElevated,
    padding: 3, justifyContent: 'center',
  },
  toggleOn: { backgroundColor: C.accent },
  thumb:    { width: 20, height: 20, borderRadius: 10, backgroundColor: C.textMuted },
  thumbOn:  { backgroundColor: C.bg, alignSelf: 'flex-end' },

  // Filters
  filterRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: S.md },
  filters:    { flexDirection: 'row', gap: S.sm },
  filterBtn: {
    paddingHorizontal: S.md, paddingVertical: S.sm,
    borderRadius: 12, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border,
  },
  filterBtnOn:  { backgroundColor: C.accentGlow, borderColor: C.borderAccent },
  filterText:   { fontSize: F.xs, fontWeight: '700', color: C.textMuted },
  filterTextOn: { color: C.accent },

  // Alert card
  alertCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: C.bgCard, borderRadius: 16, padding: S.lg,
    borderWidth: 1, borderColor: C.border,
    borderLeftWidth: 4, marginBottom: S.md,
  },
  alertCardLeft:     { flexDirection: 'row', alignItems: 'flex-start', flex: 1, gap: S.md },
  alertCardIcon:     { fontSize: 22, marginTop: 2 },
  alertCardBody:     { flex: 1 },
  alertCardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginBottom: 3 },
  alertCardTitle:    { fontSize: F.md, fontWeight: '800', color: C.white },
  alertCardDesc:     { fontSize: F.sm, color: C.textSecondary, marginBottom: 4 },
  alertCardTime:     { fontSize: F.xs, color: C.textMuted },
  alertCardRight:    { alignItems: 'flex-end', gap: S.sm },
  alertCardValue:    { fontSize: F.md, fontWeight: '900' },
  resolvedBadge: {
    backgroundColor: C.successDim, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: C.success,
  },
  resolvedBadgeText: { fontSize: F.xs, fontWeight: '700', color: C.success },
  resolveBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.successDim, borderWidth: 1, borderColor: C.success,
    justifyContent: 'center', alignItems: 'center',
  },
  resolveBtnText: { fontSize: F.md, color: C.success, fontWeight: '900' },

  alertBadge: {
    width: 18, height: 18, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
  },
  alertBadgeText: { fontSize: 10, fontWeight: '900', color: C.bg },
});