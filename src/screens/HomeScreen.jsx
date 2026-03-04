import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StatusBar, Platform, ActivityIndicator, ScrollView,
  Modal, TextInput, KeyboardAvoidingView, Alert,
} from 'react-native';
import { supabase } from '../lib/supabaseClient';

const C = {
  bg:           '#0A0A0F',
  bgCard:       '#13131A',
  bgElevated:   '#1E1E2E',
  accent:       '#00E5FF',
  success:      '#00E676',
  successDim:   'rgba(0,230,118,0.12)',
  warning:      '#FFB300',
  warningDim:   'rgba(255,179,0,0.12)',
  danger:       '#FF1744',
  dangerDim:    'rgba(255,23,68,0.12)',
  white:        '#FFFFFF',
  textSecondary:'#8A8A9A',
  textMuted:    '#4A4A5A',
  border:       '#1E1E2E',
  borderAccent: 'rgba(0,229,255,0.25)',
};

const STATUS = {
  online:   { color: C.success,   bg: C.successDim,  label: 'En ligne'   },
  offline:  { color: C.textMuted, bg: 'transparent', label: 'Hors ligne' },
  charging: { color: C.warning,   bg: C.warningDim,  label: 'En charge'  },
};

function battColor(v) {
  if (v == null) return C.textMuted;
  if (v > 50)   return C.success;
  if (v > 20)   return C.warning;
  return C.danger;
}

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)   return `il y a ${diff}s`;
  if (diff < 3600) return `il y a ${Math.floor(diff/60)}min`;
  return `il y a ${Math.floor(diff/3600)}h`;
}

