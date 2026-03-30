import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,Image,
  StatusBar, Platform, ActivityIndicator,
  Modal, TextInput, KeyboardAvoidingView,
} from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { C, STATUS, battColor, timeAgo, alertOk } from '../constants';
import Sidebar from '../components/Sidebar';

// ── Helpers ──────────────────────────────────────────────

function wheelColor(v, threshold = 2.0) {
  if (v == null)            return C.textMuted;
  if (v < threshold)        return C.danger;
  if (v < threshold * 1.15) return C.warning;
  return C.success;
}

// ── Indicator cell (cellule colorée) ─────────────────────

function IndicCell({ children, alertColor }) {
  const bg = alertColor === C.danger
    ? '#3A0A14'
    : alertColor === C.success
      ? '#0A2A14'
      : alertColor === C.warning
        ? '#2A2A0A'
        : C.bgElevated;
  const borderCol = alertColor ? alertColor + '55' : C.border;

  return (
    <View style={{
      flex: 1, backgroundColor: bg, borderRadius: 10,
      paddingVertical: 8, paddingHorizontal: 4,
      alignItems: 'center', gap: 4,
      borderWidth: 1.5,
      borderColor: borderCol,
    }}>
      {children}
    </View>
  );
}

function Dot({ color }) {
  return <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />;
}

function CellLabel({ text }) {
  return (
    <Text style={{ fontSize: 7, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 }}>
      {text}
    </Text>
  );
}

// ── Battery dashes ───────────────────────────────────────

function BatteryDashes({ batteries }) {
  const slots = [null, null, null];
  (batteries ?? []).forEach(b => {
    const idx = (b.slot ?? 1) - 1;
    if (idx >= 0 && idx < 3) slots[idx] = b;
  });
  return (
    <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
      {slots.map((b, i) => (
        <View key={i} style={{
          width: 14, height: 22, borderRadius: 3,
          backgroundColor: b ? battColor(b.soc) : C.textMuted + '33',
          borderWidth: 1,
          borderColor: b ? battColor(b.soc) + '88' : C.textMuted + '22',
        }} />
      ))}
    </View>
  );
}

// ── Scooter card (5 cellules comme Figma) ────────────────

function ScooterCard({ item, onPress }) {
  const sc        = STATUS[item.status] ?? STATUS.offline;
  const tamper    = item.tamper_points ?? [false, false, false];
  const anyTamper = tamper.some(Boolean);
  const batteries = item._batteries ?? [];
  const tpmsThresh = item.tpms_threshold ?? 2.0;

  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      activeOpacity={0.75}
      style={{
        backgroundColor: C.bgCard, borderRadius: 16,
        padding: 14, borderWidth: 1,
        borderColor: anyTamper || item.fallen ? C.danger + '55' : C.border,
      }}
    >
      {/* Header : nom + badge status */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: C.white }}>{item.name}</Text>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 5,
          paddingHorizontal: 10, paddingVertical: 4,
          borderRadius: 20, borderWidth: 1,
          borderColor: sc.color + '44', backgroundColor: sc.bg,
        }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: sc.color }} />
          <Text style={{ fontSize: 9, fontWeight: '700', color: sc.color, letterSpacing: 0.5 }}>
            {sc.label}
          </Text>
        </View>
      </View>

      {/* 5 cellules indicateurs */}
      <View style={{ flexDirection: 'row', gap: 5 }}>
        {/* BATT */}
        <IndicCell>
          <Image
            source={require('../../assets/battr.png')}
            style={{ width: 30, height: 30, tintColor: '#000000' }}
            resizeMode="contain"
          />
          <BatteryDashes batteries={batteries} />
          <CellLabel text="Batt." />
        </IndicCell>

        {/* SABOTAGE */}
        <IndicCell alertColor={anyTamper ? C.danger : C.success}>
          <Image
            source={require('../../assets/sabotage.png')}
            style={{ width: 30, height: 30, tintColor: '#000000' }}
            resizeMode="contain"
          />
          <View style={{ flexDirection: 'row', gap: 3 }}>
            {tamper.slice(0, 3).map((active, i) => (
              <Dot key={i} color={active ? C.danger : C.success} />
            ))}
          </View>
          <CellLabel text="Sabotage" />
        </IndicCell>

        {/* ALARME */}
        <IndicCell alertColor={item.alarm ? C.success : C.danger}>
          <Image
            source={require('../../assets/alarme.png')}
            style={{ width: 30, height: 30, tintColor: '#000000' }}
            resizeMode="contain"
          />
          <Dot color={item.alarm ? C.success : C.danger} />
          <CellLabel text="Alarme" />
        </IndicCell>

        {/* CHUTE */}
        <IndicCell alertColor={item.fallen ? C.danger : C.success}>
          <Image
            source={require('../../assets/gyro.png')}
            style={{ width: 30, height: 30, tintColor: '#000000' }}
            resizeMode="contain"
          />
          <Dot color={item.fallen ? C.danger : C.success} />
          <CellLabel text="Chute" />
        </IndicCell>

        {/* ROUES */}
        <IndicCell alertColor={
          wheelColor(item.wheel_front, tpmsThresh) === C.danger || wheelColor(item.wheel_rear, tpmsThresh) === C.danger
            ? C.danger
            : wheelColor(item.wheel_front, tpmsThresh) === C.warning || wheelColor(item.wheel_rear, tpmsThresh) === C.warning
              ? C.warning
              : (item.wheel_front != null || item.wheel_rear != null) ? C.success : null
        }>
          <Image
            source={require('../../assets/tpms.png')}
            style={{ width: 30, height: 30, tintColor: '#000000' }}
            resizeMode="contain"
          />
          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            <View style={{ alignItems: 'center', gap: 1 }}>
              <Dot color={wheelColor(item.wheel_front, tpmsThresh)} />
              <Text style={{ fontSize: 7, color: C.textMuted }}>AV</Text>
            </View>
            <View style={{ alignItems: 'center', gap: 1 }}>
              <Dot color={wheelColor(item.wheel_rear, tpmsThresh)} />
              <Text style={{ fontSize: 7, color: C.textMuted }}>AR</Text>
            </View>
          </View>
          <CellLabel text="Roues" />
        </IndicCell>
      </View>
    </TouchableOpacity>
  );
}

