import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, StatusBar, Platform,
} from 'react-native';
import { C, STATUS, SCOOTERS, battColor } from '../constants';

function ScooterCard({ item, onPress }) {
  const sc = STATUS[item.status];
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* Top row */}
      <View style={styles.cardTop}>
        <View>
          <Text style={styles.cardName}>{item.name}</Text>
          <Text style={styles.cardModel}>{item.model}</Text>
        </View>
        <View style={[styles.badge, { borderColor: sc.color + '44', backgroundColor: sc.bg }]}>
          <View style={[styles.dot, { backgroundColor: sc.color }]} />
          <Text style={[styles.badgeText, { color: sc.color }]}>{sc.label}</Text>
        </View>
      </View>

      {/* Metrics */}
      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: battColor(item.battery) }]}>
            {item.battery != null ? `${item.battery}%` : '—'}
          </Text>
          <Text style={styles.metricLabel}>Batterie</Text>
          {/* Battery bar */}
          <View style={styles.battWrap}>
            <View style={[styles.battBar, {
              width: `${item.battery ?? 0}%`,
              backgroundColor: battColor(item.battery),
            }]} />
          </View>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{item.range ?? '—'}</Text>
          <Text style={styles.metricLabel}>km restants</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{item.trips}</Text>
          <Text style={styles.metricLabel}>Trajets</Text>
        </View>
      </View>

      <Text style={styles.arrow}>voir détails →</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }) {
  const online   = SCOOTERS.filter(s => s.status !== 'offline').length;
  const charging = SCOOTERS.filter(s => s.status === 'charging').length;
  const totalKm  = SCOOTERS.reduce((a, s) => a + s.totalKm, 0);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <FlatList
        data={SCOOTERS}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.eyebrow}>Tableau de bord</Text>
              <Text style={styles.title}>Ma <Text style={{ color: C.accent }}>Flotte</Text></Text>
              <Text style={styles.subtitle}>{SCOOTERS.length} appareils enregistrés</Text>
            </View>

            {/* Summary pills */}
            <View style={styles.summary}>
              <View style={styles.pill}>
                <Text style={[styles.pillValue, { color: C.success }]}>{online}</Text>
                <Text style={styles.pillLabel}>En ligne</Text>
              </View>
              <View style={styles.pill}>
                <Text style={[styles.pillValue, { color: C.warning }]}>{charging}</Text>
                <Text style={styles.pillLabel}>En charge</Text>
              </View>
              <View style={styles.pill}>
                <Text style={styles.pillValue}>{(totalKm / 1000).toFixed(1)}k</Text>
                <Text style={styles.pillLabel}>Total km</Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>Appareils</Text>
          </>
        )}
        renderItem={({ item }) => (
          <ScooterCard
            item={item}
            onPress={() => navigation.navigate('Dashboard', { scooter: item })}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListFooterComponent={() => <View style={{ height: 40 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40 },

  header:   { marginBottom: 28 },
  eyebrow:  { fontSize: 10, letterSpacing: 3, color: C.accent, textTransform: 'uppercase', marginBottom: 8 },
  title:    { fontSize: 36, fontWeight: '900', color: C.white, letterSpacing: -1 },
  subtitle: { fontSize: 12, color: C.textSecondary, marginTop: 6 },

  summary:    { flexDirection: 'row', gap: 10, marginBottom: 28 },
  pill:       { flex: 1, backgroundColor: C.bgCard, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  pillValue:  { fontSize: 22, fontWeight: '900', color: C.white, letterSpacing: -1 },
  pillLabel:  { fontSize: 9, color: C.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 },

  sectionLabel: { fontSize: 9, color: C.textMuted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 },

  // Card
  card: {
    backgroundColor: C.bgCard,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  cardName:  { fontSize: 18, fontWeight: '700', color: C.white },
  cardModel: { fontSize: 10, color: C.textMuted, marginTop: 2 },

  badge:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  dot:       { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },

  metrics:      { flexDirection: 'row', gap: 8 },
  metric:       { flex: 1, backgroundColor: C.bgElevated, borderRadius: 12, padding: 10, alignItems: 'center' },
  metricValue:  { fontSize: 16, fontWeight: '700', color: C.white },
  metricLabel:  { fontSize: 8, color: C.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 3 },

  battWrap: { width: '100%', height: 3, backgroundColor: C.border, borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  battBar:  { height: '100%', borderRadius: 2 },

  arrow: { fontSize: 10, color: C.textMuted, textAlign: 'right', marginTop: 14 },
});