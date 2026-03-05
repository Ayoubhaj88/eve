import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from './src/lib/supabaseClient';
import SplashScreen from './src/screens/SplashScreen';
import AppNavigator  from './src/navigation/Appnavigator';
import AuthScreen    from './src/screens/AuthScreen';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [session,    setSession]    = useState(undefined); // undefined = pas encore vérifié

  useEffect(() => {
    // Vérifie la session au démarrage
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    // Dès que l'utilisateur se connecte OU s'inscrit → session change → redirect automatique
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 1. Splash en premier
  if (showSplash) {
    return (
      <SafeAreaProvider>
        <SplashScreen onFinish={() => setShowSplash(false)} />
      </SafeAreaProvider>
    );
  }

  // 2. Loading pendant vérification session
  if (session === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0F', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#00E5FF" size="large" />
      </View>
    );
  }

  // 3. Session active → HomeScreen, sinon → AuthScreen
  return (
    <SafeAreaProvider>
      {session ? <AppNavigator /> : <AuthScreen />}
    </SafeAreaProvider>
  );
}