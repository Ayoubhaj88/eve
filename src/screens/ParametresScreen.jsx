import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Switch,
  StatusBar, Platform, TextInput,
} from 'react-native';
import { C, alertOk } from '../constants';

// ── Composants réutilisables ─────────────────────────────────

function Header({ title, subtitle, onBack }) {
  return (
    <View style={{
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
      paddingHorizontal: 20, paddingBottom: 16,
      flexDirection: 'row', alignItems: 'center', gap: 12,
      borderBottomWidth: 1, borderBottomColor: C.border,
    }}>
      <TouchableOpacity onPress={onBack}
        style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.bgCard, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
        <Text style={{ fontSize: 18, color: C.white }}>‹</Text>
      </TouchableOpacity>
      <View>
        <Text style={{ fontSize: 18, fontWeight: '900', color: C.white, letterSpacing: -0.5 }}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ fontSize: 10, color: C.accentBright, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function SectionLabel({ text }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
      {text}
    </Text>
  );
}

function FieldRow({ label, value, onChangeText, unit, width = 60 }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}>
      <Text style={{ fontSize: 13, color: C.textSecondary, fontWeight: '600' }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="numeric"
          style={{
            backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
            color: C.accentBright, fontSize: 14, fontWeight: '800', width, textAlign: 'center',
            borderWidth: 1, borderColor: C.accent + '44',
          }}
        />
        {unit ? <Text style={{ fontSize: 11, color: C.textMuted, fontWeight: '700' }}>{unit}</Text> : null}
      </View>
    </View>
  );
}

function DoubleFieldRow({ label, value1, onChangeText1, value2, onChangeText2, unit }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}>
      <Text style={{ fontSize: 13, color: C.textSecondary, fontWeight: '600' }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <TextInput value={value1} onChangeText={onChangeText1} keyboardType="numeric"
          style={{ backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, color: C.accentBright, fontSize: 14, fontWeight: '800', width: 50, textAlign: 'center', borderWidth: 1, borderColor: C.accent + '44' }} />
        <TextInput value={value2} onChangeText={onChangeText2} keyboardType="numeric"
          style={{ backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, color: C.accentBright, fontSize: 14, fontWeight: '800', width: 50, textAlign: 'center', borderWidth: 1, borderColor: C.accent + '44' }} />
        {unit ? <Text style={{ fontSize: 11, color: C.textMuted, fontWeight: '700' }}>{unit}</Text> : null}
      </View>
    </View>
  );
}

function ToggleRow({ label, value, onValueChange }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: C.white }}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: C.bgElevated, true: C.accent }}
        thumbColor={value ? C.white : C.textMuted}
      />
    </View>
  );
}

function Card({ children, style }) {
  return (
    <View style={[{
      backgroundColor: C.bgCard, borderRadius: 16, padding: 18,
      borderWidth: 1, borderColor: C.border,
    }, style]}>
      {children}
    </View>
  );
}

function BigButton({ label, onPress, active }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}
      style={{
        backgroundColor: active ? C.accent : C.bgCard,
        borderRadius: 14, paddingVertical: 16, alignItems: 'center',
        borderWidth: 2, borderColor: active ? C.accentBright : C.border,
      }}>
      <Text style={{ fontSize: 16, fontWeight: '900', color: C.white }}>{label}</Text>
    </TouchableOpacity>
  );
}

