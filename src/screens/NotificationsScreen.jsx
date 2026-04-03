import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StatusBar, Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { getHistory, clearHistory } from '../lib/notifications';
import { C, alertConfirm } from '../constants';

const TYPE_CONFIG = {
  fall:        { icon: '⚠️', color: C.danger,      label: 'Chute'     },
  tamper:      { icon: '🚨', color: C.danger,      label: 'Sabotage'  },
  battery_low: { icon: '🔋', color: C.warning,     label: 'Batterie'  },
  tpms:        { icon: '🛞', color: C.warning,     label: 'TPMS'      },
  alarm:       { icon: '🔔', color: C.accentBright, label: 'Alarme'   },
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'À l\'instant';
  if (diffMin < 60) return `Il y a ${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Il y a ${diffH}h`;
  const dd = String(d.getDate()).padStart(2, '0');
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mo} à ${hh}:${mm}`;
}

function NotifCard({ item, onGoToScooter }) {
  const cfg = TYPE_CONFIG[item.type] || { icon: '📢', color: C.accentBright, label: 'Alerte' };

  return (
    <View style={{
      backgroundColor: C.bgCard, borderRadius: 16, padding: 14,
      borderWidth: 1, borderColor: C.border,
      flexDirection: 'row', alignItems: 'center', gap: 12,
    }}>
      <View style={{
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: cfg.color + '22',
        borderWidth: 1, borderColor: cfg.color + '44',
        justifyContent: 'center', alignItems: 'center',
      }}>
        <Text style={{ fontSize: 18 }}>{cfg.icon}</Text>
      </View>

      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: C.white }}>
            {item.scooter_name ?? 'Scooter'}
          </Text>
          <View style={{
            backgroundColor: cfg.color + '33', borderRadius: 8,
            paddingHorizontal: 8, paddingVertical: 2,
          }}>
            <Text style={{ fontSize: 9, fontWeight: '800', color: cfg.color }}>{cfg.label}</Text>
          </View>
        </View>
        <Text style={{ fontSize: 12, color: C.textSecondary }} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={{ fontSize: 10, color: C.textMuted }}>
          {formatDate(item.created_at)}
        </Text>
      </View>

      {item.scooter_id && (
        <TouchableOpacity onPress={() => onGoToScooter(item)}
          style={{ backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}>
          <Text style={{ fontSize: 9, fontWeight: '800', color: C.white, textAlign: 'center' }}>
            Voir
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function NotificationsScreen({ navigation }) {
  const [notifs,      setNotifs]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [scooterMap,  setScooterMap]  = useState({});

  const fetchData = useCallback(async () => {
    // Charger les scooters
    const { data: scooterData } = await supabase.from('scooters').select('id, name');
    const map = {};
    (scooterData ?? []).forEach(s => { map[s.id] = s; });
    setScooterMap(map);

    // Charger l'historique local (notifications déclenchées)
    const history = await getHistory();

    // Aussi charger les dernières alertes depuis telemetry (en complément)
    const { data: telData } = await supabase.from('telemetry').select('*')
      .or('fallen.eq.true')
      .order('recorded_at', { ascending: false })
      .limit(30);

    // Fusionner : historique local + alertes telemetry (dédupliquer par timestamp proche)
    const historyIds = new Set(history.map(h => h.id));
    const telNotifs = (telData ?? [])
      .filter(t => t.fallen || (t.tamper_points && t.tamper_points.some(Boolean)))
      .map(t => ({
        id: 'tel_' + t.id,
        scooter_id: t.scooter_id,
        scooter_name: map[t.scooter_id]?.name ?? 'Scooter',
        type: t.fallen ? 'fall' : 'tamper',
        message: t.fallen ? 'Chute détectée !' : 'Point de sabotage déclenché',
        created_at: t.recorded_at,
      }))
      .filter(n => !historyIds.has(n.id));

    // Combiner et trier par date
    const all = [...history, ...telNotifs].sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    );

    setNotifs(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const ch = supabase.channel('notifs-screen')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'telemetry' }, () => fetchData())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleClear = () => {
    alertConfirm('Effacer', 'Supprimer tout l\'historique ?', async () => {
      await clearHistory();
      fetchData();
    });
  };

  const handleGoToScooter = (item) => {
    const sc = scooterMap[item.scooter_id];
    if (sc) navigation.navigate('Dashboard', { scooter: sc });
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={{
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 20, paddingBottom: 16,
        flexDirection: 'row', alignItems: 'center',
        borderBottomWidth: 1, borderBottomColor: C.border,
      }}>
        <TouchableOpacity onPress={() => navigation.goBack()}
          style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.bgCard, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
          <Text style={{ fontSize: 20, color: C.white }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontWeight: '900', color: C.white, marginLeft: 12 }}>
          NOTIFICATIONS
        </Text>
        {notifs.length > 0 && (
          <TouchableOpacity onPress={handleClear}
            style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: C.dangerDim, borderWidth: 1, borderColor: C.danger + '44' }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: C.danger }}>Effacer</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Badge compteur */}
      {notifs.length > 0 && (
        <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
          <Text style={{ fontSize: 12, color: C.textMuted }}>
            {notifs.length} notification{notifs.length > 1 ? 's' : ''}
          </Text>
        </View>
      )}

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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
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
                Les alertes s'afficheront ici en temps réel
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}
