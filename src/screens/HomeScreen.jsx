import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const navigation = useNavigation();

  const scooters = [
    {
      id: '1',
      model: 'Scooter 1',
      connected: true,
      battery: 78,
      speed: 42,
      range: 65,
      temp: 32,
      charging: false,
      gps: { address: 'Sidi Henri', lastUpdate: '10 sec' }
    },
    {
      id: '2',
      model: 'Scooter 2',
      connected: false,
      battery: 55,
      speed: 0,
      range: 40,
      temp: 28,
      charging: false,
      gps: { address: null, lastUpdate: null }
    }
  ];

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('Dashboard', { scooter: item })}
    >
      <Text style={styles.title}>{item.model}</Text>
      <Text style={styles.status}>
        {item.connected ? '🟢 Connecté' : '🔴 Hors ligne'}
      </Text>
      <Text style={styles.battery}>🔋 {item.battery}%</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Mes Scooters</Text>
      <FlatList
        data={scooters}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F', padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', color: 'white', marginBottom: 20 },
  card: {
    backgroundColor: '#13131A',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#1E1E2E'
  },
  title: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  status: { color: '#8A8A9A', marginTop: 5 },
  battery: { marginTop: 8, color: '#00E5FF' }
});