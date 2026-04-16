import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from './src/lib/supabaseClient';
import { requestPermissions, startNotificationListener, stopNotificationListener } from './src/lib/notifications';
import SplashScreen from './src/screens/SplashScreen';
import AppNavigator  from './src/navigation/Appnavigator';
import AuthScreen    from './src/screens/AuthScreen';
import PendingScreen from './src/screens/PendingScreen';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [session,    setSession]    = useState(undefined); // undefined = pas encore vérifié
  const [profile,    setProfile]    = useState(undefined); // undefined = en cours, null = pas trouvé

  // Charger le profil depuis Supabase
  // Seul l'admin info@evemobility.tn est auto-créé.
  // Tous les autres utilisateurs sont créés exclusivement par l'admin via invitation.
  const loadProfile = async (user) => {
    if (!user) { setProfile(null); return; }

    // ── Super Admin : toujours admin + approuvé ──────────────
    if (user.email === 'info@evemobility.tn') {
      const superAdminProfile = {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name ?? 'Super Admin',
        role: 'admin',
        approved: true,
      };
      await supabase.from('profiles').upsert(superAdminProfile, { onConflict: 'id' });
      setProfile(superAdminProfile);
      return;
    }

    // ── Utilisateur invité : profil créé par l'admin ─────────
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (data) {
      setProfile(data);
      return;
    }

    // Aucun profil trouvé → compte non invité, accès refusé
    setProfile({ id: user.id, email: user.email, role: 'user', approved: false, _notInvited: true });
  };

  useEffect(() => {
    // Vérifie la session au démarrage
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session ?? null;
      setSession(s);
      if (s) loadProfile(s.user);
      else setProfile(null);
    });

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
      if (s) {
        loadProfile(s.user);
        requestPermissions();
        startNotificationListener();
      } else {
        setProfile(null);
        stopNotificationListener();
      }
    });

    return () => { subscription.unsubscribe(); stopNotificationListener(); };
  }, []);

  // Écouter les changements du profil en temps réel (quand admin approuve)
  useEffect(() => {
    if (!session?.user?.id) return;
    const ch = supabase.channel('my-profile')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${session.user.id}`,
      }, (payload) => {
        setProfile(payload.new);
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [session?.user?.id]);

  // 1. Splash en premier
  if (showSplash) {
    return (
      <SafeAreaProvider>
        <SplashScreen onFinish={() => setShowSplash(false)} />
      </SafeAreaProvider>
    );
  }

  // 2. Loading pendant vérification session
  if (session === undefined || (session && profile === undefined)) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0F', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#00E5FF" size="large" />
      </View>
    );
  }

  // 3. Pas de session → AuthScreen
  if (!session) {
    return (
      <SafeAreaProvider>
        <AuthScreen />
      </SafeAreaProvider>
    );
  }

  // 4. Session active mais pas approuvé → PendingScreen
  if (!profile || (!profile.approved && profile.role !== 'admin')) {
    return (
      <SafeAreaProvider>
        <PendingScreen />
      </SafeAreaProvider>
    );
  }

  // 5. Session active + approuvé → App
  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}
