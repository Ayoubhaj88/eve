import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  View, Text, ScrollView, TouchableOpacity,
  StatusBar, Platform, Modal, TextInput,
  KeyboardAvoidingView, Alert, ActivityIndicator,
} from 'react-native';

const C = {
  bg:            '#0A0A0F',
  bgCard:        '#13131A',
  bgElevated:    '#1E1E2E',
  accent:        '#00E5FF',
  success:       '#00E676',
  successDim:    'rgba(0,230,118,0.12)',
  warning:       '#FFB300',
  warningDim:    'rgba(255,179,0,0.12)',
  danger:        '#FF1744',
  dangerDim:     'rgba(255,23,68,0.12)',
  white:         '#FFFFFF',
  textSecondary: '#8A8A9A',
  textMuted:     '#4A4A5A',
  border:        '#1E1E2E',
};

const SCOOTER_STATUS = {
  online:   { color: C.success,   bg: C.successDim,  label: 'En ligne'   },
  offline:  { color: C.textMuted, bg: 'transparent', label: 'Hors ligne' },
  charging: { color: C.warning,   bg: C.warningDim,  label: 'En charge'  },
};

const BMS_STATUS = {
  charging:    { color: C.warning,   bg: C.warningDim,  icon: '⚡', label: 'En charge' },
  discharging: { color: C.success,   bg: C.successDim,  icon: '🔋', label: 'Décharge'  },
  idle:        { color: C.textMuted, bg: 'transparent', icon: '⏸️', label: 'Inactif'   },
};

function battColor(v) {
  if (v == null) return C.textMuted;
  if (v > 50) return C.success;
  if (v > 20) return C.warning;
  return C.danger;
}

function timeAgo(d) {
  if (!d) return null;
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)    return `il y a ${s}s`;
  if (s < 3600)  return `il y a ${Math.floor(s / 60)}min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)}h`;
  return `il y a ${Math.floor(s / 86400)}j`;
}

function BatteryBar({ value, fullWidth }) {
  const color = battColor(value);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, width: fullWidth ? '100%' : undefined }}>
      <View style={{
        flex: fullWidth ? 1 : undefined,
        width: fullWidth ? undefined : 60,
        height: fullWidth ? 10 : 12,
        borderRadius: 3, borderWidth: 1.5, borderColor: color + '88',
        backgroundColor: C.bgElevated, overflow: 'hidden', padding: 2,
      }}>
        <View style={{ width: `${value ?? 0}%`, height: '100%', borderRadius: 1.5, backgroundColor: color }} />
      </View>
      <View style={{ width: 3, height: 7, borderRadius: 1, backgroundColor: color + '99' }} />
    </View>
  );
}

