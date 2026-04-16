import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StatusBar, Platform, ActivityIndicator,
  RefreshControl, Modal, TextInput, KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabaseClient';
import { C, alertOk, alertConfirm } from '../constants';

function UserCard({ profile, onRevoke, onRestore }) {
  const isRevoked = !profile.approved;
  const isAdmin   = profile.role === 'admin';

  return (
    <View style={{
      backgroundColor: C.bgCard, borderRadius: 16, padding: 16,
      borderWidth: 1, borderColor: isRevoked ? C.danger + '33' : C.border,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {/* Avatar */}
        <View style={{
          width: 44, height: 44, borderRadius: 22,
          backgroundColor: isAdmin ? C.accent + '33' : isRevoked ? C.danger + '22' : C.success + '22',
          borderWidth: 1, borderColor: isAdmin ? C.accent + '55' : isRevoked ? C.danger + '44' : C.success + '44',
          justifyContent: 'center', alignItems: 'center',
        }}>
          <Text style={{ fontSize: 18 }}>{isAdmin ? '👑' : isRevoked ? '🚫' : '👤'}</Text>
        </View>

        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: C.white }} numberOfLines={1}>
              {profile.full_name || 'Sans nom'}
            </Text>
            <View style={{
              backgroundColor: isAdmin ? C.accent + '33' : isRevoked ? C.danger + '22' : C.success + '33',
              borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2,
            }}>
              <Text style={{
                fontSize: 9, fontWeight: '800',
                color: isAdmin ? C.accentBright : isRevoked ? C.danger : C.success,
              }}>
                {isAdmin ? 'ADMIN' : isRevoked ? 'RÉVOQUÉ' : 'ACTIF'}
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 12, color: C.textSecondary }} numberOfLines={1}>
            {profile.email}
          </Text>
        </View>
      </View>

      {/* Actions pour non-admin uniquement */}
      {!isAdmin && (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {isRevoked ? (
            <TouchableOpacity onPress={() => onRestore(profile)} activeOpacity={0.8}
              style={{
                flex: 1, backgroundColor: C.success + '22', borderRadius: 10,
                paddingVertical: 10, alignItems: 'center',
                borderWidth: 1, borderColor: C.success + '44',
              }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: C.success }}>Réactiver</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => onRevoke(profile)} activeOpacity={0.8}
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
  const [email,    setEmail]    = useState('');
  const [name,     setName]     = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const reset = () => {
    setEmail(''); setName(''); setPassword('');
    setShowPass(false); setError('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleInvite = async () => {
    setError('');
    if (!name.trim())        { setError('Le nom est requis'); return; }
    if (!email.trim())       { setError('L\'email est requis'); return; }
    if (password.length < 6) { setError('Mot de passe : 6 caractères minimum'); return; }

    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName  = name.trim();

      // ── 1. Créer le compte via un client temporaire (sans toucher la session admin)
      const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, storageKey: 'invite-temp' },
      });

      const { data, error: signUpError } = await tempClient.auth.signUp({
        email: cleanEmail,
        password,
        options: { data: { full_name: cleanName } },
      });

      if (signUpError) throw signUpError;

      const userId = data?.user?.id;
      if (!userId) throw new Error('Impossible de créer le compte utilisateur');

      // ── 2. Créer le profil immédiatement approuvé
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        email: cleanEmail,
        full_name: cleanName,
        role: 'user',
        approved: true,
      }, { onConflict: 'id' });

      if (profileError) throw profileError;

      // ── 3. Envoyer un email de réinitialisation pour que l'utilisateur confirme
      //       son adresse ET définisse son propre mot de passe (optionnel mais recommandé)
      await supabase.auth.resetPasswordForEmail(cleanEmail);

      alertOk(
        '✅ Compte créé',
        `Le compte de ${cleanName} a été créé.\n\n` +
        `Un email a été envoyé à :\n${cleanEmail}\n\n` +
        `L'utilisateur doit cliquer sur le lien reçu pour activer son compte, ` +
        `puis se connecter avec :\n• Email : ${cleanEmail}\n• Mot de passe : ${password}`
      );
      reset();
      onInvited();
      onClose();
    } catch (err) {
      const msg = err.message ?? 'Une erreur est survenue';
      if (msg.includes('User already registered') || msg.includes('already been registered')) {
        setError('Cet email est déjà utilisé');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} activeOpacity={1} onPress={handleClose} />
        <View style={{
          backgroundColor: C.bgCard, borderTopLeftRadius: 28, borderTopRightRadius: 28,
          paddingBottom: Platform.OS === 'ios' ? 44 : 28,
          borderWidth: 1, borderColor: C.border, borderBottomWidth: 0,
        }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 28 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.textMuted, alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ fontSize: 20, fontWeight: '900', color: C.white, marginBottom: 6, textAlign: 'center' }}>
              Créer un accès
            </Text>
            <Text style={{ fontSize: 12, color: C.textMuted, textAlign: 'center', marginBottom: 24 }}>
              L'utilisateur recevra ses identifiants de votre part
            </Text>

            {error ? (
              <View style={{ backgroundColor: C.dangerDim, borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: C.danger + '44' }}>
                <Text style={{ fontSize: 12, color: C.danger, fontWeight: '600' }}>{error}</Text>
              </View>
            ) : null}

            {/* Nom */}
            <Text style={{ fontSize: 10, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
              Nom complet
            </Text>
            <TextInput
              value={name} onChangeText={v => { setName(v); setError(''); }}
              placeholder="ex: Ahmed Ben Ali"
              placeholderTextColor={C.textMuted}
              autoCapitalize="words"
              style={{
                backgroundColor: C.bgElevated, borderRadius: 12, padding: 14,
                color: C.white, fontSize: 15, borderWidth: 1, borderColor: C.border, marginBottom: 16,
              }}
            />

            {/* Email */}
            <Text style={{ fontSize: 10, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
              Adresse email
            </Text>
            <TextInput
              value={email} onChangeText={v => { setEmail(v); setError(''); }}
              placeholder="utilisateur@exemple.com"
              placeholderTextColor={C.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              style={{
                backgroundColor: C.bgElevated, borderRadius: 12, padding: 14,
                color: C.white, fontSize: 15, borderWidth: 1, borderColor: C.border, marginBottom: 16,
              }}
            />

            {/* Mot de passe initial */}
            <Text style={{ fontSize: 10, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
              Mot de passe initial
            </Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: C.bgElevated, borderRadius: 12,
              borderWidth: 1, borderColor: C.border, marginBottom: 24,
            }}>
              <TextInput
                value={password} onChangeText={v => { setPassword(v); setError(''); }}
                placeholder="Min. 6 caractères"
                placeholderTextColor={C.textMuted}
                secureTextEntry={!showPass}
                style={{ flex: 1, padding: 14, color: C.white, fontSize: 15 }}
              />
              <TouchableOpacity onPress={() => setShowPass(v => !v)} style={{ paddingHorizontal: 14 }}>
                <Text style={{ fontSize: 16 }}>{showPass ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={handleInvite} disabled={loading} activeOpacity={0.8}
              style={{ backgroundColor: C.accent, borderRadius: 14, padding: 16, alignItems: 'center', opacity: loading ? 0.6 : 1 }}>
              {loading
                ? <ActivityIndicator color={C.white} />
                : <Text style={{ fontSize: 15, fontWeight: '900', color: C.white }}>Créer le compte</Text>}
            </TouchableOpacity>
          </ScrollView>
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

  const handleRevoke = (profile) => {
    alertConfirm('Révoquer', `Retirer l'accès de ${profile.email} ?`, async () => {
      const { error } = await supabase.from('profiles')
        .update({ approved: false })
        .eq('id', profile.id);
      if (error) alertOk('Erreur', error.message);
      else fetchProfiles();
    });
  };

  const handleRestore = (profile) => {
    alertConfirm('Réactiver', `Rétablir l'accès de ${profile.email} ?`, async () => {
      const { error } = await supabase.from('profiles')
        .update({ approved: true })
        .eq('id', profile.id);
      if (error) alertOk('Erreur', error.message);
      else fetchProfiles();
    });
  };

  const active  = profiles.filter(p =>  p.approved || p.role === 'admin');
  const revoked = profiles.filter(p => !p.approved && p.role !== 'admin');

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
            { _section: 'active' },
            ...active,
            ...(revoked.length > 0 ? [{ _section: 'revoked' }] : []),
            ...revoked,
          ]}
          keyExtractor={(item) => item._section ? `section_${item._section}` : item.id}
          contentContainerStyle={{ padding: 20, gap: 10 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
          renderItem={({ item }) => {
            if (item._section === 'active') {
              return (
                <View style={{ paddingBottom: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                    Comptes actifs ({active.length})
                  </Text>
                </View>
              );
            }
            if (item._section === 'revoked') {
              return (
                <View style={{ paddingTop: 10, paddingBottom: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: C.danger, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                    Accès révoqués ({revoked.length})
                  </Text>
                </View>
              );
            }
            return (
              <UserCard
                profile={item}
                onRevoke={handleRevoke}
                onRestore={handleRestore}
              />
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <Text style={{ fontSize: 32, marginBottom: 12 }}>👥</Text>
              <Text style={{ fontSize: 14, color: C.textMuted, textAlign: 'center' }}>
                Aucun compte pour l'instant.{'\n'}Invitez des utilisateurs avec le bouton + Inviter.
              </Text>
            </View>
          }
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
