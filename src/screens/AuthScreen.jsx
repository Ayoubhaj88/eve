import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, Animated, StatusBar, ScrollView,
} from 'react-native';
import { supabase } from '../lib/supabaseClient';

// ─── Design System (copié depuis constants.js) ─────────────
const C = {
  bg:           '#0A0A0F',
  bgCard:       '#13131A',
  bgElevated:   '#1E1E2E',
  accent:       '#00E5FF',
  accentGlow:   'rgba(0,229,255,0.10)',
  success:      '#00E676',
  danger:       '#FF1744',
  white:        '#FFFFFF',
  textSecondary:'#8A8A9A',
  textMuted:    '#4A4A5A',
  border:       '#1E1E2E',
  borderAccent: 'rgba(0,229,255,0.25)',
};

// ─── Input Field ───────────────────────────────────────────
function Field({ label, icon, value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize }) {
  const [focused, setFocused] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  };
  const handleBlur = () => {
    setFocused(false);
    Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const borderColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [C.border, C.accent],
  });

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 10, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
        {label}
      </Text>
      <Animated.View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: C.bgElevated, borderRadius: 14,
        borderWidth: 1, borderColor,
        paddingHorizontal: 14,
      }}>
        <Text style={{ fontSize: 16, marginRight: 10 }}>{icon}</Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.textMuted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType ?? 'default'}
          autoCapitalize={autoCapitalize ?? 'none'}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={{
            flex: 1, color: C.white, fontSize: 15,
            paddingVertical: 14,
          }}
        />
        {focused && (
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent }} />
        )}
      </Animated.View>
    </View>
  );
}

// ─── AuthScreen principal ──────────────────────────────────
export default function AuthScreen() {
  const [mode,     setMode]     = useState('login'); // 'login' | 'register'
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [name,     setName]     = useState('');
  const [loading,  setLoading]  = useState(false);

  // Animation entrée
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  // Animation switch mode
  const switchAnim = useRef(new Animated.Value(mode === 'login' ? 0 : 1)).current;
  useEffect(() => {
    Animated.timing(switchAnim, {
      toValue: mode === 'login' ? 0 : 1,
      duration: 250, useNativeDriver: false,
    }).start();
  }, [mode]);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Champs manquants', 'Email et mot de passe obligatoires.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Mot de passe trop court', 'Minimum 6 caractères.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        // → App.js détecte onAuthStateChange automatiquement
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim() } },
        });
        if (error) throw error;
        Alert.alert(
          '✅ Compte créé !',
          'Vérifiez votre email pour confirmer votre compte.',
          [{ text: 'OK', onPress: () => setMode('login') }]
        );
      }
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Email requis', 'Entrez votre email pour réinitialiser le mot de passe.');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) Alert.alert('Erreur', error.message);
    else Alert.alert('📧 Email envoyé', 'Vérifiez votre boîte mail.');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Background décoratif */}
      <View style={{
        position: 'absolute', top: -100, right: -100,
        width: 300, height: 300, borderRadius: 150,
        backgroundColor: 'rgba(0,229,255,0.03)',
      }} />
      <View style={{
        position: 'absolute', bottom: -60, left: -80,
        width: 240, height: 240, borderRadius: 120,
        backgroundColor: 'rgba(0,229,255,0.02)',
      }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 28, paddingTop: Platform.OS === 'ios' ? 80 : 60 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

            {/* Logo / Header */}
            <View style={{ alignItems: 'center', marginBottom: 48 }}>
              <View style={{
                width: 72, height: 72, borderRadius: 22,
                backgroundColor: C.bgCard, borderWidth: 1.5, borderColor: C.borderAccent,
                justifyContent: 'center', alignItems: 'center', marginBottom: 20,
                shadowColor: C.accent, shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.25, shadowRadius: 20, elevation: 12,
              }}>
                <Text style={{ fontSize: 36 }}>🛵</Text>
              </View>
              <Text style={{ fontSize: 10, letterSpacing: 4, color: C.accent, textTransform: 'uppercase', marginBottom: 8 }}>
                FlotteManager
              </Text>
              <Text style={{ fontSize: 32, fontWeight: '900', color: C.white, letterSpacing: -1, textAlign: 'center' }}>
                {mode === 'login' ? 'Bon retour 👋' : 'Créer un compte'}
              </Text>
              <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 8, textAlign: 'center' }}>
                {mode === 'login'
                  ? 'Connectez-vous pour gérer votre flotte'
                  : 'Rejoignez et gérez vos scooters'}
              </Text>
            </View>

            {/* Tabs login / register */}
            <View style={{
              flexDirection: 'row', backgroundColor: C.bgCard,
              borderRadius: 14, padding: 4, marginBottom: 32,
              borderWidth: 1, borderColor: C.border,
            }}>
              {['login', 'register'].map(m => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setMode(m)}
                  activeOpacity={0.8}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: 10,
                    backgroundColor: mode === m ? C.bgElevated : 'transparent',
                    alignItems: 'center',
                    borderWidth: mode === m ? 1 : 0,
                    borderColor: mode === m ? C.borderAccent : 'transparent',
                  }}
                >
                  <Text style={{
                    fontSize: 13, fontWeight: '700',
                    color: mode === m ? C.white : C.textMuted,
                  }}>
                    {m === 'login' ? 'Connexion' : 'Inscription'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Formulaire */}
            <View style={{
              backgroundColor: C.bgCard, borderRadius: 24,
              padding: 24, borderWidth: 1, borderColor: C.border,
              marginBottom: 16,
            }}>
              {mode === 'register' && (
                <Field
                  label="Nom complet"
                  icon="👤"
                  value={name}
                  onChangeText={setName}
                  placeholder="ex: Ahmed Ben Ali"
                  autoCapitalize="words"
                />
              )}

              <Field
                label="Email"
                icon="✉️"
                value={email}
                onChangeText={setEmail}
                placeholder="vous@exemple.com"
                keyboardType="email-address"
              />

              <Field
                label="Mot de passe"
                icon="🔑"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
              />

              {/* Mot de passe oublié */}
              {mode === 'login' && (
                <TouchableOpacity onPress={handleForgotPassword} style={{ alignSelf: 'flex-end', marginBottom: 24, marginTop: -8 }}>
                  <Text style={{ fontSize: 12, color: C.accent, fontWeight: '600' }}>
                    Mot de passe oublié ?
                  </Text>
                </TouchableOpacity>
              )}

              {mode === 'register' && <View style={{ height: 16 }} />}

              {/* Bouton principal */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.85}
                style={{
                  backgroundColor: C.accent, borderRadius: 16,
                  paddingVertical: 16, alignItems: 'center',
                  opacity: loading ? 0.7 : 1,
                  shadowColor: C.accent, shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
                }}
              >
                {loading
                  ? <ActivityIndicator color={C.bg} />
                  : <Text style={{ fontSize: 15, fontWeight: '900', color: C.bg, letterSpacing: 0.5 }}>
                      {mode === 'login' ? 'Se connecter →' : 'Créer mon compte →'}
                    </Text>
                }
              </TouchableOpacity>
            </View>

            {/* Switch mode bas de page */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <Text style={{ fontSize: 13, color: C.textMuted }}>
                {mode === 'login' ? "Pas encore de compte ?" : "Déjà un compte ?"}
              </Text>
              <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
                <Text style={{ fontSize: 13, color: C.accent, fontWeight: '700' }}>
                  {mode === 'login' ? "S'inscrire" : "Se connecter"}
                </Text>
              </TouchableOpacity>
            </View>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}