import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { C, STATUS, battColor, timeAgo, alertOk, alertConfirm } from '../constants';
import {
  View, Text, ScrollView, TouchableOpacity,
  StatusBar, Platform, Modal, TextInput,
  KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';

const MAX_BATTERIES = 3;

// ── Battery form modal (simplifie) ─────────────────────────

function BatteryFormModal({ visible, onClose, onSaved, scooterId, initial, usedSlots }) {
  const isEdit = !!initial;
  const [serial,  setSerial]  = useState('');
  const [slot,    setSlot]    = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initial) {
      setSerial(initial.serial_number ?? '');
      setSlot(initial.slot ?? 1);
    } else {
      setSerial('');
      const next = [1, 2, 3].find(s => !usedSlots.includes(s)) ?? 1;
      setSlot(next);
    }
  }, [initial, visible]);

  const save = async () => {
    if (!serial.trim()) { alertOk('Erreur', 'Numero de serie obligatoire.'); return; }
    setLoading(true);
    try {
      const row = { serial_number: serial.trim(), slot };
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

          <Text style={{ fontSize: 10, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
            Emplacement
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
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
                    Batterie {s}
                  </Text>
                  {taken && <Text style={{ fontSize: 8, color: C.textMuted, marginTop: 2 }}>Occupe</Text>}
                </TouchableOpacity>
              );
            })}
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

// ── Battery card (simplifie) ────────────────────────────────

function BatteryCard({ item, onEdit, onDelete }) {
  const soc = item.soc;
  const color = battColor(soc);

  return (
    <View style={{
      flex: 1, backgroundColor: C.bgCard, borderRadius: 18,
      borderWidth: 1, borderColor: C.border, padding: 14, gap: 10,
    }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: C.white }}>🔋 Batterie {item.slot ?? '?'}</Text>
          <Text style={{ fontSize: 11, color: C.accent, marginTop: 4, letterSpacing: 0.5,
            fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' }}>
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
    </View>
  );
}

// ── Dashboard screen ───────────────────────────────────────

// ── MPU-6050 card ───────────────────────────────────────────

function MpuCard({ telemetry, threshold, onChangeThreshold }) {
  const x = telemetry?.accel_x;
  const y = telemetry?.accel_y;
  const z = telemetry?.accel_z;
  const magnitude = (x != null && y != null && z != null)
    ? Math.sqrt(x * x + y * y + z * z)
    : null;
  const isFall = magnitude != null && magnitude > threshold;
  const borderColor = isFall ? C.danger + '44' : C.border;

  const [editingThreshold, setEditingThreshold] = useState(false);
  const [thresholdInput, setThresholdInput] = useState(String(threshold));

  const saveThreshold = async () => {
    const val = parseFloat(thresholdInput);
    if (isNaN(val) || val <= 0) { alertOk('Erreur', 'Seuil invalide'); return; }
    await onChangeThreshold(val);
    setEditingThreshold(false);
  };

  return (
    <View style={{
      backgroundColor: C.bgCard, borderRadius: 18,
      borderWidth: 1, borderColor, padding: 18, gap: 14,
    }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 20 }}>📐</Text>
          <Text style={{ fontSize: 15, fontWeight: '800', color: C.white }}>MPU-6050</Text>
        </View>
        {isFall && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 5,
            backgroundColor: C.dangerDim, borderRadius: 10,
            paddingHorizontal: 10, paddingVertical: 4,
            borderWidth: 1, borderColor: C.danger + '44',
          }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.danger }} />
            <Text style={{ fontSize: 9, fontWeight: '700', color: C.danger }}>CHUTE</Text>
          </View>
        )}
        {!isFall && magnitude != null && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 5,
            backgroundColor: C.successDim, borderRadius: 10,
            paddingHorizontal: 10, paddingVertical: 4,
            borderWidth: 1, borderColor: C.success + '44',
          }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.success }} />
            <Text style={{ fontSize: 9, fontWeight: '700', color: C.success }}>Stable</Text>
          </View>
        )}
      </View>

      {/* Axes X Y Z */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[
          { label: 'X', value: x, color: '#FF6B6B' },
          { label: 'Y', value: y, color: '#51CF66' },
          { label: 'Z', value: z, color: '#339AF0' },
        ].map(({ label, value, color }) => (
          <View key={label} style={{
            flex: 1, backgroundColor: C.bgElevated, borderRadius: 14,
            padding: 12, alignItems: 'center', gap: 4,
            borderWidth: 1, borderColor: C.border,
          }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color, letterSpacing: 1 }}>{label}</Text>
            <Text style={{ fontSize: 20, fontWeight: '900', color: C.white }}>
              {value != null ? value.toFixed(1) : '—'}
            </Text>
            <Text style={{ fontSize: 8, color: C.textMuted }}>g</Text>
          </View>
        ))}
      </View>

      {/* Magnitude */}
      {magnitude != null && (
        <View style={{
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          backgroundColor: C.bgElevated, borderRadius: 12, padding: 12,
          borderWidth: 1, borderColor: isFall ? C.danger + '33' : C.border,
        }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
            Magnitude
          </Text>
          <Text style={{ fontSize: 16, fontWeight: '900', color: isFall ? C.danger : C.white }}>
            {magnitude.toFixed(2)} g
          </Text>
        </View>
      )}

      {/* Seuil */}
      <View style={{
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: C.bgElevated, borderRadius: 12, padding: 12,
        borderWidth: 1, borderColor: C.border,
      }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
          Seuil chute
        </Text>
        {editingThreshold ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TextInput
              value={thresholdInput}
              onChangeText={setThresholdInput}
              keyboardType="numeric"
              style={{
                backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
                color: C.white, fontSize: 14, fontWeight: '800', width: 60, textAlign: 'center',
                borderWidth: 1, borderColor: C.accent,
              }}
              autoFocus
            />
            <TouchableOpacity onPress={saveThreshold}
              style={{ backgroundColor: C.accent, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: C.bg }}>OK</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setEditingThreshold(false); setThresholdInput(String(threshold)); }}>
              <Text style={{ fontSize: 12, color: C.textMuted }}>X</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => { setThresholdInput(String(threshold)); setEditingThreshold(true); }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 16, fontWeight: '900', color: C.warning }}>
              {threshold} g
            </Text>
            <Text style={{ fontSize: 10 }}>✏️</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Derniere mise a jour */}
      {telemetry?.recorded_at && (
        <Text style={{ fontSize: 9, color: C.textMuted, textAlign: 'right' }}>
          {timeAgo(telemetry.recorded_at)}
        </Text>
      )}
    </View>
  );
}

