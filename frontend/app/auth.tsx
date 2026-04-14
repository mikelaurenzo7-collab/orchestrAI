import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, TextInput,
  Dimensions, Animated, Keyboard, Easing, Pressable, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { Colors } from '../constants/theme';

const { width: W } = Dimensions.get('window');

const PLATFORMS = [
  { label: 'Shopify', emoji: '🛍️', c: '#96BF48' },
  { label: 'Etsy', emoji: '🧶', c: '#F1641E' },
  { label: 'eBay', emoji: '🏷️', c: '#E53238' },
  { label: 'Twitter', emoji: '🐦', c: '#1DA1F2' },
  { label: 'Pinterest', emoji: '📌', c: '#E60023' },
  { label: 'TikTok', emoji: '🎵', c: '#FE2C55' },
  { label: 'Meta', emoji: '📘', c: '#0866FF' },
  { label: 'Amazon', emoji: '📦', c: '#FF9900' },
];

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Staggered entrance animations
  const logoA = useRef(new Animated.Value(0)).current;
  const heroA = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(30)).current;
  const formA = useRef(new Animated.Value(0)).current;
  const bottomA = useRef(new Animated.Value(0)).current;
  const logoPulse = useRef(new Animated.Value(1)).current;
  const logoGlow = useRef(new Animated.Value(0.05)).current;

  useEffect(() => {
    Animated.stagger(200, [
      Animated.timing(logoA, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(heroA, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(heroSlide, { toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.timing(formA, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(bottomA, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    // Subtle logo breathing
    Animated.loop(Animated.sequence([
      Animated.timing(logoPulse, { toValue: 1.02, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(logoPulse, { toValue: 0.98, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(logoGlow, { toValue: 0.2, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(logoGlow, { toValue: 0.04, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
  }, []);

  const submit = async () => {
    if (!email.trim() || !password.trim()) { setError('All fields required'); return; }
    if (!isLogin && !name.trim()) { setError('Name required'); return; }
    setLoading(true); setError('');
    const err = isLogin ? await login(email.trim(), password) : await register(email.trim(), password, name.trim());
    if (err) setError(err);
    setLoading(false);
  };

  return (
    <View style={s.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Logo + Brand — top left, minimal */}
            <Animated.View style={[s.brandRow, { opacity: logoA }]}>
              <Image source={require('../assets/images/orchestrai-logo-icon.png')} style={s.brandIcon} resizeMode="contain" />
              <Text style={s.brandName}>orchestr<Text style={s.brandAccent}>AI</Text></Text>
            </Animated.View>

            {/* Hero — oversized, asymmetric */}
            <Animated.View style={[s.heroBlock, { opacity: heroA, transform: [{ translateY: heroSlide }] }]}>
              {/* Pulsing logo */}
              <View style={s.logoCenter}>
                <Animated.View style={[s.logoGlow, { opacity: logoGlow }]} />
                <Animated.View style={{ transform: [{ scale: logoPulse }] }}>
                  <Image source={require('../assets/images/orchestrai-logo.png')} style={s.heroLogo} resizeMode="contain" />
                </Animated.View>
              </View>

              <Text style={s.heroText}>
                AI Commerce{'\n'}
                <Text style={s.heroGreen}>Automated.</Text>
              </Text>
              <Text style={s.heroSub}>8 executive assistants that run your entire business.</Text>
            </Animated.View>

            {/* Auth Glass Card */}
            <Animated.View style={[s.glassCard, { opacity: formA }]}>
              {!isLogin && (
                <TextInput testID="auth-name-input" style={s.glassInput} value={name} onChangeText={setName}
                  placeholder="Full name" placeholderTextColor="#475569" autoCapitalize="words" />
              )}
              <TextInput testID="auth-email-input" style={s.glassInput} value={email} onChangeText={setEmail}
                placeholder="Email" placeholderTextColor="#475569" autoCapitalize="none" keyboardType="email-address" />
              <TextInput testID="auth-password-input" style={s.glassInput} value={password} onChangeText={setPassword}
                placeholder="Password" placeholderTextColor="#475569" secureTextEntry />
              {!!error && <Text testID="auth-error" style={s.error}>{error}</Text>}

              <Pressable testID="auth-submit-btn" onPress={submit} style={({ pressed }) => [s.cta, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}>
                {loading ? <ActivityIndicator color="#030712" /> : (
                  <>
                    <Text style={s.ctaText}>{isLogin ? 'Sign In' : 'Start Free Trial'}</Text>
                    <Text style={s.ctaArrow}>→</Text>
                  </>
                )}
              </Pressable>

              {!isLogin && <Text style={s.ctaNote}>30 days free · No credit card</Text>}

              <TouchableOpacity testID="auth-toggle-btn" onPress={() => { setIsLogin(!isLogin); setError(''); }} style={s.toggle}>
                <Text style={s.toggleText}>
                  {isLogin ? "New here? " : "Have an account? "}
                  <Text style={s.toggleLink}>{isLogin ? 'Create account' : 'Sign in'}</Text>
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Platform pills — horizontal scroll */}
            <Animated.View style={[s.platformSection, { opacity: bottomA }]}>
              <Text style={s.platformLabel}>WORKS WITH</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.platformScroll}>
                {PLATFORMS.map((p, i) => (
                  <View key={i} style={[s.platformPill, { borderColor: p.c + '25' }]}>
                    <Text style={{ fontSize: 16 }}>{p.emoji}</Text>
                    <Text style={[s.platformName, { color: p.c }]}>{p.label}</Text>
                  </View>
                ))}
              </ScrollView>
            </Animated.View>

            {/* Minimal footer */}
            <Animated.View style={{ opacity: bottomA }}>
              <Text style={s.footer}>Powered by GPT-5.2 · Privacy-first · SOC 2</Text>
            </Animated.View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#030712' },
  scroll: { paddingHorizontal: 28, paddingTop: 8, paddingBottom: 20 },

  // Brand row — top, minimal
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  brandIcon: { width: 28, height: 28 },
  brandName: { fontSize: 18, fontWeight: '300', color: '#64748B', letterSpacing: 0.5 },
  brandAccent: { fontWeight: '800', color: Colors.emerald },

  // Hero block
  heroBlock: { marginBottom: 32 },
  logoCenter: { alignItems: 'center', marginBottom: 24 },
  logoGlow: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: Colors.emerald },
  heroLogo: { width: 120, height: 120 },
  heroText: { fontSize: 42, fontWeight: '900', color: '#F1F5F9', letterSpacing: -1.5, lineHeight: 48 },
  heroGreen: { color: Colors.emerald },
  heroSub: { fontSize: 17, color: '#64748B', marginTop: 12, lineHeight: 25, fontWeight: '400' },

  // Glass card
  glassCard: {
    backgroundColor: 'rgba(11, 16, 31, 0.65)', borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.08)', marginBottom: 32,
  },
  glassInput: {
    backgroundColor: 'rgba(3, 7, 18, 0.6)', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16,
    color: '#F1F5F9', fontSize: 16, borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.06)',
    marginBottom: 12, fontWeight: '400',
  },
  error: { color: '#FB7185', fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 10 },

  // CTA button
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.emerald, borderRadius: 18, paddingVertical: 18, gap: 10, marginTop: 4,
    boxShadow: '0px 8px 24px rgba(52, 211, 153, 0.25)',
  },
  ctaText: { fontSize: 17, fontWeight: '800', color: '#030712' },
  ctaArrow: { fontSize: 18, fontWeight: '700', color: '#030712' },
  ctaNote: { fontSize: 12, color: '#475569', textAlign: 'center', marginTop: 10, fontWeight: '500' },

  // Toggle
  toggle: { alignItems: 'center', marginTop: 16 },
  toggleText: { fontSize: 14, color: '#475569' },
  toggleLink: { color: Colors.emerald, fontWeight: '700' },

  // Platform pills
  platformSection: { marginBottom: 24 },
  platformLabel: { fontSize: 10, fontWeight: '700', color: '#334155', letterSpacing: 2, marginBottom: 12 },
  platformScroll: { gap: 8 },
  platformPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(11, 16, 31, 0.5)', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1,
  },
  platformName: { fontSize: 12, fontWeight: '600' },

  // Footer
  footer: { fontSize: 11, color: '#1E293B', textAlign: 'center' },
});
