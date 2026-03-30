import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StatusBar, Platform, ActivityIndicator,
  Modal, TextInput, KeyboardAvoidingView,
} from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { C, battColor, alertOk, alertConfirm } from '../constants';

// ── Modal ajouter batterie au stock ─────────────────────────

function AddBatteryModal({ visible, onClose, onSaved }) {
  const [serial,  setSerial]  = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (visible) { setSerial(''); } }, [visible]);

  const save = async () => {
    if (!serial.trim()) { alertOk('Erreur', 'N° Série obligatoire.'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.from('batteries').insert({
        serial_number: serial.trim(),
        scooter_id: null,
        slot: null,
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
            Nouvelle batterie
          </Text>

          <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            N° Serie *
          </Text>
          <TextInput value={serial} onChangeText={setSerial}
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

// ── Carte batterie stock ────────────────────────────────────

function StockCard({ item, onDelete }) {
  const soc   = item.soc;
  const color = battColor(soc);
  const assigned = !!item.scooter_id;

  return (
    <View style={{
      backgroundColor: C.bgCard, borderRadius: 14,
      borderWidth: 1, borderColor: assigned ? C.success + '44' : C.border,
      padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
    }}>
      <Text style={{ fontSize: 28 }}>🔋</Text>

      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: C.white }}>
          {item.serial_number}
        </Text>
        {item.slot != null && (
          <Text style={{ fontSize: 10, color: C.textMuted }}>
            Slot: {item.slot}
          </Text>
        )}

        {/* Statut assignation */}
        {assigned ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.success }} />
            <Text style={{ fontSize: 10, color: C.success, fontWeight: '700' }}>
              Assignée (slot {item.slot ?? '?'})
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.warning }} />
            <Text style={{ fontSize: 10, color: C.warning, fontWeight: '700' }}>En stock</Text>
          </View>
        )}
      </View>

      {/* SOC si dispo */}
      {soc != null && (
        <Text style={{ fontSize: 18, fontWeight: '900', color }}>{soc.toFixed(0)}%</Text>
      )}

      {/* Supprimer */}
      {!assigned && (
        <TouchableOpacity onPress={() => onDelete(item)}
          style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: C.dangerDim, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.danger + '44' }}>
          <Text style={{ fontSize: 13, color: C.danger, fontWeight: '800' }}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Écran stock batteries ───────────────────────────────────

export default function BatteryStockScreen({ navigation }) {
  const [batteries, setBatteries] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);

  const fetch_ = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('batteries')
      .select('*')
      .order('serial_number', { ascending: true });
    if (!error) setBatteries(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetch_();
    const ch = supabase.channel('batt-stock')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'batteries' }, () => fetch_())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const deleteBatt = (item) => {
    alertConfirm('Supprimer', `Supprimer "${item.serial_number}" ?`, () => {
      supabase.from('batteries').delete().eq('id', item.id)
        .then(({ error }) => { if (error) alertOk('Erreur', error.message); else fetch_(); });
    });
  };

  const inStock   = batteries.filter(b => !b.scooter_id);
  const assigned  = batteries.filter(b =>  b.scooter_id);

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
        <Text style={{ flex: 1, fontSize: 20, fontWeight: '900', color: C.white }}>Batteries</Text>
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
                {inStock.length} en stock · {assigned.length} assignée{assigned.length > 1 ? 's' : ''}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <StockCard item={item} onDelete={deleteBatt} />
          )}
          ListEmptyComponent={() => (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Text style={{ fontSize: 44, marginBottom: 14 }}>🔋</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: C.white, marginBottom: 6 }}>Aucune batterie</Text>
              <Text style={{ fontSize: 13, color: C.textMuted, textAlign: 'center' }}>
                Ajoutez des batteries au stock pour les assigner ensuite aux scooters
              </Text>
            </View>
          )}
        />
      )}

      <AddBatteryModal
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSaved={fetch_}
      />
    </View>
  );
}
