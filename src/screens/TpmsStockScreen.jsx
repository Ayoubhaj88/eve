import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StatusBar, Platform, ActivityIndicator,
  Modal, TextInput, KeyboardAvoidingView,
} from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { C, alertOk } from '../constants';

// ── Modal ajouter TPMS au stock ─────────────────────────────

function AddTpmsModal({ visible, onClose, onSaved }) {
  const [tpmsId,  setTpmsId]  = useState('');
  const [wheel,   setWheel]   = useState('AV');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (visible) { setTpmsId(''); setWheel('AV'); } }, [visible]);

  const save = async () => {
    if (!tpmsId.trim()) { alertOk('Erreur', 'ID TPMS obligatoire.'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.from('tpms_sensors').insert({
        sensor_id: tpmsId.trim(),
        wheel_position: wheel,
        scooter_id: null,
      });
      if (error) throw error;
      onSaved(); onClose();
    } catch (e) { alertOk('Erreur', e.message); }
    finally     { setLoading(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} activeOpacity={1} onPress={onClose} />
        <View style={{
          backgroundColor: C.accent, borderTopLeftRadius: 28, borderTopRightRadius: 28,
          padding: 28, paddingBottom: Platform.OS === 'ios' ? 44 : 28,
        }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', alignSelf: 'center', marginBottom: 20 }} />
          <Text style={{ fontSize: 20, fontWeight: '900', color: C.white, marginBottom: 20, textAlign: 'center' }}>
            Nouveau TPMS
          </Text>

          {/* Type AV / AR */}
          <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            Position
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            {['AV', 'AR'].map(w => (
              <TouchableOpacity key={w} onPress={() => setWheel(w)}
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
                  backgroundColor: wheel === w ? C.white : 'rgba(255,255,255,0.15)',
                }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: wheel === w ? C.accent : C.white }}>
                  TPMS {w}.
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            ID :
          </Text>
          <TextInput value={tpmsId} onChangeText={setTpmsId}
            placeholder="ex: RAF3G5" placeholderTextColor="rgba(255,255,255,0.4)"
            autoCapitalize="characters"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 14, color: C.white, fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', marginBottom: 20 }}
          />

          <TouchableOpacity onPress={save} disabled={loading} activeOpacity={0.8}
            style={{ backgroundColor: C.white, borderRadius: 14, padding: 16, alignItems: 'center', opacity: loading ? 0.6 : 1 }}>
            {loading ? <ActivityIndicator color={C.accent} /> : <Text style={{ fontSize: 16, fontWeight: '900', color: C.accent }}>Valider</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Carte TPMS stock ────────────────────────────────────────

function TpmsCard({ item, onDelete }) {
  const assigned = !!item.scooter_id;

  return (
    <View style={{
      backgroundColor: C.bgCard, borderRadius: 14,
      borderWidth: 1, borderColor: assigned ? C.success + '44' : C.border,
      padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
    }}>
      <Text style={{ fontSize: 28 }}>⚙️</Text>

      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: C.white }}>
          TPMS {item.wheel_position ?? '?'}.
        </Text>
        <Text style={{ fontSize: 12, color: C.accentBright, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' }}>
          ID: {item.sensor_id}
        </Text>

        {assigned ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.success }} />
            <Text style={{ fontSize: 10, color: C.success, fontWeight: '700' }}>Assigné</Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.warning }} />
            <Text style={{ fontSize: 10, color: C.warning, fontWeight: '700' }}>En stock</Text>
          </View>
        )}
      </View>

      {!assigned && (
        <TouchableOpacity onPress={() => onDelete(item)}
          style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: C.dangerDim, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.danger + '44' }}>
          <Text style={{ fontSize: 13, color: C.danger, fontWeight: '800' }}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Écran stock TPMS ────────────────────────────────────────

export default function TpmsStockScreen({ navigation }) {
  const [sensors,  setSensors]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetch_ = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('tpms_sensors')
      .select('*')
      .order('sensor_id', { ascending: true });
    if (!error) setSensors(data ?? []);
    else {
      // Table n'existe peut-être pas encore
      console.log('tpms_sensors:', error.message);
      setSensors([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetch_();
    const ch = supabase.channel('tpms-stock')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tpms_sensors' }, () => fetch_())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const deleteSensor = (item) => {
    supabase.from('tpms_sensors').delete().eq('id', item.id)
      .then(({ error }) => { if (error) alertOk('Erreur', error.message); else fetch_(); });
  };

  const inStock  = sensors.filter(s => !s.scooter_id);
  const assigned = sensors.filter(s =>  s.scooter_id);

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
        <Text style={{ flex: 1, fontSize: 20, fontWeight: '900', color: C.white }}>TPMS</Text>
        <TouchableOpacity onPress={() => setShowForm(true)}
          style={{ backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: C.white }}>+ Ajouter</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      ) : (
        <FlatList
          data={[...inStock, ...assigned]}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 12, color: C.textMuted, letterSpacing: 1, textTransform: 'uppercase' }}>
                {inStock.length} en stock · {assigned.length} assigné{assigned.length > 1 ? 's' : ''}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TpmsCard item={item} onDelete={deleteSensor} />
          )}
          ListEmptyComponent={() => (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Text style={{ fontSize: 44, marginBottom: 14 }}>⚙️</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: C.white, marginBottom: 6 }}>Aucun capteur TPMS</Text>
              <Text style={{ fontSize: 13, color: C.textMuted, textAlign: 'center' }}>
                Ajoutez des capteurs TPMS au stock pour les assigner ensuite aux scooters
              </Text>
            </View>
          )}
        />
      )}

      <AddTpmsModal
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSaved={fetch_}
      />
    </View>
  );
}
