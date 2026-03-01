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
  purple:       '#7C4DFF',
  purpleDim:    'rgba(124,77,255,0.15)',
  white:        '#FFFFFF',
  textSecondary:'#8A8A9A',
  textMuted:    '#4A4A5A',
  border:       '#1E1E2E',
  borderAccent: 'rgba(0,229,255,0.25)',
};
const F = { xs: 11, sm: 12, md: 14, lg: 16, xl: 20 };
const S = { xs: 4, sm: 6, md: 10, lg: 16, xl: 20, xxl: 28 };

// ─── Données IA (démo) ────────────────────────────────────
const AI_PREDICTIONS = [
  {
    id: 1,
    icon: '🔋',
    title: 'Santé batterie',
    model: 'LSTM',
    score: 78,
    status: 'warning',
    statusLabel: 'Dégradation modérée',
    desc: 'La batterie montre des signes de vieillissement. Remplacement recommandé dans 3-4 mois.',
    confidence: 92,
    details: [
      { label: 'Capacité restante', value: '78%' },
      { label: 'Cycles effectués',  value: '312' },
      { label: 'Durée de vie est.', value: '~4 mois' },
    ],
  },
  {
    id: 2,
    icon: '🔵',
    title: 'Risque crevaison',
    model: 'Random Forest',
    score: 15,
    status: 'success',
    statusLabel: 'Risque faible',
    desc: 'Pression et état des pneus dans les normes. Aucune intervention requise.',
    confidence: 88,
    details: [
      { label: 'Pression avant',   value: '2.2 bar' },
      { label: 'Pression arrière', value: '2.4 bar' },
      { label: 'Prochain contrôle', value: '15 jours' },
    ],
  },
  {
    id: 3,
    icon: '🚗',
    title: 'Conduite anormale',
    model: 'Isolation Forest',
    score: 35,
    status: 'warning',
    statusLabel: 'Comportement inhabituel',
    desc: 'Accélérations brusques fréquentes détectées. Peut réduire la durée de vie de la batterie.',
    confidence: 74,
    details: [
      { label: 'Freinages brusques', value: '8 / heure' },
      { label: 'Vitesse max',        value: '47 km/h' },
      { label: 'Score conduite',     value: '6.5/10' },
    ],
  },
  {
    id: 4,
    icon: '🔓',
    title: 'Tentative de vol',
    model: 'SVM',
    score: 5,
    status: 'success',
    statusLabel: 'Aucune menace',
    desc: 'Aucune activité suspecte détectée. Scooter sécurisé.',
    confidence: 97,
    details: [
      { label: 'Distance batterie', value: '0.3 m' },
      { label: 'Mouvement suspect', value: 'Aucun' },
      { label: 'Dernier scan',      value: 'Il y a 30s' },
    ],
  },
];

// ─── Components ───────────────────────────────────────────

