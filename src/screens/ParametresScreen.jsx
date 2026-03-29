import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StatusBar, Platform, TextInput, ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { C, alertOk } from '../constants';

// ── Jauge semi-circulaire gyroscope ─────────────────────────

function SemiGauge({ value, min = 0, max = 180, color = C.accentBright, label }) {
  const pct   = Math.min(Math.max((value - min) / (max - min), 0), 1);
  const angle = pct * 180; // 0° = gauche, 180° = droite

  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      {/* Représentation textuelle de la jauge */}
      <View style={{
        width: 160, height: 80, borderRadius: 80,
        borderWidth: 3, borderColor: C.border,
        borderBottomWidth: 0,
        backgroundColor: C.bgElevated,
        overflow: 'hidden',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 8,
      }}>
        {/* Remplissage */}
        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: Math.max(4, pct * 76),
          backgroundColor: color + '33',
        }} />
        {/* Valeur */}
        <Text style={{ fontSize: 22, fontWeight: '900', color, letterSpacing: -1 }}>
          {value != null ? `${value.toFixed(0)}°` : '—'}
        </Text>
      </View>

      {/* Barre de progression */}
      <View style={{ width: 160, height: 6, borderRadius: 3, backgroundColor: C.bgElevated, overflow: 'hidden', borderWidth: 1, borderColor: C.border }}>
        <View style={{ width: pct * 100 + '%', height: '100%', borderRadius: 3, backgroundColor: color }} />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: 160 }}>
        <Text style={{ fontSize: 8, color: C.textMuted }}>{min}°</Text>
        <Text style={{ fontSize: 9, fontWeight: '700', color: C.textMuted }}>{label}</Text>
        <Text style={{ fontSize: 8, color: C.textMuted }}>{max}°</Text>
      </View>
    </View>
  );
}

// ── Jauge circulaire TPMS (style speedometer) ───────────────

