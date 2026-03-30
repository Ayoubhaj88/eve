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

function SectionTitle({ title }) {
  return (
    <Text style={{
      fontSize: 16, fontWeight: '900', color: C.white,
      marginTop: 22, marginBottom: 10,
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
      setSlot([1, 2, 3].find(s => !usedSlots.includes(s)) ?? 1);
    }
  }, [initial, visible]);

  const slotLabel = (s) => s === 3 ? 'Batterie reserve' : `Batterie ${s}`;

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
                    <Text style={{ fontSize: 11, fontWeight: '800', color: active ? C.accent : C.white }}>
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
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 14, color: C.white, fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', marginBottom: 14 }}
          />

          <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            N° BMS
          </Text>
          <TextInput value={bmsId} onChangeText={setBmsId}
            placeholder="xx:xx:xx:xx:xx:xx" placeholderTextColor="rgba(255,255,255,0.4)"
            autoCapitalize="none"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 14, color: C.white, fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', marginBottom: 20, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' }}
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
      const { error } = await supabase.from('scooters').update({ [col]: tpmsId.trim() }).eq('id', scooterId);
      if (error) throw error;
      onSaved(); onClose();
    } catch (e) { alertOk('Erreur', e.message); }
    finally     { setLoading(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} activeOpacity={1} onPress={onClose} />
        <View style={{ backgroundColor: C.accent, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: Platform.OS === 'ios' ? 44 : 28 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', alignSelf: 'center', marginBottom: 20 }} />
          <Text style={{ fontSize: 20, fontWeight: '900', color: C.white, marginBottom: 20, textAlign: 'center' }}>TPMS {wheel}.</Text>
          <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>ID :</Text>
          <TextInput value={tpmsId} onChangeText={setTpmsId} placeholder="ex: RAF3G5" placeholderTextColor="rgba(255,255,255,0.4)" autoCapitalize="characters"
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

// ── Battery card (style Figma) ──────────────────────────────

function BatteryCard({ item, onEdit, onDelete }) {
  const soc       = item.soc;
  const color     = battColor(soc);
  const slotLabel = item.slot === 3 ? 'Batterie reserve' : `Batterie ${item.slot ?? '?'}`;

  const statusLabel = item.bms_status === 'charging'    ? 'En charge'
                    : item.bms_status === 'discharging' ? 'Active'
                    : item.bms_status === 'idle'        ? 'Stable'
                    : item.bms_status === 'error'       ? 'Erreur'
                    : soc != null                        ? 'Stable'
                    : 'Indisponible';

  const statusColor = statusLabel === 'En charge'   ? C.success
                    : statusLabel === 'Active'       ? C.accentBright
                    : statusLabel === 'Stable'       ? C.success
                    : statusLabel === 'Erreur'       ? C.danger
                    : C.textMuted;

  return (
    <View style={{
      backgroundColor: C.bgCard, borderRadius: 14,
      borderWidth: 1, borderColor: C.border, padding: 14,
      marginBottom: 8,
    }}>
      {/* Row 1: label + status badge + icons */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <Text style={{ flex: 1, fontSize: 13, fontWeight: '800', color: C.white }}>{slotLabel}</Text>

        {/* Status badge */}
        <View style={{
          paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8,
          backgroundColor: statusColor + '22', borderWidth: 1, borderColor: statusColor + '44',
          marginRight: 8,
        }}>
          <Text style={{ fontSize: 9, fontWeight: '700', color: statusColor }}>{statusLabel}</Text>
        </View>

        {/* Wifi icon */}
        <Text style={{ fontSize: 14, marginRight: 6 }}>📶</Text>
        {/* Settings */}
        <TouchableOpacity onPress={() => onEdit(item)}>
          <Text style={{ fontSize: 14, marginRight: 6 }}>⚙️</Text>
        </TouchableOpacity>
        {/* Delete */}
        <TouchableOpacity onPress={() => onDelete(item)}>
          <Text style={{ fontSize: 14, color: C.danger }}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Row 2: SOC + N° Serie */}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: '900', color, letterSpacing: -1 }}>
          {soc != null ? soc.toFixed(0) + '%' : 'NA'}
        </Text>
        <View>
          <Text style={{ fontSize: 10, color: C.textMuted }}>N° Serie :</Text>
          {item.serial_number ? (
            <Text style={{ fontSize: 11, color: C.accentBright, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' }}>
              {item.serial_number}
            </Text>
          ) : null}
        </View>
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
    const { data, error } = await supabase.from('batteries').select('*')
      .eq('scooter_id', scooter.id).order('slot', { ascending: true });
    if (!error) setBatteries(data ?? []);
    setBattLoading(false);
  };

  const fetchTelemetry = async () => {
    if (!scooter?.id) return;
    const { data } = await supabase.from('telemetry').select('*')
      .eq('scooter_id', scooter.id).order('recorded_at', { ascending: false })
      .limit(1).maybeSingle();
    if (data) setTelemetry(data);
  };

  const deleteBattery = (item) => {
    setAttention({
      visible: true,
      label: `Supprimer "${item.serial_number}" ?`,
      action: async () => {
        const { error } = await supabase.from('batteries').delete().eq('id', item.id);
        if (error) alertOk('Erreur', error.message);
        else fetchBatteries();
      },
    });
  };

  const showAtt = (label, action) => setAttention({ visible: true, label, action });

  useEffect(() => {
    if (!scooter?.id) return;
    fetchBatteries(); fetchTelemetry();
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

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: Platform.OS === 'ios' ? 56 : 36 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header : ← Scooter 2 👤 ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.success, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 20, color: C.white, fontWeight: '800' }}>←</Text>
          </TouchableOpacity>

          <Text style={{ flex: 1, fontSize: 22, fontWeight: '900', color: C.white, textAlign: 'center', letterSpacing: -0.5 }}>
            {scooter.name}
          </Text>

          <TouchableOpacity
            onPress={() => lat != null && navigation.navigate('GPS', { scooter, telemetry })}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.accentBright, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 18 }}>👤</Text>
          </TouchableOpacity>
        </View>

        {/* Status badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: sc.color }}>{sc.label}</Text>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: sc.color }} />
        </View>

        {/* ── Batteries ─────────────────────────────────────── */}
        <SectionTitle title="Batteries" />

        {battLoading ? (
          <ActivityIndicator color={C.accent} style={{ marginVertical: 20 }} />
        ) : batteries.length === 0 ? (
          <View style={{ backgroundColor: C.bgCard, borderRadius: 14, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
            <Text style={{ fontSize: 28, marginBottom: 8 }}>🔋</Text>
            <Text style={{ fontSize: 13, color: C.textMuted }}>Aucune batterie.</Text>
          </View>
        ) : (
          batteries.map(b => (
            <BatteryCard key={b.id} item={b}
              onEdit={item => { setEditingBatt(item); setShowBattForm(true); }}
              onDelete={deleteBattery}
            />
          ))
        )}

        {batteries.length < MAX_BATTERIES && (
          <TouchableOpacity onPress={() => { setEditingBatt(null); setShowBattForm(true); }}
            style={{ borderWidth: 1, borderColor: C.accent, borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: C.accentBright }}>+ Ajouter batterie</Text>
          </TouchableOpacity>
        )}

        {/* ── Points de sabotage ────────────────────────────── */}
        <SectionTitle title="Points de sabotage" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {['Siège', 'Avant', 'Batterie'].map((label, i) => {
            const active = tamper[i] ?? false;
            const bg = active ? '#3A0A14' : C.bgElevated;
            const borderCol = active ? C.danger + '55' : C.border;
            return (
              <View key={label} style={{
                flex: 1, backgroundColor: bg, borderRadius: 12,
                padding: 12, alignItems: 'center', gap: 6,
                borderWidth: 1, borderColor: borderCol,
              }}>
                <Text style={{ fontSize: 22 }}>🚨</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: active ? C.danger : C.white }}>
                  {label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* ── Controle R.C ──────────────────────────────────── */}
        <SectionTitle title="Controle R.C" />
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[
            { label: 'Activer',       action: "Activer l'alarme"    },
            { label: 'Désactiver',    action: "Désactiver l'alarme" },
            { label: 'Env.',          action: 'Envoyer commande'    },
            { label: 'Marche M.',     action: 'Démarrer le scooter' },
            { label: 'Arrêter M.',    action: 'Arrêter le scooter'  },
          ].map(({ label, action }) => (
            <TouchableOpacity key={label}
              onPress={() => showAtt(action, () => alertOk('Info', `${action} envoyé`))}
              style={{
                flex: 1, backgroundColor: C.bgElevated, borderRadius: 12,
                paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center', gap: 5,
                borderWidth: 1, borderColor: C.border,
              }}>
              <Text style={{ fontSize: 16 }}>🔔</Text>
              <Text style={{ fontSize: 8, fontWeight: '700', color: C.white, textAlign: 'center' }} numberOfLines={2}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Gyroscope ─────────────────────────────────────── */}
        <SectionTitle title="Gyroscope" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            { label: 'Droite', value: accelX, defVal: 30,  bg: '#5C1A1A', color: '#FF6B6B' },
            { label: 'Gauche', value: accelY, defVal: 130, bg: '#1A3A1A', color: '#51CF66' },
            { label: 'Avant',  value: accelZ, defVal: 25,  bg: '#1A2A4A', color: '#339AF0' },
          ].map(({ label, value, defVal, bg, color }) => (
            <View key={label} style={{
              flex: 1, backgroundColor: bg, borderRadius: 12,
              padding: 12, alignItems: 'center', gap: 4,
              borderWidth: 1, borderColor: color + '44',
            }}>
              <Text style={{ fontSize: 9, fontWeight: '800', color, letterSpacing: 1 }}>{label}</Text>
              <Text style={{ fontSize: 22, fontWeight: '900', color: C.white }}>
                {value != null ? `${value.toFixed(0)}°` : `${defVal}°`}
              </Text>
            </View>
          ))}
        </View>

        {/* ── TPMS ──────────────────────────────────────────── */}
        <SectionTitle title="TPMS" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            { label: 'AV.', value: front, tpmsId: scooter.tpms_id_front },
            { label: 'AR.', value: rear,  tpmsId: scooter.tpms_id_rear  },
          ].map(({ label, value, tpmsId }) => {
            const temp = telemetry?.tpms_temp;
            return (
              <View key={label} style={{
                flex: 1, backgroundColor: C.bgCard, borderRadius: 14,
                borderWidth: 1, borderColor: C.border, padding: 12, gap: 8,
              }}>
                {/* Pression + Temp */}
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                  <View>
                    <Text style={{ fontSize: 22, fontWeight: '900', color: C.white }}>
                      {value != null ? value.toFixed(1) : '—'}
                    </Text>
                    <Text style={{ fontSize: 9, color: C.textMuted }}>Bar</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: C.textSecondary }}>
                      {temp != null ? temp : '30'}
                    </Text>
                    <Text style={{ fontSize: 8, color: C.textMuted }}>°C</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: C.accentBright }}>{label}</Text>
                </View>

                {/* ID + actions */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ flex: 1, fontSize: 10, color: C.accentBright,
                    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' }}>
                    {tpmsId ?? 'RAF3G5'}
                  </Text>
                  <TouchableOpacity onPress={() => {
                    setTpmsWheel(label === 'AV.' ? 'AV' : 'AR');
                    setShowTpmsForm(true);
                  }}>
                    <Text style={{ fontSize: 13 }}>⚙️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => showAtt(`Supprimer TPMS ${label}`, () => alertOk('Info', 'TPMS supprimé'))}>
                    <Text style={{ fontSize: 13, color: C.danger }}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* Dernière MAJ */}
        {telemetry?.recorded_at && (
          <Text style={{ fontSize: 9, color: C.textMuted, textAlign: 'center', marginTop: 20 }}>
            Dern. maj : {timeAgo(telemetry.recorded_at)}
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
