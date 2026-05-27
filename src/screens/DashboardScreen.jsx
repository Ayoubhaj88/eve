import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { C, STATUS, battColor, alertOk } from '../constants';
import {
  View, Text, ScrollView, TouchableOpacity,
  StatusBar, Platform, Modal,
  KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AttentionModal from '../components/AttentionModal';
import { mqttManager } from '../lib/mqttManager';

const MAX_BATTERIES = 3;
const FALL_THRESHOLD = 55;

const normalizeScooterId = (id) =>
  id ? String(id).trim().toLowerCase().replace(/-/g, '') : '';

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

function BatteryPickerModal({ visible, onClose, onSaved, scooterId, usedSlots }) {
  const [stockBatteries, setStockBatteries] = useState([]);
  const [selectedId,     setSelectedId]     = useState(null);
  const [slot,           setSlot]           = useState(1);
  const [loading,        setLoading]        = useState(false);
  const [fetching,       setFetching]       = useState(true);

  const slotLabel = (s) => s === 3 ? 'Réserve' : `Batterie ${s}`;

  useEffect(() => {
    if (!visible) return;
    setSelectedId(null);
    setSlot([1, 2, 3].find(s => !usedSlots.includes(s)) ?? 1);
    setFetching(true);
    supabase.from('batteries').select('*')
      .is('scooter_id', null)
      .order('serial_number')
      .then(({ data }) => { setStockBatteries(data ?? []); setFetching(false); });
  }, [visible]);

  const assign = async () => {
    if (!selectedId) { alertOk('Erreur', 'Sélectionnez une batterie.'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.from('batteries')
        .update({ scooter_id: scooterId, slot })
        .eq('id', selectedId);
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
          padding: 24, paddingBottom: Platform.OS === 'ios' ? 44 : 24, maxHeight: '75%',
        }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.bgElevated, alignSelf: 'center', marginBottom: 20 }} />
          <Text style={{ fontSize: 20, fontWeight: '900', color: C.white, marginBottom: 16, textAlign: 'center' }}>
            Assigner une batterie
          </Text>

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {[1, 2, 3].map(s => {
              const taken  = usedSlots.includes(s);
              const active = slot === s;
              return (
                <TouchableOpacity key={s} disabled={taken} onPress={() => setSlot(s)}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
                    backgroundColor: active ? C.accent : C.bgElevated,
                    borderWidth: 1, borderColor: active ? C.accent : C.border,
                    opacity: taken ? 0.35 : 1,
                  }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: active ? C.white : C.textSecondary }}>
                    {slotLabel(s)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={{ fontSize: 10, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Batteries en stock ({stockBatteries.length})
          </Text>

          {fetching ? (
            <ActivityIndicator color={C.accent} style={{ marginVertical: 20 }} />
          ) : stockBatteries.length === 0 ? (
            <View style={{ backgroundColor: C.bgElevated, borderRadius: 14, padding: 24, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: C.border }}>
              <Text style={{ fontSize: 28, marginBottom: 8 }}>🔋</Text>
              <Text style={{ fontSize: 13, color: C.textMuted, textAlign: 'center' }}>
                Aucune batterie en stock.{'\n'}Ajoutez-en via le menu ☰ → Ajouter Batterie
              </Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 220, marginBottom: 16 }}>
              {stockBatteries.map(b => {
                const selected = selectedId === b.id;
                return (
                  <TouchableOpacity key={b.id} onPress={() => setSelectedId(b.id)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                      backgroundColor: selected ? C.accent + '22' : C.bgElevated,
                      borderRadius: 12, padding: 12, marginBottom: 6,
                      borderWidth: 2, borderColor: selected ? C.accent : C.border,
                    }}>
                    <Text style={{ fontSize: 22 }}>🔋</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: C.white }}>{b.serial_number}</Text>
                      {b.num_bt ? (
                        <Text style={{ fontSize: 10, color: C.accentBright, fontWeight: '600' }}>BT: {b.num_bt}</Text>
                      ) : null}
                      {b.soc != null && (
                        <Text style={{ fontSize: 10, color: C.textMuted }}>SOC: {b.soc}%</Text>
                      )}
                    </View>
                    {selected && (
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: C.accent, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ color: C.white, fontSize: 14, fontWeight: '800' }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <TouchableOpacity onPress={assign} disabled={loading || !selectedId} activeOpacity={0.8}
            style={{ backgroundColor: C.accent, borderRadius: 14, padding: 16, alignItems: 'center', opacity: (loading || !selectedId) ? 0.5 : 1 }}>
            {loading
              ? <ActivityIndicator color={C.white} />
              : <Text style={{ fontSize: 16, fontWeight: '900', color: C.white }}>Assigner au {slotLabel(slot)}</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function BatteryCard({ item, onUnassign, onDelete }) {
  const soc       = item.soc;
  const color     = battColor(soc);
  const slotLabel = item.slot === 3 ? 'Batterie reserve' : `Batterie ${item.slot ?? '?'}`;

  const statusLabel = soc != null && soc > 20  ? 'Stable'
                    : soc != null && soc <= 20 ? 'Faible'
                    : 'Indisponible';

  const statusColor = statusLabel === 'Stable' ? C.success
                    : statusLabel === 'Faible' ? C.warning
                    : C.textMuted;

  return (
    <View style={{
      backgroundColor: C.bgCard, borderRadius: 16,
      borderWidth: 1, borderColor: C.border,
      padding: 14, marginBottom: 8,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ flex: 1, fontSize: 15, fontWeight: '900', color: C.white }}>{slotLabel}</Text>
		
		{item.bms_status ? (
		  <View style={{
			paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
			backgroundColor: item.bms_status === 'charging' ? C.accent
						   : item.bms_status === 'in_use'   ? C.warning
						   : C.success,
			marginRight: 6,
		  }}>
			<Text style={{ fontSize: 11, fontWeight: '800', color: C.white }}>
			  {item.bms_status === 'charging' ? 'En charge'
			 : item.bms_status === 'in_use'   ? 'En utilisation'
			 : 'En veille'}
			</Text>
		  </View>
		) : null}
		
        <View style={{
          paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20,
          backgroundColor: statusColor,
          marginRight: 10,
        }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: C.white }}>{statusLabel}</Text>
        </View>

        <TouchableOpacity onPress={() => onUnassign(item)}
          style={{
            width: 32, height: 32, borderRadius: 8,
            backgroundColor: C.bgElevated, justifyContent: 'center', alignItems: 'center',
            borderWidth: 1, borderColor: C.border, marginRight: 6,
          }}>
          <Text style={{ fontSize: 16 }}>⚙️</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onDelete(item)}
          style={{
            width: 32, height: 32, borderRadius: 8,
            backgroundColor: C.bgElevated, justifyContent: 'center', alignItems: 'center',
            borderWidth: 1, borderColor: C.border,
          }}>
          <Text style={{ fontSize: 16, color: C.accentBright, fontWeight: '800' }}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ flex: 0, fontSize: 32, fontWeight: '900', color, letterSpacing: -1 }}>
          {soc != null ? soc.toFixed(0) + '%' : 'NA'}
        </Text>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 11, color: C.textMuted, fontWeight: '700' }}>N° Serie :</Text>
            <View style={{
              flex: 1, backgroundColor: C.bgElevated, borderRadius: 8,
              paddingHorizontal: 10, paddingVertical: 5,
              borderWidth: 1, borderColor: C.border,
            }}>
              <Text style={{
                fontSize: 11, color: C.accentBright,
                fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
              }}>
                {item.serial_number ?? '—'}
              </Text>
            </View>
          </View>
          {item.num_bt ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 11, color: C.textMuted, fontWeight: '700' }}>N° BT :</Text>
              <View style={{
                flex: 1, backgroundColor: C.bgElevated, borderRadius: 8,
                paddingHorizontal: 10, paddingVertical: 5,
                borderWidth: 1, borderColor: C.border,
              }}>
                <Text style={{
                  fontSize: 11, color: C.accentBright,
                  fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
                }}>
                  {item.num_bt}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function DashboardScreen({ route, navigation }) {
  const scooter = route.params?.scooter;

  const [batteries,    setBatteries]    = useState([]);
  const [battLoading,  setBattLoading]  = useState(true);
  const [showBattForm, setShowBattForm] = useState(false);
  const [telemetry,    setTelemetry]    = useState(null);
  const [attention,    setAttention]    = useState({ visible: false, label: '', action: null });
  const [fallThreshold, setFallThreshold] = useState(FALL_THRESHOLD);
  const [lastRfAck,    setLastRfAck]    = useState(null);

  const usedSlots = batteries.map(b => b.slot).filter(Boolean);

  const fetchingBattRef = useRef(false);
  const fetchingTelRef  = useRef(false);
  const fallThresholdRef = useRef(FALL_THRESHOLD);

  // Helper to get the MQTT scooter ID (short form from the UUID)
  const getMqttScooterId = () => {
    if (!scooter?.id) return '';
    // Use first 8 chars of UUID without dashes, matching your ESP32 topic
    return normalizeScooterId(scooter.id).substring(0, 8);
  };

  const loadFallThreshold = async () => {
    try {
      const json = await AsyncStorage.getItem('settings_notif_gyroscope');
      const seuil = json ? parseFloat(JSON.parse(json)?.seuil) : NaN;
      const v = Number.isFinite(seuil) && seuil > 0 ? seuil : FALL_THRESHOLD;
      setFallThreshold(v);
      fallThresholdRef.current = v;
    } catch {}
  };
  useEffect(() => { loadFallThreshold(); }, []);
  useEffect(() => {
    if (!navigation?.addListener) return;
    return navigation.addListener('focus', loadFallThreshold);
  }, [navigation]);

  const fetchBatteries = async () => {
    if (!scooter?.id || fetchingBattRef.current) return;
    fetchingBattRef.current = true;
    try {
      const { data, error } = await supabase.from('batteries').select('*')
        .eq('scooter_id', scooter.id).order('slot', { ascending: true });
      if (!error) setBatteries(data ?? []);
    } finally {
      fetchingBattRef.current = false;
      setBattLoading(false);
    }
  };

  const fetchTelemetry = async () => {
    if (!scooter?.id || fetchingTelRef.current) return;
    fetchingTelRef.current = true;
    try {
      const { data } = await supabase.from('telemetry').select('*')
        .eq('scooter_id', scooter.id).order('recorded_at', { ascending: false })
        .limit(1).maybeSingle();
      if (data) setTelemetry(data);
    } finally {
      fetchingTelRef.current = false;
    }
  };

  const fetchAll = () => { fetchBatteries(); fetchTelemetry(); };

  const unassignBattery = (item) => {
    setAttention({
      visible: true,
      label: `Retirer "${item.serial_number}" et remettre en stock ?`,
      action: async () => {
        const { error } = await supabase.from('batteries')
          .update({ scooter_id: null, slot: null }).eq('id', item.id);
        if (error) alertOk('Erreur', error.message);
        else fetchBatteries();
      },
    });
  };

  const deleteBattery = (item) => {
    setAttention({
      visible: true,
      label: `Supprimer définitivement "${item.serial_number}" ?`,
      action: async () => {
        const { error } = await supabase.from('batteries').delete().eq('id', item.id);
        if (error) alertOk('Erreur', error.message);
        else fetchBatteries();
      },
    });
  };

  const showAtt = (label, action) => setAttention({ visible: true, label, action });

  // ── RF Command sender ──────────────────────────────────────
  const sendRfCommand = (action, label) => {
    setAttention({
      visible: true,
      label: `${label} ?`,
      action: () => {
        const mqttId = getMqttScooterId();
        mqttManager.sendCommand(mqttId, action);
        alertOk('Envoyé', `Commande "${label}" envoyée`);
      },
    });
  };

  const deleteScooter = () => {
    setAttention({
      visible: true,
      label: `Supprimer définitivement "${scooter.name}" ?\nCette action est irréversible.`,
      action: async () => {
        const { error } = await supabase.from('scooters').delete().eq('id', scooter.id);
        if (error) { alertOk('Erreur', error.message); return; }
        navigation.goBack();
      },
    });
  };

  const onMqttMessage = (topic, message) => {
    try {
      const mqttScooterId = topic.split('/')[1];
      const dbId = normalizeScooterId(scooter.id);
      const msgId = normalizeScooterId(mqttScooterId);
      if (dbId !== msgId && !dbId.includes(msgId) && !msgId.includes(dbId)) return;

      let payload;
      try { payload = JSON.parse(message.toString()); }
      catch { payload = { type: 'contact', value: message.toString() === '1' ? 1 : 0 }; }

      if (payload.type === 'rf_ack') {
        setLastRfAck(payload);
        return;
      }

      if (payload.type === 'contact') {
        setTelemetry(prev => {
          const prevTamper = prev?.tamper_points ?? [false, false, false];
          const updatedTamper = Array.isArray(payload.tamper_points)
            ? payload.tamper_points
            : [...prevTamper];
          if (!Array.isArray(payload.tamper_points)) {
            updatedTamper[0] = payload.value === 1;
          }
          return { ...prev, tamper_points: updatedTamper, recorded_at: new Date().toISOString() };
        });
      }

      if (payload.type === 'gyro' || payload.fallen !== undefined
          || payload.accel !== undefined || payload.accel_x !== undefined) {
        setTelemetry(prev => {
          const ax = payload.accel_x ?? payload.accel ?? prev?.accel_x;
          const hasAccelData = payload.accel !== undefined || payload.accel_x !== undefined;
          const newFallen = hasAccelData
            ? Math.abs(Number(ax) || 0) > fallThresholdRef.current
            : (payload.fallen !== undefined ? !!payload.fallen : prev?.fallen);
          return { ...prev, fallen: newFallen, accel_x: ax, recorded_at: new Date().toISOString() };
        });
      }
	  if (payload.type === 'bms') {
        const mac    = payload.battery_id;
        const soc    = payload.soc;
        const status = payload.status;

        if (!mac || soc == null) return;

        // Update UI instantly
        setBatteries(prev =>
          prev.map(b =>
            b.num_bt === mac
              ? { ...b, soc, bms_status: status }
              : b
          )
        );

        // Persist to Supabase
        supabase
          .from('batteries')
          .update({ soc,bms_status: status  })
          .eq('num_bt', mac)
          .then(({ error }) => {
            if (error) console.warn('BMS update error:', error.message);
          });
      }
    } catch {}
  };

  useEffect(() => {
    if (!scooter?.id) return;

    fetchAll();
    mqttManager.updateCallback(onMqttMessage);

    const battCh = supabase.channel('batt-' + scooter.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'batteries', filter: 'scooter_id=eq.' + scooter.id }, fetchBatteries)
      .subscribe();

    const interval = setInterval(fetchAll, 30000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(battCh);
    };
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
  const accelX = telemetry?.accel_x;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: Platform.OS === 'ios' ? 56 : 36 }}
        showsVerticalScrollIndicator={false}
      >

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.success, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 20, color: C.white, fontWeight: '800' }}>←</Text>
          </TouchableOpacity>

          <Text style={{ flex: 1, fontSize: 22, fontWeight: '900', color: C.white, textAlign: 'center', letterSpacing: -0.5 }}>
            {scooter.name}
          </Text>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={deleteScooter}
              style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: '#3A0A14',
                justifyContent: 'center', alignItems: 'center',
                borderWidth: 1, borderColor: C.danger + '55',
              }}>
              <Text style={{ fontSize: 18 }}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: sc.color }}>{sc.label}</Text>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: sc.color }} />
        </View>

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
            <BatteryCard key={b.id} item={b} onUnassign={unassignBattery} onDelete={deleteBattery} />
          ))
        )}

        {batteries.length < MAX_BATTERIES && (
          <TouchableOpacity onPress={() => setShowBattForm(true)}
            style={{ borderWidth: 1, borderColor: C.accent, borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: C.accentBright }}>+ Ajouter batterie</Text>
          </TouchableOpacity>
        )}

        <SectionTitle title="Points de sabotage" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {['Siège', 'Avant', 'Batterie'].map((label, i) => {
            const active = tamper[i] ?? false;
            return (
              <View key={label} style={{
                flex: 1,
                backgroundColor: active ? '#3A0A14' : '#0A2A14',
                borderRadius: 12,
                padding: 12, alignItems: 'center', gap: 6,
                borderWidth: 1.5,
                borderColor: active ? C.danger + '55' : C.success + '55',
              }}>
                <Text style={{ fontSize: 22 }}>{active ? '⚠️' : '✅'}</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: active ? C.danger : C.success }}>
                  {label}
                </Text>
                <View style={{
                  width: 8, height: 8, borderRadius: 4,
                  backgroundColor: active ? C.danger : C.success
                }} />
              </View>
            );
          })}
        </View>

        <SectionTitle title="Controle R.C" />
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[
            { label: 'Verrouiller',   emoji: '🔒', action: 'lock',    confirm: "Verrouiller le scooter"    },
            { label: 'Déverrouiller', emoji: '🔓', action: 'unlock',  confirm: "Déverrouiller le scooter"  },
            { label: 'Klaxon',        emoji: '🔔', action: 'bell',    confirm: "Activer le klaxon"         },
            { label: 'Tonnerre',      emoji: '⚡', action: 'thunder', confirm: "Activer le tonnerre"       },
          ].map(({ label, emoji, action, confirm }) => (
            <TouchableOpacity key={action}
              onPress={() => sendRfCommand(action, confirm)}
              style={{
                flex: 1, backgroundColor: C.bgElevated, borderRadius: 12,
                paddingVertical: 12, paddingHorizontal: 4, alignItems: 'center', gap: 6,
                borderWidth: 1, borderColor: C.border,
              }}>
              <Text style={{ fontSize: 22 }}>{emoji}</Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: C.white, textAlign: 'center' }} numberOfLines={2}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <SectionTitle title="Gyroscope" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(() => {
            const isFall = accelX != null && Math.abs(accelX) > fallThreshold;
            const bg    = isFall ? '#5C1A1A' : '#1A3A1A';
            const color = isFall ? '#FF6B6B' : '#51CF66';
            return (
              <View style={{
                flex: 1, backgroundColor: bg, borderRadius: 12,
                padding: 12, alignItems: 'center', gap: 4,
                borderWidth: 1, borderColor: color + '44',
              }}>
                <Text style={{ fontSize: 9, fontWeight: '800', color, letterSpacing: 1 }}>
                  Droite/Gauche
                </Text>
                <Text style={{ fontSize: 22, fontWeight: '900', color: C.white }}>
                  {accelX != null ? `${accelX.toFixed(0)}°` : '—'}
                </Text>
                <Text style={{ fontSize: 9, color: C.textMuted }}>Seuil : {fallThreshold}</Text>
              </View>
            );
          })()}
        </View>

        <SectionTitle title="TPMS" />
        <View style={{
          backgroundColor: C.bgCard, borderRadius: 14,
          borderWidth: 1, borderColor: C.border,
          padding: 14, alignItems: 'center', gap: 4,
        }}>
          <Text style={{ fontSize: 22 }}>🚫</Text>
          <Text style={{ fontSize: 13, fontWeight: '800', color: C.textSecondary }}>
            Indisponible
          </Text>
          <Text style={{ fontSize: 10, color: C.textMuted, textAlign: 'center' }}>
            Capteurs TPMS non connectés
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <BatteryPickerModal
        visible={showBattForm}
        onClose={() => setShowBattForm(false)}
        onSaved={fetchBatteries}
        scooterId={scooter?.id}
        usedSlots={usedSlots}
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