function BatteryFormModal({ visible, onClose, onSaved, scooterId, initial }) {
  const isEdit = !!initial;
  const [serial,  setSerial]  = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { setSerial(initial?.serial_number ?? ''); }, [initial, visible]);

  const save = async () => {
    if (!serial.trim()) { Alert.alert('Erreur', 'Numéro de série obligatoire.'); return; }
    setLoading(true);
    try {
      const row = { serial_number: serial.trim() };
      const { error } = isEdit
        ? await supabase.from('batteries').update(row).eq('id', initial.id)
        : await supabase.from('batteries').insert({ ...row, scooter_id: scooterId });
      if (error) throw error;
      onSaved(); onClose();
    } catch (e) { Alert.alert('Erreur', e.message); }
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
              {isEdit ? '✏️ Modifier' : '🔋 Nouvelle batterie'}
            </Text>
            <TouchableOpacity onPress={onClose}
              style={{ backgroundColor: C.bgElevated, borderRadius: 20, width: 32, height: 32, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: C.textMuted, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 10, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
            Numéro de série *
          </Text>
          <TextInput
            value={serial} onChangeText={setSerial}
            placeholder="ex: BAT-2024-001" placeholderTextColor={C.textMuted}
            autoCapitalize="characters"
            style={{
              backgroundColor: C.bgElevated, borderRadius: 14, padding: 14,
              color: C.white, fontSize: 15, borderWidth: 1, borderColor: C.border,
              marginBottom: 24, letterSpacing: 1,
              fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
            }}
          />
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

function BatteryCard({ item, onEdit, onDelete }) {
  const bms    = BMS_STATUS[item.bms_status] ?? null;
  const hasBms = item.soc != null || bms != null;

  return (
    <View style={{
      backgroundColor: C.bgCard, borderRadius: 18,
      borderWidth: 1, borderColor: C.border, marginBottom: 10, overflow: 'hidden',
    }}>
      {/* En-tête */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', padding: 14,
        borderBottomWidth: 1, borderColor: C.border,
      }}>
        <View style={{
          width: 38, height: 38, borderRadius: 11, backgroundColor: C.bgElevated,
          justifyContent: 'center', alignItems: 'center',
          borderWidth: 1, borderColor: C.border, marginRight: 12,
        }}>
          <Text style={{ fontSize: 20 }}>🔋</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 13, fontWeight: '800', color: C.white, letterSpacing: 0.5,
            fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
          }}>
            {item.serial_number}
          </Text>
          <Text style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>
            Ajouté {timeAgo(item.created_at)}
          </Text>
        </View>
        <TouchableOpacity onPress={() => onEdit(item)}
          style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: C.bgElevated, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border, marginRight: 6 }}>
          <Text style={{ fontSize: 13 }}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(item)}
          style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: C.dangerDim, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.danger + '44' }}>
          <Text style={{ fontSize: 13 }}>🗑️</Text>
        </TouchableOpacity>
      </View>

      {/* Données BMS */}
      <View style={{ padding: 14, gap: 10 }}>
        {item.soc != null && (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 10, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700' }}>
                État de charge
              </Text>
              <Text style={{ fontSize: 22, fontWeight: '900', color: battColor(item.soc) }}>
                {item.soc}%
              </Text>
            </View>
            <BatteryBar value={item.soc} fullWidth />
          </>
        )}

        {bms && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
            backgroundColor: bms.bg, borderRadius: 10,
            paddingHorizontal: 12, paddingVertical: 8,
            borderWidth: 1, borderColor: bms.color + '33',
          }}>
            <Text style={{ fontSize: 14 }}>{bms.icon}</Text>
            <Text style={{ fontSize: 11, fontWeight: '800', color: bms.color }}>{bms.label}</Text>
          </View>
        )}

        {!hasBms && (
          <Text style={{ fontSize: 11, color: C.textMuted, textAlign: 'center', paddingVertical: 4 }}>
            En attente des données BMS…
          </Text>
        )}
      </View>
    </View>
  );
}

