import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';

import DashboardScreen from '../screens/DashboardScreen';
import HomeScreen from '../screens/HomeScreen';
import DashboardScreen from '../screens/DashboardScreen';
import SettingsScreen from '../screens/Settingsscreen';

const Tab = createBottomTabNavigator();

const COLORS = {
  bg: '#0A0A0F',
  bgCard: '#13131A',
  accent: '#00E5FF',
  accentGlow: 'rgba(0,229,255,0.12)',
  success: '#00E676',
  warning: '#FFB300',
  danger: '#FF1744',
  textPrimary: '#FFFFFF',
  textSecondary: '#8A8A9A',
  textMuted: '#4A4A5A',
  border: '#1E1E2E',
  borderAccent: 'rgba(0,229,255,0.3)',
};

const TABS = [
  { name: 'Dashboard', icon: '⚡', label: 'Accueil' },
  { name: 'Alerts',    icon: '🔔', label: 'Alertes' },
  { name: 'Prediction',icon: '🧠', label: 'IA' },
  { name: 'Settings',  icon: '⚙️', label: 'Réglages' },
];

function CustomTabBar({ state, descriptors, navigation }) {
  return (
    <View style={styles.tabBar}>
      <View style={styles.tabBarInner}>
        {state.routes.map((route, index) => {
          const tab = TABS[index];
          const isFocused = state.index === index;

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tabItem}
              onPress={() => navigation.navigate(route.name)}
              activeOpacity={0.7}
            >
              {isFocused && <View style={styles.tabActiveGlow} />}
              <View style={[styles.tabIconWrap, isFocused && styles.tabIconWrapActive]}>
                <Text style={styles.tabIcon}>{tab.icon}</Text>
              </View>
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                {tab.label}
              </Text>
              {isFocused && <View style={styles.tabActiveDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        tabBar={props => <CustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="Dashboard"  component={DashboardScreen} />
        <Tab.Screen name="Alerts"     component={AlertsScreen} />
        <Tab.Screen name="Prediction" component={PredictionScreen} />
        <Tab.Screen name="Settings"   component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  tabBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    position: 'relative',
  },
  tabActiveGlow: {
    position: 'absolute',
    top: -8,
    width: 60,
    height: 3,
    backgroundColor: COLORS.accent,
    borderRadius: 2,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 5,
  },
  tabIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  tabIconWrapActive: {
    backgroundColor: COLORS.accentGlow,
    borderWidth: 1,
    borderColor: COLORS.borderAccent,
  },
  tabIcon: { fontSize: 20 },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  tabLabelActive: {
    color: COLORS.accent,
  },
  tabActiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
    marginTop: 3,
  },
});