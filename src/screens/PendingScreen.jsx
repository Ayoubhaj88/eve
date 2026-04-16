import React from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { C } from '../constants';

export default function PendingScreen() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Icône */}
      <View style={{
        width: 88, height: 88, borderRadius: 26,
        backgroundColor: C.dangerDim,
        borderWidth: 1.5, borderColor: C.danger + '55',
        justifyContent: 'center', alignItems: 'center', marginBottom: 28,
      }}>
        <Text style={{ fontSize: 42 }}>🚫</Text>
      </View>

      <Text style={{ fontSize: 22, fontWeight: '900', color: C.white, marginBottom: 10, textAlign: 'center' }}>
        Accès non autorisé
      </Text>

      <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
        Ce compte n'a pas été invité par l'administrateur.{'\n'}
        Vous ne pouvez pas accéder à l'application.
      </Text>

      {/* Encart contact admin */}
      <View style={{
        backgroundColor: C.bgCard, borderRadius: 18, padding: 20,
        borderWidth: 1, borderColor: C.borderAccent + '55',
        width: '100%', marginBottom: 28, gap: 8,
      }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: C.accent, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 2 }}>
          Comment obtenir un accès ?
        </Text>
        <Text style={{ fontSize: 13, color: C.textSecondary, lineHeight: 20 }}>
          Contactez l'administrateur EVE Mobility pour qu'il vous crée un compte :
        </Text>
        <View style={{
          backgroundColor: C.bgElevated, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14,
          borderWidth: 1, borderColor: C.border,
        }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.accent, textAlign: 'center' }}>
            📧 info@evemobility.tn
          </Text>
        </View>
      </View>

      <TouchableOpacity onPress={handleLogout} activeOpacity={0.8}
        style={{
          backgroundColor: C.bgCard, borderRadius: 14,
          paddingVertical: 14, paddingHorizontal: 40,
          borderWidth: 1, borderColor: C.border,
        }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: C.textSecondary }}>
          Se déconnecter
        </Text>
      </TouchableOpacity>
    </View>
  );
}
