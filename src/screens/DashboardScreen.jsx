import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { C, STATUS, battColor, timeAgo, alertOk, alertConfirm } from '../constants';
import {
  View, Text, ScrollView, TouchableOpacity,
  StatusBar, Platform, Modal, TextInput,
  KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';

const MAX_BATTERIES = 3;

// ── Battery form modal ─────────────────────────────────────

function BatteryFormModal({ visible, onClose, onSaved, scooterId, initial, usedSlots }) {
  const isEdit = !!initial;
  const [serial,    setSerial]    = useState('');
  const [slot,      setSlot]      = useState(1);
  const [capacity,  setCapacity]  = useState('20');
  const [cellCount, setCellCount] = useState('16');
  const [loading,   setLoading]   = useState(false);

  useEffect(() => {
    if (initial) {
      setSerial(initial.serial_number ?? '');
      setSlot(initial.slot ?? 1);
      setCapacity(String(initial.capacity_ah ?? 20));
      setCellCount(String(initial.cell_count ?? 16));
    } else {
      setSerial('');
      const next = [1, 2, 3].find(s => !usedSlots.includes(s)) ?? 1;
      setSlot(next);
      setCapacity('20');
      setCellCount('16');
    }
  }, [initial, visible]);

  const save = async () => {
    if (!serial.trim()) { alertOk('Erreur', 'Numero de serie obligatoire.'); return; }
    setLoading(true);
    try {
      const row = {
        serial_number: serial.trim(),
        slot,
        capacity_ah: parseFloat(capacity) || 20,
        cell_count: parseInt(cellCount) || 16,
      };
      const { error } = isEdit
        ? await supabase.from('batteries').update(row).eq('id', initial.id)
        : await supabase.from('batteries').insert({ ...row, scooter_id: scooterId });
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
          backgroundColor: C.bgCard, borderTopLeftRadius: 28, borderTopRightRadius: 28,
          padding: 28, paddingBottom: Platform.OS === 'ios' ? 44 : 28,
          borderTopWidth: 1, borderColor: C.border,
        }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.bgElevated, alignSelf: 'center', marginBottom: 24 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: C.white }}>
              {isEdit ? 'Modifier batterie' : 'Nouvelle batterie'}
            </Text>
            <TouchableOpacity onPress={onClose}
              style={{ backgroundColor: C.bgElevated, borderRadius: 20, width: 32, height: 32, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: C.textMuted, fontSize: 16 }}>X</Text>
            </TouchableOpacity>
          </View>

          {/* Serial */}
          <Text style={{ fontSize: 10, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
            Numero de serie *
          </Text>
          <TextInput
            value={serial} onChangeText={setSerial}
            placeholder="ex: BAT-2024-001" placeholderTextColor={C.textMuted}
            autoCapitalize="characters"
            style={{
              backgroundColor: C.bgElevated, borderRadius: 14, padding: 14,
              color: C.white, fontSize: 15, borderWidth: 1, borderColor: C.border,
              marginBottom: 16, letterSpacing: 1,
              fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
            }}
          />

          {/* Slot */}
          <Text style={{ fontSize: 10, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
            Emplacement
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {[1, 2, 3].map(s => {
              const taken = !isEdit && usedSlots.includes(s);
              const active = slot === s;
              return (
                <TouchableOpacity key={s} disabled={taken}
                  onPress={() => setSlot(s)}
                  style={{
                    flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
                    backgroundColor: active ? C.accent : C.bgElevated,
                    borderWidth: 1, borderColor: active ? C.accent : C.border,
                    opacity: taken ? 0.3 : 1,
                  }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: active ? C.bg : C.white }}>
                    Slot {s}
                  </Text>
                  {taken && <Text style={{ fontSize: 8, color: C.textMuted, marginTop: 2 }}>Occupe</Text>}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Capacity + Cell count */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
                Capacite (Ah)
              </Text>
              <TextInput
                value={capacity} onChangeText={setCapacity}
                placeholder="20" placeholderTextColor={C.textMuted}
                keyboardType="numeric"
                style={{
                  backgroundColor: C.bgElevated, borderRadius: 14, padding: 14,
                  color: C.white, fontSize: 15, borderWidth: 1, borderColor: C.border, textAlign: 'center',
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
                Cellules (S)
              </Text>
              <TextInput
                value={cellCount} onChangeText={setCellCount}
                placeholder="16" placeholderTextColor={C.textMuted}
                keyboardType="numeric"
                style={{
                  backgroundColor: C.bgElevated, borderRadius: 14, padding: 14,
                  color: C.white, fontSize: 15, borderWidth: 1, borderColor: C.border, textAlign: 'center',
                }}
              />
            </View>
          </View>

          <TouchableOpacity onPress={save} disabled={loading} activeOpacity={0.8}
            style={{ backgroundColor: C.accent, borderRadius: 16, padding: 16, alignItems: 'center', opacity: loading ? 0.6 : 1 }}>
            {loading
              ? <ActivityIndicator color={C.bg} />
              : <Text style={{ fontSize: 15, fontWeight: '900', color: C.bg }}>{isEdit ? 'Enregistrer' : 'Ajouter'}</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Battery card (grille, simple) ──────────────────────────

function BatteryCard({ item, onEdit, onDelete }) {
  const soc = item.soc;
  const color = battColor(soc);
  const isActive = item.bms_status === 'charging' || item.bms_status === 'discharging';

  return (
    <View style={{
      flex: 1, backgroundColor: C.bgCard, borderRadius: 18,
      borderWidth: 1, borderColor: C.border, padding: 14, gap: 10,
    }}>
      {/* Header : titre + actions */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: C.white }}>Batterie</Text>
          <Text style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>
            #{item.serial_number}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity onPress={() => onEdit(item)}
            style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: C.bgElevated, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 12 }}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(item)}
            style={{ width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: C.danger, fontWeight: '800' }}>X</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* SOC */}
      <Text style={{ fontSize: 32, fontWeight: '900', color, letterSpacing: -1 }}>
        {soc != null ? soc.toFixed(0) + '%' : '—'}
      </Text>

      {/* Barre */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <View style={{
          flex: 1, height: 10, borderRadius: 5,
          borderWidth: 1.5, borderColor: color + '55',
          backgroundColor: C.bgElevated, overflow: 'hidden', padding: 2,
        }}>
          <View style={{
            width: (soc ?? 0) + '%', height: '100%',
            borderRadius: 3, backgroundColor: color,
          }} />
        </View>
        <View style={{ width: 3, height: 7, borderRadius: 1, backgroundColor: color + '99' }} />
      </View>

      {/* Status badge */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 5,
        alignSelf: 'flex-start',
        backgroundColor: isActive ? C.successDim : 'transparent',
        borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
        borderWidth: 1, borderColor: isActive ? C.success + '44' : C.border,
      }}>
        <View style={{
          width: 6, height: 6, borderRadius: 3,
          backgroundColor: isActive ? C.success : C.textMuted,
        }} />
        <Text style={{
          fontSize: 9, fontWeight: '700',
          color: isActive ? C.success : C.textMuted,
        }}>
          {isActive ? 'En service' : 'Inactif'}
        </Text>
      </View>
    </View>
  );
}

// ── Dashboard screen ───────────────────────────────────────

export default function DashboardScreen({ route, navigation }) {
  const scooter = route.params?.scooter;

  const [batteries,   setBatteries]   = useState([]);
  const [battLoading, setBattLoading] = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [editingBatt, setEditingBatt] = useState(null);

  const usedSlots = batteries.map(b => b.slot).filter(Boolean);

  const fetchBatteries = async () => {
    if (!scooter?.id) return;
    setBattLoading(true);
    const { data, error } = await supabase
      .from('batteries').select('*')
      .eq('scooter_id', scooter.id)
      .order('slot', { ascending: true });
    if (!error) setBatteries(data ?? []);
    setBattLoading(false);
  };

  const deleteBattery = (item) => {
    alertConfirm('Supprimer', `Supprimer "${item.serial_number}" ?`, async () => {
      const { error } = await supabase.from('batteries').delete().eq('id', item.id);
      if (error) alertOk('Erreur', error.message);
      else fetchBatteries();
    });
  };

  useEffect(() => {
    if (!scooter?.id) return;
    fetchBatteries();

    const battCh = supabase.channel('batt-' + scooter.id)
      .on('postgres_changes', {
        event: '*', schema: 'public',
        table: 'batteries', filter: 'scooter_id=eq.' + scooter.id,
      }, () => fetchBatteries())
      .subscribe();

    return () => supabase.removeChannel(battCh);
  }, [scooter?.id]);

  if (!scooter) return (
    <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }}>
      <TouchableOpacity onPress={() => navigation.goBack()}
        style={{ backgroundColor: C.bgElevated, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 }}>
        <Text style={{ color: C.accent, fontWeight: '700' }}>Retour</Text>
      </TouchableOpacity>
    </View>
  );

  const sc = STATUS[scooter.status] ?? STATUS.offline;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Retour */}
        <TouchableOpacity onPress={() => navigation.goBack()}
          style={{ alignSelf: 'flex-start', backgroundColor: C.bgElevated, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: C.border, marginBottom: 20 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: C.textSecondary }}>← Retour</Text>
        </TouchableOpacity>

        {/* Status badge */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 6,
          alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5,
          borderRadius: 20, borderWidth: 1,
          borderColor: sc.color + '44', backgroundColor: sc.bg,
          marginBottom: 12,
        }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: sc.color }} />
          <Text style={{ fontSize: 10, fontWeight: '700', color: sc.color, letterSpacing: 0.5 }}>{sc.label}</Text>
        </View>

        {/* Hero : nom + scooter emoji */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 28, fontWeight: '900', color: C.white, letterSpacing: -1 }}>
              {scooter.name ?? 'Scooter'}
            </Text>
            {scooter.model ? <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>{scooter.model}</Text> : null}
            {scooter.reference ? <Text style={{ fontSize: 11, color: C.accent, marginTop: 2 }}>#{scooter.reference}</Text> : null}
          </View>
          <Text style={{ fontSize: 48 }}>🛵</Text>
        </View>

        {/* Header batteries */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5 }}>
            Batteries
          </Text>
          {batteries.length < MAX_BATTERIES && (
            <TouchableOpacity
              onPress={() => { setEditingBatt(null); setShowForm(true); }}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                borderWidth: 1, borderColor: C.accent,
                paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12,
              }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: C.accent }}>+ Ajouter</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Grille batteries (2 colonnes) */}
        {battLoading ? (
          <ActivityIndicator color={C.accent} style={{ marginVertical: 24 }} />
        ) : batteries.length === 0 ? (
          <View style={{ backgroundColor: C.bgCard, borderRadius: 16, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: C.border, borderStyle: 'dashed' }}>
            <Text style={{ fontSize: 36, marginBottom: 10 }}>🔋</Text>
            <Text style={{ fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20 }}>
              Aucune batterie enregistree.{'\n'}Appuyez sur + Ajouter.
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {batteries.map(b => (
              <View key={b.id} style={{ width: '48.5%' }}>
                <BatteryCard
                  item={b}
                  onEdit={(item) => { setEditingBatt(item); setShowForm(true); }}
                  onDelete={deleteBattery}
                />
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <BatteryFormModal
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSaved={fetchBatteries}
        scooterId={scooter?.id}
        initial={editingBatt}
        usedSlots={usedSlots}
      />
    </View>
  );
}
