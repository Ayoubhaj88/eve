import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { C } from '../constants';

/**
 * AttentionModal — modal "ATTENTION es-tu sûr ?"
 *
 * Props:
 *   visible    bool
 *   label      string  — ex: "Démarrer", "Activer Alarme", "LED Attention"
 *   onOui      func    — confirmé
 *   onNon      func    — annulé
 */
export default function AttentionModal({ visible, label, onOui, onNon }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onNon}>
      <View style={{
        flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'center', alignItems: 'center', padding: 32,
      }}>
        <View style={{
          backgroundColor: C.bgCard,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: C.danger + '55',
          padding: 28,
          width: '100%',
          maxWidth: 340,
          alignItems: 'center',
          gap: 20,
        }}>
          {/* Titre */}
          <View style={{
            backgroundColor: C.danger,
            borderRadius: 12,
            paddingHorizontal: 24,
            paddingVertical: 10,
            width: '100%',
            alignItems: 'center',
          }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: C.white, letterSpacing: 1 }}>
              ATTENTION
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.white, marginTop: 4 }}>
              es-tu sûr ?
            </Text>
          </View>

          {/* Label action */}
          {label ? (
            <Text style={{ fontSize: 13, color: C.textSecondary, textAlign: 'center' }}>
              {label}
            </Text>
          ) : null}

          {/* Boutons OUI / NO */}
          <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
            <TouchableOpacity
              onPress={onOui}
              activeOpacity={0.8}
              style={{
                flex: 1, paddingVertical: 14, borderRadius: 12,
                backgroundColor: C.success,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '900', color: C.white }}>OUI</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onNon}
              activeOpacity={0.8}
              style={{
                flex: 1, paddingVertical: 14, borderRadius: 12,
                backgroundColor: C.danger,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '900', color: C.white }}>NO</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