// ─── Modal réutilisable (Ajout + Modification) ─────────────
function ScooterFormModal({ visible, onClose, onSaved, initial }) {
  const isEdit = !!initial;
  const [name,      setName]      = useState(initial?.name      ?? '');
  const [model,     setModel]     = useState(initial?.model     ?? '');
  const [reference, setReference] = useState(initial?.reference ?? '');
  const [loading,   setLoading]   = useState(false);

  // Sync si on rouvre le modal avec un autre scooter
  useEffect(() => {
    setName(initial?.name ?? '');
    setModel(initial?.model ?? '');
    setReference(initial?.reference ?? '');
  }, [initial, visible]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Le nom est obligatoire.');
      return;
    }
    setLoading(true);
    try {
      if (isEdit) {
        // Modifier
        const { error } = await supabase
          .from('scooters')
          .update({ name: name.trim(), model: model.trim(), reference: reference.trim() })
          .eq('id', initial.id);
        if (error) throw error;
      } else {
        // Ajouter
        const { error } = await supabase
          .from('scooters')
          .insert({ name: name.trim(), model: model.trim(), reference: reference.trim() });
        if (error) throw error;
      }
      onSaved();
      onClose();
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} activeOpacity={1} onPress={onClose} />
        <View style={{
          backgroundColor: C.bgCard,
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          padding: 28, paddingBottom: Platform.OS === 'ios' ? 44 : 28,
          borderTopWidth: 1, borderColor: C.border,
        }}>
          {/* Handle */}
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.bgElevated, alignSelf: 'center', marginBottom: 24 }} />

          {/* Titre */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: C.white, letterSpacing: -0.5 }}>
              {isEdit ? 'Modifier 🛵' : 'Nouveau 🛵'}
            </Text>
            <TouchableOpacity onPress={onClose}
              style={{ backgroundColor: C.bgElevated, borderRadius: 20, width: 32, height: 32, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: C.textMuted, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Nom */}
          <Text style={{ fontSize: 10, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Nom *</Text>
          <TextInput value={name} onChangeText={setName} placeholder="ex: Scooter 1"
            placeholderTextColor={C.textMuted}
            style={{ backgroundColor: C.bgElevated, borderRadius: 14, padding: 14, color: C.white, fontSize: 15, borderWidth: 1, borderColor: C.border, marginBottom: 16 }}
          />

          {/* Modèle */}
          <Text style={{ fontSize: 10, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Modèle</Text>
          <TextInput value={model} onChangeText={setModel} placeholder="ex: Niu NQi GT Pro"
            placeholderTextColor={C.textMuted}
            style={{ backgroundColor: C.bgElevated, borderRadius: 14, padding: 14, color: C.white, fontSize: 15, borderWidth: 1, borderColor: C.border, marginBottom: 16 }}
          />

          {/* Référence */}
          <Text style={{ fontSize: 10, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Référence</Text>
          <TextInput value={reference} onChangeText={setReference} placeholder="ex: SCT-001"
            placeholderTextColor={C.textMuted}
            style={{ backgroundColor: C.bgElevated, borderRadius: 14, padding: 14, color: C.white, fontSize: 15, borderWidth: 1, borderColor: C.border, marginBottom: 28 }}
          />

          {/* Bouton */}
          <TouchableOpacity onPress={handleSave} disabled={loading} activeOpacity={0.8}
            style={{ backgroundColor: C.accent, borderRadius: 16, padding: 16, alignItems: 'center', opacity: loading ? 0.6 : 1 }}>
            {loading
              ? <ActivityIndicator color={C.bg} />
              : <Text style={{ fontSize: 15, fontWeight: '900', color: C.bg }}>{isEdit ? 'Enregistrer' : 'Ajouter le scooter'}</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Écran Détail ──────────────────────────────────────────
function DetailScreen({ s, onBack, onDeleted, onEdited }) {
  const [data,      setData]      = useState(s);
  const [alarm,     setAlarm]     = useState(s.alarm);
  const [starter,   setStarter]   = useState(s.starter);
  const [showEdit,  setShowEdit]  = useState(false);
  const sc = STATUS[data.status] ?? STATUS.offline;

  useEffect(() => {
    const channel = supabase
      .channel(`telemetry-${s.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'telemetry',
        filter: `scooter_id=eq.${s.id}`,
      }, payload => setData(prev => ({ ...prev, ...payload.new })))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [s.id]);

  const handleAlarm = async () => {
    const v = !alarm; setAlarm(v);
    await supabase.from('telemetry').insert({ scooter_id: s.id, alarm: v, starter, battery: data.battery, status: data.status });
  };

  const handleStarter = async () => {
    const v = !starter; setStarter(v);
    await supabase.from('telemetry').insert({ scooter_id: s.id, starter: v, alarm, battery: data.battery, status: data.status });
  };

  const handleDelete = async () => {
  Alert.alert(
    'Supprimer ce scooter ?',
    `"${data.name}" sera supprimé définitivement.`,
    [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase.from('telemetry').delete().eq('scooter_id', s.id);
            await supabase.from('scooters').delete().eq('id', s.id);
            onBack();
            setTimeout(() => onDeleted(), 500);
          } catch (err) {
            Alert.alert('Erreur', err.message);
          }
        },
      },
    ],
    { cancelable: true }
  );
};

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Barre haut */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <TouchableOpacity onPress={onBack}
          style={{ backgroundColor: C.bgElevated, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: C.border }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: C.textSecondary }}>← Retour</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {/* Modifier */}
          <TouchableOpacity onPress={() => setShowEdit(true)}
            style={{ backgroundColor: C.bgElevated, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.accent }}>⚙️ Modifier</Text>
          </TouchableOpacity>
          {/* Supprimer */}
          <TouchableOpacity onPress={handleDelete}
            style={{ backgroundColor: C.dangerDim, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: C.danger + '44' }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.danger }}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Hero */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
            paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
            borderColor: sc.color + '44', backgroundColor: sc.bg, marginBottom: 8 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: sc.color }} />
            <Text style={{ fontSize: 9, fontWeight: '700', color: sc.color, letterSpacing: 0.5 }}>{sc.label}</Text>
          </View>
          <Text style={{ fontSize: 28, fontWeight: '900', color: C.white, letterSpacing: -1 }}>{data.name}</Text>
          <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{data.model}</Text>
          {data.reference ? (
            <Text style={{ fontSize: 10, color: C.accent, marginTop: 4, fontWeight: '700' }}>#{data.reference}</Text>
          ) : null}
        </View>
        <Text style={{ fontSize: 48 }}>🛵</Text>
      </View>

      {/* Mini stats */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
        {[
          { label: 'Batterie',  value: data.battery != null ? `${data.battery}%` : '—', color: battColor(data.battery) },
          { label: 'Autonomie', value: data.range   != null ? `${data.range}km`  : '—', color: C.white },
          { label: 'Vitesse',   value: data.speed   != null ? `${data.speed}km/h`: '—', color: C.white },
          { label: 'Temp',      value: data.temp    != null ? `${data.temp}°C`   : '—', color: C.white },
        ].map(({ label, value, color }) => (
          <View key={label} style={{ flex: 1, backgroundColor: C.bgElevated, borderRadius: 12, padding: 10, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color, letterSpacing: -0.5 }}>{value}</Text>
            <Text style={{ fontSize: 7, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: 3 }}>{label}</Text>
          </View>
        ))}
      </View>

      {/* GPS */}
      <Text style={{ fontSize: 10, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Localisation</Text>
      <View style={{ backgroundColor: C.bgCard, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: C.border, marginBottom: 20 }}>
        <View style={{ height: 150, backgroundColor: '#13131A', justifyContent: 'center', alignItems: 'center' }}>
          {data.status !== 'offline' ? (
            <>
              <View style={{ position: 'absolute', width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(0,229,255,0.05)', borderWidth: 1, borderColor: 'rgba(0,229,255,0.1)' }} />
              <View style={{ position: 'absolute', width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,229,255,0.08)', borderWidth: 1.5, borderColor: C.borderAccent }} />
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.bgCard, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: C.accent }}>
                <Text style={{ fontSize: 18 }}>🛵</Text>
              </View>
            </>
          ) : (
            <Text style={{ color: C.textMuted, fontSize: 12 }}>Hors ligne — GPS non disponible</Text>
          )}
          {data.address ? (
            <View style={{ position: 'absolute', bottom: 10, left: 10, backgroundColor: C.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: C.bg }}>📍 {data.address}</Text>
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 8 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: data.status !== 'offline' ? C.success : C.textMuted }} />
          <Text style={{ flex: 1, fontSize: 11, color: C.textSecondary }}>
            {data.last_update ? `Mis à jour ${timeAgo(data.last_update)}` : 'En attente du GPS…'}
          </Text>
        </View>
      </View>

      {/* Contrôles */}
      <Text style={{ fontSize: 10, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Contrôles</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        {[
          { icon: '🔒', label: 'Alarme',    active: alarm,   onPress: handleAlarm,   statusOn: 'Armée',  statusOff: 'Désarmée' },
          { icon: '⚡', label: 'Démarrage', active: starter, onPress: handleStarter, statusOn: 'Actif',  statusOff: 'Inactif'  },
        ].map(({ icon, label, active, onPress, statusOn, statusOff }) => (
          <TouchableOpacity key={label} onPress={onPress} activeOpacity={0.75}
            style={{ flex: 1, backgroundColor: active ? '#1A1A26' : C.bgCard, borderRadius: 18, padding: 16,
              alignItems: 'center', gap: 6, borderWidth: 1, borderColor: active ? C.borderAccent : C.border }}>
            <Text style={{ fontSize: 24 }}>{icon}</Text>
            <Text style={{ fontSize: 11, fontWeight: '800', color: C.white }}>{label}</Text>
            <Text style={{ fontSize: 10, color: active ? C.accent : C.textMuted }}>{active ? statusOn : statusOff}</Text>
            <View style={{ width: 42, height: 24, borderRadius: 12, backgroundColor: active ? C.accent : C.bgElevated, padding: 3, justifyContent: 'center', marginTop: 4 }}>
              <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: active ? C.bg : C.textMuted, alignSelf: active ? 'flex-end' : 'flex-start' }} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats */}
      <Text style={{ fontSize: 10, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Stats en direct</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {[
          { icon: '🔋', value: data.battery, unit: '%',    label: 'BATTERIE' },
          { icon: '🚀', value: data.speed,   unit: 'km/h', label: 'VITESSE' },
          { icon: '🛣️', value: data.range,   unit: 'km',   label: 'AUTONOMIE' },
          { icon: '🌡️', value: data.temp,    unit: '°C',   label: 'TEMPÉRATURE' },
        ].map(({ icon, value, unit, label }) => (
          <View key={label} style={{ width: '47.5%', backgroundColor: C.bgCard, borderRadius: 16, padding: 14,
            borderWidth: 1, borderColor: C.border, minHeight: 110, justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 20 }}>{icon}</Text>
            <Text style={{ fontSize: 32, fontWeight: '900', color: value == null ? C.textMuted : C.white, letterSpacing: -1.5 }}>
              {value ?? '—'}{value != null && <Text style={{ fontSize: 12, color: C.textSecondary }}> {unit}</Text>}
            </Text>
            <Text style={{ fontSize: 8, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5 }}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: 40 }} />

      {/* Modal Modifier */}
      <ScooterFormModal
        visible={showEdit}
        onClose={() => setShowEdit(false)}
        initial={data}
        onSaved={() => {
          setShowEdit(false);
          onEdited();
        }}
      />
    </ScrollView>
  );
}

// ─── Écran Accueil ─────────────────────────────────────────
export default function HomeScreen() {
  const [scooters,  setScooters]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(null);
  const [showAdd,   setShowAdd]   = useState(false);

  const fetchScooters = async () => {
    const { data, error } = await supabase.from('scooters_live').select('*');
    if (error) console.error('Supabase error:', error);
    else setScooters(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchScooters();
    const channel = supabase
      .channel('telemetry-all')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'telemetry' }, () => fetchScooters())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  if (selected) return (
    <DetailScreen
      s={selected}
      onBack={() => setSelected(null)}
      onDeleted={() => { fetchScooters(); setSelected(null); }}
      onEdited={() => fetchScooters()}
    />
  );

  const online   = scooters.filter(s => s.status !== 'offline').length;
  const charging = scooters.filter(s => s.status === 'charging').length;
  const totalKm  = scooters.reduce((a, s) => a + (s.range ?? 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={{ color: C.textMuted, marginTop: 12, fontSize: 12 }}>Connexion…</Text>
        </View>
      ) : (
        <FlatList
          data={scooters}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <View>
                  <Text style={{ fontSize: 10, letterSpacing: 3, color: C.accent, textTransform: 'uppercase', marginBottom: 8 }}>Tableau de bord</Text>
                  <Text style={{ fontSize: 36, fontWeight: '900', color: C.white, letterSpacing: -1 }}>
                    Ma <Text style={{ color: C.accent }}>Flotte</Text>
                  </Text>
                  <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 6 }}>
                    {scooters.length} appareil{scooters.length > 1 ? 's' : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowAdd(true)} activeOpacity={0.8}
                  style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: C.accent,
                    justifyContent: 'center', alignItems: 'center',
                    shadowColor: C.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 }}>
                  <Text style={{ fontSize: 26, color: C.bg, fontWeight: '300', lineHeight: 30 }}>+</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 28 }}>
                {[
                  { value: online,   color: C.success, label: 'En ligne' },
                  { value: charging, color: C.warning, label: 'En charge' },
                  { value: `${totalKm.toFixed(0)}km`, color: C.white, label: 'Autonomie' },
                ].map(({ value, color, label }) => (
                  <View key={label} style={{ flex: 1, backgroundColor: C.bgCard, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
                    <Text style={{ fontSize: 22, fontWeight: '900', color, letterSpacing: -1 }}>{value}</Text>
                    <Text style={{ fontSize: 9, color: C.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 }}>{label}</Text>
                  </View>
                ))}
              </View>
              <Text style={{ fontSize: 9, color: C.textMuted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>Appareils</Text>
            </>
          )}
          renderItem={({ item }) => {
            const sc = STATUS[item.status] ?? STATUS.offline;
            return (
              <TouchableOpacity onPress={() => setSelected(item)} activeOpacity={0.75}
                style={{ backgroundColor: C.bgCard, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <View>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: C.white }}>{item.name}</Text>
                    <Text style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>{item.model}</Text>
                    {item.reference ? <Text style={{ fontSize: 9, color: C.accent, marginTop: 2 }}>#{item.reference}</Text> : null}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5,
                    borderRadius: 20, borderWidth: 1, borderColor: sc.color + '44', backgroundColor: sc.bg }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: sc.color }} />
                    <Text style={{ fontSize: 9, fontWeight: '700', color: sc.color, letterSpacing: 0.5 }}>{sc.label}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1, backgroundColor: C.bgElevated, borderRadius: 12, padding: 10, alignItems: 'center' }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: battColor(item.battery) }}>
                      {item.battery != null ? `${item.battery}%` : '—'}
                    </Text>
                    <Text style={{ fontSize: 8, color: C.textMuted, textTransform: 'uppercase', marginTop: 3 }}>Batterie</Text>
                    <View style={{ width: '100%', height: 3, backgroundColor: C.border, borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                      <View style={{ height: '100%', borderRadius: 2, width: `${item.battery ?? 0}%`, backgroundColor: battColor(item.battery) }} />
                    </View>
                  </View>
                  <View style={{ flex: 1, backgroundColor: C.bgElevated, borderRadius: 12, padding: 10, alignItems: 'center' }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: C.white }}>{item.range ?? '—'}</Text>
                    <Text style={{ fontSize: 8, color: C.textMuted, textTransform: 'uppercase', marginTop: 3 }}>km restants</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: C.bgElevated, borderRadius: 12, padding: 10, alignItems: 'center' }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: C.white }}>{item.speed ?? '—'}</Text>
                    <Text style={{ fontSize: 8, color: C.textMuted, textTransform: 'uppercase', marginTop: 3 }}>km/h</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 10, color: C.textMuted, textAlign: 'right', marginTop: 12 }}>
                  {item.last_update ? `Mis à jour ${timeAgo(item.last_update)}` : 'Aucune donnée'} →
                </Text>
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListFooterComponent={() => <View style={{ height: 40 }} />}
        />
      )}

      <ScooterFormModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={fetchScooters}
      />
    </View>
  );
}