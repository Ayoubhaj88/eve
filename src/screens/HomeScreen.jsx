import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StatusBar, Platform, ActivityIndicator,
  Modal, TextInput, KeyboardAvoidingView,
} from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { C, STATUS, battColor, timeAgo, alertOk, alertConfirm } from '../constants';

function wheelColor(v) {
  if (v == null) return C.textMuted;
  if (v < 1.5)  return C.danger;
  if (v < 2.2)  return C.warning;
  return C.success;
}

function BatteryIcon({ value }) {
  const getCell = (idx) => {
    if (value == null) return C.textMuted;
    const min = idx * 33.3;
    if (value <= min) return C.bgElevated;
    if (value <= 20)  return C.danger;
    if (value <= 50)  return C.warning;
    return C.success;
  };
  const border = battColor(value);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <View style={{
        width: 26, height: 12, borderRadius: 3,
        borderWidth: 1.5, borderColor: border + '66',
        flexDirection: 'row', padding: 2, gap: 1.5,
        alignItems: 'center', backgroundColor: C.bgCard,
      }}>
        {[0, 1, 2].map(i => (
          <View key={i} style={{ flex: 1, height: '100%', borderRadius: 1, backgroundColor: getCell(i) }} />
        ))}
      </View>
      <View style={{ width: 2, height: 6, borderRadius: 1, backgroundColor: border + '88' }} />
    </View>
  );
}

function IndicCell({ children, alertColor }) {
  return (
    <View style={{
      flex: 1, backgroundColor: C.bgElevated, borderRadius: 12,
      paddingVertical: 10, paddingHorizontal: 4,
      alignItems: 'center', gap: 4,
      borderWidth: 1,
      borderColor: alertColor ? alertColor + '33' : 'transparent',
    }}>
      {children}
    </View>
  );
}

function Dot({ color }) {
  return (
    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
  );
}

