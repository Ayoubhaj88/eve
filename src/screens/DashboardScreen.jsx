import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { C, STATUS, battColor, timeAgo, alertOk, alertConfirm } from '../constants';
import {
  View, Text, ScrollView, TouchableOpacity,
  StatusBar, Platform, Modal, TextInput,
  KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';

const MAX_BATTERIES = 3;

const BMS_STATUS = {
  charging:    { color: C.warning,   bg: C.warningDim,  icon: '⚡', label: 'En charge' },
  discharging: { color: C.success,   bg: C.successDim,  icon: '🔋', label: 'Décharge'  },
  idle:        { color: C.textMuted, bg: 'transparent', icon: '⏸️', label: 'Inactif'   },
  error:       { color: C.danger,    bg: C.dangerDim,   icon: '⚠️', label: 'Erreur'    },
};

// ── Helpers ───────────────────────────────────────────────

function fmtV(v)  { return v != null ? v.toFixed(1) + 'V' : '—'; }
function fmtA(v)  { return v != null ? v.toFixed(1) + 'A' : '—'; }
function fmtW(v)  { return v != null ? v.toFixed(0) + 'W' : '—'; }
function fmtC(v)  { return v != null ? v.toFixed(0) + '°C' : '—'; }
function fmtPct(v){ return v != null ? v.toFixed(0) + '%' : '—'; }

function tempColor(t) {
  if (t == null) return C.textMuted;
  if (t > 45) return C.danger;
  if (t > 35) return C.warning;
  return C.success;
}

// ── Stat cell ──────────────────────────────────────────────

function StatCell({ label, value, color }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
      <Text style={{ fontSize: 15, fontWeight: '900', color: color ?? C.white }}>{value}</Text>
      <Text style={{ fontSize: 7, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</Text>
    </View>
  );
}

// ── Cell voltages chart ────────────────────────────────────

function CellVoltages({ voltages }) {
  if (!voltages || !voltages.length) return null;
  const min = Math.min(...voltages);
  const max = Math.max(...voltages);
  const avg = voltages.reduce((a, b) => a + b, 0) / voltages.length;
  const delta = max - min;

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 9, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
        Cellules ({voltages.length}S)
      </Text>
      <View style={{ flexDirection: 'row', gap: 2, height: 28, alignItems: 'flex-end' }}>
        {voltages.map((v, i) => {
          const d = Math.abs(v - avg);
          let color = C.success;
          if (d > 0.05) color = C.danger;
          else if (d > 0.02) color = C.warning;
          const h = max === min ? 20 : 8 + ((v - min) / delta) * 20;
          return (
            <View key={i} style={{
              flex: 1, height: h, borderRadius: 2,
              backgroundColor: color,
            }} />
          );
        })}
      </View>
      <Text style={{ fontSize: 8, color: C.textMuted }}>
        {min.toFixed(3)}V — {max.toFixed(3)}V (Δ{(delta * 1000).toFixed(0)}mV)
      </Text>
    </View>
  );
}

// ── Protection flags ───────────────────────────────────────

function ProtectionFlags({ protection }) {
  if (!protection || !Object.keys(protection).length) return null;
  const flags = [
    { key: 'overvoltage',           label: 'Surtension' },
    { key: 'undervoltage',          label: 'Sous-tension' },
    { key: 'overcurrent_charge',    label: 'Surint. charge' },
    { key: 'overcurrent_discharge', label: 'Surint. dech.' },
    { key: 'overtemp',              label: 'Surchauffe' },
    { key: 'short_circuit',         label: 'Court-circuit' },
  ];
  const active = flags.filter(f => protection[f.key]);
  const allOk = active.length === 0;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {allOk ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.successDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: C.success + '33' }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.success }} />
          <Text style={{ fontSize: 9, fontWeight: '700', color: C.success }}>Protection OK</Text>
        </View>
      ) : active.map(f => (
        <View key={f.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.dangerDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: C.danger + '33' }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.danger }} />
          <Text style={{ fontSize: 9, fontWeight: '700', color: C.danger }}>{f.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Battery bar ────────────────────────────────────────────

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
        <View style={{ width: (value ?? 0) + '%', height: '100%', borderRadius: 1.5, backgroundColor: color }} />
      </View>
      <View style={{ width: 3, height: 7, borderRadius: 1, backgroundColor: color + '99' }} />
    </View>
  );
}

