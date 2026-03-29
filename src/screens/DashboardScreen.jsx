import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { C, STATUS, battColor, timeAgo, alertOk } from '../constants';
import {
  View, Text, ScrollView, TouchableOpacity,
  StatusBar, Platform, Modal, TextInput,
  KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import AttentionModal from '../components/AttentionModal';

const MAX_BATTERIES = 3;

// ── Section header ──────────────────────────────────────────

function SectionHeader({ title }) {
  return (
    <Text style={{
      fontSize: 9, fontWeight: '800', color: C.textMuted,
      textTransform: 'uppercase', letterSpacing: 2,
      marginTop: 28, marginBottom: 14,
    }}>
      {title}
    </Text>
  );
}

// ── Battery form modal ──────────────────────────────────────

function BatteryFormModal({ visible, onClose, onSaved, scooterId, initial, usedSlots }) {
  const isEdit = !!initial;
  const [serial,  setSerial]  = useState('');
  const [bmsId,   setBmsId]   = useState('');
  const [slot,    setSlot]    = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initial) {
      setSerial(initial.serial_number ?? '');
      setBmsId(initial.bms_id ?? '');
      setSlot(initial.slot ?? 1);
    } else {
      setSerial(''); setBmsId('');
      const next = [1, 2, 3].find(s => !usedSlots.includes(s)) ?? 1;
      setSlot(next);
    }
  }, [initial, visible]);

  const slotLabel = (s) => s === 3 ? 'Réserve' : `Batterie ${s}`;

  const save = async () => {
    if (!serial.trim()) { alertOk('Erreur', 'N° Série obligatoire.'); return; }
    setLoading(true);
    try {
      const row = { serial_number: serial.trim(), bms_id: bmsId.trim(), slot };
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
          backgroundColor: C.accent,
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          padding: 28, paddingBottom: Platform.OS === 'ios' ? 44 : 28,
        }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', alignSelf: 'center', marginBottom: 20 }} />
          <Text style={{ fontSize: 20, fontWeight: '900', color: C.white, marginBottom: 20, textAlign: 'center' }}>
            {isEdit ? 'Modifier' : slotLabel(slot)}
          </Text>

          {!isEdit && (
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {[1, 2, 3].map(s => {
                const taken  = usedSlots.includes(s);
                const active = slot === s;
                return (
                  <TouchableOpacity key={s} disabled={taken} onPress={() => setSlot(s)}
                    style={{
                      flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
                      backgroundColor: active ? C.white : 'rgba(255,255,255,0.15)',
                      opacity: taken ? 0.35 : 1,
                    }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: active ? C.accent : C.white }}>
                      {slotLabel(s)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            N° Serie
          </Text>
          <TextInput value={serial} onChangeText={setSerial}
            placeholder="ex: RAF3G5" placeholderTextColor="rgba(255,255,255,0.4)"
            autoCapitalize="characters"
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 14,
              color: C.white, fontSize: 15,
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', marginBottom: 14,
            }}
          />

          <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            N° BMS
          </Text>
          <TextInput value={bmsId} onChangeText={setBmsId}
            placeholder="xx:xx:xx:xx:xx:xx" placeholderTextColor="rgba(255,255,255,0.4)"
            autoCapitalize="none"
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 14,
              color: C.white, fontSize: 15,
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', marginBottom: 20,
              fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
            }}
          />

          <TouchableOpacity onPress={save} disabled={loading} activeOpacity={0.8}
            style={{ backgroundColor: C.white, borderRadius: 14, padding: 16, alignItems: 'center', opacity: loading ? 0.6 : 1 }}>
            {loading
              ? <ActivityIndicator color={C.accent} />
              : <Text style={{ fontSize: 16, fontWeight: '900', color: C.accent }}>Valider</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── TPMS form modal ─────────────────────────────────────────

function TpmsFormModal({ visible, onClose, onSaved, scooterId, wheel }) {
  const [tpmsId,  setTpmsId]  = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (visible) setTpmsId(''); }, [visible]);

  const save = async () => {
    if (!tpmsId.trim()) { alertOk('Erreur', 'ID TPMS obligatoire.'); return; }
    setLoading(true);
    try {
      const col = wheel === 'AV' ? 'tpms_id_front' : 'tpms_id_rear';
      const { error } = await supabase.from('scooters')
        .update({ [col]: tpmsId.trim() }).eq('id', scooterId);
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
          backgroundColor: C.accent,
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          padding: 28, paddingBottom: Platform.OS === 'ios' ? 44 : 28,
        }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', alignSelf: 'center', marginBottom: 20 }} />
          <Text style={{ fontSize: 20, fontWeight: '900', color: C.white, marginBottom: 20, textAlign: 'center' }}>
            TPMS {wheel}.
          </Text>

          <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            ID :
          </Text>
          <TextInput value={tpmsId} onChangeText={setTpmsId}
            placeholder="ex: RAF3G5" placeholderTextColor="rgba(255,255,255,0.4)"
            autoCapitalize="characters"
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 14,
              color: C.white, fontSize: 15,
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', marginBottom: 20,
            }}
          />

          <TouchableOpacity onPress={save} disabled={loading} activeOpacity={0.8}
            style={{ backgroundColor: C.white, borderRadius: 14, padding: 16, alignItems: 'center', opacity: loading ? 0.6 : 1 }}>
            {loading
              ? <ActivityIndicator color={C.accent} />
              : <Text style={{ fontSize: 16, fontWeight: '900', color: C.accent }}>Valider</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Battery card ─────────────────────────────────────────────

function BatteryCard({ item, onEdit, onDelete }) {
  const soc       = item.soc;
  const color     = battColor(soc);
  const slotLabel = item.slot === 3 ? 'Réserve' : `Batterie ${item.slot ?? '?'}`;

  return (
    <View style={{
      backgroundColor: C.bgCard, borderRadius: 16,
      borderWidth: 1, borderColor: C.border, padding: 16, gap: 10,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ fontSize: 14, fontWeight: '800', color: C.white }}>🔋 {slotLabel}</Text>
          {item.serial_number ? (
            <Text style={{ fontSize: 10, color: C.accentBright, marginTop: 3,
              fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' }}>
              {item.serial_number}
            </Text>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => onEdit(item)}
            style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: C.bgElevated, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
            <Text style={{ fontSize: 13 }}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(item)}
            style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: C.dangerDim, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.danger + '44' }}>
            <Text style={{ fontSize: 13, color: C.danger, fontWeight: '800' }}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={{ fontSize: 32, fontWeight: '900', color, letterSpacing: -1 }}>
        {soc != null ? soc.toFixed(0) + '%' : '—'}
      </Text>

      <View style={{ height: 8, borderRadius: 4, backgroundColor: C.bgElevated, overflow: 'hidden', borderWidth: 1, borderColor: color + '44' }}>
        <View style={{ width: (soc ?? 0) + '%', height: '100%', borderRadius: 4, backgroundColor: color }} />
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[
          { label: 'Tension',  value: item.voltage,     unit: 'V'  },
          { label: 'Courant',  value: item.current_a,   unit: 'A'  },
          { label: 'Temp.',    value: item.temperature,  unit: '°C' },
        ].map(({ label, value, unit }) => (
          <View key={label} style={{
            flex: 1, backgroundColor: C.bgElevated, borderRadius: 10,
            padding: 10, alignItems: 'center', gap: 2,
            borderWidth: 1, borderColor: C.border,
          }}>
            <Text style={{ fontSize: 8, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</Text>
            <Text style={{ fontSize: 14, fontWeight: '900', color: C.white }}>
              {value != null ? value.toFixed(1) : '—'}
            </Text>
            <Text style={{ fontSize: 8, color: C.textMuted }}>{unit}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Dashboard screen ───────────────────────────────────────

export default function DashboardScreen({ route, navigation }) {
  const scooter = route.params?.scooter;

  const [batteries,     setBatteries]     = useState([]);
  const [battLoading,   setBattLoading]   = useState(true);
  const [showBattForm,  setShowBattForm]  = useState(false);
  const [editingBatt,   setEditingBatt]   = useState(null);
  const [showTpmsForm,  setShowTpmsForm]  = useState(false);
  const [tpmsWheel,     setTpmsWheel]     = useState('AV');
  const [telemetry,     setTelemetry]     = useState(null);
  const [fallThreshold, setFallThreshold] = useState(scooter?.fall_threshold ?? 2.5);
  const [attention,     setAttention]     = useState({ visible: false, label: '', action: null });

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
      .limit(1).maybeSingle();
    if (data) setTelemetry(data);
  };

  const deleteBattery = (item) => {
    setAttention({
      visible: true,
      label: `Supprimer la batterie "${item.serial_number}" ?`,
      action: async () => {
        const { error } = await supabase.from('batteries').delete().eq('id', item.id);
        if (error) alertOk('Erreur', error.message);
        else fetchBatteries();
      },
    });
  };

  const showAttention = (label, action) => setAttention({ visible: true, label, action });

  useEffect(() => {
    if (!scooter?.id) return;
    fetchBatteries();
    fetchTelemetry();
    supabase.from('scooters').select('fall_threshold').eq('id', scooter.id).single()
      .then(({ data }) => { if (data?.fall_threshold != null) setFallThreshold(data.fall_threshold); });

    const battCh = supabase.channel('batt-' + scooter.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'batteries', filter: 'scooter_id=eq.' + scooter.id }, () => fetchBatteries())
      .subscribe();
    const telCh = supabase.channel('tel-' + scooter.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'telemetry', filter: 'scooter_id=eq.' + scooter.id }, () => fetchTelemetry())
      .subscribe();

    return () => { supabase.removeChannel(battCh); supabase.removeChannel(telCh); };
  }, [scooter?.id]);

  if (!scooter) return (
    <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }}>
      <TouchableOpacity onPress={() => navigation.goBack()}
        style={{ backgroundColor: C.bgCard, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderColor: C.border }}>
        <Text style={{ color: C.accentBright, fontWeight: '700' }}>← Retour</Text>
      </TouchableOpacity>
    </View>
  );

  const sc     = STATUS[telemetry?.status ?? scooter.status] ?? STATUS.offline;
  const tamper = telemetry?.tamper_points ?? [false, false, false];
  const front  = telemetry?.wheel_front;
  const rear   = telemetry?.wheel_rear;
  const lat    = telemetry?.latitude;
  const accelX = telemetry?.accel_x;
  const accelY = telemetry?.accel_y;
  const accelZ = telemetry?.accel_z;
  const isFallen = telemetry?.fallen ?? false;

  const wheelCol = (v) => {
    if (v == null) return C.textMuted;
    if (v < 2.0)   return C.danger;
    if (v < 2.3)   return C.warning;
    return C.success;
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}
            style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.bgCard, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
            <Text style={{ fontSize: 20, color: C.white }}>‹</Text>
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: C.white, letterSpacing: -0.5 }}>
              {scooter.name}
            </Text>
            {scooter.model ? <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{scooter.model}</Text> : null}
          </View>

          {lat != null && (
            <TouchableOpacity
              onPress={() => navigation.navigate('GPS', { scooter, telemetry })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.bgCard, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: C.border }}>
              <Text style={{ fontSize: 14 }}>📍</Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: C.accentBright }}>GPS</Text>
            </TouchableOpacity>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: sc.color + '44', backgroundColor: sc.bg }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: sc.color }} />
            <Text style={{ fontSize: 9, fontWeight: '700', color: sc.color }}>{sc.label}</Text>
          </View>
        </View>

        {/* ── Batteries ─────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <SectionHeader title="Batteries" />
          {batteries.length < MAX_BATTERIES && (
            <TouchableOpacity onPress={() => { setEditingBatt(null); setShowBattForm(true); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: C.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginTop: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: C.accentBright }}>+ Ajouter</Text>
            </TouchableOpacity>
          )}
        </View>

        {battLoading ? (
          <ActivityIndicator color={C.accent} style={{ marginVertical: 24 }} />
        ) : batteries.length === 0 ? (
          <View style={{ backgroundColor: C.bgCard, borderRadius: 16, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🔋</Text>
            <Text style={{ fontSize: 13, color: C.textMuted, textAlign: 'center' }}>Aucune batterie. Appuyez sur + Ajouter.</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {batteries.map(b => (
              <BatteryCard key={b.id} item={b}
                onEdit={item => { setEditingBatt(item); setShowBattForm(true); }}
                onDelete={deleteBattery}
              />
            ))}
          </View>
        )}

        {/* ── Points de sabotage ────────────────────────────── */}
        <SectionHeader title="Points de sabotage" />
        <View style={{ backgroundColor: C.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: tamper.some(Boolean) ? C.danger + '44' : C.border, flexDirection: 'row', gap: 10 }}>
          {['Siège', 'Avant', 'Batterie'].map((label, i) => {
            const active = tamper[i] ?? false;
            return (
              <View key={label} style={{
                flex: 1, backgroundColor: active ? C.dangerDim : C.bgElevated,
                borderRadius: 12, padding: 12, alignItems: 'center', gap: 6,
                borderWidth: 1, borderColor: active ? C.danger + '44' : C.border,
              }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: active ? C.danger : C.success }} />
                <Text style={{ fontSize: 10, fontWeight: '700', color: active ? C.danger : C.white, textAlign: 'center' }}>{label}</Text>
                <Text style={{ fontSize: 8, color: active ? C.danger : C.success }}>{active ? 'Alerte' : 'OK'}</Text>
              </View>
            );
          })}
        </View>

        {/* ── Contrôle R.C ──────────────────────────────────── */}
        <SectionHeader title="Controle R.C" />
        <View style={{ backgroundColor: C.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { label: 'Activer',    action: "Activer l'alarme",    color: C.success },
              { label: 'Désactiver', action: "Désactiver l'alarme", color: C.danger  },
            ].map(({ label, action, color }) => (
              <TouchableOpacity key={label}
                onPress={() => showAttention(action, () => alertOk('Info', `${action} envoyé`))}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: color + '22', borderWidth: 1, borderColor: color + '44' }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color }}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { label: 'Env. Marche', action: 'Démarrer le scooter', color: C.accentBright },
              { label: 'M. Arrêter',  action: 'Arrêter le scooter',  color: C.warning      },
            ].map(({ label, action, color }) => (
              <TouchableOpacity key={label}
                onPress={() => showAttention(action, () => alertOk('Info', `${action} envoyé`))}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: color + '22', borderWidth: 1, borderColor: color + '44' }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color }}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Gyroscope ─────────────────────────────────────── */}
        <SectionHeader title="Gyroscope" />
        <View style={{ backgroundColor: C.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: isFallen ? C.danger + '44' : C.border, gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: C.white }}>MPU-6050</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
              backgroundColor: isFallen ? C.dangerDim : C.successDim,
              borderWidth: 1, borderColor: isFallen ? C.danger + '44' : C.success + '33' }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isFallen ? C.danger : C.success }} />
              <Text style={{ fontSize: 9, fontWeight: '700', color: isFallen ? C.danger : C.success }}>
                {isFallen ? 'CHUTE !' : 'Stable'}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { label: 'Droite', value: accelX, color: '#FF6B6B' },
              { label: 'Gauche', value: accelY, color: '#51CF66' },
              { label: 'Avant',  value: accelZ, color: '#339AF0' },
            ].map(({ label, value, color }) => (
              <View key={label} style={{ flex: 1, backgroundColor: C.bgElevated, borderRadius: 12, padding: 12, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: C.border }}>
                <Text style={{ fontSize: 9, fontWeight: '800', color, letterSpacing: 1 }}>{label}</Text>
                <Text style={{ fontSize: 18, fontWeight: '900', color: C.white }}>
                  {value != null ? value.toFixed(1) : '—'}
                </Text>
                <Text style={{ fontSize: 8, color: C.textMuted }}>g</Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.bgElevated, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ fontSize: 10, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>Seuil chute</Text>
            <Text style={{ fontSize: 15, fontWeight: '900', color: C.warning }}>{fallThreshold} g</Text>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('Parametres', { tab: 'gyroscope', scooter })}
            style={{ backgroundColor: C.bgElevated, borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.accentBright }}>⚙️ Configurer les seuils</Text>
          </TouchableOpacity>
        </View>

        {/* ── TPMS ──────────────────────────────────────────── */}
        <SectionHeader title="TPMS" />
        <View style={{ backgroundColor: C.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[
              { label: 'AV.', value: front, color: wheelCol(front) },
              { label: 'AR.', value: rear,  color: wheelCol(rear)  },
            ].map(({ label, value, color }) => (
              <View key={label} style={{ flex: 1, backgroundColor: C.bgElevated, borderRadius: 14, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: color + '44' }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</Text>
                <Text style={{ fontSize: 26, fontWeight: '900', color, letterSpacing: -1 }}>
                  {value != null ? value.toFixed(1) : '—'}
                </Text>
                <Text style={{ fontSize: 9, color: C.textMuted }}>Bar</Text>
                <Text style={{ fontSize: 9, fontWeight: '700', color }}>
                  {value == null ? '—' : value < 2.0 ? 'Critique' : value < 2.3 ? 'Bas' : 'OK'}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['AV', 'AR'].map(w => (
              <TouchableOpacity key={w}
                onPress={() => { setTpmsWheel(w); setShowTpmsForm(true); }}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: C.accentBright }}>+ TPMS {w}.</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {telemetry?.recorded_at && (
          <Text style={{ fontSize: 9, color: C.textMuted, textAlign: 'center', marginTop: 20 }}>
            Dernière mise à jour : {timeAgo(telemetry.recorded_at)}
          </Text>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <BatteryFormModal
        visible={showBattForm}
        onClose={() => setShowBattForm(false)}
        onSaved={fetchBatteries}
        scooterId={scooter?.id}
        initial={editingBatt}
        usedSlots={usedSlots}
      />

      <TpmsFormModal
        visible={showTpmsForm}
        onClose={() => setShowTpmsForm(false)}
        onSaved={() => {}}
        scooterId={scooter?.id}
        wheel={tpmsWheel}
      />

      <AttentionModal
        visible={attention.visible}
        label={attention.label}
        onOui={() => { attention.action?.(); setAttention({ visible: false, label: '', action: null }); }}
        onNon={() => setAttention({ visible: false, label: '', action: null })}
      />
    </View>
  );
}