function CategoryButton({ label, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}
      style={{
        backgroundColor: C.accent, borderRadius: 14,
        paddingVertical: 18, alignItems: 'center',
        borderWidth: 1, borderColor: C.accentBright,
      }}>
      <Text style={{ fontSize: 16, fontWeight: '900', color: C.white }}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Écran GYROSCOPE (Notifications) ──────────────────────────

function GyroscopeNotifScreen({ onBack }) {
  const [rotG, setRotG] = useState('');
  const [rotD, setRotD] = useState('');
  const [rotA, setRotA] = useState('');
  const [son,  setSon]  = useState(true);
  const [msg,  setMsg]  = useState('');

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="GYROSCOPE" subtitle="Notifications" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} showsVerticalScrollIndicator={false}>
        <Card>
          <SectionLabel text="Seuils" />
          <FieldRow label="Rotation Gauche" value={rotG} onChangeText={setRotG} unit="XX °" />
          <FieldRow label="Rotation Droite" value={rotD} onChangeText={setRotD} unit="XX °" />
          <FieldRow label="Rotation Avant" value={rotA} onChangeText={setRotA} unit="XX °" />
        </Card>

        <Card>
          <ToggleRow label="Son Alarme" value={son} onValueChange={setSon} />
        </Card>

        <Card>
          <SectionLabel text="Message" />
          <TextInput
            value={msg} onChangeText={setMsg}
            placeholder="Écrire votre message"
            placeholderTextColor={C.textMuted}
            multiline
            style={{
              backgroundColor: C.bgElevated, borderRadius: 12, padding: 14,
              color: C.white, fontSize: 14, minHeight: 80, textAlignVertical: 'top',
              borderWidth: 1, borderColor: C.border,
            }}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

// ── Écran TPMS (Notifications) ───────────────────────────────

function TpmsNotifScreen({ onBack }) {
  const [moyen,    setMoyen]    = useState('');
  const [critique, setCritique] = useState('');
  const [type,     setType]     = useState('');
  const [alarme,   setAlarme]   = useState(true);
  const [plein,    setPlein]    = useState(false);
  const [son,      setSon]      = useState(true);
  const [msg,      setMsg]      = useState('');

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="TPMS" subtitle="Notifications" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} showsVerticalScrollIndicator={false}>
        <Card>
          <SectionLabel text="Seuils" />
          <FieldRow label="Moyen" value={moyen} onChangeText={setMoyen} unit="XX Bar" />
          <FieldRow label="Critique" value={critique} onChangeText={setCritique} unit="XX Bar" />
          <FieldRow label="Type" value={type} onChangeText={setType} />
        </Card>

        <Card>
          <ToggleRow label="Alarme" value={alarme} onValueChange={setAlarme} />
          <ToggleRow label="Plein ecran" value={plein} onValueChange={setPlein} />
          <ToggleRow label="Son Alarme" value={son} onValueChange={setSon} />
        </Card>

        <Card>
          <SectionLabel text="Message" />
          <TextInput
            value={msg} onChangeText={setMsg}
            placeholder="Écrire votre message"
            placeholderTextColor={C.textMuted}
            multiline
            style={{
              backgroundColor: C.bgElevated, borderRadius: 12, padding: 14,
              color: C.white, fontSize: 14, minHeight: 80, textAlignVertical: 'top',
              borderWidth: 1, borderColor: C.border,
            }}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

// ── Écran BATTERIE (Notifications) ───────────────────────────

function BatterieNotifScreen({ onBack }) {
  const [son,     setSon]     = useState(true);
  const [msg,     setMsg]     = useState('');
  const [alm1,    setAlm1]    = useState('');
  const [alm2,    setAlm2]    = useState('');

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="BATTERIE" subtitle="Notifications" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} showsVerticalScrollIndicator={false}>
        <Card>
          <ToggleRow label="Son Alarme" value={son} onValueChange={setSon} />
        </Card>

        <Card>
          <SectionLabel text="Message" />
          <TextInput
            value={msg} onChangeText={setMsg}
            placeholder="Écrire votre message"
            placeholderTextColor={C.textMuted}
            multiline
            style={{
              backgroundColor: C.bgElevated, borderRadius: 12, padding: 14,
              color: C.white, fontSize: 14, minHeight: 80, textAlignVertical: 'top',
              borderWidth: 1, borderColor: C.border,
            }}
          />
        </Card>

        <Card>
          <SectionLabel text="Reglage" />
          <DoubleFieldRow label="Alarme" value1={alm1} onChangeText1={setAlm1} value2={alm2} onChangeText2={setAlm2} unit="%" />
        </Card>

        <Card style={{ backgroundColor: C.bgElevated }}>
          <Text style={{ fontSize: 11, color: C.textSecondary, lineHeight: 18 }}>
            NB: Une notification d'alerte sera envoyée quand la charge totale des batteries du scooter atteint la valeur définie.
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}

// ── Écran SABOTAGE (Notifications) ───────────────────────────

function SabotageNotifScreen({ onBack }) {
  const [son, setSon] = useState(true);
  const [msg, setMsg] = useState('');

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="SABOTAGE" subtitle="Notifications" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} showsVerticalScrollIndicator={false}>
        <Card>
          <ToggleRow label="Son Alarme" value={son} onValueChange={setSon} />
        </Card>

        <Card>
          <SectionLabel text="Message" />
          <TextInput
            value={msg} onChangeText={setMsg}
            placeholder="Écrire votre message"
            placeholderTextColor={C.textMuted}
            multiline
            style={{
              backgroundColor: C.bgElevated, borderRadius: 12, padding: 14,
              color: C.white, fontSize: 14, minHeight: 80, textAlignVertical: 'top',
              borderWidth: 1, borderColor: C.border,
            }}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