// ── Pack summary (aggregate) ───────────────────────────────

function PackSummary({ batteries }) {
  const withBms = batteries.filter(b => b.voltage != null);
  if (!withBms.length) return null;

  const avgVoltage   = withBms.reduce((s, b) => s + b.voltage, 0) / withBms.length;
  const totalCurrent = withBms.reduce((s, b) => s + (b.current_a ?? 0), 0);
  const totalPower   = withBms.reduce((s, b) => s + (b.power_w ?? 0), 0);
  const avgTemp      = withBms.reduce((s, b) => s + (b.temperature ?? 0), 0) / withBms.length;
  const totalCap     = batteries.reduce((s, b) => s + (b.capacity_ah ?? 0), 0);

  const weightedSoc = batteries.reduce((s, b) => s + (b.soc ?? 0) * (b.capacity_ah ?? 1), 0)
    / batteries.reduce((s, b) => s + (b.capacity_ah ?? 1), 0);

  return (
    <View style={{ backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, marginBottom: 20, overflow: 'hidden' }}>
      <View style={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5 }}>
            Pack batterie
          </Text>
          <Text style={{ fontSize: 10, color: C.textMuted }}>
            {batteries.length} batt. • {totalCap.toFixed(0)}Ah
          </Text>
        </View>

        <View style={{ alignItems: 'center', gap: 6 }}>
          <BatteryBar value={weightedSoc} fullWidth />
          <Text style={{ fontSize: 38, fontWeight: '900', letterSpacing: -2, color: battColor(weightedSoc) }}>
            {fmtPct(weightedSoc)}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: C.border, paddingVertical: 12 }}>
        <StatCell label="Tension" value={fmtV(avgVoltage)} />
        <StatCell label="Courant" value={fmtA(totalCurrent)} color={totalCurrent > 0 ? C.warning : C.success} />
        <StatCell label="Puiss." value={fmtW(totalPower)} />
        <StatCell label="Temp" value={fmtC(avgTemp)} color={tempColor(avgTemp)} />
      </View>
    </View>
  );
}

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

// ── Battery card (enhanced) ────────────────────────────────

