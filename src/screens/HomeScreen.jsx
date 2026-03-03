import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, StatusBar, Platform, ScrollView,
} from 'react-native';

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
  white:        '#FFFFFF',
  textSecondary:'#8A8A9A',
  textMuted:    '#4A4A5A',
  border:       '#1E1E2E',
  borderAccent: 'rgba(0,229,255,0.25)',
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

const SCOOTERS = [
  {
    id: '1', name: 'Scooter 1', model: 'Niu NQi GT Pro',
    status: 'online', battery: 78, charging: false,
    speed: 0, range: 62, temp: 24,
    alarm: false, starter: true, trips: 142, totalKm: 2340,
    gps: { address: 'Sidi Henri, Tunis', lastUpdate: 'il y a 2 min' },
  },
  {
    id: '2', name: 'Scooter 2', model: 'Niu MQi+ Sport',
    status: 'charging', battery: 34, charging: true,
    speed: 0, range: 28, temp: 31,
    alarm: true, starter: false, trips: 89, totalKm: 1120,
    gps: { address: 'La Marsa, Tunis', lastUpdate: 'il y a 5 min' },
  },
  {
    id: '3', name: 'Scooter 3', model: 'Vmoto Super Soco',
    status: 'offline', battery: null, charging: false,
    speed: null, range: null, temp: null,
    alarm: false, starter: false, trips: 211, totalKm: 4780,
    gps: { address: null, lastUpdate: null },
  },
];

