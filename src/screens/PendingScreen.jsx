import React from 'react';
import { View, Text, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { C } from '../constants';

export default function PendingScreen() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={{
        width: 80, height: 80, borderRadius: 24,
        backgroundColor: C.bgCard, borderWidth: 1.5, borderColor: C.borderAccent,
        justifyContent: 'center', alignItems: 'center', marginBottom: 24,
      }}>
        <Text style={{ fontSize: 40 }}>⏳</Text>
      </View>

      <Text style={{ fontSize: 22, fontWeight: '900', color: C.white, marginBottom: 10, textAlign: 'center' }}>
        En attente d'approbation
      </Text>

      <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
        Votre compte a bien été créé.{'\n'}
        L'administrateur doit approuver votre accès avant que vous puissiez utiliser l'application.
      </Text>

      <View style={{
        backgroundColor: C.bgCard, borderRadius: 16, padding: 18,
        borderWidth: 1, borderColor: C.border, width: '100%', marginBottom: 24,
      }}>
        <Text style={{ fontSize: 12, color: C.textMuted, textAlign: 'center', lineHeight: 20 }}>
          Contactez votre administrateur pour qu'il valide votre compte depuis l'application.
        </Text>
      </View>

      <TouchableOpacity onPress={handleLogout} activeOpacity={0.8}
        style={{
          backgroundColor: C.dangerDim, borderRadius: 14,
          paddingVertical: 14, paddingHorizontal: 32,
          borderWidth: 1, borderColor: C.danger + '44',
        }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: C.danger }}>
          Se déconnecter
        </Text>
      </TouchableOpacity>
    </View>
  );
}