// ── Modal ajouter scooter ────────────────────────────────

function AddScooterModal({ visible, onClose, onSaved, initial }) {
  const isEdit = !!initial;
  const [name,      setName]      = useState('');
  const [model,     setModel]     = useState('');
  const [reference, setReference] = useState('');
  const [loading,   setLoading]   = useState(false);

  useEffect(() => {
    setName(initial?.name      ?? '');
    setModel(initial?.model    ?? '');
    setReference(initial?.reference ?? '');
  }, [initial, visible]);

  const handleSave = async () => {
    if (!name.trim()) { alertOk('Erreur', 'Le nom est obligatoire.'); return; }
    if (name.trim().length > 17) { alertOk('Erreur', 'Maximum 17 caractères.'); return; }
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
          backgroundColor: C.accent,
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          padding: 28, paddingBottom: Platform.OS === 'ios' ? 44 : 28,
        }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', alignSelf: 'center', marginBottom: 20 }} />
          <Text style={{ fontSize: 20, fontWeight: '900', color: C.white, marginBottom: 20, textAlign: 'center' }}>
            {isEdit ? 'Modifier Scooter' : 'Scooter X'}
          </Text>

          <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            N° Serie/ Cadre
          </Text>
          <TextInput
            value={name}
            onChangeText={t => setName(t.slice(0, 17))}
            placeholder="Scooter X"
            placeholderTextColor="rgba(255,255,255,0.4)"
            maxLength={17}
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: 12, padding: 14,
              color: C.white, fontSize: 15,
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
            }}
          />
          <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 12, marginTop: 4, textAlign: 'right' }}>
            {name.length}/17 caractères
          </Text>

          <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            Modèle
          </Text>
          <TextInput
            value={model} onChangeText={setModel}
            placeholder="ex: Niu NQi GT Pro" placeholderTextColor="rgba(255,255,255,0.4)"
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: 12, padding: 14,
              color: C.white, fontSize: 15,
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
              marginBottom: 20,
            }}
          />

          <TouchableOpacity onPress={handleSave} disabled={loading} activeOpacity={0.8}
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

// ── Modal deconnexion ────────────────────────────────────

function LogoutModal({ visible, onClose, onConfirm, loading }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 32 }}
        activeOpacity={1} onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1}
          style={{ backgroundColor: C.bgCard, borderRadius: 24, padding: 28, width: '100%', borderWidth: 1, borderColor: C.border }}>
          <Text style={{ fontSize: 20, fontWeight: '900', color: C.white, textAlign: 'center', marginBottom: 8 }}>
            Déconnexion
          </Text>
          <Text style={{ fontSize: 13, color: C.textSecondary, textAlign: 'center', marginBottom: 28, lineHeight: 20 }}>
            Vous allez être déconnecté de votre compte.
          </Text>
          <TouchableOpacity onPress={onConfirm} disabled={loading} activeOpacity={0.85}
            style={{ backgroundColor: C.dangerDim, borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: C.danger + '55' }}>
            {loading
              ? <ActivityIndicator color={C.danger} />
              : <Text style={{ fontSize: 14, fontWeight: '800', color: C.danger }}>Confirmer</Text>}
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

