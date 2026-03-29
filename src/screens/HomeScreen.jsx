import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StatusBar, Platform, ActivityIndicator,
  Modal, TextInput, KeyboardAvoidingView,
} from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { C, STATUS, battColor, timeAgo, alertOk, alertConfirm } from '../constants';
import Sidebar from '../components/Sidebar';

// ── Helpers ──────────────────────────────────────────────

function wheelColor(v, threshold = 2.0) {
  if (v == null)            return C.textMuted;
  if (v < threshold)        return C.danger;
  if (v < threshold * 1.15) return C.warning;
  return C.success;
}

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
          width: 18, height: 6, borderRadius: 2,
          backgroundColor: b ? battColor(b.soc) : C.textMuted + '33',
        }} />
      ))}
    </View>
  );
}

// ── Scooter card ─────────────────────────────────────────

function ScooterCard({ item, onPress }) {
  const sc        = STATUS[item.status] ?? STATUS.offline;
  const tamper    = item.tamper_points ?? [false, false, false];
  const anyTamper = tamper.some(Boolean);
  const batteries = item._batteries ?? [];

  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      activeOpacity={0.75}
      style={{
        backgroundColor: C.bgCard,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: anyTamper || item.fallen ? C.danger + '55' : C.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
      }}
    >
      {/* Icone scooter */}
      <View style={{
        width: 48, height: 48, borderRadius: 12,
        backgroundColor: C.bgElevated,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: C.border,
      }}>
        <Text style={{ fontSize: 24 }}>🛵</Text>
      </View>

      {/* Infos */}
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: C.white }}>{item.name}</Text>
          {/* Badge status */}
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

        {item.model ? (
          <Text style={{ fontSize: 11, color: C.textMuted }}>{item.model}</Text>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <BatteryDashes batteries={batteries} />
          {anyTamper && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.danger }} />
              <Text style={{ fontSize: 9, color: C.danger, fontWeight: '700' }}>Alerte sabotage</Text>
            </View>
          )}
          {item.fallen && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.danger }} />
              <Text style={{ fontSize: 9, color: C.danger, fontWeight: '700' }}>Chute</Text>
            </View>
          )}
        </View>

        {item.last_update ? (
          <Text style={{ fontSize: 9, color: C.textMuted, marginTop: 2 }}>
            Mis à jour {timeAgo(item.last_update)}
          </Text>
        ) : null}
      </View>

      {/* Flèche */}
      <Text style={{ fontSize: 16, color: C.textMuted }}>›</Text>
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

          {/* N° Serie/Cadre */}
          <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            N° Serie/ Cadre
          </Text>
          <View style={{ position: 'relative', marginBottom: 6 }}>
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
          </View>
          <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 12, textAlign: 'right' }}>
            {name.length}/17 caractères
          </Text>

          {/* Modele */}
          <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            Modèle
          </Text>
          <TextInput
            value={model}
            onChangeText={setModel}
            placeholder="ex: Niu NQi GT Pro"
            placeholderTextColor="rgba(255,255,255,0.4)"
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: 12, padding: 14,
              color: C.white, fontSize: 15,
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
              marginBottom: 16,
            }}
          />

          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.8}
            style={{
              backgroundColor: C.white,
              borderRadius: 14, padding: 16,
              alignItems: 'center',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading
              ? <ActivityIndicator color={C.accent} />
              : <Text style={{ fontSize: 16, fontWeight: '900', color: C.accent }}>Valider</Text>
            }
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
              : <Text style={{ fontSize: 14, fontWeight: '800', color: C.danger }}>Confirmer</Text>
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
          latitude: t.latitude,
          longitude: t.longitude,
        } : { status: s.status ?? 'offline' }),
        _batteries: s.batteries ?? [],
      };
    }));
    setLoading(false);
  };

  useEffect(() => {
    fetchScooters();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data?.user?.email ?? '');
    });

    const ch1 = supabase.channel('home-tel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'telemetry' }, () => fetchScooters())
      .subscribe();
    const ch2 = supabase.channel('home-batt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'batteries' }, () => fetchScooters())
      .subscribe();
    const ch3 = supabase.channel('home-scoot')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scooters' }, () => fetchScooters())
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
      supabase.removeChannel(ch3);
    };
  }, []);

  const handleLogout = async () => {
    setLogoutLoading(true);
    await supabase.auth.signOut();
    setLogoutLoading(false);
    setShowLogout(false);
  };

  const handleSidebarSelect = (key) => {
    if (key === 'addScooter') { setEditingScooter(null); setShowForm(true); }
    else if (key === 'parametres')  navigation.navigate('Parametres');
    else if (key === 'compte')      setShowLogout(true);
    else if (key === 'addBatterie') navigation.navigate('Dashboard', { scooter: scooters[0], openBatterie: true });
    else if (key === 'addTpms')     navigation.navigate('Dashboard', { scooter: scooters[0], openTpms: true });
  };

  const online   = scooters.filter(s => s.status !== 'offline').length;
  const charging = scooters.filter(s => s.status === 'charging').length;

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
          data={scooters}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={{ padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40 }}
          showsVerticalScrollIndicator={false}

          ListHeaderComponent={() => (
            <>
              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, letterSpacing: 3, color: C.accentBright, textTransform: 'uppercase', marginBottom: 6 }}>
                    Tableau de bord
                  </Text>
                  <Text style={{ fontSize: 32, fontWeight: '900', color: C.white, letterSpacing: -1 }}>
                    EVE <Text style={{ color: C.accentBright }}>Mobility</Text>
                  </Text>
                  <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 6 }}>
                    {scooters.length} scooter{scooters.length > 1 ? 's' : ''}
                  </Text>
                  {userEmail ? (
                    <Text style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>{userEmail}</Text>
                  ) : null}
                </View>

                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  {/* Hamburger */}
                  <TouchableOpacity
                    onPress={() => setShowSidebar(true)}
                    activeOpacity={0.8}
                    style={{
                      width: 48, height: 48, borderRadius: 14,
                      backgroundColor: C.bgCard,
                      borderWidth: 1, borderColor: C.border,
                      justifyContent: 'center', alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 20, color: C.white }}>☰</Text>
                  </TouchableOpacity>

                  {/* Ajouter */}
                  <TouchableOpacity
                    onPress={() => { setEditingScooter(null); setShowForm(true); }}
                    activeOpacity={0.8}
                    style={{
                      width: 48, height: 48, borderRadius: 14,
                      backgroundColor: C.accent,
                      justifyContent: 'center', alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 26, color: C.white, fontWeight: '300', lineHeight: 30 }}>+</Text>
                  </TouchableOpacity>

                  {/* Déconnexion */}
                  <TouchableOpacity
                    onPress={() => setShowLogout(true)}
                    activeOpacity={0.8}
                    style={{
                      width: 48, height: 48, borderRadius: 14,
                      backgroundColor: C.dangerDim,
                      borderWidth: 1, borderColor: C.danger + '44',
                      justifyContent: 'center', alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>🚪</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Stats en ligne / en charge */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 28 }}>
                {[
                  { value: online,   color: C.success, label: 'En ligne'  },
                  { value: charging, color: C.warning, label: 'En charge' },
                ].map(({ value, color, label }) => (
                  <View key={label} style={{
                    flex: 1, backgroundColor: C.bgCard, borderRadius: 14,
                    padding: 14, alignItems: 'center',
                    borderWidth: 1, borderColor: C.border,
                  }}>
                    <Text style={{ fontSize: 24, fontWeight: '900', color, letterSpacing: -1 }}>{value}</Text>
                    <Text style={{ fontSize: 9, color: C.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 }}>
                      {label}
                    </Text>
                  </View>
                ))}
              </View>

              <Text style={{ fontSize: 9, color: C.textMuted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>
                Appareils
              </Text>
            </>
          )}

          renderItem={({ item }) => (
            <ScooterCard
              item={item}
              onPress={scooter => navigation.navigate('Dashboard', { scooter })}
            />
          )}

          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
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