function Label({ text }) {
  return (
    <Text style={{ fontSize: 7, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
      {text}
    </Text>
  );
}

function ScooterCard({ item, onPress, onEdit, onDelete }) {
  const sc        = STATUS[item.status] ?? STATUS.offline;
  const tamper    = item.tamper_points ?? [false, false, false];
  const anyTamper = tamper.some(Boolean);
  const alertBorder = (anyTamper || item.fallen) ? C.danger + '44' : C.border;

  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      activeOpacity={0.75}
      style={{
        backgroundColor: C.bgCard,
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        borderColor: alertBorder,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <View>
          <Text style={{ fontSize: 17, fontWeight: '800', color: C.white }}>{item.name}</Text>
          <Text style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>{item.model}</Text>
          {item.reference
            ? <Text style={{ fontSize: 9, color: C.accent, marginTop: 2 }}>#{item.reference}</Text>
            : null}
        </View>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 5,
          paddingHorizontal: 10, paddingVertical: 5,
          borderRadius: 20, borderWidth: 1,
          borderColor: sc.color + '44', backgroundColor: sc.bg,
        }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: sc.color }} />
          <Text style={{ fontSize: 9, fontWeight: '700', color: sc.color, letterSpacing: 0.5 }}>{sc.label}</Text>
        </View>
      </View>

      {/* ── Toutes les cellules sur une seule ligne ── */}
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <IndicCell>
          <Text style={{ fontSize: 16 }}>🔋</Text>
          <BatteryIcon value={item.battery} />
          <Text style={{ fontSize: 11, fontWeight: '800', color: battColor(item.battery) }}>
            {item.battery != null ? `${item.battery}%` : '—'}
          </Text>
          <Label text="Batt." />
        </IndicCell>

        <IndicCell alertColor={anyTamper ? C.danger : null}>
          <Text style={{ fontSize: 16 }}>🚨</Text>
          <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
            {tamper.slice(0, 3).map((active, i) => (
              <Dot key={i} color={active ? C.danger : C.success} />
            ))}
          </View>
          <Text style={{ fontSize: 9, fontWeight: '700', color: anyTamper ? C.danger : C.success }}>
            {anyTamper ? 'Alerte' : 'OK'}
          </Text>
          <Label text="Sabotage" />
        </IndicCell>

        <IndicCell>
          <Text style={{ fontSize: 16 }}>🔒</Text>
          <Dot color={item.alarm ? C.success : C.danger} />
          <Text style={{ fontSize: 9, fontWeight: '700', color: item.alarm ? C.success : C.danger }}>
            {item.alarm ? 'Armée' : 'OFF'}
          </Text>
          <Label text="Alarme" />
        </IndicCell>

        <IndicCell alertColor={item.fallen ? C.danger : null}>
          <Text style={{
            fontSize: 16,
            transform: [{ rotate: item.fallen ? '90deg' : '0deg' }],
          }}>🛵</Text>
          <Dot color={item.fallen ? C.danger : C.success} />
          <Text style={{ fontSize: 9, fontWeight: '700', color: item.fallen ? C.danger : C.success }}>
            {item.fallen ? 'Chute !' : 'Stable'}
          </Text>
          <Label text="Chute" />
        </IndicCell>

        <IndicCell alertColor={wheelColor(item.wheel_front) === C.danger || wheelColor(item.wheel_rear) === C.danger ? C.danger : null}>
          <Text style={{ fontSize: 16 }}>⚙️</Text>
          <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
            <View style={{ alignItems: 'center', gap: 2 }}>
              <Dot color={wheelColor(item.wheel_front)} />
              <Text style={{ fontSize: 8, fontWeight: '700', color: wheelColor(item.wheel_front) }}>
                {item.wheel_front != null ? `${item.wheel_front}b` : '—'}
              </Text>
              <Text style={{ fontSize: 6, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>AV</Text>
            </View>
            <View style={{ width: 1, height: 20, backgroundColor: C.border }} />
            <View style={{ alignItems: 'center', gap: 2 }}>
              <Dot color={wheelColor(item.wheel_rear)} />
              <Text style={{ fontSize: 8, fontWeight: '700', color: wheelColor(item.wheel_rear) }}>
                {item.wheel_rear != null ? `${item.wheel_rear}b` : '—'}
              </Text>
              <Text style={{ fontSize: 6, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>AR</Text>
            </View>
          </View>
          <Label text="Roues" />
        </IndicCell>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <Text style={{ fontSize: 10, color: C.textMuted }}>
          {item.last_update ? `Mis à jour ${timeAgo(item.last_update)}` : 'Aucune donnée'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity onPress={() => onEdit(item)}
            style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: C.bgElevated, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
            <Text style={{ fontSize: 12 }}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(item)}
            style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: C.dangerDim, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.danger + '44' }}>
            <Text style={{ fontSize: 12 }}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function ScooterFormModal({ visible, onClose, onSaved, initial }) {
  const isEdit = !!initial;
  const [name,      setName]      = useState(initial?.name      ?? '');
  const [model,     setModel]     = useState(initial?.model     ?? '');
  const [reference, setReference] = useState(initial?.reference ?? '');
  const [loading,   setLoading]   = useState(false);

  useEffect(() => {
    setName(initial?.name      ?? '');
    setModel(initial?.model    ?? '');
    setReference(initial?.reference ?? '');
  }, [initial, visible]);

  const handleSave = async () => {
    if (!name.trim()) { alertOk('Erreur', 'Le nom est obligatoire.'); return; }
    setLoading(true);
    try {
      if (isEdit) {
        const { error } = await supabase.from('scooters')
          .update({ name: name.trim(), model: model.trim(), reference: reference.trim() })
          .eq('id', initial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('scooters')
          .insert({ name: name.trim(), model: model.trim(), reference: reference.trim() });
        if (error) throw error;
      }
      onSaved(); onClose();
    } catch (err) {
      alertOk('Erreur', err.message);
    } finally {
      setLoading(false);
    }
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
            <Text style={{ fontSize: 22, fontWeight: '900', color: C.white, letterSpacing: -0.5 }}>
              {isEdit ? 'Modifier 🛵' : 'Nouveau 🛵'}
            </Text>
            <TouchableOpacity onPress={onClose}
              style={{ backgroundColor: C.bgElevated, borderRadius: 20, width: 32, height: 32, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: C.textMuted, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          </View>

          {[
            { label: 'Nom *',      value: name,      set: setName,      placeholder: 'ex: Scooter 1'     },
            { label: 'Modèle',     value: model,     set: setModel,     placeholder: 'ex: Niu NQi GT Pro' },
            { label: 'Référence',  value: reference, set: setReference, placeholder: 'ex: SCT-001'        },
          ].map(({ label, value, set, placeholder }) => (
            <View key={label}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>{label}</Text>
              <TextInput value={value} onChangeText={set} placeholder={placeholder}
                placeholderTextColor={C.textMuted}
                style={{ backgroundColor: C.bgElevated, borderRadius: 14, padding: 14, color: C.white, fontSize: 15, borderWidth: 1, borderColor: C.border, marginBottom: 16 }}
              />
            </View>
          ))}

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

function LogoutModal({ visible, onClose, onConfirm, loading }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 32 }}
        activeOpacity={1} onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1}
          style={{ backgroundColor: C.bgCard, borderRadius: 24, padding: 28, width: '100%', borderWidth: 1, borderColor: C.border }}>
          <Text style={{ fontSize: 28, textAlign: 'center', marginBottom: 12 }}>👋</Text>
          <Text style={{ fontSize: 20, fontWeight: '900', color: C.white, textAlign: 'center', marginBottom: 8 }}>
            Déconnexion
          </Text>
          <Text style={{ fontSize: 13, color: C.textSecondary, textAlign: 'center', marginBottom: 28, lineHeight: 20 }}>
            Vous allez être déconnecté de votre compte FlotteManager.
          </Text>

          <TouchableOpacity onPress={onConfirm} disabled={loading} activeOpacity={0.85}
            style={{ backgroundColor: C.dangerDim, borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: C.danger + '55' }}>
            {loading
              ? <ActivityIndicator color={C.danger} />
              : <Text style={{ fontSize: 14, fontWeight: '800', color: C.danger }}>Confirmer la déconnexion</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} activeOpacity={0.8}
            style={{ backgroundColor: C.bgElevated, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.textSecondary }}>Annuler</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export default function HomeScreen({ navigation }) {
  const [scooters,        setScooters]        = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [showForm,        setShowForm]        = useState(false);
  const [editingScooter,  setEditingScooter]  = useState(null);
  const [showLogout,      setShowLogout]      = useState(false);
  const [logoutLoading,   setLogoutLoading]   = useState(false);
  const [userEmail,       setUserEmail]       = useState('');

  const fetchScooters = async () => {
    const { data: scooterData, error } = await supabase.from('scooters').select('*');
    if (error) { console.error('Supabase error:', error); setLoading(false); return; }

    const ids = (scooterData ?? []).map(s => s.id);
    let telMap = {};
    if (ids.length > 0) {
      const results = await Promise.all(
        ids.map(id =>
          supabase.from('telemetry').select('*')
            .eq('scooter_id', id)
            .order('recorded_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        )
      );
      results.forEach((res, i) => {
        if (res.data) telMap[ids[i]] = res.data;
      });
    }

    setScooters((scooterData ?? []).map(s => {
      const t = telMap[s.id];
      return t ? { ...s, ...t, id: s.id, last_update: t.recorded_at } : s;
    }));
    setLoading(false);
  };

  useEffect(() => {
    fetchScooters();

    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data?.user?.email ?? '');
    });

    const channel = supabase
      .channel('telemetry-all')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'telemetry' },
        payload => {
          const { id: _tid, scooter_id, ...tel } = payload.new;
          setScooters(prev =>
            prev.map(s => s.id === scooter_id ? { ...s, ...tel, last_update: tel.recorded_at } : s)
          );
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const handleLogout = async () => {
    setLogoutLoading(true);
    await supabase.auth.signOut();
    setLogoutLoading(false);
    setShowLogout(false);
  };

  const deleteScooter = (item) => {
    alertConfirm('Supprimer', `Supprimer "${item.name}" ?`, async () => {
      const { error } = await supabase.from('scooters').delete().eq('id', item.id);
      if (error) alertOk('Erreur', error.message);
      else fetchScooters();
    });
  };

  const online   = scooters.filter(s => s.status !== 'offline').length;
  const charging = scooters.filter(s => s.status === 'charging').length;

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
          keyExtractor={i => String(i.id)}
          contentContainerStyle={{ padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, letterSpacing: 3, color: C.accent, textTransform: 'uppercase', marginBottom: 8 }}>
                    Tableau de bord
                  </Text>
                  <Text style={{ fontSize: 36, fontWeight: '900', color: C.white, letterSpacing: -1 }}>
                    EVE <Text style={{ color: C.accent }}>Mobility</Text>
                  </Text>
                  <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 6 }}>
                    {scooters.length} scooter{scooters.length > 1 ? 's' : ''}
                  </Text>
                  {userEmail ? (
                    <Text style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>👤 {userEmail}</Text>
                  ) : null}
                </View>

                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => { setEditingScooter(null); setShowForm(true); }} activeOpacity={0.8}
                    style={{
                      width: 48, height: 48, borderRadius: 16, backgroundColor: C.accent,
                      justifyContent: 'center', alignItems: 'center',
                      shadowColor: C.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
                    }}>
                    <Text style={{ fontSize: 26, color: C.bg, fontWeight: '300', lineHeight: 30 }}>+</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => setShowLogout(true)} activeOpacity={0.8}
                    style={{
                      width: 48, height: 48, borderRadius: 16,
                      backgroundColor: C.dangerDim,
                      borderWidth: 1, borderColor: C.danger + '44',
                      justifyContent: 'center', alignItems: 'center',
                    }}>
                    <Text style={{ fontSize: 18 }}>🚪</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 28 }}>
                {[
                  { value: online,   color: C.success, label: 'En ligne'  },
                  { value: charging, color: C.warning, label: 'En charge' },
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

          renderItem={({ item }) => (
            <ScooterCard
              item={item}
              onPress={(scooter) => navigation.navigate('Dashboard', { scooter })}
              onEdit={(scooter) => { setEditingScooter(scooter); setShowForm(true); }}
              onDelete={deleteScooter}
            />
          )}

          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListFooterComponent={() => <View style={{ height: 40 }} />}
          ListEmptyComponent={() => (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>🛵</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: C.white, marginBottom: 8 }}>Aucun scooter</Text>
              <Text style={{ fontSize: 13, color: C.textMuted, textAlign: 'center' }}>
                Appuyez sur + pour ajouter votre premier scooter
              </Text>
            </View>
          )}
        />
      )}

      <ScooterFormModal
        visible={showForm}
        onClose={() => { setShowForm(false); setEditingScooter(null); }}
        onSaved={fetchScooters}
        initial={editingScooter}
      />

      <LogoutModal
        visible={showLogout}
        onClose={() => setShowLogout(false)}
        onConfirm={handleLogout}
        loading={logoutLoading}
      />
    </View>
  );
}
