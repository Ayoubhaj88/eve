import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StatusBar, Platform, ActivityIndicator,
  Modal, TextInput, KeyboardAvoidingView,
} from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { C, STATUS, battColor, timeAgo, alertOk } from '../constants';
import Sidebar from '../components/Sidebar';
import { mqttClient } from '../lib/mqttService';

// ── Helpers ──────────────────────────────────────────────

const normalizeScooterId = (id) => {
  if (!id) return '';

  // always lowercase
  const clean = String(id).trim().toLowerCase();

  // if MQTT sends short id, match against start of UUID safely
  return clean;
};

function wheelColor(v, threshold = 2.0) {
  if (v == null)            return C.textMuted;
  if (v < threshold)        return C.danger;
  if (v < threshold * 1.15) return C.warning;
  return C.success;
}

// ── Indicator cell ────────────────────────────────────────

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
      borderWidth: 1.5, borderColor: borderCol,
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

// ── Battery dashes ────────────────────────────────────────

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

// ── Scooter card ──────────────────────────────────────────

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

      <View style={{ flexDirection: 'row', gap: 5 }}>
        <IndicCell>
          <Image source={require('../../assets/battr.png')} style={{ width: 40, height: 40, tintColor: '#000000' }} resizeMode="contain" />
          <BatteryDashes batteries={batteries} />
          <CellLabel text="Batt." />
        </IndicCell>

        <IndicCell alertColor={anyTamper ? C.danger : C.success}>
          <Image source={require('../../assets/sabotage.png')} style={{ width: 30, height: 30, tintColor: '#000000' }} resizeMode="contain" />
          <View style={{ flexDirection: 'row', gap: 3 }}>
            {tamper.slice(0, 3).map((active, i) => (
              <Dot key={i} color={active ? C.danger : C.success} />
            ))}
          </View>
          <CellLabel text="Sabotage" />
        </IndicCell>

        <IndicCell alertColor={item.alarm ? C.success : C.danger}>
          <Image source={require('../../assets/alarme.png')} style={{ width: 30, height: 30, tintColor: '#000000' }} resizeMode="contain" />
          <Dot color={item.alarm ? C.success : C.danger} />
          <CellLabel text="Alarme" />
        </IndicCell>

        <IndicCell alertColor={item.fallen ? C.danger : C.success}>
          <Image source={require('../../assets/gyro.png')} style={{ width: 30, height: 30, tintColor: '#000000' }} resizeMode="contain" />
          <Dot color={item.fallen ? C.danger : C.success} />
          <CellLabel text="Chute" />
        </IndicCell>

        <IndicCell alertColor={
          wheelColor(item.wheel_front, tpmsThresh) === C.danger || wheelColor(item.wheel_rear, tpmsThresh) === C.danger
            ? C.danger
            : wheelColor(item.wheel_front, tpmsThresh) === C.warning || wheelColor(item.wheel_rear, tpmsThresh) === C.warning
              ? C.warning
              : (item.wheel_front != null || item.wheel_rear != null) ? C.success : null
        }>
          <Image source={require('../../assets/tpms.png')} style={{ width: 30, height: 30, tintColor: '#000000' }} resizeMode="contain" />
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

// ── Modal ajouter scooter ─────────────────────────────────

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
            value={name} onChangeText={t => setName(t.slice(0, 17))}
            placeholder="Scooter X" placeholderTextColor="rgba(255,255,255,0.4)"
            maxLength={17}
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 14,
              color: C.white, fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
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
              backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 14,
              color: C.white, fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
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

// ── Modal deconnexion ─────────────────────────────────────

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

