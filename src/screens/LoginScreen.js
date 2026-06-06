import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { colors } from '../constants/theme';
import { login, logout } from '../services/auth';
import { checkAdminAccess } from '../services/firestore';
import { showAlert } from '../utils/alert';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleLogin = async (mode) => {
    if (!email || !password) {
      showAlert('Missing details', 'Please enter email and password to continue.');
      return;
    }

    setLoading(true);
    try {
      const user = await login(email.trim(), password.trim());
      if (mode === 'admin') {
        const isAdmin = await checkAdminAccess(user.email);
        if (!isAdmin) {
          await logout();
          showAlert('Access denied', 'This account is not registered as an admin.');
          return;
        }
        navigation.reset({ index: 0, routes: [{ name: 'AdminDashboard' }] });
        return;
      }
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (error) {
      showAlert('Login failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.page}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      <View style={styles.card}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Choose how you want to login.</Text>

        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          onFocus={() => setFocusedField('email')}
          onBlur={() => setFocusedField(null)}
          style={[styles.input, focusedField === 'email' && styles.inputFocused]}
        />
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          onFocus={() => setFocusedField('password')}
          onBlur={() => setFocusedField(null)}
          style={[styles.input, focusedField === 'password' && styles.inputFocused]}
        />

        <View style={styles.loginButtons}>
          <Pressable style={[styles.secondaryButton, loading && styles.disabledButton]} onPress={() => handleLogin('user')} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.secondaryButtonText}>User Login</Text>}
          </Pressable>
          <Pressable style={[styles.primaryButton, styles.primaryButtonSpacing, loading && styles.disabledButton]} onPress={() => handleLogin('admin')} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Admin Login</Text>}
          </Pressable>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>New to ParkSmart?</Text>
          <Pressable onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLink}>Create account</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.panel,
    borderRadius: 28,
    padding: 28,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  title: {
    fontSize: 28,
    color: colors.text,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.secondaryText,
    lineHeight: 22,
    marginBottom: 28,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    backgroundColor: colors.overlay,
    color: colors.text,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: '#fff',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  loginButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonSpacing: {
    marginLeft: 12,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.overlay,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.65,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: colors.secondaryText,
    marginRight: 6,
  },
  footerLink: {
    color: colors.primary,
    fontWeight: '700',
  },
});
