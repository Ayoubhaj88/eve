import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Modal,
  Platform, StatusBar,
} from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { C } from '../constants';

const ITEMS_BASE = [
  { key: 'parametres',      icon: '🔔',  label: 'Parametres des notifications' },
  { key: 'addBatterie',     icon: '🔋',  label: 'Batterie' },
  { key: 'addTpms',         icon: '🛞',  label: 'TPMS'    },
  { key: 'addScooter',      icon: '🛵',  label: 'Ajouter Scooter' },
];

const ADMIN_ITEM = { key: 'admin', icon: '👥', label: 'Gestion des comptes' };
const COMPTE_ITEM = { key: 'compte', icon: '👤', label: 'Déconnexion' };

export default function Sidebar({ visible, onClose, onSelect, userEmail }) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!visible) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) {
        supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle()
          .then(({ data: profile }) => {
            setIsAdmin(profile?.role === 'admin');
          });
      }
    });
  }, [visible]);

  const items = [
    ...ITEMS_BASE,
    ...(isAdmin ? [ADMIN_ITEM] : []),
    COMPTE_ITEM,
  ];

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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <Text style={{ fontSize: 11, color: C.textMuted }}>{userEmail}</Text>
                {isAdmin && (
                  <View style={{ backgroundColor: C.accent + '33', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
                    <Text style={{ fontSize: 8, fontWeight: '800', color: C.accentBright }}>ADMIN</Text>
                  </View>
                )}
              </View>
            ) : null}
          </View>

          {/* Menu items */}
          <View style={{ gap: 4 }}>
            {items.map(item => (
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