function BatteryCard({ item, onEdit, onDelete }) {
  const bms    = BMS_STATUS[item.bms_status] ?? null;
  const hasBms = item.voltage != null || item.soc != null;

  return (
    <View style={{
      backgroundColor: C.bgCard, borderRadius: 18,
      borderWidth: 1, borderColor: C.border, marginBottom: 10, overflow: 'hidden',
    }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderColor: C.border }}>
        <View style={{
          width: 38, height: 38, borderRadius: 11, backgroundColor: C.bgElevated,
          justifyContent: 'center', alignItems: 'center',
          borderWidth: 1, borderColor: C.border, marginRight: 12,
        }}>
          <Text style={{ fontSize: 20 }}>🔋</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{
              fontSize: 13, fontWeight: '800', color: C.white, letterSpacing: 0.5,
              fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
            }}>
              {item.serial_number}
            </Text>
            <View style={{ backgroundColor: C.accent + '22', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: C.accent + '44' }}>
              <Text style={{ fontSize: 9, fontWeight: '800', color: C.accent }}>Slot {item.slot ?? 1}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 9, color: C.textMuted, marginTop: 2 }}>
            {item.cell_count ?? 16}S • {item.capacity_ah ?? 20}Ah • {item.cycles ?? 0} cycles
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

      {hasBms ? (
        <View style={{ padding: 14, gap: 14 }}>
          {/* SOC + SOH row */}
          {item.soc != null && (
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                  <Text style={{ fontSize: 28, fontWeight: '900', color: battColor(item.soc) }}>
                    {item.soc.toFixed(0)}%
                  </Text>
                  <Text style={{ fontSize: 9, color: C.textMuted, textTransform: 'uppercase' }}>SOC</Text>
                </View>
                {item.soh != null && (
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                    <Text style={{ fontSize: 9, color: C.textMuted, textTransform: 'uppercase' }}>SOH</Text>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: item.soh > 80 ? C.success : item.soh > 50 ? C.warning : C.danger }}>
                      {item.soh.toFixed(0)}%
                    </Text>
                  </View>
                )}
              </View>
              <BatteryBar value={item.soc} fullWidth />
            </View>
          )}

          {/* BMS status badge */}
          {bms && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
              backgroundColor: bms.bg, borderRadius: 10,
              paddingHorizontal: 12, paddingVertical: 6,
              borderWidth: 1, borderColor: bms.color + '33',
            }}>
              <Text style={{ fontSize: 14 }}>{bms.icon}</Text>
              <Text style={{ fontSize: 11, fontWeight: '800', color: bms.color }}>{bms.label}</Text>
            </View>
          )}

          {/* Stats row: Voltage / Current / Power / Temp */}
          {item.voltage != null && (
            <View style={{ flexDirection: 'row', backgroundColor: C.bgElevated, borderRadius: 12, paddingVertical: 10, borderWidth: 1, borderColor: C.border }}>
              <StatCell label="Tension" value={fmtV(item.voltage)} />
              <StatCell label="Courant" value={fmtA(item.current_a)} color={item.current_a > 0 ? C.warning : C.success} />
              <StatCell label="Puiss." value={fmtW(item.power_w)} />
              <StatCell label="Temp" value={fmtC(item.temperature)} color={tempColor(item.temperature)} />
            </View>
          )}

          {/* Cell voltages */}
          <CellVoltages voltages={item.cell_voltages} />

          {/* Protection */}
          <ProtectionFlags protection={item.protection} />

          {/* Updated at */}
          {item.updated_at && (
            <Text style={{ fontSize: 9, color: C.textMuted, textAlign: 'right' }}>
              Mis a jour {timeAgo(item.updated_at)}
            </Text>
          )}
        </View>
      ) : (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: 11, color: C.textMuted }}>
            En attente des donnees BMS...
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Dashboard screen ───────────────────────────────────────