function RiskBar({ score, status }) {
  const color = status === 'success' ? C.success : status === 'warning' ? C.warning : C.danger;
  return (
    <View style={styles.riskBarWrap}>
      <View style={styles.riskBarTrack}>
        <View style={[styles.riskBarFill, { width: `${score}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.riskScore, { color }]}>{score}%</Text>
    </View>
  );
}

function PredictionCard({ item }) {
  const [expanded, setExpanded] = useState(false);
  const colors = {
    success: { bg: C.successDim, border: C.success, text: C.success },
    warning: { bg: C.warningDim, border: C.warning, text: C.warning },
    danger:  { bg: C.dangerDim,  border: C.danger,  text: C.danger },
  };
  const col = colors[item.status];

  return (
    <TouchableOpacity
      style={styles.predCard}
      onPress={() => setExpanded(v => !v)}
      activeOpacity={0.8}
    >
      {/* Header */}
      <View style={styles.predHeader}>
        <View style={styles.predHeaderLeft}>
          <Text style={styles.predIcon}>{item.icon}</Text>
          <View>
            <Text style={styles.predTitle}>{item.title}</Text>
            <View style={styles.modelBadge}>
              <Text style={styles.modelBadgeText}>🧠 {item.model}</Text>
            </View>
          </View>
        </View>
        <View style={[styles.statusPill, { backgroundColor: col.bg, borderColor: col.border }]}>
          <Text style={[styles.statusPillText, { color: col.text }]}>{item.statusLabel}</Text>
        </View>
      </View>

      {/* Risk bar */}
      <RiskBar score={item.score} status={item.status} />

      {/* Description */}
      <Text style={styles.predDesc}>{item.desc}</Text>

      {/* Confidence */}
      <View style={styles.confidenceRow}>
        <Text style={styles.confidenceLabel}>Confiance du modèle</Text>
        <Text style={styles.confidenceValue}>{item.confidence}%</Text>
      </View>

      {/* Details (expanded) */}
      {expanded && (
        <View style={styles.details}>
          <View style={styles.detailsDivider} />
          {item.details.map((d, i) => (
            <View key={i} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{d.label}</Text>
              <Text style={styles.detailValue}>{d.value}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.expandHint}>{expanded ? '▲ Réduire' : '▼ Voir détails'}</Text>
    </TouchableOpacity>
  );
}

function GlobalScore({ predictions }) {
  const avg = Math.round(
    predictions.reduce((sum, p) => sum + (p.status === 'success' ? 100 - p.score : 100 - p.score), 0) / predictions.length
  );
  const color = avg > 70 ? C.success : avg > 40 ? C.warning : C.danger;

  return (
    <View style={styles.globalCard}>
      <View style={styles.globalLeft}>
        <Text style={styles.globalLabel}>Score global scooter</Text>
        <Text style={[styles.globalScore, { color }]}>{avg}<Text style={styles.globalUnit}>/100</Text></Text>
        <Text style={styles.globalDesc}>Basé sur 4 modèles IA actifs</Text>
      </View>
      <View style={[styles.globalRing, { borderColor: color }]}>
        <Text style={{ fontSize: 32 }}>🧠</Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────
export default function PredictionScreen() {
  const [lastRefresh] = useState('Il y a 2 min');

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Prédictions IA</Text>
          <Text style={styles.pageSubtitle}>Analyse prédictive en temps réel</Text>
        </View>

        {/* ── Global Score ── */}
        <GlobalScore predictions={AI_PREDICTIONS} />

        {/* ── Refresh info ── */}
        <View style={styles.refreshRow}>
          <View style={styles.dot} />
          <Text style={styles.refreshText}>Modèles mis à jour {lastRefresh}</Text>
        </View>

        {/* ── Predictions ── */}
        <Text style={styles.sectionTitle}>Analyse détaillée</Text>
        {AI_PREDICTIONS.map(item => (
          <PredictionCard key={item.id} item={item} />
        ))}

        {/* ── Info footer ── */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 Les prédictions sont générées par des modèles entraînés sur l'historique de votre scooter. Appuyez sur une carte pour voir les détails.
          </Text>
        </View>

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

  // Global score card
  globalCard: {
    backgroundColor: C.bgCard, borderRadius: 20, padding: S.xl,
    borderWidth: 1, borderColor: C.border, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center', marginBottom: S.md,
  },
  globalLeft:  { flex: 1 },
  globalLabel: { fontSize: F.sm, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  globalScore: { fontSize: 48, fontWeight: '900', letterSpacing: -2 },
  globalUnit:  { fontSize: F.xl, fontWeight: '700', color: C.textSecondary },
  globalDesc:  { fontSize: F.sm, color: C.textMuted, marginTop: 4 },
  globalRing: {
    width: 80, height: 80, borderRadius: 40, borderWidth: 3,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: C.bgElevated,
  },

  // Refresh
  refreshRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: S.xl,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.success },
  refreshText: { fontSize: F.sm, color: C.textMuted, fontWeight: '600' },

  sectionTitle: {
    fontSize: F.lg, fontWeight: '800', color: C.white,
    marginBottom: S.md, letterSpacing: -0.3,
  },

  // Prediction card
  predCard: {
    backgroundColor: C.bgCard, borderRadius: 20, padding: S.xl,
    borderWidth: 1, borderColor: C.border, marginBottom: S.md,
  },
  predHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: S.md,
  },
  predHeaderLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: S.md },
  predIcon:  { fontSize: 28 },
  predTitle: { fontSize: F.lg, fontWeight: '800', color: C.white, marginBottom: 4 },
  modelBadge: {
    backgroundColor: C.purpleDim, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  modelBadgeText: { fontSize: F.xs, fontWeight: '700', color: C.purple },
  statusPill: {
    paddingHorizontal: S.md, paddingVertical: S.sm,
    borderRadius: 12, borderWidth: 1, alignSelf: 'flex-start',
  },
  statusPillText: { fontSize: F.xs, fontWeight: '700' },

  // Risk bar
  riskBarWrap: { flexDirection: 'row', alignItems: 'center', gap: S.md, marginBottom: S.md },
  riskBarTrack: {
    flex: 1, height: 8, borderRadius: 4, backgroundColor: C.bgElevated, overflow: 'hidden',
  },
  riskBarFill: { height: '100%', borderRadius: 4 },
  riskScore:   { fontSize: F.md, fontWeight: '900', width: 40, textAlign: 'right' },

  predDesc: { fontSize: F.md, color: C.textSecondary, lineHeight: 20, marginBottom: S.md },

  confidenceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  confidenceLabel: { fontSize: F.sm, color: C.textMuted, fontWeight: '600' },
  confidenceValue: { fontSize: F.sm, fontWeight: '900', color: C.accent },

  // Expanded details
  details:       { marginTop: S.md },
  detailsDivider: { height: 1, backgroundColor: C.border, marginBottom: S.md },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: S.sm,
  },
  detailLabel: { fontSize: F.md, color: C.textSecondary },
  detailValue: { fontSize: F.md, fontWeight: '800', color: C.white },

  expandHint: {
    fontSize: F.xs, color: C.textMuted, fontWeight: '700',
    textAlign: 'center', marginTop: S.md,
  },

  // Info box
  infoBox: {
    backgroundColor: C.accentGlow, borderRadius: 14, padding: S.lg,
    borderWidth: 1, borderColor: C.borderAccent, marginTop: S.sm,
  },
  infoText: { fontSize: F.sm, color: C.textSecondary, lineHeight: 18 },
});