// ── Ecran principal ───────────────────────────────────────

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
  
  const [mqttStatus, setMqttStatus] = useState('disconnected');
  const [mqttLog, setMqttLog] = useState([]);

  // Ref pour éviter les appels simultanés
  const fetchingRef = useRef(false);

  const fetchScooters = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      // 1. On récupère les scooters et leurs batteries
      const { data: scooterData, error } = await supabase
        .from('scooters')
        .select('*, batteries(id, serial_number, slot, soc)');
      
      if (error) throw error;

      // 2. On récupère la dernière télémétrie pour CHAQUE scooter (pour le switch/tamper)
      const enriched = await Promise.all((scooterData || []).map(async (s) => {
        const { data: t } = await supabase
          .from('telemetry')
          .select('tamper_points, alarm, fallen, status, recorded_at')
          .eq('scooter_id', s.id)
          .order('recorded_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          ...s,
          // On injecte les tamper_points (interrupteurs) ici
          tamper_points: t?.tamper_points ?? [false, false, false],
          alarm: t?.alarm ?? false,
          fallen: t?.fallen ?? false,
          status: t?.status ?? 'offline',
          last_update: t?.recorded_at,
          _batteries: s.batteries || []
        };
      }));

      setScooters(enriched);
    } catch (e) {
      console.error('Erreur Fetch HomeScreen:', e.message);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  };

	const onMessage = (topic, message) => {
		console.log("[MQTT][1] message received:", topic, message.toString());
	  const text = message.toString();

	  setMqttLog(prev => {
		const updated = [`${topic}: ${text}`, ...prev];
		return updated.slice(0, 8);
	  });

	  try {
		const parts = topic.split('/');
		const mqttScooterId = parts[1];
		
		console.log("[MQTT][2] scooterId extracted:", mqttScooterId);
		console.log("[MQTT][2] current scooter IDs:", scooters.map(s => s.id));

		const raw = message.toString();
		const mqttValue = raw.trim(); // "1" or "0"

		setScooters(current =>
		  current.map(s => {
			console.log("[MQTT][4] comparing", s.id, mqttScooterId);

			const dbId = normalizeScooterId(s.id);
			const msgId = normalizeScooterId(mqttScooterId);

			console.log("[MQTT][COMPARE]", { dbId, msgId });

			if (!dbId.startsWith(msgId) && dbId !== msgId) {
			  return s;
			}

			console.log("[MQTT][MATCH] 🎯 scooter updated:", dbId);

			console.log("[MQTT][4] ✅ MATCH FOUND");

			const prevTamper = s.tamper_points ?? [false, false, false];
			const updatedTamper = [...prevTamper];

			updatedTamper[0] = mqttValue === "1";

			return {
			  ...s,
			  tamper_points: updatedTamper,
			  last_update: Date.now(),
			};
		  })
		);
	  } catch (e) {
		console.log("Erreur Parsing MQTT HomeScreen:", e);
	  }
	};


  useEffect(() => {
    // 1. Chargement initial des données stockées
    fetchScooters();
    supabase.auth.getUser().then(({ data }) => setUserEmail(data?.user?.email ?? ''));

    // 2. ÉCOUTE MQTT (Réactivité en temps réel)
    // On s'abonne à tous les scooters d'un coup
    const globalTopic = 'scooter/+/telemetry';
	
	console.log("📡 Subscribing to:", globalTopic);
	mqttClient.subscribe(globalTopic);
	mqttClient.on('message', onMessage);

	
    


mqttClient.on('connect', () => {
  console.log('🟢 MQTT CONNECTED');
  setMqttStatus('connected');
});

mqttClient.on('close', () => {
  console.log('⚪ MQTT CLOSED');
  setMqttStatus('disconnected');
});

mqttClient.on('error', (err) => {
  console.log('🔴 MQTT ERROR:', err.message);
  setMqttStatus('error');
});

return () => {
  mqttClient.unsubscribe(globalTopic);
  mqttClient.removeListener('message', onMessage);
};
}, []); // ✅ THIS closes useEffect

  const handleLogout = async () => {
    setLogoutLoading(true);
    await supabase.auth.signOut();
    setLogoutLoading(false);
    setShowLogout(false);
  };

  const handleSidebarSelect = (key) => {
    if (key === 'addScooter')       { setEditingScooter(null); setShowForm(true); }
    else if (key === 'parametres')  navigation.navigate('Parametres');
    else if (key === 'compte')      setShowLogout(true);
    else if (key === 'addBatterie') navigation.navigate('BatteryStock');
    else if (key === 'addTpms')     navigation.navigate('TpmsStock');
    else if (key === 'admin')       navigation.navigate('Admin');
  };

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

				{/* HEADER ROW */}
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

				{/* 🧪 MQTT DEBUG BOX (ADD THIS BLOCK) */}
				<View style={{
				  backgroundColor: '#0f0f0f',
				  borderRadius: 10,
				  padding: 10,
				  marginBottom: 12,
				  borderWidth: 1,
				  borderColor: '#333'
				}}>
				  <Text style={{ color: '#00ff88', fontWeight: '800' }}>
					MQTT: {mqttStatus}
				  </Text>

				  {mqttLog.map((msg, i) => (
					<Text key={i} style={{ color: '#aaa', fontSize: 10 }}>
					  {msg}
					</Text>
				  ))}
				</View>

				{/* SEARCH BAR */}
				<View style={{
				  flexDirection: 'row', alignItems: 'center',
				  backgroundColor: C.bgCard, borderRadius: 12,
				  borderWidth: 1, borderColor: C.border,
				  paddingHorizontal: 14, height: 44, marginBottom: 18, gap: 10,
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