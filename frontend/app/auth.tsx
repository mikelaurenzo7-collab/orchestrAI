import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Spacing, BorderRadius, FontSizes } from '../constants/theme';

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) { setError('All fields are required'); return; }
    if (!isLogin && !name.trim()) { setError('Name is required'); return; }
    setLoading(true);
    setError('');
    const err = isLogin
      ? await login(email.trim(), password)
      : await register(email.trim(), password, name.trim());
    if (err) setError(err);
    setLoading(false);
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.logoWrap}>
            <View style={s.logoRow}>
              <Text style={s.logoLight}>orchestr</Text>
              <Text style={s.logoBold}>AI</Text>
            </View>
            <Text style={s.tagline}>Conduct Your Commerce Symphony</Text>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>{isLogin ? 'Welcome Back, Maestro' : 'Join the Symphony'}</Text>
            <Text style={s.cardSub}>{isLogin ? 'Sign in to your command center' : 'Start your 30-day free trial'}</Text>

            {!isLogin && (
              <TextInput testID="auth-name-input" style={s.input} value={name} onChangeText={setName}
                placeholder="Your name" placeholderTextColor={Colors.textMuted} autoCapitalize="words" />
            )}
            <TextInput testID="auth-email-input" style={s.input} value={email} onChangeText={setEmail}
              placeholder="Email address" placeholderTextColor={Colors.textMuted}
              autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
            <TextInput testID="auth-password-input" style={s.input} value={password} onChangeText={setPassword}
              placeholder="Password" placeholderTextColor={Colors.textMuted} secureTextEntry />

            {!!error && <Text testID="auth-error" style={s.error}>{error}</Text>}

            <TouchableOpacity testID="auth-submit-btn" style={s.btn} onPress={handleSubmit} disabled={loading} activeOpacity={0.8}>
              {loading ? <ActivityIndicator color={Colors.bg} /> : (
                <Text style={s.btnText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity testID="auth-toggle-btn" onPress={() => { setIsLogin(!isLogin); setError(''); }} style={s.toggleWrap}>
              <Text style={s.toggleText}>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <Text style={s.toggleLink}>{isLogin ? 'Sign Up' : 'Sign In'}</Text>
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={s.footer}>30-day free trial  ·  No credit card required</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.xxl },
  logoWrap: { alignItems: 'center', marginBottom: 40 },
  logoRow: { flexDirection: 'row', alignItems: 'baseline' },
  logoLight: { fontSize: 38, fontWeight: '300', color: Colors.textPrimary, letterSpacing: 1 },
  logoBold: { fontSize: 38, fontWeight: '900', color: Colors.emerald, letterSpacing: -1 },
  tagline: { fontSize: FontSizes.md, color: Colors.textSecondary, marginTop: 12 },
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xxl, padding: Spacing.xxl,
    borderWidth: 1, borderColor: Colors.border,
  },
  cardTitle: { fontSize: FontSizes.xxl, fontWeight: '900', color: Colors.textPrimary, marginBottom: 4 },
  cardSub: { fontSize: FontSizes.md, color: Colors.textSecondary, marginBottom: Spacing.xxl },
  input: {
    backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg,
    paddingVertical: 16, color: Colors.textPrimary, fontSize: FontSizes.md,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md,
  },
  error: { color: Colors.rose, fontSize: FontSizes.sm, marginBottom: Spacing.md, fontWeight: '600' },
  btn: {
    backgroundColor: Colors.emerald, borderRadius: BorderRadius.lg, paddingVertical: 16,
    alignItems: 'center', marginTop: Spacing.sm,
  },
  btnText: { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.bg },
  toggleWrap: { alignItems: 'center', marginTop: Spacing.xl },
  toggleText: { fontSize: FontSizes.md, color: Colors.textSecondary },
  toggleLink: { color: Colors.emerald, fontWeight: '700' },
  footer: { textAlign: 'center', color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 32 },
});
