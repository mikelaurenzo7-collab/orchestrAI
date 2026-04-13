import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, TextInput,
  Dimensions, Animated, Modal, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Spacing, BorderRadius, FontSizes } from '../constants/theme';

const { width, height } = Dimensions.get('window');

// Matrix code rain background — scattered characters
function MatrixBg() {
  const chars = useMemo(() => {
    const symbols = 'orchestrAI{}()<>$#@&%+=*/|~^;:.,0123456789abcdef';
    return Array.from({ length: 120 }, () => ({
      char: symbols[Math.floor(Math.random() * symbols.length)],
      x: Math.random() * width,
      y: Math.random() * (height + 200),
      size: Math.random() * 11 + 9,
      opacity: Math.random() * 0.08 + 0.02,
      color: Math.random() > 0.85 ? Colors.emerald : Math.random() > 0.9 ? Colors.cyan : '#1E293B',
    }));
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {chars.map((c, i) => (
        <Text key={i} style={{ position: 'absolute', left: c.x, top: c.y, fontSize: c.size, color: c.color, opacity: c.opacity, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: '400' }}>
          {c.char}
        </Text>
      ))}
      {/* Central glow */}
      <View style={{ position: 'absolute', width: 500, height: 500, borderRadius: 250, backgroundColor: Colors.emerald, opacity: 0.03, top: height * 0.12, left: width / 2 - 250 }} />
    </View>
  );
}

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) { setError('All fields required'); return; }
    if (!isLogin && !name.trim()) { setError('Name required'); return; }
    setLoading(true); setError('');
    const err = isLogin ? await login(email.trim(), password) : await register(email.trim(), password, name.trim());
    if (err) setError(err);
    setLoading(false);
  };

  const openAuth = (loginMode: boolean) => {
    setIsLogin(loginMode); setShowAuth(true); setError(''); setEmail(''); setPassword(''); setName('');
  };

  return (
    <View style={s.root}>
      <MatrixBg />
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Hero — centered like Emergent */}
          <Animated.View style={[s.hero, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
            {/* Logo mark */}
            <View style={s.logoMark}>
              <Text style={s.logoMarkText}>oAI</Text>
            </View>

            <Text style={s.heroLine1}>Conduct Your Commerce</Text>
            <Text style={s.heroLine2}>Symphony with AI</Text>

            <Text style={s.heroSub}>4 autonomous agents that build, manage,{'\n'}and scale your eCommerce store.</Text>
          </Animated.View>

          {/* Bento Auth — two sexy cards */}
          <Animated.View style={[s.bentoWrap, { opacity: fadeIn }]}>
            <TouchableOpacity testID="landing-signup-btn" style={s.bentoPrimary} activeOpacity={0.8} onPress={() => openAuth(false)}>
              <View style={s.bentoPrimaryInner}>
                <Text style={s.bentoPrimaryTitle}>Start Free Trial</Text>
                <Text style={s.bentoPrimarySub}>30 days · No credit card</Text>
              </View>
              <View style={s.bentoPrimaryArrow}><Text style={s.bentoPrimaryArrowText}>→</Text></View>
            </TouchableOpacity>

            <TouchableOpacity testID="landing-signin-btn" style={s.bentoSecondary} activeOpacity={0.8} onPress={() => openAuth(true)}>
              <View style={s.bentoSecondaryInner}>
                <Text style={s.bentoSecondaryTitle}>Sign In</Text>
                <Text style={s.bentoSecondarySub}>Welcome back, Maestro</Text>
              </View>
              <Text style={s.bentoSecondaryArrow}>→</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Feature bento grid */}
          <View style={s.fGrid}>
            <View style={s.fRow}>
              <View style={[s.fCard, { flex: 1.5, borderColor: Colors.emerald + '15' }]}>
                <Text style={s.fIcon}>🤖</Text>
                <Text style={s.fTitle}>4 AI Agents</Text>
                <Text style={s.fDesc}>Store ops · Marketing · Analytics · Support — working 24/7 on your store</Text>
              </View>
              <View style={[s.fCard, { borderColor: Colors.amber + '15' }]}>
                <Text style={s.fIcon}>🏗️</Text>
                <Text style={s.fTitle}>Auto-Build</Text>
                <Text style={s.fDesc}>AI creates your entire store from scratch</Text>
              </View>
            </View>
            <View style={s.fRow}>
              <View style={[s.fCard, { borderColor: Colors.cyan + '15' }]}>
                <Text style={s.fIcon}>🌐</Text>
                <Text style={s.fTitle}>Browser Agent</Text>
                <Text style={s.fDesc}>Scrapes competitors & monitors prices</Text>
              </View>
              <View style={[s.fCard, { flex: 1.5, borderColor: Colors.rose + '15' }]}>
                <Text style={s.fIcon}>⚡</Text>
                <Text style={s.fTitle}>24 Actions</Text>
                <Text style={s.fDesc}>One-click execution — SEO, ads, email, pricing, reports, and more</Text>
              </View>
            </View>
          </View>

          {/* Integrations */}
          <View style={s.intRow}>
            {['🟢 Shopify', '🟠 Etsy', '🟣 Woo'].map((p, i) => (
              <View key={i} style={s.intChip}><Text style={s.intText}>{p}</Text></View>
            ))}
          </View>

          <Text style={s.footer}>Powered by GPT-5.2  ·  Privacy-first  ·  Built for profit</Text>
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Auth Modal — slides up like a sheet */}
      <Modal visible={showAuth} animationType="slide" transparent>
        <KeyboardAvoidingView style={s.mOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={s.mDismiss} activeOpacity={1} onPress={() => { Keyboard.dismiss(); setShowAuth(false); }} />
          <View style={s.mSheet}>
            <View style={s.mHandle} />
            <View style={s.mLogoRow}>
              <Text style={s.mLogoLight}>orchestr</Text>
              <Text style={s.mLogoBold}>AI</Text>
            </View>
            <Text style={s.mTitle}>{isLogin ? 'Welcome Back' : 'Start Your Free Trial'}</Text>

            {!isLogin && (
              <TextInput testID="auth-name-input" style={s.mInput} value={name} onChangeText={setName}
                placeholder="Your name" placeholderTextColor="#475569" autoCapitalize="words" />
            )}
            <TextInput testID="auth-email-input" style={s.mInput} value={email} onChangeText={setEmail}
              placeholder="Email" placeholderTextColor="#475569" autoCapitalize="none" keyboardType="email-address" />
            <TextInput testID="auth-password-input" style={s.mInput} value={password} onChangeText={setPassword}
              placeholder="Password" placeholderTextColor="#475569" secureTextEntry />
            {!!error && <Text testID="auth-error" style={s.mError}>{error}</Text>}
            <TouchableOpacity testID="auth-submit-btn" style={s.mBtn} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#020408" /> :
                <Text style={s.mBtnText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>}
            </TouchableOpacity>
            <TouchableOpacity testID="auth-toggle-btn" onPress={() => { setIsLogin(!isLogin); setError(''); }} style={s.mToggle}>
              <Text style={s.mToggleText}>{isLogin ? "No account? " : "Have an account? "}
                <Text style={s.mToggleLink}>{isLogin ? 'Sign Up' : 'Sign In'}</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020408' },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 40 },

  hero: { alignItems: 'center', marginBottom: 36 },
  logoMark: {
    width: 72, height: 72, borderRadius: 22, backgroundColor: '#0B101F',
    justifyContent: 'center', alignItems: 'center', marginBottom: 28,
    borderWidth: 1, borderColor: Colors.emerald + '25',
  },
  logoMarkText: { fontSize: 24, fontWeight: '900', color: Colors.emerald, letterSpacing: -1 },
  heroLine1: { fontSize: 32, fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: -0.5 },
  heroLine2: { fontSize: 32, fontWeight: '900', color: Colors.emerald, textAlign: 'center', letterSpacing: -0.5, marginBottom: 16 },
  heroSub: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 23 },

  bentoWrap: { gap: 12, marginBottom: 28 },
  bentoPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.emerald, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 22,
  },
  bentoPrimaryInner: {},
  bentoPrimaryTitle: { fontSize: 20, fontWeight: '900', color: '#020408' },
  bentoPrimarySub: { fontSize: 13, color: '#020408', opacity: 0.6, marginTop: 2 },
  bentoPrimaryArrow: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  bentoPrimaryArrowText: { fontSize: 22, color: '#020408', fontWeight: '700' },
  bentoSecondary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#0B101F', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 20,
    borderWidth: 1, borderColor: '#1E293B',
  },
  bentoSecondaryInner: {},
  bentoSecondaryTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  bentoSecondarySub: { fontSize: 13, color: '#64748B', marginTop: 2 },
  bentoSecondaryArrow: { fontSize: 20, color: '#64748B' },

  fGrid: { gap: 10, marginBottom: 24 },
  fRow: { flexDirection: 'row', gap: 10 },
  fCard: {
    flex: 1, backgroundColor: '#0B101F', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#1E293B',
  },
  fIcon: { fontSize: 22, marginBottom: 8 },
  fTitle: { fontSize: 13, fontWeight: '800', color: '#fff', marginBottom: 4 },
  fDesc: { fontSize: 11, color: '#64748B', lineHeight: 16 },

  intRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 20 },
  intChip: { backgroundColor: '#0B101F', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 30, borderWidth: 1, borderColor: '#1E293B' },
  intText: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },

  footer: { textAlign: 'center', color: '#334155', fontSize: 11 },

  mOverlay: { flex: 1, backgroundColor: 'rgba(2,4,8,0.85)', justifyContent: 'flex-end' },
  mDismiss: { flex: 1 },
  mSheet: {
    backgroundColor: '#0B101F', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, paddingBottom: Platform.OS === 'ios' ? 44 : 32,
    borderTopWidth: 1, borderColor: '#1E293B',
  },
  mHandle: { width: 40, height: 4, backgroundColor: '#334155', borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  mLogoRow: { flexDirection: 'row', alignItems: 'baseline', alignSelf: 'center', marginBottom: 20 },
  mLogoLight: { fontSize: 22, fontWeight: '200', color: '#fff' },
  mLogoBold: { fontSize: 22, fontWeight: '900', color: Colors.emerald },
  mTitle: { fontSize: 20, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 24 },
  mInput: {
    backgroundColor: '#141A29', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 16,
    color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#1E293B', marginBottom: 12,
  },
  mError: { color: Colors.rose, fontSize: 13, marginBottom: 12, fontWeight: '600', textAlign: 'center' },
  mBtn: { backgroundColor: Colors.emerald, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  mBtnText: { fontSize: 17, fontWeight: '800', color: '#020408' },
  mToggle: { alignItems: 'center', marginTop: 20 },
  mToggleText: { fontSize: 14, color: '#64748B' },
  mToggleLink: { color: Colors.emerald, fontWeight: '700' },
});
