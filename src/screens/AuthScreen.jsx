import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, StatusBar, ScrollView,
} from 'react-native';
import { supabase } from '../lib/supabaseClient';

const C = {
  bg:           '#0A0A0F',
  bgCard:       '#13131A',
  bgElevated:   '#1E1E2E',
  accent:       '#00E5FF',
  accentDim:    'rgba(0,229,255,0.08)',
  success:      '#00E676',
  successDim:   'rgba(0,230,118,0.10)',
  danger:       '#FF1744',
  dangerDim:    'rgba(255,23,68,0.10)',
  white:        '#FFFFFF',
  textSecondary:'#8A8A9A',
  textMuted:    '#4A4A5A',
  border:       '#1E1E2E',
  borderAccent: 'rgba(0,229,255,0.25)',
};

// ─── Erreurs Supabase → message lisible ───────────────────
function parseError(msg) {
  if (!msg) return 'Une erreur est survenue';
  if (msg.includes('Invalid login credentials'))   return '❌ Email ou mot de passe incorrect';
  if (msg.includes('Email not confirmed'))         return '📧 Vérifiez votre email pour confirmer votre compte';
  if (msg.includes('User already registered'))     return '⚠️ Cet email est déjà utilisé — connectez-vous';
  if (msg.includes('Password should be'))          return '🔑 Mot de passe trop court (min. 6 caractères)';
  if (msg.includes('Unable to validate'))          return '❌ Email ou mot de passe incorrect';
  if (msg.includes('rate limit'))                  return '⏳ Trop de tentatives, attendez quelques secondes';
  return msg;
}