function CircularGauge({ value, min = 0.5, max = 4.5, color = C.accentBright }) {
  const pct = Math.min(Math.max((value - min) / (max - min), 0), 1);
  const mid  = (min + max) / 2;

  return (
    <View style={{ alignItems: 'center', gap: 12 }}>
      <View style={{
        width: 160, height: 160, borderRadius: 80,
        borderWidth: 3, borderColor: C.border,
        backgroundColor: C.bgElevated,
        justifyContent: 'center', alignItems: 'center',
        position: 'relative',
      }}>
        {/* Cercle de progression */}
        <View style={{
          position: 'absolute',
          width: 140, height: 140, borderRadius: 70,
          borderWidth: 8,
          borderColor: C.border,
          borderTopColor: pct > 0.5 ? color : C.border,
          borderRightColor: pct > 0.25 ? color : C.border,
        }} />

        {/* Valeur centrale */}
        <Text style={{ fontSize: 32, fontWeight: '900', color, letterSpacing: -1 }}>
          {value != null ? value.toFixed(1) : '—'}
        </Text>
        <Text style={{ fontSize: 11, color: C.textMuted }}>Bar</Text>

        {/* Aiguille indicateur */}
        <View style={{
          position: 'absolute', bottom: 10,
          flexDirection: 'row', alignItems: 'center', gap: 4,
        }}>
          <Text style={{ fontSize: 9, color: C.textMuted }}>{min}</Text>
          <View style={{ width: 60, height: 3, borderRadius: 2, backgroundColor: C.bgCard, overflow: 'hidden' }}>
            <View style={{ width: pct * 100 + '%', height: '100%', backgroundColor: color }} />
          </View>
          <Text style={{ fontSize: 9, color: C.textMuted }}>{max}</Text>
        </View>
      </View>

      {/* Légende */}
      <View style={{ flexDirection: 'row', gap: 20 }}>
        {[
          { label: String(min), sub: 'min' },
          { label: String(mid.toFixed(1)), sub: 'moy' },
          { label: String(max), sub: 'max' },
        ].map(({ label, sub }) => (
          <View key={sub} style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: C.white }}>{label}</Text>
            <Text style={{ fontSize: 8, color: C.textMuted }}>{sub}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Onglet Gyroscope ────────────────────────────────────────

function GyroscopeTab({ scooter }) {
  const [droiteVal, setDroiteVal] = useState('30');
  const [gaucheVal, setGaucheVal] = useState('130');
  const [avantVal,  setAvantVal]  = useState('25');
  const [loading,   setLoading]   = useState(false);

  useEffect(() => {
    if (!scooter?.id) return;
    supabase.from('scooters')
      .select('gyro_threshold_right, gyro_threshold_left, gyro_threshold_front')
      .eq('id', scooter.id).single()
      .then(({ data }) => {
        if (!data) return;
        if (data.gyro_threshold_right != null) setDroiteVal(String(data.gyro_threshold_right));
        if (data.gyro_threshold_left  != null) setGaucheVal(String(data.gyro_threshold_left));
        if (data.gyro_threshold_front != null) setAvantVal(String(data.gyro_threshold_front));
      });
  }, [scooter?.id]);

  const save = async () => {
    const d = parseFloat(droiteVal);
    const g = parseFloat(gaucheVal);
    const a = parseFloat(avantVal);
    if ([d, g, a].some(isNaN)) { alertOk('Erreur', 'Valeurs invalides'); return; }
    setLoading(true);
    const { error } = await supabase.from('scooters').update({
      gyro_threshold_right: d,
      gyro_threshold_left:  g,
      gyro_threshold_front: a,
    }).eq('id', scooter?.id);
    setLoading(false);
    if (error) alertOk('Erreur', error.message);
    else alertOk('Succès', 'Seuils enregistrés.');
  };

  const droite = parseFloat(droiteVal) || 30;
  const gauche = parseFloat(gaucheVal) || 130;
  const avant  = parseFloat(avantVal)  || 25;

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 24 }} showsVerticalScrollIndicator={false}>
      {/* Droite / Gauche */}
      <View style={{ backgroundColor: C.bgCard, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: C.border, gap: 16, alignItems: 'center' }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, alignSelf: 'flex-start' }}>
          Droite / Gauche
        </Text>

        <View style={{ flexDirection: 'row', gap: 20 }}>
          <SemiGauge value={droite} label="Droite" color="#FF6B6B" />
          <SemiGauge value={gauche} label="Gauche" color="#51CF66" />
        </View>

        <View style={{ width: '100%', gap: 10 }}>
          {[
            { label: 'Seuil Droite (D)', value: droiteVal, set: setDroiteVal, color: '#FF6B6B' },
            { label: 'Seuil Gauche (G)', value: gaucheVal, set: setGaucheVal, color: '#51CF66' },
          ].map(({ label, value, set, color }) => (
            <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.bgElevated, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.border }}>
              <Text style={{ fontSize: 11, color: C.textMuted }}>Seuil actuelle ({label.includes('D)') ? 'D' : 'G'}) :</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  value={value}
                  onChangeText={set}
                  keyboardType="numeric"
                  style={{ backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, color, fontSize: 14, fontWeight: '800', width: 60, textAlign: 'center', borderWidth: 1, borderColor: color + '55' }}
                />
                <Text style={{ fontSize: 11, color: C.textMuted }}>°</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Avant */}
      <View style={{ backgroundColor: C.bgCard, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: C.border, gap: 16, alignItems: 'center' }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, alignSelf: 'flex-start' }}>
          Avant
        </Text>

        <SemiGauge value={avant} label="Avant" color="#339AF0" />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.bgElevated, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.border, width: '100%' }}>
          <Text style={{ fontSize: 11, color: C.textMuted }}>Seuil actuelle :</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TextInput
              value={avantVal}
              onChangeText={setAvantVal}
              keyboardType="numeric"
              style={{ backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, color: '#339AF0', fontSize: 14, fontWeight: '800', width: 60, textAlign: 'center', borderWidth: 1, borderColor: '#339AF055' }}
            />
            <Text style={{ fontSize: 11, color: C.textMuted }}>°</Text>
          </View>
        </View>
      </View>

      {/* Valider */}
      <TouchableOpacity onPress={save} disabled={loading} activeOpacity={0.8}
        style={{ backgroundColor: C.accent, borderRadius: 14, padding: 16, alignItems: 'center', opacity: loading ? 0.6 : 1 }}>
        {loading
          ? <ActivityIndicator color={C.white} />
          : <Text style={{ fontSize: 15, fontWeight: '900', color: C.white }}>Valider</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Onglet TPMS ─────────────────────────────────────────────

function TpmsTab({ scooter }) {
  const [seuil,   setSeuil]   = useState('2.5');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!scooter?.id) return;
    supabase.from('scooters').select('tpms_threshold').eq('id', scooter.id).single()
      .then(({ data }) => { if (data?.tpms_threshold != null) setSeuil(String(data.tpms_threshold)); });
  }, [scooter?.id]);

  const save = async () => {
    const val = parseFloat(seuil);
    if (isNaN(val) || val < 0.5 || val > 4.5) { alertOk('Erreur', 'Seuil invalide (0.5 – 4.5 bar)'); return; }
    setLoading(true);
    const { error } = await supabase.from('scooters')
      .update({ tpms_threshold: val }).eq('id', scooter?.id);
    setLoading(false);
    if (error) alertOk('Erreur', error.message);
    else alertOk('Succès', 'Seuil TPMS enregistré.');
  };

  const seuilVal = parseFloat(seuil) || 2.5;

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 24, alignItems: 'center' }} showsVerticalScrollIndicator={false}>
      <View style={{ backgroundColor: C.bgCard, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: C.border, gap: 20, width: '100%', alignItems: 'center' }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, alignSelf: 'flex-start' }}>
          TPMS
        </Text>

        <CircularGauge value={seuilVal} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.bgElevated, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.border, width: '100%' }}>
          <Text style={{ fontSize: 11, color: C.textMuted }}>Seuil actuelle :</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TextInput
              value={seuil}
              onChangeText={setSeuil}
              keyboardType="numeric"
              style={{ backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, color: C.accentBright, fontSize: 14, fontWeight: '800', width: 70, textAlign: 'center', borderWidth: 1, borderColor: C.accent + '55' }}
            />
            <Text style={{ fontSize: 11, color: C.textMuted }}>Bar</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity onPress={save} disabled={loading} activeOpacity={0.8}
        style={{ backgroundColor: C.accent, borderRadius: 14, padding: 16, alignItems: 'center', width: '100%', opacity: loading ? 0.6 : 1 }}>
        {loading
          ? <ActivityIndicator color={C.white} />
          : <Text style={{ fontSize: 15, fontWeight: '900', color: C.white }}>Valider</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Onglet Notifications ────────────────────────────────────

function NotificationsTab() {
  const CATEGORIES = ['Batterie', 'TPMS', 'Sabotage', 'Chute', 'GPS'];

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }} showsVerticalScrollIndicator={false}>
      {CATEGORIES.map(cat => (
        <View key={cat} style={{
          backgroundColor: C.bgCard, borderRadius: 14, padding: 16,
          borderWidth: 1, borderColor: C.border,
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.white }}>{cat}</Text>
          <View style={{
            backgroundColor: C.accent, borderRadius: 20,
            paddingHorizontal: 14, paddingVertical: 6,
          }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: C.white }}>en cours</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ── Écran Paramètres ────────────────────────────────────────

const SEUILS_TABS  = ['Gyroscope', 'TPMS'];
const MAIN_TABS    = ['Seuils', 'Notifications'];

export default function ParametresScreen({ route, navigation }) {
  const scooter    = route.params?.scooter ?? null;
  const initTab    = route.params?.tab === 'gyroscope' ? 0 : 0;

  const [mainTab,   setMainTab]   = useState(0);   // 0=Seuils, 1=Notifications
  const [seuilTab,  setSeuilTab]  = useState(initTab); // 0=Gyroscope, 1=TPMS

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={{
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 20, paddingBottom: 16,
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderBottomWidth: 1, borderBottomColor: C.border,
      }}>
        <TouchableOpacity onPress={() => navigation.goBack()}
          style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.bgCard, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
          <Text style={{ fontSize: 20, color: C.white }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: '900', color: C.white, letterSpacing: -0.5 }}>
          PARAMETRES
        </Text>
      </View>

      {/* Onglets principaux : Seuils / Notifications */}
      <View style={{ flexDirection: 'row', margin: 20, marginBottom: 0, gap: 10 }}>
        {MAIN_TABS.map((tab, i) => (
          <TouchableOpacity key={tab} onPress={() => setMainTab(i)} style={{ flex: 1 }}>
            <View style={{
              paddingVertical: 12, borderRadius: 12, alignItems: 'center',
              backgroundColor: mainTab === i ? C.accent : C.bgCard,
              borderWidth: 1, borderColor: mainTab === i ? C.accent : C.border,
            }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: C.white }}>{tab}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sous-onglets Seuils : Gyroscope / TPMS */}
      {mainTab === 0 && (
        <View style={{ flexDirection: 'row', marginHorizontal: 20, marginTop: 12, marginBottom: 0, gap: 10 }}>
          {SEUILS_TABS.map((tab, i) => (
            <TouchableOpacity key={tab} onPress={() => setSeuilTab(i)} style={{ flex: 1 }}>
              <View style={{
                paddingVertical: 10, borderRadius: 10, alignItems: 'center',
                backgroundColor: seuilTab === i ? C.accentBright : C.bgElevated,
                borderWidth: 1, borderColor: seuilTab === i ? C.accentBright : C.border,
              }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: C.white }}>{tab}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Contenu */}
      <View style={{ flex: 1, marginTop: 12 }}>
        {mainTab === 0 ? (
          seuilTab === 0
            ? <GyroscopeTab scooter={scooter} />
            : <TpmsTab      scooter={scooter} />
        ) : (
          <NotificationsTab />
        )}
      </View>
    </View>
  );
}
