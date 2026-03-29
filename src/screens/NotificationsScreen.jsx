import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StatusBar, Platform, ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { C } from '../constants';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  return `A ${hh}:${mm}:${ss} ${dd}/${mo}/${yy}`;
}

function NotifCard({ item, onGoToScooter }) {
  const typeColor = {
    fall:   C.danger,
    tamper: C.danger,
    battery_low: C.warning,
    online: C.success,
  }[item.type] ?? C.accentBright;

  return (
    <View style={{
      backgroundColor: C.bgCard, borderRadius: 16, padding: 16,
      borderWidth: 1, borderColor: C.border,
      flexDirection: 'row', alignItems: 'center', gap: 14,
    }}>
      <View style={{
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: typeColor + '22',
        borderWidth: 1, borderColor: typeColor + '44',
        justifyContent: 'center', alignItems: 'center',
      }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: typeColor }} />
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: C.white }}>
          {item.scooter_name ?? 'Scooter'}
        </Text>
        <Text style={{ fontSize: 11, color: C.textSecondary }}>
          {item.message ?? item.type}
        </Text>
        <Text style={{ fontSize: 10, color: C.textMuted }}>
          {formatDate(item.created_at)}
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => onGoToScooter(item)}
        style={{
          backgroundColor: C.accent, borderRadius: 10,
          paddingHorizontal: 12, paddingVertical: 8,
        }}
      >
        <Text style={{ fontSize: 10, fontWeight: '800', color: C.white }}>
          Aller au{'\n'}scooter
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function NotificationsScreen({ navigation }) {
  const [notifs,   setNotifs]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [scooters, setScooters] = useState({});

  const fetchData = async () => {
    setLoading(true);
    // Fetch scooters pour les noms
    const { data: scooterData } = await supabase.from('scooters').select('id, name');
    const scooterMap = {};
    (scooterData ?? []).forEach(s => { scooterMap[s.id] = s; });
    setScooters(scooterMap);

    // Fetch dernières telemetries avec alertes
    const { data: telData } = await supabase
      .from('telemetry').select('*')
      .or('fallen.eq.true,alarm.eq.false')
      .order('recorded_at', { ascending: false })
      .limit(50);

    const items = (telData ?? []).map(t => ({
      id: t.id,
      scooter_id: t.scooter_id,
      scooter_name: scooterMap[t.scooter_id]?.name ?? 'Scooter',
      type: t.fallen ? 'fall' : t.tamper_points?.some(Boolean) ? 'tamper' : 'alerte',
      message: t.fallen
        ? 'Chute détectée !'
        : t.tamper_points?.some(Boolean)
          ? 'Point de sabotage déclenché'
          : 'Alerte',
      created_at: t.recorded_at,
    }));

    setNotifs(items);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const ch = supabase.channel('notifs-global')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'telemetry' }, () => fetchData())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const handleGoToScooter = async (item) => {
    const sc = scooters[item.scooter_id];
    if (sc) navigation.navigate('Dashboard', { scooter: sc });
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={{
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 20, paddingBottom: 16,
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderBottomWidth: 1, borderBottomColor: C.border,
      }}>
        <TouchableOpacity onPress={() => navigation.goBack()}
          style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.bgCard, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
          <Text style={{ fontSize: 20, color: C.white }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: '900', color: C.white, letterSpacing: -0.5 }}>
          NOTIFICATIONS
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      ) : (
        <FlatList
          data={notifs}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={{ padding: 20, gap: 10 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <NotifCard item={item} onGoToScooter={handleGoToScooter} />
          )}
          ListEmptyComponent={() => (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Text style={{ fontSize: 40, marginBottom: 14 }}>🔔</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: C.white, marginBottom: 6 }}>
                Aucune notification
              </Text>
              <Text style={{ fontSize: 13, color: C.textMuted, textAlign: 'center' }}>
                Les alertes s'afficheront ici
              </Text>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
    </View>
  );
}