export default function DashboardScreen({ route, navigation }) {
  const scooter = route.params?.scooter;

  const [tel, setTel] = useState({
    battery:     null,
    charging:    false,
    status:      scooter?.status ?? 'offline',
    recorded_at: null,
  });
  const [telLoading, setTelLoading] = useState(true);

  const [batteries,   setBatteries]   = useState([]);
  const [battLoading, setBattLoading] = useState(false);
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

  const fetchTel = async () => {
    if (!scooter?.id) return;
    const { data, error } = await supabase
      .from('telemetry')
      .select('battery, charging, status, recorded_at')
      .eq('scooter_id', scooter.id)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data && !error) setTel(p => ({ ...p, ...data }));
    setTelLoading(false);
  };

  useEffect(() => {
    if (!scooter?.id) return;
    fetchTel();
    const poll = setInterval(fetchTel, 15000);

    const telCh = supabase.channel('tel-' + scooter.id)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'telemetry', filter: 'scooter_id=eq.' + scooter.id,
      }, ({ new: d }) => setTel(p => ({
        battery:     d.battery     ?? p.battery,
        charging:    d.charging    ?? p.charging,
        status:      d.status      ?? p.status,
        recorded_at: d.recorded_at ?? p.recorded_at,
      })))
      .subscribe();

    const battCh = supabase.channel('batt-' + scooter.id)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public',
        table: 'batteries', filter: 'scooter_id=eq.' + scooter.id,
      }, ({ new: d }) => setBatteries(prev => prev.map(b => b.id === d.id ? { ...b, ...d } : b)))
      .subscribe();

    fetchBatteries();
    return () => {
      clearInterval(poll);
      supabase.removeChannel(telCh);
      supabase.removeChannel(battCh);
    };
  }, [scooter?.id]);

  if (!scooter) return (
    <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
      <TouchableOpacity onPress={() => navigation.goBack()}
        style={{ backgroundColor: C.bgElevated, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 }}>
        <Text style={{ color: C.accent, fontWeight: '700' }}>Retour</Text>
      </TouchableOpacity>
    </View>
  );

  const sc = STATUS[tel.status] ?? STATUS.offline;

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
            {scooter.model     ? <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{scooter.model}</Text>     : null}
            {scooter.reference ? <Text style={{ fontSize: 10, color: C.accent,   marginTop: 2 }}>#{scooter.reference}</Text> : null}
          </View>
          <Text style={{ fontSize: 48 }}>🛵</Text>
        </View>

        {/* Pack summary (from BMS data) or fallback to telemetry */}
        {batteries.some(b => b.voltage != null) ? (
          <PackSummary batteries={batteries} />
        ) : (
          <View style={{ backgroundColor: C.bgCard, borderRadius: 18, padding: 20, alignItems: 'center', gap: 8, marginBottom: 20, borderWidth: 1, borderColor: C.border }}>
            {telLoading ? (
              <ActivityIndicator color={C.accent} style={{ marginVertical: 18 }} />
            ) : (
              <>
                <BatteryBar value={tel.battery} />
                <Text style={{ fontSize: 52, fontWeight: '900', letterSpacing: -2, color: battColor(tel.battery) }}>
                  {tel.battery != null ? tel.battery + '%' : '—'}
                </Text>
                {tel.charging ? (
                  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: C.warningDim, borderWidth: 1, borderColor: C.warning + '55' }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: C.warning }}>⚡ En charge</Text>
                  </View>
                ) : null}
              </>
            )}
            <Text style={{ fontSize: 9, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5 }}>
              Charge globale (telemetrie)
            </Text>
          </View>
        )}

        {/* Header batteries */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5 }}>
            Batteries ({batteries.length}/{MAX_BATTERIES})
          </Text>
          {batteries.length < MAX_BATTERIES && (
            <TouchableOpacity
              onPress={() => { setEditingBatt(null); setShowForm(true); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
              <Text style={{ fontSize: 16, color: C.bg, fontWeight: '900', lineHeight: 20 }}>+</Text>
              <Text style={{ fontSize: 11, fontWeight: '800', color: C.bg }}>Ajouter</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Liste batteries */}
        {battLoading ? (
          <ActivityIndicator color={C.accent} style={{ marginVertical: 24 }} />
        ) : batteries.length === 0 ? (
          <View style={{ backgroundColor: C.bgCard, borderRadius: 16, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: C.border, borderStyle: 'dashed', marginBottom: 20 }}>
            <Text style={{ fontSize: 36, marginBottom: 10 }}>🔋</Text>
            <Text style={{ fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20 }}>
              Aucune batterie enregistree.{'\n'}Appuyez sur + pour en ajouter une.
            </Text>
          </View>
        ) : batteries.map(b => (
          <BatteryCard key={b.id} item={b}
            onEdit={(item) => { setEditingBatt(item); setShowForm(true); }}
            onDelete={deleteBattery}
          />
        ))}

        {tel.recorded_at ? (
          <Text style={{ fontSize: 10, color: C.textMuted, textAlign: 'center', marginTop: 8 }}>
            Derniere telemetrie {timeAgo(tel.recorded_at)}
          </Text>
        ) : null}

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
