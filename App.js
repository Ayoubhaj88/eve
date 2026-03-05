import React, { useState } from 'react';
import SplashScreen from './src/screens/SplashScreen';
import AuthScreen from './src/screens/AuthScreen';
import AppNavigator from './src/navigation/Appnavigator';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) return <SplashScreen onFinish={() => setShowSplash(false)} />;
  return session ? <AppNavigator /> : <AuthScreen />;
}