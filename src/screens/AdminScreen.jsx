import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StatusBar, Platform, ActivityIndicator,
  RefreshControl, Modal, TextInput, KeyboardAvoidingView,
} from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { C, alertOk, alertConfirm } from '../constants';

function UserCard({ profile, onApprove, onReject, onDelete }) {
  const isPending = !profile.approved;
  const isAdmin = profile.role === 'admin';

  return (
    <View style={{
      backgroundColor: C.bgCard, borderRadius: 16, padding: 16,
      borderWidth: 1, borderColor: isPending ? C.warning + '44' : C.border,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {/* Avatar */}
        <View style={{
          width: 44, height: 44, borderRadius: 22,
          backgroundColor: isAdmin ? C.accent + '33' : isPending ? C.warning + '22' : C.success + '22',
          borderWidth: 1, borderColor: isAdmin ? C.accent + '55' : isPending ? C.warning + '44' : C.success + '44',
          justifyContent: 'center', alignItems: 'center',
        }}>
          <Text style={{ fontSize: 18 }}>{isAdmin ? '👑' : isPending ? '⏳' : '👤'}</Text>
        </View>

        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: C.white }} numberOfLines={1}>
              {profile.full_name || 'Sans nom'}
            </Text>
            <View style={{
              backgroundColor: isAdmin ? C.accent + '33' : isPending ? C.warning + '33' : C.success + '33',
              borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2,
            }}>
              <Text style={{
                fontSize: 9, fontWeight: '800',
                color: isAdmin ? C.accentBright : isPending ? C.warning : C.success,
              }}>
                {isAdmin ? 'ADMIN' : isPending ? 'EN ATTENTE' : 'ACTIF'}
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 12, color: C.textSecondary }} numberOfLines={1}>
            {profile.email}
          </Text>
        </View>
      </View>

      {/* Actions pour non-admin */}
      {!isAdmin && (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {isPending && (
            <TouchableOpacity onPress={() => onApprove(profile)} activeOpacity={0.8}
              style={{
                flex: 1, backgroundColor: C.success + '22', borderRadius: 10,
                paddingVertical: 10, alignItems: 'center',
                borderWidth: 1, borderColor: C.success + '44',
              }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: C.success }}>Approuver</Text>
            </TouchableOpacity>
          )}
          {isPending && (
            <TouchableOpacity onPress={() => onReject(profile)} activeOpacity={0.8}
              style={{
                flex: 1, backgroundColor: C.dangerDim, borderRadius: 10,
                paddingVertical: 10, alignItems: 'center',
                borderWidth: 1, borderColor: C.danger + '44',
              }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: C.danger }}>Rejeter</Text>
            </TouchableOpacity>
          )}
          {!isPending && (
            <TouchableOpacity onPress={() => onDelete(profile)} activeOpacity={0.8}
              style={{
                flex: 1, backgroundColor: C.dangerDim, borderRadius: 10,
                paddingVertical: 10, alignItems: 'center',
                borderWidth: 1, borderColor: C.danger + '44',
              }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: C.danger }}>Révoquer l'accès</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

function InviteModal({ visible, onClose, onInvited }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (!email.trim()) { alertOk('Erreur', 'Email requis'); return; }
    setLoading(true);
    try {
      // Pré-approuver cet email dans la table invited_emails.
      // Quand l'utilisateur s'inscrira avec cet email, le trigger SQL
      // le détectera et créera son profil avec approved=true directement.
      const { error } = await supabase.from('invited_emails').upsert({
        email: email.trim().toLowerCase(),
        full_name: name.trim(),
      });
      if (error) throw error;

      alertOk(
        'Invitation enregistrée',
        `L'email ${email.trim()} est pré-approuvé.\n\nPartagez-lui l'application — il pourra s'inscrire directement et aura accès immédiatement.`
      );
      setEmail('');
      setName('');
      onInvited();
      onClose();
    } catch (err) {
      alertOk('Erreur', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} activeOpacity={1} onPress={onClose} />
        <View style={{
          backgroundColor: C.bgCard, borderTopLeftRadius: 28, borderTopRightRadius: 28,
          padding: 28, paddingBottom: Platform.OS === 'ios' ? 44 : 28,
          borderWidth: 1, borderColor: C.border, borderBottomWidth: 0,
        }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.textMuted, alignSelf: 'center', marginBottom: 20 }} />
          <Text style={{ fontSize: 20, fontWeight: '900', color: C.white, marginBottom: 20, textAlign: 'center' }}>
            Inviter un utilisateur
          </Text>

          <Text style={{ fontSize: 10, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
            Nom complet
          </Text>
          <TextInput
            value={name} onChangeText={setName}
            placeholder="ex: Ahmed Ben Ali"
            placeholderTextColor={C.textMuted}
            style={{
              backgroundColor: C.bgElevated, borderRadius: 12, padding: 14,
              color: C.white, fontSize: 15, borderWidth: 1, borderColor: C.border, marginBottom: 16,
            }}
          />

          <Text style={{ fontSize: 10, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
            Adresse email
          </Text>
          <TextInput
            value={email} onChangeText={setEmail}
            placeholder="utilisateur@exemple.com"
            placeholderTextColor={C.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            style={{
              backgroundColor: C.bgElevated, borderRadius: 12, padding: 14,
              color: C.white, fontSize: 15, borderWidth: 1, borderColor: C.border, marginBottom: 24,
            }}
          />

          <View style={{
            backgroundColor: C.bgElevated, borderRadius: 12, padding: 14,
            borderWidth: 1, borderColor: C.border, marginBottom: 20,
          }}>
            <Text style={{ fontSize: 11, color: C.textSecondary, lineHeight: 18 }}>
              L'email sera pré-approuvé. Quand cette personne s'inscrira dans l'application avec cet email, elle aura accès immédiatement sans attendre votre validation.
            </Text>
          </View>

          <TouchableOpacity onPress={handleInvite} disabled={loading} activeOpacity={0.8}
            style={{ backgroundColor: C.accent, borderRadius: 14, padding: 16, alignItems: 'center', opacity: loading ? 0.6 : 1 }}>
            {loading
              ? <ActivityIndicator color={C.white} />
              : <Text style={{ fontSize: 15, fontWeight: '900', color: C.white }}>Envoyer l'invitation</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function AdminScreen({ navigation }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const fetchProfiles = useCallback(async () => {
    const { data, error } = await supabase.from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error(error); }
    setProfiles(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfiles();
    const ch = supabase.channel('admin-profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchProfiles())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchProfiles]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfiles();
    setRefreshing(false);
  };

  const handleApprove = (profile) => {
    alertConfirm('Approuver', `Autoriser ${profile.email} à accéder à l'application ?`, async () => {
      const { error } = await supabase.from('profiles')
        .update({ approved: true })
        .eq('id', profile.id);
      if (error) alertOk('Erreur', error.message);
      else fetchProfiles();
    });
  };

  const handleReject = (profile) => {
    alertConfirm('Rejeter', `Supprimer le compte de ${profile.email} ?`, async () => {
      // Supprimer le profil (le user auth reste, mais sans profil = pas d'accès)
      const { error } = await supabase.from('profiles').delete().eq('id', profile.id);
      if (error) alertOk('Erreur', error.message);
      else fetchProfiles();
    });
  };

  const handleRevoke = (profile) => {
    alertConfirm('Révoquer', `Retirer l'accès de ${profile.email} ?`, async () => {
      const { error } = await supabase.from('profiles')
        .update({ approved: false })
        .eq('id', profile.id);
      if (error) alertOk('Erreur', error.message);
      else fetchProfiles();
    });
  };

  const pending = profiles.filter(p => !p.approved && p.role !== 'admin');
  const approved = profiles.filter(p => p.approved || p.role === 'admin');

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={{
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 20, paddingBottom: 16,
        flexDirection: 'row', alignItems: 'center',
        borderBottomWidth: 1, borderBottomColor: C.border,
      }}>
        <TouchableOpacity onPress={() => navigation.goBack()}
          style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.bgCard, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
          <Text style={{ fontSize: 20, color: C.white }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontWeight: '900', color: C.white, marginLeft: 12 }}>
          GESTION COMPTES
        </Text>
        <TouchableOpacity onPress={() => setShowInvite(true)}
          style={{ backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: C.white }}>+ Inviter</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      ) : (
        <FlatList
          data={[
            ...(pending.length > 0 ? [{ _section: 'pending' }] : []),
            ...pending,
            { _section: 'approved' },
            ...approved,
          ]}
          keyExtractor={(item, i) => item._section ? `section_${item._section}` : item.id}
          contentContainerStyle={{ padding: 20, gap: 10 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
          renderItem={({ item }) => {
            if (item._section === 'pending') {
              return (
                <View style={{ paddingBottom: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: C.warning, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                    En attente d'approbation ({pending.length})
                  </Text>
                </View>
              );
            }
            if (item._section === 'approved') {
              return (
                <View style={{ paddingTop: pending.length > 0 ? 10 : 0, paddingBottom: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                    Utilisateurs actifs ({approved.length})
                  </Text>
                </View>
              );
            }
            return (
              <UserCard
                profile={item}
                onApprove={handleApprove}
                onReject={handleReject}
                onDelete={handleRevoke}
              />
            );
          }}
        />
      )}

      <InviteModal
        visible={showInvite}
        onClose={() => setShowInvite(false)}
        onInvited={fetchProfiles}
      />
    </View>
  );
}