export default function DashboardScreen({ route, navigation }) {
  const scooter = route.params?.scooter;

  const [tel, setTel] = useState({
    battery:     scooter?.battery  ?? null,
    charging:    scooter?.charging ?? false,
    status:      scooter?.status   ?? 'offline',
    recorded_at: scooter?.recorded_at ?? scooter?.last_update ?? null,
  });

  const [batteries,   setBatteries]   = useState([]);
  const [battLoading, setBattLoading] = useState(false);
  const [showForm,    setShowForm]    = useState(false);
  const [editingBatt, setEditingBatt] = useState(null);

  const fetchBatteries = async () => {
    if (!scooter?.id) return;
    setBattLoading(true);
    const { data, error } = await supabase
      .from('batteries').select('*')
      .eq('scooter_id', scooter.id)
      .order('created_at', { ascending: true });
    if (!error) setBatteries(data ?? []);
    setBattLoading(false);
  };

  const deleteBattery = (item) => {
    Alert.alert('Supprimer', `Supprimer « ${item.serial_number} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('batteries').delete().eq('id', item.id);
        if (error) Alert.alert('Erreur', error.message);
        else fetchBatteries();
      }},
    ]);
  };

  useEffect(() => {
    if (!scooter?.id) return;

    supabase.from('telemetry')
      .select('battery, charging, status, recorded_at')
      .eq('scooter_id', scooter.id)
      .order('recorded_at', { ascending: false })
      .limit(1).single()
      .then(({ data, error }) => { if (data && !error) setTel(p => ({ ...p, ...data })); });

    const telCh = supabase.channel(`tel-${scooter.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'telemetry', filter: `scooter_id=eq.${scooter.id}` },
        ({ new: d }) => setTel(p => ({
          battery:     d.battery     ?? p.battery,
          charging:    d.charging    ?? p.charging,
          status:      d.status      ?? p.status,
          recorded_at: d.recorded_at ?? p.recorded_at,
        }))
      ).subscribe();

    const battCh = supabase.channel(`batt-${scooter.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'batteries', filter: `scooter_id=eq.${scooter.id}` },
        ({ new: d }) => setBatteries(prev => prev.map(b => b.id === d.id ? { ...b, ...d } : b))
      ).subscribe();

    fetchBatteries();
    return () => { supabase.removeChannel(telCh); supabase.removeChannel(battCh); };
  }, [scooter?.id]);

  if (!scooter) return (
    <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
      <TouchableOpacity onPress={() => navigation.goBack()}
        style={{ backgroundColor: C.bgElevated, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 }}>
        <Text style={{ color: C.accent, fontWeight: '700' }}>← Retour</Text>
      </TouchableOpacity>
    </View>
  );

  const sc = SCOOTER_STATUS[tel.status] ?? SCOOTER_STATUS.offline;

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

        {/* Hero */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: sc.color + '44', backgroundColor: sc.bg }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: sc.color }} />
              <Text style={{ fontSize: 10, fontWeight: '700', color: sc.color, letterSpacing: 0.5 }}>{sc.label}</Text>
            </View>
            <Text style={{ fontSize: 28, fontWeight: '900', color: C.white, letterSpacing: -1, marginTop: 8 }}>
              {scooter.name ?? 'Scooter'}
            </Text>
            {scooter.model     ? <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{scooter.model}</Text> : null}
            {scooter.reference ? <Text style={{ fontSize: 10, color: C.accent,   marginTop: 2 }}>#{scooter.reference}</Text> : null}
          </View>
          <Text style={{ fontSize: 48 }}>🛵</Text>
        </View>

        {/* Batterie hero */}
        <View style={{ backgroundColor: C.bgCard, borderRadius: 18, padding: 20, alignItems: 'center', gap: 8, marginBottom: 28, borderWidth: 1, borderColor: C.border }}>
          <BatteryBar value={tel.battery} />
          <Text style={{ fontSize: 52, fontWeight: '900', letterSpacing: -2, color: battColor(tel.battery) }}>
            {tel.battery != null ? `${tel.battery}%` : '—'}
          </Text>
          {tel.charging && (
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: C.warningDim, borderWidth: 1, borderColor: C.warning + '55' }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: C.warning }}>⚡ En charge</Text>
            </View>
          )}
          <Text style={{ fontSize: 9, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5 }}>Charge globale</Text>
        </View>

        {/* Header batteries */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5 }}>
            Batteries{batteries.length > 0 ? <Text style={{ color: C.accent }}> ({batteries.length})</Text> : null}
          </Text>
          <TouchableOpacity
            onPress={() => { setEditingBatt(null); setShowForm(true); }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
            <Text style={{ fontSize: 16, color: C.bg, fontWeight: '900', lineHeight: 20 }}>+</Text>
            <Text style={{ fontSize: 11, fontWeight: '800', color: C.bg }}>Ajouter</Text>
          </TouchableOpacity>
        </View>

        {/* Liste */}
        {battLoading ? (
          <ActivityIndicator color={C.accent} style={{ marginVertical: 24 }} />
        ) : batteries.length === 0 ? (
          <View style={{ backgroundColor: C.bgCard, borderRadius: 16, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: C.border, borderStyle: 'dashed', marginBottom: 20 }}>
            <Text style={{ fontSize: 36, marginBottom: 10 }}>🔋</Text>
            <Text style={{ fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20 }}>
              Aucune batterie enregistrée.{'\n'}Appuyez sur + pour en ajouter une.
            </Text>
          </View>
        ) : batteries.map(b => (
          <BatteryCard key={b.id} item={b}
            onEdit={(item) => { setEditingBatt(item); setShowForm(true); }}
            onDelete={deleteBattery}
          />
        ))}

        {tel.recorded_at
          ? <Text style={{ fontSize: 10, color: C.textMuted, textAlign: 'center', marginTop: 8 }}>
              Dernière télémétrie {timeAgo(tel.recorded_at)}
            </Text>
          : null}

        <View style={{ height: 40 }} />
      </ScrollView>

      <BatteryFormModal
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSaved={fetchBatteries}
        scooterId={scooter?.id}
        initial={editingBatt}
      />
    </View>
  );
}