// ── Écran ALARME ON (Notifications) ──────────────────────────

function AlarmeOnNotifScreen({ onBack }) {
  const [son,   setSon]   = useState(true);
  const [msg,   setMsg]   = useState('');
  const [delai, setDelai] = useState('');

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="ALARME ON" subtitle="Notifications" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} showsVerticalScrollIndicator={false}>
        <Card>
          <ToggleRow label="Son Alarme" value={son} onValueChange={setSon} />
        </Card>

        <Card>
          <SectionLabel text="Message" />
          <TextInput
            value={msg} onChangeText={setMsg}
            placeholder="Écrire votre message"
            placeholderTextColor={C.textMuted}
            multiline
            style={{
              backgroundColor: C.bgElevated, borderRadius: 12, padding: 14,
              color: C.white, fontSize: 14, minHeight: 80, textAlignVertical: 'top',
              borderWidth: 1, borderColor: C.border,
            }}
          />
        </Card>

        <Card>
          <SectionLabel text="Reglage" />
          <FieldRow label="Delai" value={delai} onChangeText={setDelai} unit="S" />
        </Card>

        <Card style={{ backgroundColor: C.bgElevated }}>
          <Text style={{ fontSize: 11, color: C.textSecondary, lineHeight: 18 }}>
            NB: Ce délai est la durée d'attente avant envoi d'une notification après avoir laissé le scooter sans activer l'alarme.
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}

// ── Écran ENVOI LED (Notifications → Reglage Fn.) ───────────

function EnvoiLedScreen({ onBack }) {
  const [type,    setType]    = useState('Continue');
  const [duree,   setDuree]   = useState('');
  const [rythme,  setRythme]  = useState('');

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="ENVOI LED" subtitle="Reglage Fn." onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} showsVerticalScrollIndicator={false}>
        <Card>
          <SectionLabel text="Type" />
          {['Continue', 'Clignotant'].map(t => (
            <TouchableOpacity key={t} onPress={() => setType(t)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
              <View style={{
                width: 20, height: 20, borderRadius: 10, borderWidth: 2,
                borderColor: type === t ? C.accentBright : C.textMuted,
                justifyContent: 'center', alignItems: 'center',
              }}>
                {type === t && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.accentBright }} />}
              </View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: type === t ? C.white : C.textSecondary }}>{t}</Text>
            </TouchableOpacity>
          ))}
        </Card>

        <Card>
          <SectionLabel text="Reglage" />
          <FieldRow label="Durée" value={duree} onChangeText={setDuree} unit="S" />
          <FieldRow label="Rythme" value={rythme} onChangeText={setRythme} unit="XX s" />
        </Card>
      </ScrollView>
    </View>
  );
}

// ── Écran INTERFACE > BATTERIE ───────────────────────────────

