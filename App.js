import React, { useState } from 'react';
import SplashScreen from './src/screens/SplashScreen';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
    const [ready, setReady] = useState(false);

    if (!ready) {
        return <SplashScreen onFinish={() => setReady(true)} />;
    }

    return <AppNavigator />;
}