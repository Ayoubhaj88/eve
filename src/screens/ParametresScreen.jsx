import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Switch,
  StatusBar, Platform, TextInput, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { C, alertOk } from '../constants';

// ── Hook persistance AsyncStorage ────────────────────────────

function useSettings(key, defaults) {
  const [values, setValues] = useState(defaults);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(`settings_${key}`).then(json => {
      if (json) {
        try { setValues(prev => ({ ...prev, ...JSON.parse(json) })); } catch {}
      }
      setLoaded(true);
    });
  }, [key]);

  const set = useCallback((k, v) => setValues(prev => ({ ...prev, [k]: v })), []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await AsyncStorage.setItem(`settings_${key}`, JSON.stringify(values));
      alertOk('Succès', 'Paramètres sauvegardés.');
    } catch (e) { alertOk('Erreur', e.message); }
    finally { setSaving(false); }
  }, [key, values]);

  return { values, set, save, saving, loaded };
}

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

function NumericInput({ value, onChange }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      keyboardType="numeric"
      style={{
        minWidth: 52, height: 32, borderRadius: 8, backgroundColor: C.bg,
        paddingHorizontal: 10, color: C.accentBright, fontSize: 14, fontWeight: '800',
        textAlign: 'center', borderWidth: 1, borderColor: C.accent + '44',
      }}
    />
  );
}

function FieldRow({ label, value, onChangeText, unit }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}>
      <Text style={{ fontSize: 13, color: C.textSecondary, fontWeight: '600' }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <NumericInput value={value} onChange={onChangeText} />
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

function SaveButton({ onPress, loading }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={loading} activeOpacity={0.8}
      style={{ backgroundColor: C.accent, borderRadius: 14, padding: 16, alignItems: 'center', opacity: loading ? 0.6 : 1 }}>
      {loading
        ? <ActivityIndicator color={C.white} />
        : <Text style={{ fontSize: 15, fontWeight: '900', color: C.white }}>Sauvegarder</Text>}
    </TouchableOpacity>
  );
}

function MsgField({ value, onChangeText }) {
  return (
    <Card>
      <SectionLabel text="Message" />
      <TextInput
        value={value} onChangeText={onChangeText}
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
  const { values: s, set, save, saving } = useSettings('notif_gyroscope', {
    seuil: '55', son: true, msg: '',
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="GYROSCOPE" subtitle="Notifications" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} showsVerticalScrollIndicator={false}>
        <Card>
          <SectionLabel text="Reglage" />
          <FieldRow label="Seuil de chute" value={s.seuil} onChangeText={v => set('seuil', v)} />
        </Card>

        <Card>
          <ToggleRow label="Son Alarme" value={s.son} onValueChange={v => set('son', v)} />
        </Card>

        <MsgField value={s.msg} onChangeText={v => set('msg', v)} />


        <SaveButton onPress={save} loading={saving} />
      </ScrollView>
    </View>
  );
}

// ── Écran BATTERIE (Notifications) ───────────────────────────

function BatterieNotifScreen({ onBack }) {
  const { values: s, set, save, saving } = useSettings('notif_batterie', {
    son: true, msg: '', alarme: '20',
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="BATTERIE" subtitle="Notifications" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} showsVerticalScrollIndicator={false}>
        <Card>
          <ToggleRow label="Son Alarme" value={s.son} onValueChange={v => set('son', v)} />
        </Card>

        <MsgField value={s.msg} onChangeText={v => set('msg', v)} />

        <Card>
          <SectionLabel text="Reglage" />
          <FieldRow label="Alarme" value={s.alarme} onChangeText={v => set('alarme', v)} unit="%" />
        </Card>

        <Card style={{ backgroundColor: C.bgElevated }}>
          <Text style={{ fontSize: 11, color: C.textSecondary, lineHeight: 18 }}>
            NB: Une notification d'alerte est envoyée lorsque la charge totale des batteries du scooter atteint la valeur définie.
          </Text>
        </Card>

        <SaveButton onPress={save} loading={saving} />
      </ScrollView>
    </View>
  );
}

// ── Écran ALARME ON (Notifications) ──────────────────────────

function AlarmeOnNotifScreen({ onBack }) {
  const { values: s, set, save, saving } = useSettings('notif_alarmeOn', {
    son: true, msg: '', delai: '',
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="ALARME ON" subtitle="Notifications" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} showsVerticalScrollIndicator={false}>
        <Card>
          <ToggleRow label="Son Alarme" value={s.son} onValueChange={v => set('son', v)} />
        </Card>

        <MsgField value={s.msg} onChangeText={v => set('msg', v)} />

        <Card>
          <SectionLabel text="Reglage" />
          <FieldRow label="Delai" value={s.delai} onChangeText={v => set('delai', v)} unit="S" />
        </Card>

        <Card style={{ backgroundColor: C.bgElevated }}>
          <Text style={{ fontSize: 11, color: C.textSecondary, lineHeight: 18 }}>
            NB: Ce délai est la durée d'attente avant envoi d'une notification après avoir laissé le scooter sans activer l'alarme.
          </Text>
        </Card>

        <SaveButton onPress={save} loading={saving} />
      </ScrollView>
    </View>
  );
}

// ── Liste Notifications ──────────────────────────────────────

const NOTIF_CATEGORIES = [
  { key: 'batterie',  label: 'BATTERIE'  },
  { key: 'gyroscope', label: 'GYROSCOPE' },
  { key: 'alarmeOn',  label: 'ALARME ON' },
];

// ── Écran principal Parametres ───────────────────────────────

export default function ParametresScreen({ navigation }) {
  const [screen, setScreen] = useState('main');

  if (screen === 'gyroscope')  return <GyroscopeNotifScreen onBack={() => setScreen('main')} />;
  if (screen === 'batterie')   return <BatterieNotifScreen  onBack={() => setScreen('main')} />;
  if (screen === 'alarmeOn')   return <AlarmeOnNotifScreen  onBack={() => setScreen('main')} />;

  // Main = liste des notifications directement
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <Header title="PARAMETRES" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }} showsVerticalScrollIndicator={false}>
        {NOTIF_CATEGORIES.map(cat => (
          <CategoryButton key={cat.key} label={cat.label} onPress={() => setScreen(cat.key)} />
        ))}
      </ScrollView>
    </View>
  );
}
