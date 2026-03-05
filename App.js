import React, { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from './src/lib/supabaseClient';
import SplashScreen from './src/screens/SplashScreen';
import AppNavigator from './src/navigation/Appnavigator';
import AuthScreen   from './src/screens/AuthScreen';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [session,    setSession]    = useState(null);
  const [authReady,  setAuthReady]  = useState(false);

  useEffect(() => {
    // Récupère la session existante
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });

    // Écoute les changements de session (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Splash toujours affiché en premier
  if (showSplash) {
    return (
      <SafeAreaProvider>
        <SplashScreen onFinish={() => setShowSplash(false)} />
      </SafeAreaProvider>
    );
  }

  // Attend que Supabase vérifie la session
  if (!authReady) return null;

  return (
    <SafeAreaProvider>
      {session ? <AppNavigator /> : <AuthScreen />}
    </SafeAreaProvider>
  );
}