import React from 'react';
import {
  View, Text, TouchableOpacity, Modal,
  Platform, StatusBar,
} from 'react-native';
import { C } from '../constants';

const ITEMS = [
  { key: 'parametres',      icon: '⚙️',  label: 'Parametres'      },
  { key: 'addBatterie',     icon: '🔋',  label: 'Ajouter Batterie' },
  { key: 'addTpms',         icon: '⚙️',  label: 'Ajouter TPMS'    },
  { key: 'addScooter',      icon: '🛵',  label: 'Ajouter Scooter' },
  { key: 'compte',          icon: '👤',  label: 'Compte'           },
];

export default function Sidebar({ visible, onClose, onSelect, userEmail }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* Panneau sidebar */}
        <View style={{
          width: '72%',
          backgroundColor: C.bgSidebar,
          paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight ?? 0) + 20,
          paddingBottom: 40,
          paddingHorizontal: 24,
          borderRightWidth: 1,
          borderRightColor: C.border,
        }}>
          {/* Logo + email */}
          <View style={{ marginBottom: 36 }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: C.white, letterSpacing: -0.5 }}>
              EVE <Text style={{ color: C.accentBright }}>Mobility</Text>
            </Text>
            {userEmail ? (
              <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>{userEmail}</Text>
            ) : null}
          </View>

          {/* Menu items */}
          <View style={{ gap: 4 }}>
            {ITEMS.map(item => (
              <TouchableOpacity
                key={item.key}
                onPress={() => { onClose(); onSelect(item.key); }}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                }}
              >
                <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                <Text style={{ fontSize: 15, fontWeight: '600', color: C.white }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Zone cliquable pour fermer */}
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}
          activeOpacity={1}
          onPress={onClose}
        />
      </View>
    </Modal>
  );
}
