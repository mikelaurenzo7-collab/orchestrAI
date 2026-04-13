import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, TextInput,
  Dimensions, Animated, Modal, Keyboard, Easing, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { Colors, BorderRadius } from '../constants/theme';

const { width, height } = Dimensions.get('window');
const W = width;

// ─── Animated Background with visible orbs, grid, aurora, sparkles ───
function AnimatedBg() {
  const orb1Y = useRef(new Animated.Value(0)).current;
  const orb1X = useRef(new Animated.Value(0)).current;
  const orb2Y = useRef(new Animated.Value(0)).current;
  const orb2X = useRef(new Animated.Value(0)).current;
  const orb3Y = useRef(new Animated.Value(0)).current;
  const orb3X = useRef(new Animated.Value(0)).current;
  const pulse1 = useRef(new Animated.Value(0.28)).current;
  const pulse2 = useRef(new Animated.Value(0.22)).current;
  // Sparkle particles
  const sparkles = useRef(Array.from({ length: 18 }, () => ({
    x: Math.random() * W,
    y: Math.random() * height * 1.2,
    size: Math.random() * 3 + 1.5,
    opacity: new Animated.Value(Math.random() * 0.5 + 0.2),
    isGreen: Math.random() > 0.5,
  }))).current;

  useEffect(() => {
    const drift = (v: Animated.Value, range: number, dur: number) => {
      const loop = () => Animated.sequence([
        Animated.timing(v, { toValue: range, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: -range, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]).start(loop);
      loop();
    };
    drift(orb1Y, 35, 5000); drift(orb1X, 25, 7000);
    drift(orb2Y, -30, 6500); drift(orb2X, -20, 5500);
    drift(orb3Y, 25, 8000); drift(orb3X, 15, 6000);

    const breathe = (v: Animated.Value, lo: number, hi: number, dur: number) =>
      Animated.loop(Animated.sequence([
        Animated.timing(v, { toValue: hi, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: lo, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])).start();
    breathe(pulse1, 0.2, 0.4, 3500);
    breathe(pulse2, 0.15, 0.35, 4500);

    // Sparkle twinkle
    sparkles.forEach(sp => {
      const twinkle = () => Animated.sequence([
        Animated.timing(sp.opacity, { toValue: Math.random() * 0.8 + 0.2, duration: 1500 + Math.random() * 2000, useNativeDriver: true }),
        Animated.timing(sp.opacity, { toValue: Math.random() * 0.15, duration: 1500 + Math.random() * 2000, useNativeDriver: true }),
      ]).start(twinkle);
      twinkle();
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Grid — visible */}
      {Array.from({ length: 9 }).map((_, i) => (
        <View key={`h${i}`} style={{ position: 'absolute', top: i * (height / 8), left: 0, right: 0, height: 1, backgroundColor: '#34D399', opacity: 0.07 }} />
      ))}
      {Array.from({ length: 7 }).map((_, i) => (
        <View key={`v${i}`} style={{ position: 'absolute', left: i * (W / 6), top: 0, bottom: 0, width: 1, backgroundColor: '#34D399', opacity: 0.05 }} />
      ))}

      {/* Aurora sweep */}
      <Animated.View style={{
        position: 'absolute', top: 40, left: -40, right: -40, height: 280,
        backgroundColor: Colors.emerald, opacity: pulse1, borderRadius: 140,
        transform: [{ scaleX: 1.8 }, { scaleY: 0.4 }, { rotate: '-6deg' }],
      }} />
      <Animated.View style={{
        position: 'absolute', top: height * 0.55, left: -30, right: -30, height: 200,
        backgroundColor: Colors.cyan, opacity: pulse2, borderRadius: 100,
        transform: [{ scaleX: 1.5 }, { scaleY: 0.3 }, { rotate: '4deg' }],
      }} />

      {/* Orbs with glow */}
      <Animated.View style={[bgs.orb, {
        width: 320, height: 320, backgroundColor: Colors.emerald, opacity: 0.3,
        top: 20, left: -80, borderRadius: 160,
        transform: [{ translateY: orb1Y }, { translateX: orb1X }],
        shadowColor: Colors.emerald, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 60, elevation: 0,
      }]} />
      <Animated.View style={[bgs.orb, {
        width: 240, height: 240, backgroundColor: Colors.cyan, opacity: 0.25,
        top: height * 0.38, right: -50, borderRadius: 120,
        transform: [{ translateY: orb2Y }, { translateX: orb2X }],
        shadowColor: Colors.cyan, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 50, elevation: 0,
      }]} />
      <Animated.View style={[bgs.orb, {
        width: 200, height: 200, backgroundColor: Colors.amber, opacity: 0.2,
        bottom: 180, left: W * 0.25, borderRadius: 100,
        transform: [{ translateY: orb3Y }, { translateX: orb3X }],
        shadowColor: Colors.amber, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 40, elevation: 0,
      }]} />

      {/* Sparkle particles */}
      {sparkles.map((sp, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', left: sp.x, top: sp.y,
          width: sp.size, height: sp.size, borderRadius: sp.size,
          backgroundColor: sp.isGreen ? Colors.emerald : '#fff',
          opacity: sp.opacity,
        }} />
      ))}
    </View>
  );
}

// ─── Pressable button with scale micro-animation ───
function BentoButton({ testID, onPress, children, style }: any) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable testID={testID}
      onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start()}
      onPress={onPress}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
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

  // Staggered entrance
  const anims = useRef(Array.from({ length: 6 }, () => ({ op: new Animated.Value(0), sl: new Animated.Value(45) }))).current;
  useEffect(() => {
    anims.forEach((a, i) => {
      Animated.parallel([
        Animated.timing(a.op, { toValue: 1, duration: 700, delay: 150 + i * 180, useNativeDriver: true }),
        Animated.timing(a.sl, { toValue: 0, duration: 600, delay: 150 + i * 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    });
  }, []);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) { setError('All fields required'); return; }
    if (!isLogin && !name.trim()) { setError('Name required'); return; }
    setLoading(true); setError('');
    const err = isLogin ? await login(email.trim(), password) : await register(email.trim(), password, name.trim());
    if (err) setError(err);
    setLoading(false);
  };

  const openAuth = (mode: boolean) => { setIsLogin(mode); setShowAuth(true); setError(''); setEmail(''); setPassword(''); setName(''); };
  const A = (i: number) => ({ opacity: anims[i].op, transform: [{ translateY: anims[i].sl }] });

  return (
    <View style={s.root}>
      <AnimatedBg />
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Hero */}
          <Animated.View style={[s.hero, A(0)]}>
            <View style={s.logoBadge}>
              <Text style={s.logoBadgeText}>oAI</Text>
            </View>
            <Text style={s.h1}>Conduct Your Commerce</Text>
            <Text style={s.h1g}>Symphony with AI</Text>
            <Text style={s.heroP}>4 autonomous agents that build, manage,{'\n'}and scale your eCommerce store.</Text>
          </Animated.View>

          {/* CTA buttons with press animation */}
          <Animated.View style={A(1)}>
            <BentoButton testID="landing-signup-btn" style={s.ctaP} onPress={() => openAuth(false)}>
              <View>
                <Text style={s.ctaPT}>Start Free Trial</Text>
                <Text style={s.ctaPS}>30 days · No credit card required</Text>
              </View>
              <View style={s.ctaArr}><Text style={s.ctaArrT}>→</Text></View>
            </BentoButton>
          </Animated.View>

          <Animated.View style={[{ marginTop: 12 }, A(2)]}>
            <BentoButton testID="landing-signin-btn" style={s.ctaS} onPress={() => openAuth(true)}>
              <Text style={s.ctaST}>Sign In</Text>
              <Text style={s.ctaSS}>Welcome back, Maestro →</Text>
            </BentoButton>
          </Animated.View>

          {/* Feature bento with press animations */}
          <Animated.View style={[s.fGrid, A(3)]}>
            <View style={s.fRow}>
              <BentoButton style={[s.fCard, s.fW, { borderColor: '#34D39925' }]} onPress={() => {}}>
                <View style={[s.fIW, { backgroundColor: '#34D39920' }]}><Text style={s.fI}>🤖</Text></View>
                <Text style={s.fT}>4 AI Agents</Text>
                <Text style={s.fD}>Store ops · Marketing · Analytics · Support — 24/7</Text>
              </BentoButton>
              <BentoButton style={[s.fCard, { borderColor: '#FBBF2425' }]} onPress={() => {}}>
                <View style={[s.fIW, { backgroundColor: '#FBBF2420' }]}><Text style={s.fI}>🏗️</Text></View>
                <Text style={s.fT}>Auto-Build</Text>
                <Text style={s.fD}>AI creates your store from scratch</Text>
              </BentoButton>
            </View>
            <View style={s.fRow}>
              <BentoButton style={[s.fCard, { borderColor: '#22D3EE25' }]} onPress={() => {}}>
                <View style={[s.fIW, { backgroundColor: '#22D3EE20' }]}><Text style={s.fI}>🌐</Text></View>
                <Text style={s.fT}>Browser Agent</Text>
                <Text style={s.fD}>Scrapes & monitors competitors</Text>
              </BentoButton>
              <BentoButton style={[s.fCard, s.fW, { borderColor: '#FB718525' }]} onPress={() => {}}>
                <View style={[s.fIW, { backgroundColor: '#FB718520' }]}><Text style={s.fI}>⚡</Text></View>
                <Text style={s.fT}>24 Actions</Text>
                <Text style={s.fD}>SEO, ads, email, pricing — agents execute</Text>
              </BentoButton>
            </View>
          </Animated.View>

          {/* Stats */}
          <Animated.View style={[s.statsBar, A(4)]}>
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

          <Animated.View style={[s.platRow, A(5)]}>
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
            <View style={s.mLR}><Text style={s.mLL}>orchestr</Text><Text style={s.mLB}>AI</Text></View>
            <Text style={s.mTi}>{isLogin ? 'Welcome Back' : 'Start Your Free Trial'}</Text>
            {!isLogin && <TextInput testID="auth-name-input" style={s.mIn} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="#475569" autoCapitalize="words" />}
            <TextInput testID="auth-email-input" style={s.mIn} value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor="#475569" autoCapitalize="none" keyboardType="email-address" />
            <TextInput testID="auth-password-input" style={s.mIn} value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor="#475569" secureTextEntry />
            {!!error && <Text testID="auth-error" style={s.mEr}>{error}</Text>}
            <TouchableOpacity testID="auth-submit-btn" style={s.mBt} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#050A18" /> : <Text style={s.mBtT}>{isLogin ? 'Sign In' : 'Create Account'}</Text>}
            </TouchableOpacity>
            <TouchableOpacity testID="auth-toggle-btn" onPress={() => { setIsLogin(!isLogin); setError(''); }} style={s.mTo}>
              <Text style={s.mToT}>{isLogin ? "No account? " : "Have an account? "}<Text style={s.mToL}>{isLogin ? 'Sign Up' : 'Sign In'}</Text></Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const bgs = StyleSheet.create({ orb: { position: 'absolute' } });

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050A18' },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 32 },
  hero: { alignItems: 'center', marginBottom: 36 },
  logoBadge: { width: 68, height: 68, borderRadius: 22, backgroundColor: '#0D142490', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 1.5, borderColor: Colors.emerald + '45' },
  logoBadgeText: { fontSize: 24, fontWeight: '900', color: Colors.emerald },
  h1: { fontSize: 30, fontWeight: '900', color: '#F1F5F9', textAlign: 'center', letterSpacing: -0.5 },
  h1g: { fontSize: 30, fontWeight: '900', color: Colors.emerald, textAlign: 'center', letterSpacing: -0.5, marginBottom: 14 },
  heroP: { fontSize: 15, color: '#94A3B8', textAlign: 'center', lineHeight: 23 },
  ctaP: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.emerald, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 22 },
  ctaPT: { fontSize: 20, fontWeight: '900', color: '#050A18' },
  ctaPS: { fontSize: 13, color: '#050A18', opacity: 0.55, marginTop: 3 },
  ctaArr: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(5,10,24,0.15)', justifyContent: 'center', alignItems: 'center' },
  ctaArrT: { fontSize: 22, color: '#050A18', fontWeight: '700' },
  ctaS: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0D1424', borderRadius: 18, paddingHorizontal: 24, paddingVertical: 18, borderWidth: 1, borderColor: '#1E293B' },
  ctaST: { fontSize: 17, fontWeight: '800', color: '#E2E8F0' },
  ctaSS: { fontSize: 13, color: '#64748B' },
  fGrid: { marginTop: 28, gap: 10, marginBottom: 24 },
  fRow: { flexDirection: 'row', gap: 10 },
  fCard: { flex: 1, backgroundColor: '#0A0F1E', borderRadius: 18, padding: 16, borderWidth: 1 },
  fW: { flex: 1.5 },
  fIW: { width: 42, height: 42, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  fI: { fontSize: 20 },
  fT: { fontSize: 14, fontWeight: '800', color: '#E2E8F0', marginBottom: 4 },
  fD: { fontSize: 11, color: '#64748B', lineHeight: 16 },
  statsBar: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#0A0F1E', borderRadius: 18, paddingVertical: 20, paddingHorizontal: 16, borderWidth: 1, borderColor: '#1E293B', marginBottom: 24 },
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
  mLR: { flexDirection: 'row', alignItems: 'baseline', alignSelf: 'center', marginBottom: 16 },
  mLL: { fontSize: 22, fontWeight: '200', color: '#F1F5F9' },
  mLB: { fontSize: 22, fontWeight: '900', color: Colors.emerald },
  mTi: { fontSize: 20, fontWeight: '900', color: '#F1F5F9', textAlign: 'center', marginBottom: 24 },
  mIn: { backgroundColor: '#141C2E', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 16, color: '#F1F5F9', fontSize: 16, borderWidth: 1, borderColor: '#1E293B', marginBottom: 12 },
  mEr: { color: Colors.rose, fontSize: 13, marginBottom: 12, fontWeight: '600', textAlign: 'center' },
  mBt: { backgroundColor: Colors.emerald, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  mBtT: { fontSize: 17, fontWeight: '800', color: '#050A18' },
  mTo: { alignItems: 'center', marginTop: 20 },
  mToT: { fontSize: 14, color: '#64748B' },
  mToL: { color: Colors.emerald, fontWeight: '700' },
});
