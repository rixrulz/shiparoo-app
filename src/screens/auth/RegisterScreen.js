import React, { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Colors } from '../../components/UI';

const ROLES = ['shipper', 'carrier'];

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();

  const [role,      setRole]      = useState('shipper');
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [phone,     setPhone]     = useState('');
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  // Carrier-only
  const [company,   setCompany]   = useState('');
  const [mcNumber,  setMcNumber]  = useState('');

  const [busy,   setBusy]   = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!firstName.trim()) e.firstName = 'Required';
    if (!lastName.trim())  e.lastName  = 'Required';
    if (!email.trim())     e.email     = 'Required';
    if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Valid email required';
    if (password.length < 8)         e.password = 'Min 8 characters';
    if (password !== confirm)        e.confirm  = 'Passwords do not match';
    if (role === 'carrier') {
      if (!company.trim())  e.company  = 'Company name required';
      if (!mcNumber.trim()) e.mcNumber = 'MC number required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      await register({
        role,
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        email:     email.trim().toLowerCase(),
        phone:     phone.trim() || undefined,
        password,
        ...(role === 'carrier' ? {
          companyName: company.trim(),
          mcNumber:    mcNumber.trim().replace(/^MC-?/i, ''),
        } : {}),
      });
    } catch (err) {
      Alert.alert('Registration Failed', err.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>Create Account</Text>

        {/* Role toggle */}
        <View style={styles.roleRow}>
          {ROLES.map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.roleBtn, role === r && styles.roleBtnActive]}
              onPress={() => setRole(r)}
            >
              <Text style={[styles.roleText, role === r && styles.roleTextActive]}>
                {r === 'shipper' ? '📦 Shipper' : '🚛 Carrier'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.roleHint}>
          {role === 'shipper'
            ? 'Post loads and hire carriers to move freight.'
            : 'Find loads and get paid to haul freight.'}
        </Text>

        {/* Personal info */}
        <View style={styles.row}>
          <View style={styles.half}>
            <Input label="First Name" value={firstName} onChangeText={setFirstName} autoCapitalize="words" returnKeyType="next" error={errors.firstName} />
          </View>
          <View style={[styles.half, { marginLeft: 10 }]}>
            <Input label="Last Name" value={lastName} onChangeText={setLastName} autoCapitalize="words" returnKeyType="next" error={errors.lastName} />
          </View>
        </View>

        <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoCorrect={false} returnKeyType="next" placeholder="you@company.com" error={errors.email} />
        <Input label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" returnKeyType="next" placeholder="+1 (555) 000-0000" />

        {/* Carrier-only fields */}
        {role === 'carrier' && (
          <>
            <Input label="Company Name" value={company} onChangeText={setCompany} autoCapitalize="words" returnKeyType="next" placeholder="Acme Trucking LLC" error={errors.company} />
            <Input label="MC Number" value={mcNumber} onChangeText={setMcNumber} keyboardType="numeric" returnKeyType="next" placeholder="123456" error={errors.mcNumber} />
          </>
        )}

        <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry returnKeyType="next" placeholder="Min 8 characters" error={errors.password} />
        <Input label="Confirm Password" value={confirm} onChangeText={setConfirm} secureTextEntry returnKeyType="done" onSubmitEditing={handleRegister} placeholder="Re-enter password" error={errors.confirm} />

        <Button title="Create Account" onPress={handleRegister} loading={busy} style={{ marginTop: 8 }} />

        <TouchableOpacity style={styles.loginRow} onPress={() => navigation.goBack()}>
          <Text style={styles.loginText}>
            Already have an account? <Text style={styles.loginLink}>Log in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:            { flex: 1, backgroundColor: Colors.bg },
  container:       { padding: 20, paddingBottom: 48 },
  heading:         { fontSize: 26, fontWeight: '800', color: Colors.text, marginBottom: 20, marginTop: 12 },
  roleRow:         { flexDirection: 'row', marginBottom: 10 },
  roleBtn:         { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: Colors.card },
  roleBtnActive:   { backgroundColor: Colors.primary, borderColor: Colors.primary },
  roleText:        { fontSize: 15, fontWeight: '600', color: Colors.muted },
  roleTextActive:  { color: '#fff' },
  roleHint:        { fontSize: 13, color: Colors.muted, marginBottom: 18, lineHeight: 18 },
  row:             { flexDirection: 'row' },
  half:            { flex: 1 },
  loginRow:        { alignItems: 'center', marginTop: 24 },
  loginText:       { color: Colors.muted, fontSize: 14 },
  loginLink:       { color: Colors.primary, fontWeight: '700' },
});