// ─── Barre force mot de passe ─────────────────────────────
function PasswordStrength({ password }) {
  if (!password || password.length < 2) return null;
  let score = 0;
  if (password.length >= 6)              score++;
  if (password.length >= 10)             score++;
  if (/[A-Z]/.test(password))            score++;
  if (/[0-9]/.test(password))            score++;
  if (/[^A-Za-z0-9]/.test(password))    score++;

  const clamp   = Math.min(score, 4);
  const colors  = ['', C.danger, '#FFB300', C.accent, C.success];
  const labels  = ['', 'Faible', 'Moyen', 'Bon', 'Fort'];

  return (
    <View style={{ marginBottom: 14, marginTop: -4 }}>
      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 5 }}>
        {[1,2,3,4].map(i => (
          <View key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            backgroundColor: i <= clamp ? colors[clamp] : C.bgElevated,
          }} />
        ))}
      </View>
      <Text style={{ fontSize: 10, fontWeight: '700', color: colors[clamp], letterSpacing: 0.5 }}>
        {labels[clamp]}
      </Text>
    </View>
  );
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
  const [mode,        setMode]        = useState('login');   // 'login' | 'register'
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [fullName,    setFullName]    = useState('');
  const [loading,     setLoading]     = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [errors,      setErrors]      = useState({});
  const [resetSent,   setResetSent]   = useState(false);
  const [showForgot,  setShowForgot]  = useState(false);

  // Animations
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const tabAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 650, useNativeDriver: true }),
    ]).start();
  }, []);

  const switchMode = (m) => {
    Animated.timing(tabAnim, { toValue: m === 'login' ? 0 : 1, duration: 220, useNativeDriver: false }).start();
    setMode(m);
    setErrors({});
    setGlobalError('');
    setPassword('');
    setConfirmPass('');
  };

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
      if (error) {
        // Si "already registered" → suggère de passer en login
        if (error.message.includes('User already registered')) {
          setGlobalError('');
          switchMode('login');
        } else {
          setGlobalError(parseError(error.message));
        }
      }
      // Succès → App.js redirige automatiquement
    } finally {
      setLoading(false);
    }
  };

  // ── REGISTER ──────────────────────────────────────────
  const handleRegister = async () => {
    setErrors({}); setGlobalError('');
    const errs = {};
    if (!fullName.trim())         errs.fullName    = 'Nom requis';
    if (!email.trim())            errs.email       = 'Email requis';
    if (password.length < 6)      errs.password    = 'Minimum 6 caractères';
    if (password !== confirmPass) errs.confirmPass = 'Les mots de passe ne correspondent pas';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(), password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (error) {
        if (error.message.includes('User already registered')) {
          // Compte existant → bascule automatiquement sur login
          setGlobalError('');
          switchMode('login');
          setGlobalError('✅ Compte existant détecté — connectez-vous ci-dessous');
        } else {
          setGlobalError(parseError(error.message));
        }
      }
      // Succès → App.js redirige automatiquement
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

  const tabIndicatorLeft = tabAnim.interpolate({ inputRange: [0, 1], outputRange: ['2%', '52%'] });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Déco bg */}
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
                FlotteManager
              </Text>
            </View>

            {/* Tabs */}
            <View style={{
              flexDirection: 'row', backgroundColor: C.bgCard,
              borderRadius: 16, padding: 4, marginBottom: 24,
              borderWidth: 1, borderColor: C.border, position: 'relative',
            }}>
              {/* Indicateur glissant */}
              <Animated.View style={{
                position: 'absolute', top: 4, bottom: 4,
                width: '46%', borderRadius: 12,
                backgroundColor: C.bgElevated,
                borderWidth: 1, borderColor: C.borderAccent,
                left: tabIndicatorLeft,
              }} />
              {['login', 'register'].map(m => (
                <TouchableOpacity key={m} onPress={() => switchMode(m)} activeOpacity={0.7}
                  style={{ flex: 1, paddingVertical: 11, alignItems: 'center', zIndex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: mode === m ? C.white : C.textMuted }}>
                    {m === 'login' ? '🔐 Connexion' : '✨ Inscription'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Card */}
            <View style={{
              backgroundColor: C.bgCard, borderRadius: 24, padding: 24,
              borderWidth: 1, borderColor: C.border, marginBottom: 16,
            }}>

              {/* Erreur globale */}
              {globalError ? (
                <View style={{
                  backgroundColor: globalError.startsWith('✅') ? C.successDim : C.dangerDim,
                  borderRadius: 12, padding: 12, marginBottom: 16,
                  borderWidth: 1, borderColor: (globalError.startsWith('✅') ? C.success : C.danger) + '44',
                }}>
                  <Text style={{ fontSize: 12, color: globalError.startsWith('✅') ? C.success : C.danger, fontWeight: '600', lineHeight: 18 }}>
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

              {/* Champ nom (register seulement) */}
              {mode === 'register' && (
                <Field label="Nom complet" icon="👤"
                  value={fullName} onChangeText={v => { setFullName(v); setErrors(e => ({...e, fullName: null})); }}
                  placeholder="ex: Ahmed Ben Ali" autoCapitalize="words"
                  error={errors.fullName}
                />
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
                placeholder={mode === 'login' ? '••••••••' : 'Minimum 6 caractères'}
                secureTextEntry
                error={errors.password}
              />
              {mode === 'register' && <PasswordStrength password={password} />}

              {/* Confirmer mdp (register) */}
              {mode === 'register' && (
                <Field label="Confirmer mot de passe" icon="🔒"
                  value={confirmPass} onChangeText={v => { setConfirmPass(v); setErrors(e => ({...e, confirmPass: null})); }}
                  placeholder="Répétez le mot de passe" secureTextEntry
                  error={errors.confirmPass}
                />
              )}

              {/* Mot de passe oublié */}
              {mode === 'login' && (
                <TouchableOpacity onPress={() => setShowForgot(v => !v)}
                  style={{ alignSelf: 'flex-end', marginTop: -8, marginBottom: 20 }}>
                  <Text style={{ fontSize: 12, color: C.accent, fontWeight: '600' }}>
                    Mot de passe oublié ?
                  </Text>
                </TouchableOpacity>
              )}

              {/* Section forgot password inline */}
              {showForgot && mode === 'login' && !resetSent && (
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

              {/* Bouton principal */}
              <TouchableOpacity
                onPress={mode === 'login' ? handleLogin : handleRegister}
                disabled={loading}
                activeOpacity={0.85}
                style={{
                  backgroundColor: C.accent, borderRadius: 16, paddingVertical: 16,
                  alignItems: 'center', opacity: loading ? 0.7 : 1,
                  shadowColor: C.accent, shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.3, shadowRadius: 14, elevation: 8,
                  marginTop: mode === 'register' ? 4 : 0,
                }}
              >
                {loading
                  ? <ActivityIndicator color={C.bg} />
                  : <Text style={{ fontSize: 15, fontWeight: '900', color: C.bg, letterSpacing: 0.3 }}>
                      {mode === 'login' ? 'Se connecter →' : 'Créer mon compte →'}
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