// ── Ecran principal ──────────────────────────────────────

export default function HomeScreen({ navigation }) {
  const [scooters,       setScooters]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [showForm,       setShowForm]       = useState(false);
  const [editingScooter, setEditingScooter] = useState(null);
  const [showLogout,     setShowLogout]     = useState(false);
  const [logoutLoading,  setLogoutLoading]  = useState(false);
  const [userEmail,      setUserEmail]      = useState('');
  const [showSidebar,    setShowSidebar]    = useState(false);
  const [searchText,     setSearchText]     = useState('');

  const fetchScooters = async () => {
    const { data: scooterData, error } = await supabase
      .from('scooters')
      .select('*, batteries(id, serial_number, slot, soc)');
    if (error) { console.error('Supabase:', error); setLoading(false); return; }

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
      return {
        ...s,
        ...(t ? {
          tamper_points: t.tamper_points,
          alarm: t.alarm,
          fallen: t.fallen,
          wheel_front: t.wheel_front,
          wheel_rear: t.wheel_rear,
          status: t.status ?? s.status ?? 'offline',
          last_update: t.recorded_at,
        } : { status: s.status ?? 'offline' }),
        _batteries: s.batteries ?? [],
      };
    }));
    setLoading(false);
  };

  useEffect(() => {
    fetchScooters();
    supabase.auth.getUser().then(({ data }) => setUserEmail(data?.user?.email ?? ''));

    const ch1 = supabase.channel('home-tel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'telemetry' }, () => fetchScooters())
      .subscribe();
    const ch2 = supabase.channel('home-batt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'batteries' }, () => fetchScooters())
      .subscribe();
    const ch3 = supabase.channel('home-scoot')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scooters' }, () => fetchScooters())
      .subscribe();

    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); supabase.removeChannel(ch3); };
  }, []);

  const handleLogout = async () => {
    setLogoutLoading(true);
    await supabase.auth.signOut();
    setLogoutLoading(false);
    setShowLogout(false);
  };

  const handleSidebarSelect = (key) => {
    if (key === 'addScooter')      { setEditingScooter(null); setShowForm(true); }
    else if (key === 'parametres') navigation.navigate('Parametres');
    else if (key === 'compte')     setShowLogout(true);
    else if (key === 'addBatterie' && scooters.length > 0) navigation.navigate('Dashboard', { scooter: scooters[0], openBatterie: true });
    else if (key === 'addTpms'     && scooters.length > 0) navigation.navigate('Dashboard', { scooter: scooters[0], openTpms: true });
  };

  // Filtrage par recherche
  const filtered = searchText.trim()
    ? scooters.filter(s => s.name?.toLowerCase().includes(searchText.toLowerCase()))
    : scooters;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={{ color: C.textMuted, marginTop: 12, fontSize: 12 }}>Connexion...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}

          ListHeaderComponent={() => (
            <View style={{ paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 36 }}>
              {/* ── Top bar : ☰ EVE Mobility 🔔 ── */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <TouchableOpacity onPress={() => setShowSidebar(true)} activeOpacity={0.7}>
                    <Text style={{ fontSize: 22, color: C.white }}>☰</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: C.white }}>
                    EVE <Text style={{ color: C.accentBright }}>Mobility</Text>
                  </Text>
                </View>

                <TouchableOpacity onPress={() => navigation.navigate('Notifications')} activeOpacity={0.7}
                  style={{ width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 20 }}>🔔</Text>
                </TouchableOpacity>
              </View>

              {/* ── Barre de recherche ── */}
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: C.bgCard, borderRadius: 12,
                borderWidth: 1, borderColor: C.border,
                paddingHorizontal: 14, height: 44,
                marginBottom: 18,
                gap: 10,
              }}>
                <TouchableOpacity onPress={() => setShowSidebar(true)}>
                  <Text style={{ fontSize: 16, color: C.textMuted }}>☰</Text>
                </TouchableOpacity>
                <TextInput
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder="Hinted search text"
                  placeholderTextColor={C.textMuted}
                  style={{ flex: 1, color: C.white, fontSize: 14 }}
                />
                <Text style={{ fontSize: 16, color: C.textMuted }}>🔍</Text>
              </View>
            </View>
          )}

          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
              <ScooterCard
                item={item}
                onPress={scooter => navigation.navigate('Dashboard', { scooter })}
              />
            </View>
          )}

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

      <Sidebar
        visible={showSidebar}
        onClose={() => setShowSidebar(false)}
        onSelect={handleSidebarSelect}
        userEmail={userEmail}
      />

      <AddScooterModal
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
