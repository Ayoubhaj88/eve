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
  warning:      '#FFB300',
  white:        '#FFFFFF',
  textSecondary:'#8A8A9A',
  textMuted:    '#4A4A5A',
  border:       '#1E1E2E',
  borderAccent: 'rgba(0,229,255,0.25)',
};

// ─── Input animé ──────────────────────────────────────────
function Field({ label, icon, value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize, editable = true, hint, error }) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const onFocus = () => {
    setFocused(true);
    Animated.timing(borderAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
  };
  const onBlur = () => {
    setFocused(false);
    Animated.timing(borderAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? C.danger : C.border, error ? C.danger : C.accent],
  });

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 10, fontWeight: '800', color: error ? C.danger : C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
        {label}
      </Text>
      <Animated.View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: editable ? C.bgElevated : C.bgCard,
        borderRadius: 14, borderWidth: 1, borderColor,
        paddingHorizontal: 14, opacity: editable ? 1 : 0.55,
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
          editable={editable}
          onFocus={onFocus}
          onBlur={onBlur}
          style={{ flex: 1, color: C.white, fontSize: 15, paddingVertical: 14 }}
        />
        {error
          ? <Text style={{ fontSize: 13 }}>⚠️</Text>
          : value && focused
            ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent }} />
            : null
        }
      </Animated.View>
      {(hint || error) && (
        <Text style={{ fontSize: 11, color: error ? C.danger : C.textMuted, marginTop: 5, marginLeft: 2 }}>
          {error || hint}
        </Text>
      )}
    </View>
  );
}

// ─── Badge statut email ───────────────────────────────────
function EmailBadge({ status }) {
  const map = {
    found:    { icon: '✓', label: 'Compte existant — connectez-vous', color: C.success, bg: C.successDim },
    notfound: { icon: '✦', label: 'Nouvel utilisateur — créez un compte', color: C.accent, bg: C.accentDim },
    error:    { icon: '✕', label: 'Email invalide', color: C.danger, bg: C.dangerDim },
  };
  const c = map[status];
  if (!c) return null;
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 7,
      alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6,
      borderRadius: 20, backgroundColor: c.bg,
      borderWidth: 1, borderColor: c.color + '55', marginBottom: 18,
    }}>
      <Text style={{ fontSize: 10, fontWeight: '900', color: c.color }}>{c.icon}</Text>
      <Text style={{ fontSize: 11, fontWeight: '700', color: c.color }}>{c.label}</Text>
    </View>
  );
}

// ─── Indicateur force mot de passe ───────────────────────
function PasswordStrength({ password }) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8)        score++;
  if (/[A-Z]/.test(password))      score++;
  if (/[0-9]/.test(password))      score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const colors = [C.danger, C.danger, C.warning, C.accent, C.success];
  const labels = ['', 'Très faible', 'Faible', 'Moyen', 'Fort'];

  return (
    <View style={{ marginTop: -6, marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 5 }}>
        {[1,2,3,4].map(i => (
          <View key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            backgroundColor: i <= score ? colors[score] : C.bgElevated,
          }} />
        ))}
      </View>
      <Text style={{ fontSize: 10, fontWeight: '700', color: colors[score], letterSpacing: 0.5 }}>
        {labels[score]}
      </Text>
    </View>
  );
}

