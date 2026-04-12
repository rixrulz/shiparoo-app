import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, RefreshControl,
} from 'react-native';
import { users as usersApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Card, Colors, Button, Input, Divider, Spinner, ErrorBanner } from '../../components/UI';

export default function ProfileScreen({ navigation }) {
  const { user, logout, updateUser } = useAuth();

  const [profile,     setProfile]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [editing,     setEditing]     = useState(false);
  const [saving,      setSaving]      = useState(false);

  // Editable fields
  const [firstName,   setFirstName]   = useState('');
  const [lastName,    setLastName]    = useState('');
  const [phone,       setPhone]       = useState('');
  const [company,     setCompany]     = useState('');

  const fetchProfile = useCallback(async () => {
    try {
      setError(null);
      const data = await usersApi.profile();
      const p = data.user ?? data;
      setProfile(p);
      setFirstName(p.firstName ?? '');
      setLastName(p.lastName ?? '');
      setPhone(p.phone ?? '');
      setCompany(p.carrier?.companyName ?? p.shipper?.companyName ?? '');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await usersApi.update({
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        phone:     phone.trim() || undefined,
      });
      const updated = data.user ?? data;
      updateUser(updated);
      setProfile(updated);
      setEditing(false);
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  const handleStripeOnboard = async () => {
    try {
      const res = await usersApi.stripeOnboard?.();
      // In a full implementation, open the Stripe onboarding URL in a WebView or Safari
      Alert.alert('Stripe Onboarding', `Open this URL to complete setup:\n\n${res?.url ?? 'URL not available'}`);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  if (loading) return <Spinner />;

  const isCarrier = user?.role === 'carrier';
  const displayName = `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim() || 'User';
  const initials = `${(profile?.firstName?.[0] ?? '')[0] ?? ''}${(profile?.lastName?.[0] ?? '')[0] ?? ''}`.toUpperCase() || 'U';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={false} onRefresh={fetchProfile} tintColor={Colors.primary} />}
    >
      <ErrorBanner message={error} onRetry={fetchProfile} />

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.displayName}>{displayName}</Text>
        <Text style={styles.email}>{profile?.email}</Text>
        <View style={styles.rolePill}>
          <Text style={styles.roleText}>{isCarrier ? '🚛 Carrier' : '📦 Shipper'}</Text>
        </View>
      </View>

      {/* Profile info */}
      <Card>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Personal Info</Text>
          <TouchableOpacity onPress={() => setEditing(!editing)}>
            <Text style={styles.editLink}>{editing ? 'Cancel' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>

        {editing ? (
          <>
            <View style={styles.row}>
              <View style={[styles.half, { marginRight: 8 }]}>
                <Input label="First Name" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
              </View>
              <View style={styles.half}>
                <Input label="Last Name" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
              </View>
            </View>
            <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+1 (555) 000-0000" />
            <Button title={saving ? 'Saving…' : 'Save Changes'} onPress={handleSave} loading={saving} />
          </>
        ) : (
          <>
            <InfoRow label="First Name" value={profile?.firstName} />
            <InfoRow label="Last Name"  value={profile?.lastName} />
            <InfoRow label="Email"      value={profile?.email} />
            <InfoRow label="Phone"      value={profile?.phone || 'Not set'} />
          </>
        )}
      </Card>

      {/* Role-specific info */}
      {isCarrier && profile?.carrier && (
        <Card>
          <Text style={styles.sectionTitle}>Carrier Info</Text>
          <InfoRow label="Company"    value={profile.carrier.companyName} />
          <InfoRow label="MC Number"  value={profile.carrier.mcNumber ? `MC#${profile.carrier.mcNumber}` : null} />
          <InfoRow label="FMCSA Status" value={profile.carrier.fmcsaStatus?.replace(/_/g, ' ')} />
        </Card>
      )}

      {/* Stripe onboarding for carriers */}
      {isCarrier && (
        <Card>
          <Text style={styles.sectionTitle}>Payment Setup</Text>
          {profile?.carrier?.stripeAccountId ? (
            <View style={styles.stripeConnected}>
              <Text style={styles.stripeConnectedText}>✅ Stripe account connected</Text>
              <Text style={styles.stripeHint}>Payments will be deposited after delivery confirmation.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.stripeHint}>Connect a Stripe account to receive payments for your deliveries.</Text>
              <Button title="Connect with Stripe" onPress={handleStripeOnboard} style={{ marginTop: 12 }} />
            </>
          )}
        </Card>
      )}

      {/* Notifications */}
      <Card>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Text style={styles.menuIcon}>🔔</Text>
          <Text style={styles.menuLabel}>Notifications</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </Card>

      {/* App info */}
      <Card>
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>Shiparoo v1.0.0</Text>
          <Text style={styles.appInfoText}>© 2026 Shiparoo Inc.</Text>
        </View>
      </Card>

      {/* Logout */}
      <View style={styles.logoutBlock}>
        <Button title="Log Out" variant="danger" onPress={handleLogout} />
      </View>
    </ScrollView>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: Colors.bg },
  scroll:            { paddingBottom: 48 },
  avatarSection:     { alignItems: 'center', paddingVertical: 28, backgroundColor: Colors.primary },
  avatar:            { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  avatarText:        { fontSize: 28, fontWeight: '800', color: '#fff' },
  displayName:       { fontSize: 22, fontWeight: '800', color: '#fff' },
  email:             { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  rolePill:          { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4, marginTop: 10 },
  roleText:          { color: '#fff', fontWeight: '700', fontSize: 13 },
  sectionHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:      { fontSize: 15, fontWeight: '700', color: Colors.text },
  editLink:          { color: Colors.primary, fontWeight: '700', fontSize: 14 },
  row:               { flexDirection: 'row' },
  half:              { flex: 1 },
  infoRow:           { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoLabel:         { fontSize: 14, color: Colors.muted },
  infoValue:         { fontSize: 14, fontWeight: '600', color: Colors.text },
  stripeConnected:   { backgroundColor: '#d1fae5', borderRadius: 10, padding: 12 },
  stripeConnectedText:{ color: '#065f46', fontWeight: '700', fontSize: 15 },
  stripeHint:        { fontSize: 13, color: Colors.muted, lineHeight: 18, marginTop: 4 },
  menuItem:          { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  menuIcon:          { fontSize: 20 },
  menuLabel:         { flex: 1, fontSize: 16, color: Colors.text, fontWeight: '500' },
  menuArrow:         { fontSize: 22, color: Colors.muted },
  appInfo:           { alignItems: 'center', gap: 4 },
  appInfoText:       { fontSize: 12, color: Colors.muted },
  logoutBlock:       { marginHorizontal: 16, marginTop: 8 },
});
