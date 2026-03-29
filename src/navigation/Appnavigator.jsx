import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen          from '../screens/HomeScreen';
import DashboardScreen     from '../screens/DashboardScreen';
import GPSScreen           from '../screens/GPSScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ParametresScreen    from '../screens/ParametresScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#0A1628' },
        }}
      >
        <Stack.Screen name="Home"          component={HomeScreen} />
        <Stack.Screen name="Dashboard"     component={DashboardScreen} />
        <Stack.Screen name="GPS"           component={GPSScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Parametres"    component={ParametresScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