// ── Dashboard screen ───────────────────────────────────────

export default function DashboardScreen({ route, navigation }) {
  const scooter = route.params?.scooter;

  const [batteries,      setBatteries]      = useState([]);
  const [battLoading,    setBattLoading]    = useState(true);
  const [showForm,       setShowForm]       = useState(false);
  const [editingBatt,    setEditingBatt]    = useState(null);
  const [telemetry,      setTelemetry]      = useState(null);
  const [fallThreshold,  setFallThreshold]  = useState(scooter?.fall_threshold ?? 2.5);

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

  const fetchTelemetry = async () => {
    if (!scooter?.id) return;
    const { data } = await supabase
      .from('telemetry').select('*')
      .eq('scooter_id', scooter.id)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) setTelemetry(data);
  };

  const updateThreshold = async (val) => {
    const { error } = await supabase
      .from('scooters').update({ fall_threshold: val }).eq('id', scooter.id);
    if (error) { alertOk('Erreur', error.message); return; }
    setFallThreshold(val);
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
    fetchTelemetry();

    // Fetch threshold from DB
    supabase.from('scooters').select('fall_threshold').eq('id', scooter.id).single()
      .then(({ data }) => { if (data?.fall_threshold != null) setFallThreshold(data.fall_threshold); });

    const battCh = supabase.channel('batt-' + scooter.id)
      .on('postgres_changes', {
        event: '*', schema: 'public',
        table: 'batteries', filter: 'scooter_id=eq.' + scooter.id,
      }, () => fetchBatteries())
      .subscribe();

    const telCh = supabase.channel('tel-' + scooter.id)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'telemetry', filter: 'scooter_id=eq.' + scooter.id,
      }, () => fetchTelemetry())
      .subscribe();

    return () => {
      supabase.removeChannel(battCh);
      supabase.removeChannel(telCh);
    };
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

        {/* Liste batteries */}
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
          <View style={{ gap: 10 }}>
            {batteries.map(b => (
              <BatteryCard
                key={b.id}
                item={b}
                onEdit={(item) => { setEditingBatt(item); setShowForm(true); }}
                onDelete={deleteBattery}
              />
            ))}
          </View>
        )}

        {/* Header MPU */}
        <View style={{ marginTop: 28, marginBottom: 16 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5 }}>
            Accelerometre
          </Text>
        </View>

        <MpuCard
          telemetry={telemetry}
          threshold={fallThreshold}
          onChangeThreshold={updateThreshold}
        />

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