// ── Detail Screen ─────────────────────────────────────────
function DetailScreen({ s, onBack }) {
  const [alarm,   setAlarm]   = useState(s.alarm);
  const [starter, setStarter] = useState(s.starter);
  const sc = STATUS[s.status];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Retour */}
      <TouchableOpacity onPress={onBack}
        style={{ alignSelf: 'flex-start', backgroundColor: C.bgElevated, borderRadius: 10,
          paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: C.border, marginBottom: 20 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: C.textSecondary }}>← Retour</Text>
      </TouchableOpacity>

      {/* Hero */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
            paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
            borderColor: sc.color + '44', backgroundColor: sc.bg, marginBottom: 8 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: sc.color }} />
            <Text style={{ fontSize: 9, fontWeight: '700', color: sc.color, letterSpacing: 0.5 }}>{sc.label}</Text>
          </View>
          <Text style={{ fontSize: 28, fontWeight: '900', color: C.white, letterSpacing: -1 }}>{s.name}</Text>
          <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{s.model}</Text>
        </View>
        <Text style={{ fontSize: 48 }}>🛵</Text>
      </View>

      {/* Mini stats */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
        {[
          { label: 'Batterie',  value: s.battery != null ? `${s.battery}%` : '—', color: battColor(s.battery) },
          { label: 'Autonomie', value: s.range   != null ? `${s.range}km`  : '—', color: C.white },
          { label: 'Trajets',   value: `${s.trips}`,                               color: C.white },
          { label: 'Total',     value: `${(s.totalKm/1000).toFixed(1)}k`,          color: C.white },
        ].map(({ label, value, color }) => (
          <View key={label} style={{ flex: 1, backgroundColor: C.bgElevated, borderRadius: 12, padding: 10, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color, letterSpacing: -0.5 }}>{value}</Text>
            <Text style={{ fontSize: 7, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: 3 }}>{label}</Text>
          </View>
        ))}
      </View>

      {/* GPS */}
      <Text style={{ fontSize: 10, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Localisation</Text>
      <View style={{ backgroundColor: C.bgCard, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: C.border, marginBottom: 20 }}>
        <View style={{ height: 150, backgroundColor: '#13131A', justifyContent: 'center', alignItems: 'center' }}>
          {s.status !== 'offline' ? (
            <>
              <View style={{ position: 'absolute', width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(0,229,255,0.05)', borderWidth: 1, borderColor: 'rgba(0,229,255,0.1)' }} />
              <View style={{ position: 'absolute', width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,229,255,0.08)', borderWidth: 1.5, borderColor: C.borderAccent }} />
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.bgCard, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: C.accent }}>
                <Text style={{ fontSize: 18 }}>🛵</Text>
              </View>
            </>
          ) : (
            <Text style={{ color: C.textMuted, fontSize: 12 }}>Hors ligne — GPS non disponible</Text>
          )}
          {s.gps.address ? (
            <View style={{ position: 'absolute', bottom: 10, left: 10, backgroundColor: C.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: C.bg }}>📍 {s.gps.address}</Text>
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 8 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: s.status !== 'offline' ? C.success : C.textMuted }} />
          <Text style={{ flex: 1, fontSize: 11, color: C.textSecondary }}>
            {s.gps.lastUpdate ? `Mis à jour ${s.gps.lastUpdate}` : 'En attente du GPS…'}
          </Text>
        </View>
      </View>

      {/* Contrôles */}
      <Text style={{ fontSize: 10, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Contrôles</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        {[
          { icon: '🔒', label: 'Alarme',    active: alarm,   onPress: () => setAlarm(v => !v),   statusOn: 'Armée',  statusOff: 'Désarmée' },
          { icon: '⚡', label: 'Démarrage', active: starter, onPress: () => setStarter(v => !v), statusOn: 'Actif',  statusOff: 'Inactif'  },
        ].map(({ icon, label, active, onPress, statusOn, statusOff }) => (
          <TouchableOpacity key={label} onPress={onPress} activeOpacity={0.75}
            style={{ flex: 1, backgroundColor: active ? '#1A1A26' : C.bgCard, borderRadius: 18, padding: 16,
              alignItems: 'center', gap: 6, borderWidth: 1, borderColor: active ? C.borderAccent : C.border }}>
            <Text style={{ fontSize: 24 }}>{icon}</Text>
            <Text style={{ fontSize: 11, fontWeight: '800', color: C.white }}>{label}</Text>
            <Text style={{ fontSize: 10, color: active ? C.accent : C.textMuted }}>{active ? statusOn : statusOff}</Text>
            <View style={{ width: 42, height: 24, borderRadius: 12, backgroundColor: active ? C.accent : C.bgElevated, padding: 3, justifyContent: 'center', marginTop: 4 }}>
              <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: active ? C.bg : C.textMuted, alignSelf: active ? 'flex-end' : 'flex-start' }} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats */}
      <Text style={{ fontSize: 10, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Stats en direct</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {[
          { icon: '🔋', value: s.battery, unit: '%',    label: 'BATTERIE' },
          { icon: '🚀', value: s.speed,   unit: 'km/h', label: 'VITESSE' },
          { icon: '🛣️', value: s.range,   unit: 'km',   label: 'AUTONOMIE' },
          { icon: '🌡️', value: s.temp,    unit: '°C',   label: 'TEMPÉRATURE' },
        ].map(({ icon, value, unit, label }) => (
          <View key={label} style={{ width: '47.5%', backgroundColor: C.bgCard, borderRadius: 16, padding: 14,
            borderWidth: 1, borderColor: C.border, minHeight: 110, justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 20 }}>{icon}</Text>
            <Text style={{ fontSize: 32, fontWeight: '900', color: value == null ? C.textMuted : C.white, letterSpacing: -1.5 }}>
              {value ?? '—'}{value != null && <Text style={{ fontSize: 12, color: C.textSecondary }}> {unit}</Text>}
            </Text>
            <Text style={{ fontSize: 8, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5 }}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ── Home Screen ───────────────────────────────────────────
export default function HomeScreen() {
  const [selected, setSelected] = useState(null);

  if (selected) return <DetailScreen s={selected} onBack={() => setSelected(null)} />;

  const online   = SCOOTERS.filter(s => s.status !== 'offline').length;
  const charging = SCOOTERS.filter(s => s.status === 'charging').length;
  const totalKm  = SCOOTERS.reduce((a, s) => a + s.totalKm, 0);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <FlatList
        data={SCOOTERS}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <>
            <Text style={{ fontSize: 10, letterSpacing: 3, color: C.accent, textTransform: 'uppercase', marginBottom: 8 }}>
              Tableau de bord
            </Text>
            <Text style={{ fontSize: 36, fontWeight: '900', color: C.white, letterSpacing: -1 }}>
              Ma <Text style={{ color: C.accent }}>Flotte</Text>
            </Text>
            <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 6, marginBottom: 24 }}>
              {SCOOTERS.length} appareils enregistrés
            </Text>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 28 }}>
              {[
                { value: online,   color: C.success, label: 'En ligne' },
                { value: charging, color: C.warning, label: 'En charge' },
                { value: `${(totalKm/1000).toFixed(1)}k`, color: C.white, label: 'Total km' },
              ].map(({ value, color, label }) => (
                <View key={label} style={{ flex: 1, backgroundColor: C.bgCard, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
                  <Text style={{ fontSize: 22, fontWeight: '900', color, letterSpacing: -1 }}>{value}</Text>
                  <Text style={{ fontSize: 9, color: C.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 }}>{label}</Text>
                </View>
              ))}
            </View>

            <Text style={{ fontSize: 9, color: C.textMuted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>
              Appareils
            </Text>
          </>
        )}
        renderItem={({ item }) => {
          const sc = STATUS[item.status];
          return (
            <TouchableOpacity
              onPress={() => setSelected(item)}
              activeOpacity={0.75}
              style={{ backgroundColor: C.bgCard, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border }}
            >
              {/* Top */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: C.white }}>{item.name}</Text>
                  <Text style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>{item.model}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5,
                  borderRadius: 20, borderWidth: 1, borderColor: sc.color + '44', backgroundColor: sc.bg }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: sc.color }} />
                  <Text style={{ fontSize: 9, fontWeight: '700', color: sc.color, letterSpacing: 0.5 }}>{sc.label}</Text>
                </View>
              </View>

              {/* Metrics */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1, backgroundColor: C.bgElevated, borderRadius: 12, padding: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: battColor(item.battery) }}>
                    {item.battery != null ? `${item.battery}%` : '—'}
                  </Text>
                  <Text style={{ fontSize: 8, color: C.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 3 }}>Batterie</Text>
                  <View style={{ width: '100%', height: 3, backgroundColor: C.border, borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                    <View style={{ height: '100%', borderRadius: 2, width: `${item.battery ?? 0}%`, backgroundColor: battColor(item.battery) }} />
                  </View>
                </View>
                <View style={{ flex: 1, backgroundColor: C.bgElevated, borderRadius: 12, padding: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: C.white }}>{item.range ?? '—'}</Text>
                  <Text style={{ fontSize: 8, color: C.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 3 }}>km restants</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: C.bgElevated, borderRadius: 12, padding: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: C.white }}>{item.trips}</Text>
                  <Text style={{ fontSize: 8, color: C.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 3 }}>Trajets</Text>
                </View>
              </View>

              <Text style={{ fontSize: 10, color: C.textMuted, textAlign: 'right', marginTop: 12 }}>voir détails →</Text>
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListFooterComponent={() => <View style={{ height: 40 }} />}
      />
    </View>
  );
}