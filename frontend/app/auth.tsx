import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, TextInput,
  Dimensions, Animated, Modal, Keyboard, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { Colors, BorderRadius } from '../constants/theme';

const { width, height } = Dimensions.get('window');

// Floating animated orbs + grid
function AnimatedBg() {
  const orb1Y = useRef(new Animated.Value(0)).current;
  const orb1X = useRef(new Animated.Value(0)).current;
  const orb2Y = useRef(new Animated.Value(0)).current;
  const orb2X = useRef(new Animated.Value(0)).current;
  const orb3Y = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const drift = (val: Animated.Value, range: number, dur: number) => {
      const loop = () => Animated.sequence([
        Animated.timing(val, { toValue: range, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(val, { toValue: -range, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]).start(loop);
      loop();
    };
    drift(orb1Y, 30, 6000);
    drift(orb1X, 20, 8000);
    drift(orb2Y, -25, 7000);
    drift(orb2X, -15, 5000);
    drift(orb3Y, 20, 9000);
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.7, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.3, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Grid lines */}
      {Array.from({ length: 8 }).map((_, i) => (
        <View key={`h${i}`} style={{ position: 'absolute', top: i * (height / 7), left: 0, right: 0, height: 1, backgroundColor: '#1E293B', opacity: 0.3 }} />
      ))}
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={`v${i}`} style={{ position: 'absolute', left: i * (width / 5), top: 0, bottom: 0, width: 1, backgroundColor: '#1E293B', opacity: 0.2 }} />
      ))}

      {/* Floating orbs */}
      <Animated.View style={[a.orb, a.orb1, { transform: [{ translateY: orb1Y }, { translateX: orb1X }], opacity: pulse }]} />
      <Animated.View style={[a.orb, a.orb2, { transform: [{ translateY: orb2Y }, { translateX: orb2X }] }]} />
      <Animated.View style={[a.orb, a.orb3, { transform: [{ translateY: orb3Y }] }]} />

      {/* Aurora band */}
      <Animated.View style={[a.aurora, { opacity: pulse }]} />
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

  // Staggered entrance animations
  const heroOp = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(50)).current;
  const btn1Op = useRef(new Animated.Value(0)).current;
  const btn1Slide = useRef(new Animated.Value(40)).current;
  const btn2Op = useRef(new Animated.Value(0)).current;
  const btn2Slide = useRef(new Animated.Value(40)).current;
  const gridOp = useRef(new Animated.Value(0)).current;
  const gridSlide = useRef(new Animated.Value(30)).current;
  const statsOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const stagger = (op: Animated.Value, slide: Animated.Value, delay: number) =>
      Animated.parallel([
        Animated.timing(op, { toValue: 1, duration: 700, delay, useNativeDriver: true }),
        Animated.timing(slide, { toValue: 0, duration: 600, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]);
    Animated.parallel([
      stagger(heroOp, heroSlide, 200),
      stagger(btn1Op, btn1Slide, 500),
      stagger(btn2Op, btn2Slide, 650),
      stagger(gridOp, gridSlide, 800),
      Animated.timing(statsOp, { toValue: 1, duration: 600, delay: 1000, useNativeDriver: true }),
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
      <AnimatedBg />
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Hero */}
          <Animated.View style={[s.hero, { opacity: heroOp, transform: [{ translateY: heroSlide }] }]}>
            <View style={s.logoBadge}>
              <Text style={s.logoBadgeText}>oAI</Text>
            </View>
            <Text style={s.h1White}>Conduct Your Commerce</Text>
            <Text style={s.h1Green}>Symphony with AI</Text>
            <Text style={s.heroP}>4 autonomous agents that build, manage,{'\n'}and scale your eCommerce store.</Text>
          </Animated.View>

          {/* CTA Bento */}
          <Animated.View style={{ opacity: btn1Op, transform: [{ translateY: btn1Slide }] }}>
            <TouchableOpacity testID="landing-signup-btn" style={s.ctaPrimary} activeOpacity={0.85} onPress={() => openAuth(false)}>
              <View>
                <Text style={s.ctaPrimaryTitle}>Start Free Trial</Text>
                <Text style={s.ctaPrimarySub}>30 days · No credit card required</Text>
              </View>
              <View style={s.ctaArrow}><Text style={s.ctaArrowText}>→</Text></View>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ opacity: btn2Op, transform: [{ translateY: btn2Slide }], marginTop: 12 }}>
            <TouchableOpacity testID="landing-signin-btn" style={s.ctaSecondary} activeOpacity={0.85} onPress={() => openAuth(true)}>
              <Text style={s.ctaSecTitle}>Sign In</Text>
              <Text style={s.ctaSecSub}>Welcome back, Maestro →</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Feature bento */}
          <Animated.View style={[s.fGrid, { opacity: gridOp, transform: [{ translateY: gridSlide }] }]}>
            <View style={s.fRow}>
              <View style={[s.fCard, s.fCardWide, { borderColor: '#34D39920' }]}>
                <View style={[s.fIconWrap, { backgroundColor: '#34D39915' }]}><Text style={s.fIcon}>🤖</Text></View>
                <Text style={s.fTitle}>4 AI Agents</Text>
                <Text style={s.fDesc}>Store ops · Marketing · Analytics · Support — working 24/7</Text>
              </View>
              <View style={[s.fCard, { borderColor: '#FBBF2420' }]}>
                <View style={[s.fIconWrap, { backgroundColor: '#FBBF2415' }]}><Text style={s.fIcon}>🏗️</Text></View>
                <Text style={s.fTitle}>Auto-Build</Text>
                <Text style={s.fDesc}>AI creates your store from scratch</Text>
              </View>
            </View>
            <View style={s.fRow}>
              <View style={[s.fCard, { borderColor: '#22D3EE20' }]}>
                <View style={[s.fIconWrap, { backgroundColor: '#22D3EE15' }]}><Text style={s.fIcon}>🌐</Text></View>
                <Text style={s.fTitle}>Browser Agent</Text>
                <Text style={s.fDesc}>Scrapes & monitors competitors</Text>
              </View>
              <View style={[s.fCard, s.fCardWide, { borderColor: '#FB718520' }]}>
                <View style={[s.fIconWrap, { backgroundColor: '#FB718515' }]}><Text style={s.fIcon}>⚡</Text></View>
                <Text style={s.fTitle}>24 Actions</Text>
                <Text style={s.fDesc}>SEO, ads, email, pricing — agents execute, not just advise</Text>
              </View>
            </View>
          </Animated.View>

          {/* Stats */}
          <Animated.View style={[s.statsBar, { opacity: statsOp }]}>
            {[
              { v: '4', l: 'AI Agents', c: Colors.emerald },
              { v: '24', l: 'Actions', c: Colors.amber },
              { v: '30', l: 'Day Trial', c: Colors.cyan },
              { v: '∞', l: 'Potential', c: Colors.rose },
            ].map((st, i) => (
              <View key={i} style={s.stat}>
                <Text style={[s.statV, { color: st.c }]}>{st.v}</Text>
                <Text style={s.statL}>{st.l}</Text>
              </View>
            ))}
          </Animated.View>

          {/* Platforms */}
          <Animated.View style={[s.platRow, { opacity: statsOp }]}>
            {['🟢 Shopify', '🟠 Etsy', '🟣 WooCommerce'].map((p, i) => (
              <View key={i} style={s.platChip}><Text style={s.platText}>{p}</Text></View>
            ))}
          </Animated.View>

          <Text style={s.footer}>Powered by GPT-5.2  ·  Privacy-first  ·  Built for profit</Text>
          <View style={{ height: 50 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Auth Sheet */}
      <Modal visible={showAuth} animationType="slide" transparent>
        <KeyboardAvoidingView style={s.mOv} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={s.mDis} activeOpacity={1} onPress={() => { Keyboard.dismiss(); setShowAuth(false); }} />
          <View style={s.mSh}>
            <View style={s.mHan} />
            <View style={s.mLogo}><Text style={s.mLogoL}>orchestr</Text><Text style={s.mLogoB}>AI</Text></View>
            <Text style={s.mTi}>{isLogin ? 'Welcome Back' : 'Start Your Free Trial'}</Text>
            {!isLogin && <TextInput testID="auth-name-input" style={s.mIn} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="#475569" autoCapitalize="words" />}
            <TextInput testID="auth-email-input" style={s.mIn} value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor="#475569" autoCapitalize="none" keyboardType="email-address" />
            <TextInput testID="auth-password-input" style={s.mIn} value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor="#475569" secureTextEntry />
            {!!error && <Text testID="auth-error" style={s.mErr}>{error}</Text>}
            <TouchableOpacity testID="auth-submit-btn" style={s.mBtn} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#020810" /> : <Text style={s.mBtnT}>{isLogin ? 'Sign In' : 'Create Account'}</Text>}
            </TouchableOpacity>
            <TouchableOpacity testID="auth-toggle-btn" onPress={() => { setIsLogin(!isLogin); setError(''); }} style={s.mTog}>
              <Text style={s.mTogT}>{isLogin ? "No account? " : "Have an account? "}<Text style={s.mTogL}>{isLogin ? 'Sign Up' : 'Sign In'}</Text></Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const a = StyleSheet.create({
  orb: { position: 'absolute', borderRadius: 999 },
  orb1: { width: 280, height: 280, backgroundColor: Colors.emerald, opacity: 0.15, top: 60, left: -60 },
  orb2: { width: 200, height: 200, backgroundColor: Colors.cyan, opacity: 0.12, top: height * 0.4, right: -40 },
  orb3: { width: 160, height: 160, backgroundColor: Colors.amber, opacity: 0.1, bottom: 200, left: width * 0.3 },
  aurora: {
    position: 'absolute', top: height * 0.08, left: -20, right: -20, height: 200,
    backgroundColor: Colors.emerald, opacity: 0.07, borderRadius: 100,
    transform: [{ scaleX: 1.5 }, { rotate: '-8deg' }],
  },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050A18' },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 32 },

  hero: { alignItems: 'center', marginBottom: 36 },
  logoBadge: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: '#0D1424',
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
    borderWidth: 1.5, borderColor: Colors.emerald + '35',
  },
  logoBadgeText: { fontSize: 22, fontWeight: '900', color: Colors.emerald },
  h1White: { fontSize: 30, fontWeight: '900', color: '#F1F5F9', textAlign: 'center', letterSpacing: -0.5 },
  h1Green: { fontSize: 30, fontWeight: '900', color: Colors.emerald, textAlign: 'center', letterSpacing: -0.5, marginBottom: 14 },
  heroP: { fontSize: 15, color: '#94A3B8', textAlign: 'center', lineHeight: 23 },

  ctaPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.emerald, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 22,
  },
  ctaPrimaryTitle: { fontSize: 20, fontWeight: '900', color: '#050A18' },
  ctaPrimarySub: { fontSize: 13, color: '#050A18', opacity: 0.55, marginTop: 3 },
  ctaArrow: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(5,10,24,0.15)', justifyContent: 'center', alignItems: 'center' },
  ctaArrowText: { fontSize: 22, color: '#050A18', fontWeight: '700' },
  ctaSecondary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#0D1424', borderRadius: 18, paddingHorizontal: 24, paddingVertical: 18,
    borderWidth: 1, borderColor: '#1E293B',
  },
  ctaSecTitle: { fontSize: 17, fontWeight: '800', color: '#E2E8F0' },
  ctaSecSub: { fontSize: 13, color: '#64748B' },

  fGrid: { marginTop: 28, gap: 10, marginBottom: 24 },
  fRow: { flexDirection: 'row', gap: 10 },
  fCard: {
    flex: 1, backgroundColor: '#0A0F1E', borderRadius: 18, padding: 16,
    borderWidth: 1,
  },
  fCardWide: { flex: 1.5 },
  fIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  fIcon: { fontSize: 20 },
  fTitle: { fontSize: 14, fontWeight: '800', color: '#E2E8F0', marginBottom: 4 },
  fDesc: { fontSize: 11, color: '#64748B', lineHeight: 16 },

  statsBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#0A0F1E', borderRadius: 18, paddingVertical: 20, paddingHorizontal: 16,
    borderWidth: 1, borderColor: '#1E293B', marginBottom: 24,
  },
  stat: { alignItems: 'center', flex: 1 },
  statV: { fontSize: 26, fontWeight: '900' },
  statL: { fontSize: 10, color: '#64748B', fontWeight: '700', marginTop: 4, letterSpacing: 0.5 },

  platRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 20 },
  platChip: { backgroundColor: '#0D1424', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 30, borderWidth: 1, borderColor: '#1E293B' },
  platText: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },

  footer: { textAlign: 'center', color: '#334155', fontSize: 11, marginTop: 4 },

  mOv: { flex: 1, backgroundColor: 'rgba(5,10,24,0.88)', justifyContent: 'flex-end' },
  mDis: { flex: 1 },
  mSh: { backgroundColor: '#0D1424', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: Platform.OS === 'ios' ? 44 : 32, borderTopWidth: 1, borderColor: '#1E293B' },
  mHan: { width: 40, height: 4, backgroundColor: '#334155', borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  mLogo: { flexDirection: 'row', alignItems: 'baseline', alignSelf: 'center', marginBottom: 16 },
  mLogoL: { fontSize: 22, fontWeight: '200', color: '#F1F5F9' },
  mLogoB: { fontSize: 22, fontWeight: '900', color: Colors.emerald },
  mTi: { fontSize: 20, fontWeight: '900', color: '#F1F5F9', textAlign: 'center', marginBottom: 24 },
  mIn: { backgroundColor: '#141C2E', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 16, color: '#F1F5F9', fontSize: 16, borderWidth: 1, borderColor: '#1E293B', marginBottom: 12 },
  mErr: { color: Colors.rose, fontSize: 13, marginBottom: 12, fontWeight: '600', textAlign: 'center' },
  mBtn: { backgroundColor: Colors.emerald, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  mBtnT: { fontSize: 17, fontWeight: '800', color: '#050A18' },
  mTog: { alignItems: 'center', marginTop: 20 },
  mTogT: { fontSize: 14, color: '#64748B' },
  mTogL: { color: Colors.emerald, fontWeight: '700' },
});
