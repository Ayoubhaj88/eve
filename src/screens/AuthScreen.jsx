import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, StatusBar, ScrollView,
} from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { C } from '../constants';

// ─── Erreurs Supabase → message lisible ───────────────────
function parseError(msg) {
  if (!msg) return 'Une erreur est survenue';
  if (msg.includes('Invalid login credentials'))   return '❌ Email ou mot de passe incorrect';
  if (msg.includes('Email not confirmed'))         return '📧 Vérifiez votre email pour confirmer votre compte';
  if (msg.includes('Password should be'))          return '🔑 Mot de passe trop court (min. 6 caractères)';
  if (msg.includes('Unable to validate'))          return '❌ Email ou mot de passe incorrect';
  if (msg.includes('rate limit'))                  return '⏳ Trop de tentatives, attendez quelques secondes';
  return msg;
}

// ─── Input animé ──────────────────────────────────────────
function Field({ label, icon, value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize, error }) {
  const borderAnim = useRef(new Animated.Value(0)).current;

  const borderColor = borderAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [error ? C.danger : C.border, error ? C.danger : C.accent],
  });

  return (
    <View style={{ marginBottom: error ? 6 : 16 }}>
      <Text style={{
        fontSize: 10, fontWeight: '800',
        color: error ? C.danger : C.textMuted,
        textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8,
      }}>
        {label}
      </Text>
      <Animated.View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: C.bgElevated, borderRadius: 14,
        borderWidth: 1, borderColor, paddingHorizontal: 14,
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
          onFocus={() => Animated.timing(borderAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start()}
          onBlur={()  => Animated.timing(borderAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start()}
          style={{ flex: 1, color: C.white, fontSize: 15, paddingVertical: 14 }}
        />
      </Animated.View>
      {error && (
        <Text style={{ fontSize: 11, color: C.danger, marginTop: 5, marginLeft: 2 }}>{error}</Text>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────
export default function AuthScreen() {
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [loading,     setLoading]     = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [errors,      setErrors]      = useState({});
  const [resetSent,   setResetSent]   = useState(false);
  const [showForgot,  setShowForgot]  = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 650, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── LOGIN ─────────────────────────────────────────────
  const handleLogin = async () => {
    setErrors({}); setGlobalError('');
    const errs = {};
    if (!email.trim())    errs.email    = 'Email requis';
    if (!password)        errs.password = 'Mot de passe requis';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setGlobalError(parseError(error.message));
    } finally {
      setLoading(false);
    }
  };

  // ── FORGOT PASSWORD ───────────────────────────────────
  const handleForgot = async () => {
    if (!email.trim()) { setErrors({ email: 'Entrez votre email d\'abord' }); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) setGlobalError(parseError(error.message));
      else setResetSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={{ position: 'absolute', top: -100, right: -60,  width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(0,229,255,0.035)' }} />
      <View style={{ position: 'absolute', bottom: -80, left: -80, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(0,229,255,0.02)'  }} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: Platform.OS === 'ios' ? 80 : 56 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

            {/* Logo */}
            <View style={{ alignItems: 'center', marginBottom: 36 }}>
              <View style={{
                width: 76, height: 76, borderRadius: 22,
                backgroundColor: C.bgCard, borderWidth: 1.5, borderColor: C.borderAccent,
                justifyContent: 'center', alignItems: 'center', marginBottom: 16,
                shadowColor: C.accent, shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
              }}>
                <Text style={{ fontSize: 38 }}>🛵</Text>
              </View>
              <Text style={{ fontSize: 9, letterSpacing: 4, color: C.accent, textTransform: 'uppercase' }}>
                EVE MOBILITY
              </Text>
            </View>

            {/* Titre */}
            <View style={{ alignItems: 'center', marginBottom: 28 }}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: C.white, marginBottom: 6 }}>
                Connexion
              </Text>
              <Text style={{ fontSize: 12, color: C.textMuted, textAlign: 'center' }}>
                Accès sur invitation uniquement
              </Text>
            </View>

            {/* Card */}
            <View style={{
              backgroundColor: C.bgCard, borderRadius: 24, padding: 24,
              borderWidth: 1, borderColor: C.border, marginBottom: 16,
            }}>

              {/* Erreur globale */}
              {globalError ? (
                <View style={{
                  backgroundColor: C.dangerDim,
                  borderRadius: 12, padding: 12, marginBottom: 16,
                  borderWidth: 1, borderColor: C.danger + '44',
                }}>
                  <Text style={{ fontSize: 12, color: C.danger, fontWeight: '600', lineHeight: 18 }}>
                    {globalError}
                  </Text>
                </View>
              ) : null}

              {/* Reset envoyé */}
              {resetSent && (
                <View style={{ backgroundColor: C.successDim, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: C.success + '44' }}>
                  <Text style={{ fontSize: 13, color: C.success, fontWeight: '700', marginBottom: 3 }}>📧 Email envoyé !</Text>
                  <Text style={{ fontSize: 12, color: C.success, opacity: 0.8 }}>Vérifiez votre boîte mail pour réinitialiser votre mot de passe.</Text>
                </View>
              )}

              {/* Email */}
              <Field label="Adresse email" icon="✉️"
                value={email} onChangeText={v => { setEmail(v); setErrors(e => ({...e, email: null})); setGlobalError(''); }}
                placeholder="vous@exemple.com" keyboardType="email-address"
                error={errors.email}
              />

              {/* Mot de passe */}
              <Field label="Mot de passe" icon="🔑"
                value={password} onChangeText={v => { setPassword(v); setErrors(e => ({...e, password: null})); }}
                placeholder="••••••••"
                secureTextEntry
                error={errors.password}
              />

              {/* Mot de passe oublié */}
              <TouchableOpacity onPress={() => setShowForgot(v => !v)}
                style={{ alignSelf: 'flex-end', marginTop: -8, marginBottom: 20 }}>
                <Text style={{ fontSize: 12, color: C.accent, fontWeight: '600' }}>
                  Mot de passe oublié ?
                </Text>
              </TouchableOpacity>

              {/* Section forgot password inline */}
              {showForgot && !resetSent && (
                <View style={{ backgroundColor: C.bgElevated, borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: C.border }}>
                  <Text style={{ fontSize: 12, color: C.textSecondary, marginBottom: 10 }}>
                    Un lien de réinitialisation sera envoyé à votre email.
                  </Text>
                  <TouchableOpacity onPress={handleForgot} disabled={loading}
                    style={{ backgroundColor: C.bgCard, borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: C.borderAccent }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: C.accent }}>
                      {loading ? '...' : 'Envoyer le lien de réinitialisation'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Bouton connexion */}
              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
                style={{
                  backgroundColor: C.accent, borderRadius: 16, paddingVertical: 16,
                  alignItems: 'center', opacity: loading ? 0.7 : 1,
                  shadowColor: C.accent, shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.3, shadowRadius: 14, elevation: 8,
                }}
              >
                {loading
                  ? <ActivityIndicator color={C.bg} />
                  : <Text style={{ fontSize: 15, fontWeight: '900', color: C.bg, letterSpacing: 0.3 }}>
                      Se connecter →
                    </Text>
                }
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.success }} />
              <Text style={{ fontSize: 11, color: C.textMuted }}>Connexion sécurisée par Supabase</Text>
            </View>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
