import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StatusBar,
  Platform, ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { C, timeAgo } from '../constants';

export default function GPSScreen({ route, navigation }) {
  const { scooter, telemetry: initialTel } = route.params ?? {};
  const [telemetry, setTelemetry] = useState(initialTel ?? null);
  const [loading,   setLoading]   = useState(!initialTel);

  const fetchTelemetry = async () => {
    if (!scooter?.id) return;
    const { data } = await supabase
      .from('telemetry').select('*')
      .eq('scooter_id', scooter.id)
      .order('recorded_at', { ascending: false })
      .limit(1).maybeSingle();
    if (data) setTelemetry(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!initialTel) fetchTelemetry();

    const ch = supabase.channel('gps-' + scooter?.id)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'telemetry',
        filter: 'scooter_id=eq.' + scooter?.id,
      }, () => fetchTelemetry())
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [scooter?.id]);

  const lat   = telemetry?.latitude;
  const lon   = telemetry?.longitude;
  const speed = telemetry?.speed;
  const suivi = telemetry?.recorded_at;

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
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '900', color: C.white }}>GPS</Text>
          {scooter?.name ? <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{scooter.name}</Text> : null}
        </View>
        {suivi && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5,
            backgroundColor: C.successDim, borderRadius: 10,
            paddingHorizontal: 10, paddingVertical: 5,
            borderWidth: 1, borderColor: C.success + '33' }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.success }} />
            <Text style={{ fontSize: 9, fontWeight: '700', color: C.success }}>Suivi actif</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      ) : (
        <>
          {/* Zone carte simulée */}
          <View style={{ flex: 1, backgroundColor: '#0D2137', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
            {/* Grille carte */}
            {[...Array(8)].map((_, i) => (
              <View key={'h' + i} style={{
                position: 'absolute', left: 0, right: 0,
                top: `${(i + 1) * 12}%`, height: 1,
                backgroundColor: C.border + '55',
              }} />
            ))}
            {[...Array(6)].map((_, i) => (
              <View key={'v' + i} style={{
                position: 'absolute', top: 0, bottom: 0,
                left: `${(i + 1) * 16}%`, width: 1,
                backgroundColor: C.border + '55',
              }} />
            ))}

            {/* Pin scooter */}
            {lat != null ? (
              <View style={{ alignItems: 'center' }}>
                <View style={{
                  width: 48, height: 48, borderRadius: 24,
                  backgroundColor: C.accent,
                  justifyContent: 'center', alignItems: 'center',
                  shadowColor: C.accent, shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8, shadowRadius: 12, elevation: 10,
                }}>
                  <Text style={{ fontSize: 24 }}>🛵</Text>
                </View>
                <View style={{ width: 2, height: 16, backgroundColor: C.accent }} />
                <View style={{ width: 8, height: 4, borderRadius: 4, backgroundColor: C.accent + '66' }} />
              </View>
            ) : (
              <View style={{ alignItems: 'center', gap: 12 }}>
                <Text style={{ fontSize: 48 }}>📍</Text>
                <Text style={{ fontSize: 14, color: C.textMuted }}>Aucune position disponible</Text>
              </View>
            )}
          </View>

          {/* Panneau infos */}
          <View style={{
            backgroundColor: C.bgCard,
            borderTopWidth: 1, borderTopColor: C.border,
            padding: 20, gap: 16,
          }}>
            {/* Suivi / dernière maj */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 11, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>Suivi :</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: suivi ? C.success : C.textMuted }}>
                  {suivi ? 'active' : 'inactif'}
                </Text>
              </View>
              {suivi && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 11, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>Dern. maj :</Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: C.white }}>{timeAgo(suivi)}</Text>
                </View>
              )}
            </View>

            {/* Coordonnées + Vitesse */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, backgroundColor: C.bgElevated, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border, gap: 6 }}>
                <Text style={{ fontSize: 9, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>Position</Text>
                <Text style={{ fontSize: 16, fontWeight: '900', color: C.white }}>
                  {lat != null ? lat.toFixed(4) : '—'}
                </Text>
                <Text style={{ fontSize: 16, fontWeight: '900', color: C.white }}>
                  {lon != null ? lon.toFixed(4) : '—'}
                </Text>
              </View>

              <View style={{ flex: 1, backgroundColor: C.bgElevated, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border, gap: 6, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 9, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>Vitesse actuelle</Text>
                <Text style={{ fontSize: 28, fontWeight: '900', color: C.white }}>
                  {speed != null ? speed.toFixed(0) : '—'}
                </Text>
                <Text style={{ fontSize: 11, color: C.textMuted }}>Km/h</Text>
              </View>
            </View>
          </View>
        </>
      )}
    </View>
  );
}
