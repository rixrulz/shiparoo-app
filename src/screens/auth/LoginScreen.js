import React, { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Colors } from '../../components/UI';

export default function LoginScreen({ navigation }) {
  const { login, loading, error } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [busy,     setBusy]     = useState(false);
  const [errors,   setErrors]   = useState({});

  const validate = () => {
    const e = {};
    if (!email.trim())    e.email    = 'Email is required';
    if (!password)        e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      await login(email.trim().toLowerCase(), password);
      // Navigation handled automatically by RootNavigation auth state
    } catch (err) {
      Alert.alert('Login Failed', err.message ?? 'Please check your credentials.');
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
        {/* Logo / Brand */}
        <View style={styles.brand}>
          <Text style={styles.logo}>🚚</Text>
          <Text style={styles.appName}>Shiparoo</Text>
          <Text style={styles.tagline}>Freight. Simplified.</Text>
        </View>

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.heading}>Welcome back</Text>

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            returnKeyType="next"
            placeholder="you@company.com"
            error={errors.email}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            placeholder="••••••••"
            error={errors.password}
          />

          <Button
            title="Log In"
            onPress={handleLogin}
            loading={busy}
            style={{ marginTop: 6 }}
          />

          <TouchableOpacity style={styles.forgotRow} onPress={() => Alert.alert('Reset Password', 'Contact support@shiparoo.com to reset your password.')}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        {/* Register link */}
        <TouchableOpacity
          style={styles.registerRow}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.registerText}>
            Don't have an account?{' '}
            <Text style={styles.registerLink}>Sign up</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:        { flex: 1, backgroundColor: Colors.primary },
  container:   { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 48 },
  brand:       { alignItems: 'center', marginBottom: 32 },
  logo:        { fontSize: 56 },
  appName:     { fontSize: 34, fontWeight: '800', color: '#fff', letterSpacing: 0.5, marginTop: 4 },
  tagline:     { fontSize: 15, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  card:        { backgroundColor: '#fff', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  heading:     { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 20 },
  forgotRow:   { alignItems: 'center', marginTop: 16 },
  forgotText:  { color: Colors.muted, fontSize: 14 },
  registerRow: { alignItems: 'center', marginTop: 24 },
  registerText:{ color: 'rgba(255,255,255,0.85)', fontSize: 15 },
  registerLink:{ color: '#fff', fontWeight: '700' },
});