function InterfaceBatterieScreen({ onBack }) {
  const [jauneMin, setJauneMin] = useState('');
  const [jauneMax, setJauneMax] = useState('');
  const [rougeMin, setRougeMin] = useState('');
  const [rougeMax, setRougeMax] = useState('');
  const [vertVal,  setVertVal]  = useState('');
  const [alerteV1, setAlerteV1] = useState('');
  const [alerteV2, setAlerteV2] = useState('');
  const [alerteV3, setAlerteV3] = useState('');
  const [blueVal,  setBlueVal]  = useState('');

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="BATTERIE" subtitle="Interface" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} showsVerticalScrollIndicator={false}>
        <Card>
          <SectionLabel text="Couleur Des Icons" />
          <DoubleFieldRow label="Jaune" value1={jauneMin} onChangeText1={setJauneMin} value2={jauneMax} onChangeText2={setJauneMax} unit="%" />
          <DoubleFieldRow label="Rouge" value1={rougeMin} onChangeText1={setRougeMin} value2={rougeMax} onChangeText2={setRougeMax} unit="%" />
          <FieldRow label="Vert" value={vertVal} onChangeText={setVertVal} unit="%" />
        </Card>

        <Card>
          <SectionLabel text="Couleur D'arrier plan" />
          <Text style={{ fontSize: 10, color: C.textMuted, marginBottom: 8 }}>Seuiles des batteries</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: C.danger }} />
              <Text style={{ fontSize: 13, color: C.textSecondary, fontWeight: '600' }}>Alerte</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TextInput value={alerteV1} onChangeText={setAlerteV1} keyboardType="numeric"
                style={{ backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, color: C.accentBright, fontSize: 14, fontWeight: '800', width: 45, textAlign: 'center', borderWidth: 1, borderColor: C.accent + '44' }} />
              <TextInput value={alerteV2} onChangeText={setAlerteV2} keyboardType="numeric"
                style={{ backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, color: C.accentBright, fontSize: 14, fontWeight: '800', width: 45, textAlign: 'center', borderWidth: 1, borderColor: C.accent + '44' }} />
              <TextInput value={alerteV3} onChangeText={setAlerteV3} keyboardType="numeric"
                style={{ backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, color: C.accentBright, fontSize: 14, fontWeight: '800', width: 45, textAlign: 'center', borderWidth: 1, borderColor: C.accent + '44' }} />
              <Text style={{ fontSize: 11, color: C.textMuted }}>%</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: C.accentBright }} />
              <Text style={{ fontSize: 13, color: C.textSecondary, fontWeight: '600' }}>Blue</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TextInput value={blueVal} onChangeText={setBlueVal} keyboardType="numeric"
                style={{ backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, color: C.accentBright, fontSize: 14, fontWeight: '800', width: 50, textAlign: 'center', borderWidth: 1, borderColor: C.accent + '44' }} />
              <Text style={{ fontSize: 11, color: C.textMuted }}>%</Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

// ── Liste Notifications ──────────────────────────────────────

const NOTIF_CATEGORIES = [
  { key: 'batterie',  label: 'BATTERIE'  },
  { key: 'tpms',      label: 'TPMS'      },
  { key: 'gyroscope', label: 'GYROSCOPE' },
  { key: 'sabotage',  label: 'SABOTAGE'  },
  { key: 'alarmeOn',  label: 'ALARME ON' },
  { key: 'envoiLed',  label: 'ENVOI LED' },
];

// ── Écran principal Parametres ───────────────────────────────

export default function ParametresScreen({ navigation }) {
  // Navigation interne par état
  const [screen, setScreen] = useState('main'); // main | notifList | gyroscope | tpms | batterie | sabotage | alarmeOn | envoiLed | interfaceBatt

  // ── Sous-écrans ──
  if (screen === 'gyroscope')    return <GyroscopeNotifScreen onBack={() => setScreen('notifList')} />;
  if (screen === 'tpms')         return <TpmsNotifScreen      onBack={() => setScreen('notifList')} />;
  if (screen === 'batterie')     return <BatterieNotifScreen   onBack={() => setScreen('notifList')} />;
  if (screen === 'sabotage')     return <SabotageNotifScreen   onBack={() => setScreen('notifList')} />;
  if (screen === 'alarmeOn')     return <AlarmeOnNotifScreen   onBack={() => setScreen('notifList')} />;
  if (screen === 'envoiLed')     return <EnvoiLedScreen        onBack={() => setScreen('notifList')} />;
  if (screen === 'interfaceBatt') return <InterfaceBatterieScreen onBack={() => setScreen('interfaceMenu')} />;

  // ── Interface menu ──
  if (screen === 'interfaceMenu') {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Header title="PARAMETRES" subtitle="Interface" onBack={() => setScreen('main')} />
        <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }} showsVerticalScrollIndicator={false}>
          <CategoryButton label="BATTERIE" onPress={() => setScreen('interfaceBatt')} />
        </ScrollView>
      </View>
    );
  }

  // ── Notifications list ──
  if (screen === 'notifList') {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Header title="PARAMETRES" subtitle="Notifications" onBack={() => setScreen('main')} />
        <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }} showsVerticalScrollIndicator={false}>
          {NOTIF_CATEGORIES.map(cat => (
            <CategoryButton key={cat.key} label={cat.label} onPress={() => setScreen(cat.key)} />
          ))}
        </ScrollView>
      </View>
    );
  }

  // ── Main screen : Interface / Notifications ──
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <Header title="PARAMETRES" onBack={() => navigation.goBack()} />

      <View style={{ padding: 20, gap: 14 }}>
        <BigButton label="Interface" onPress={() => setScreen('interfaceMenu')} />
        <BigButton label="Notifications" onPress={() => setScreen('notifList')} />
      </View>
    </View>
  );
}