// ─── Screen principal ─────────────────────────────────────
export default function AuthScreen() {
  // STEPS: EMAIL → PASSWORD (compte trouvé) ou REGISTER (pas de compte) ou FORGOT
  const [step,        setStep]        = useState('EMAIL');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [fullName,    setFullName]    = useState('');
  const [emailStatus, setEmailStatus] = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [errors,      setErrors]      = useState({});
  const [resetSent,   setResetSent]   = useState(false);

  // Animations globales
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const cardFade  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 650, useNativeDriver: true }),
    ]).start();
  }, []);

  const transitionTo = (nextStep) => {
    Animated.sequence([
      Animated.timing(cardFade, { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.timing(cardFade, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setStep(nextStep), 130);
  };

  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  // ── STEP 1 : Check email ──────────────────────────────
  const handleCheckEmail = async () => {
    setErrors({});
    if (!isValidEmail(email)) {
      setErrors({ email: 'Adresse email invalide' });
      setEmailStatus('error');
      return;
    }
    setLoading(true);
    try {
      // On tente un login avec un faux mdp — si "Invalid login credentials" → email existe
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: '__CHECK_ONLY__',
      });

      if (!error || error.message.includes('Invalid login credentials') || error.message.includes('Email not confirmed')) {
        setEmailStatus('found');
        transitionTo('PASSWORD');
      } else {
        // Toute autre erreur (user not found, etc.) = pas de compte
        setEmailStatus('notfound');
        transitionTo('REGISTER');
      }
    } catch {
      setEmailStatus('notfound');
      transitionTo('REGISTER');
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 2 : Login ────────────────────────────────────
  const handleLogin = async () => {
    setErrors({});
    if (!password) { setErrors({ password: 'Mot de passe requis' }); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setErrors({ password: error.message.includes('Invalid login credentials') ? 'Mot de passe incorrect' : error.message });
      }
      // Succès → App.js redirect auto via onAuthStateChange
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 3 : Register ─────────────────────────────────
  const handleRegister = async () => {
    setErrors({});
    const errs = {};
    if (!fullName.trim())          errs.fullName    = 'Nom requis';
    if (password.length < 8)       errs.password    = 'Minimum 8 caractères';
    if (password !== confirmPass)  errs.confirmPass = 'Les mots de passe ne correspondent pas';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(), password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (error) throw error;
      // Succès → App.js redirect auto
    } catch (err) {
      setErrors({ general: err.message });
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 4 : Forgot password ──────────────────────────
  const handleForgot = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
      setResetSent(true);
    } catch (err) {
      setErrors({ general: err.message });
    } finally {
      setLoading(false);
    }
  };

  const goBackToEmail = () => {
    transitionTo('EMAIL');
    setPassword(''); setConfirmPass(''); setFullName('');
    setErrors({}); setEmailStatus(null); setResetSent(false);
  };

  const stepConfig = {
    EMAIL:    { title: 'Bienvenue 👋',        sub: 'Entrez votre email pour continuer',   btn: 'Continuer →',        action: handleCheckEmail },
    PASSWORD: { title: 'Bon retour 🔐',       sub: `Connexion en tant que`,               btn: 'Se connecter →',     action: handleLogin      },
    REGISTER: { title: 'Nouveau compte ✨',   sub: `Aucun compte pour`,                   btn: 'Créer mon compte →', action: handleRegister   },
    FORGOT:   { title: 'Mot de passe oublié', sub: 'Un lien sera envoyé à',               btn: 'Envoyer le lien →',  action: handleForgot     },
  };
  const current = stepConfig[step];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Déco */}
      <View style={{ position: 'absolute', top: -100, right: -60, width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(0,229,255,0.035)' }} />
      <View style={{ position: 'absolute', bottom: -80, left: -80, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(0,229,255,0.02)' }} />

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
                shadowColor: C.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
              }}>
                <Text style={{ fontSize: 38 }}>🛵</Text>
              </View>
              <Text style={{ fontSize: 9, letterSpacing: 4, color: C.accent, textTransform: 'uppercase' }}>
                FlotteManager
              </Text>
            </View>

            {/* Progress dots */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 28 }}>
              {['EMAIL', step === 'FORGOT' ? 'FORGOT' : emailStatus === 'found' ? 'PASSWORD' : 'REGISTER'].map((s, i) => (
                <View key={i} style={{
                  height: 3, borderRadius: 2,
                  width: step === s ? 24 : 8,
                  backgroundColor: step === s || (i === 0 && step !== 'EMAIL') ? C.accent : C.bgElevated,
                }} />
              ))}
            </View>

            {/* Card */}
            <Animated.View style={{
              backgroundColor: C.bgCard, borderRadius: 24, padding: 24,
              borderWidth: 1, borderColor: C.border, marginBottom: 16,
              opacity: cardFade,
            }}>
              {/* Titre + sous-titre */}
              <Text style={{ fontSize: 24, fontWeight: '900', color: C.white, letterSpacing: -0.8, marginBottom: 4 }}>
                {current.title}
              </Text>
              <Text style={{ fontSize: 12, color: C.textSecondary, marginBottom: 22, lineHeight: 18 }}>
                {current.sub}{step !== 'EMAIL' ? <Text style={{ color: C.accent, fontWeight: '700' }}> {email}</Text> : null}
              </Text>

              {/* Badge email */}
              <EmailBadge status={emailStatus} />

              {/* Erreur générale */}
              {errors.general && (
                <View style={{ backgroundColor: C.dangerDim, borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: C.danger + '44' }}>
                  <Text style={{ fontSize: 12, color: C.danger, fontWeight: '600' }}>⚠️  {errors.general}</Text>
                </View>
              )}

              {/* Reset envoyé */}
              {resetSent && (
                <View style={{ backgroundColor: C.successDim, borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: C.success + '44' }}>
                  <Text style={{ fontSize: 13, color: C.success, fontWeight: '700', marginBottom: 3 }}>📧 Email envoyé !</Text>
                  <Text style={{ fontSize: 12, color: C.success, opacity: 0.8 }}>Vérifiez votre boîte mail pour réinitialiser votre mot de passe.</Text>
                </View>
              )}

              {/* ── EMAIL ── */}
              {step === 'EMAIL' && (
                <Field label="Adresse email" icon="✉️"
                  value={email} onChangeText={v => { setEmail(v); setErrors({}); setEmailStatus(null); }}
                  placeholder="vous@exemple.com"
                  keyboardType="email-address"
                  error={errors.email}
                />
              )}

              {/* ── PASSWORD ── */}
              {step === 'PASSWORD' && (
                <>
                  <Field label="Email" icon="✉️" value={email} editable={false} />
                  <Field label="Mot de passe" icon="🔑"
                    value={password} onChangeText={v => { setPassword(v); setErrors({}); }}
                    placeholder="••••••••" secureTextEntry
                    error={errors.password}
                  />
                  <TouchableOpacity onPress={() => transitionTo('FORGOT')} style={{ alignSelf: 'flex-end', marginTop: -6, marginBottom: 20 }}>
                    <Text style={{ fontSize: 12, color: C.accent, fontWeight: '600' }}>Mot de passe oublié ?</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* ── REGISTER ── */}
              {step === 'REGISTER' && (
                <>
                  <Field label="Email" icon="✉️" value={email} editable={false} />
                  <Field label="Nom complet" icon="👤"
                    value={fullName} onChangeText={v => { setFullName(v); setErrors({}); }}
                    placeholder="ex: Ahmed Ben Ali" autoCapitalize="words"
                    error={errors.fullName}
                  />
                  <Field label="Mot de passe" icon="🔑"
                    value={password} onChangeText={v => { setPassword(v); setErrors({}); }}
                    placeholder="Minimum 8 caractères" secureTextEntry
                    error={errors.password}
                    hint={!errors.password ? 'Majuscules, chiffres et symboles recommandés' : null}
                  />
                  <PasswordStrength password={password} />
                  <Field label="Confirmer mot de passe" icon="🔒"
                    value={confirmPass} onChangeText={v => { setConfirmPass(v); setErrors({}); }}
                    placeholder="Répétez le mot de passe" secureTextEntry
                    error={errors.confirmPass}
                  />
                </>
              )}

              {/* ── FORGOT ── */}
              {step === 'FORGOT' && !resetSent && (
                <Field label="Email" icon="✉️" value={email} editable={false} />
              )}

              {/* Bouton principal */}
              {!resetSent && (
                <TouchableOpacity
                  onPress={current.action}
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
                    : <Text style={{ fontSize: 15, fontWeight: '900', color: C.bg, letterSpacing: 0.3 }}>{current.btn}</Text>
                  }
                </TouchableOpacity>
              )}

              {/* Retour */}
              {step !== 'EMAIL' && (
                <TouchableOpacity onPress={goBackToEmail} style={{ alignItems: 'center', marginTop: 14 }}>
                  <Text style={{ fontSize: 12, color: C.textMuted, fontWeight: '600' }}>← Utiliser un autre email</Text>
                </TouchableOpacity>
              )}
            </Animated.View>

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