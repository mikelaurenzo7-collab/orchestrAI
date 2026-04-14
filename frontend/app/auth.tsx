import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, TextInput,
  Dimensions, Animated, Keyboard, Easing, Pressable, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { Colors, BorderRadius } from '../constants/theme';

const { width: W, height: H } = Dimensions.get('window');

const INTEGRATIONS = [
  { label: 'Shopify', emoji: '🛍️', color: '#96BF48' },
  { label: 'Etsy', emoji: '🧶', color: '#F1641E' },
  { label: 'Amazon', emoji: '📦', color: '#FF9900' },
  { label: 'eBay', emoji: '🏷️', color: '#E53238' },
  { label: 'Twitter', emoji: '🐦', color: '#1DA1F2' },
  { label: 'Pinterest', emoji: '📌', color: '#E60023' },
  { label: 'TikTok', emoji: '🎵', color: '#010101' },
  { label: 'Meta', emoji: '📘', color: '#0866FF' },
];

function OrbitalHero() {
  const pulse = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0.1)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.03, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.98, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 0.3, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0.06, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
  }, []);

  return (
    <View style={o.heroWrap}>
      <Animated.View style={[o.glowCircle, { opacity: glow }]} />
      <Animated.View style={[o.logoWrap, { transform: [{ scale: pulse }] }]}>
        <Image source={require('../assets/images/orchestrai-logo.png')} style={o.heroLogo} resizeMode="contain" />
      </Animated.View>
    </View>
  );
}
// Press-animated button
function PressBtn({ testID, onPress, children, style }: any) {
  const sc = useRef(new Animated.Value(1)).current;
  return (
    <Pressable testID={testID}
      onPressIn={() => Animated.spring(sc, { toValue: 0.96, useNativeDriver: true, speed: 50 }).start()}
      onPressOut={() => Animated.spring(sc, { toValue: 1, useNativeDriver: true, speed: 30 }).start()}
      onPress={onPress}>
      <Animated.View style={[style, { transform: [{ scale: sc }] }]}>{children}</Animated.View>
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

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;
  const btnFade = useRef(new Animated.Value(0)).current;
  const bottomFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeIn, { toValue: 1, duration: 800, delay: 300, useNativeDriver: true }),
        Animated.timing(slideUp, { toValue: 0, duration: 700, delay: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.timing(btnFade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(bottomFade, { toValue: 1, duration: 500, useNativeDriver: true }),
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

  const openAuth = (mode: boolean) => { setIsLogin(mode); setShowAuth(true); setError(''); setEmail(''); setPassword(''); setName(''); };

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Brand name top */}
          <Animated.View style={[s.topBrand, { opacity: fadeIn }]}>
            <Text style={s.brandLight}>orchestr</Text>
            <Text style={s.brandBold}>AI</Text>
          </Animated.View>

          {/* Orbital Hero */}
          <Animated.View style={[{ opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
            <OrbitalHero />
          </Animated.View>

          {/* Tagline */}
          <Animated.View style={[s.tagWrap, { opacity: fadeIn }]}>
            <Text style={s.tagMain}>Your AI Commerce</Text>
            <Text style={s.tagAccent}>Command Center</Text>
            <Text style={s.tagSub}>AI agents that build, manage, and grow{'\n'}your eCommerce empire.</Text>
          </Animated.View>

          {/* CTA Buttons */}
          <Animated.View style={{ opacity: btnFade }}>
            {/* Inline Auth Form */}
            {!isLogin && (
              <TextInput testID="auth-name-input" style={s.inlineInput} value={name} onChangeText={setName}
                placeholder="Your name" placeholderTextColor="#475569" autoCapitalize="words" />
            )}
            <TextInput testID="auth-email-input" style={s.inlineInput} value={email} onChangeText={setEmail}
              placeholder="Email" placeholderTextColor="#475569" autoCapitalize="none" keyboardType="email-address" />
            <TextInput testID="auth-password-input" style={s.inlineInput} value={password} onChangeText={setPassword}
              placeholder="Password" placeholderTextColor="#475569" secureTextEntry />
            {!!error && <Text testID="auth-error" style={s.inlineError}>{error}</Text>}

            <PressBtn testID="auth-submit-btn" style={s.ctaP} onPress={handleSubmit}>
              {loading ? <ActivityIndicator color="#050A18" /> : (
                <View>
                  <Text style={s.ctaPT}>{isLogin ? 'Sign In' : 'Start Free Trial'}</Text>
                  {!isLogin && <Text style={s.ctaPS}>30 days · No credit card</Text>}
                </View>
              )}
              <View style={s.ctaArr}><Text style={s.ctaArrT}>→</Text></View>
            </PressBtn>

            <TouchableOpacity testID="auth-toggle-btn" onPress={() => { setIsLogin(!isLogin); setError(''); }} style={s.toggleWrap}>
              <Text style={s.toggleText}>
                {isLogin ? "No account? " : "Already have an account? "}
                <Text style={s.toggleLink}>{isLogin ? 'Start Free Trial' : 'Sign In'}</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Integration labels */}
          <Animated.View style={[s.intLabels, { opacity: bottomFade }]}>
            <Text style={s.intTitle}>Connected to everything</Text>
            <View style={s.intRow}>
              {INTEGRATIONS.map((int, i) => (
                <View key={i} style={[s.intChip, { borderColor: int.color + '30' }]}>
                  <Text style={{ fontSize: 14 }}>{int.emoji}</Text>
                  <Text style={[s.intChipText, { color: int.color }]}>{int.label}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Stats */}
          <Animated.View style={[s.statsBar, { opacity: bottomFade }]}>
            {[
              { v: '8', l: 'AI Agents', c: Colors.emerald },
              { v: '24', l: 'Actions', c: '#FBBF24' },
              { v: '30', l: 'Day Trial', c: '#22D3EE' },
            ].map((st, i) => (
              <View key={i} style={s.stat}>
                <Text style={[s.statV, { color: st.c }]}>{st.v}</Text>
                <Text style={s.statL}>{st.l}</Text>
              </View>
            ))}
          </Animated.View>

          <Text style={s.footer}>Powered by GPT-5.2  ·  Privacy-first</Text>
          <View style={{ height: 50 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const o = StyleSheet.create({
  heroWrap: { alignItems: 'center', justifyContent: 'center', height: 200, marginBottom: 8 },
  glowCircle: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: Colors.emerald },
  logoWrap: { width: 160, height: 160 },
  heroLogo: { width: 160, height: 160 },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050A18' },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 16 },
  topBrand: { flexDirection: 'row', alignItems: 'baseline', alignSelf: 'center', marginBottom: 12 },
  brandLight: { fontSize: 22, fontWeight: '300', color: '#94A3B8', letterSpacing: -0.5 },
  brandBold: { fontSize: 22, fontWeight: '900', color: Colors.emerald, letterSpacing: -0.5 },
  tagWrap: { alignItems: 'center', marginBottom: 32 },
  tagMain: { fontSize: 30, fontWeight: '900', color: '#F1F5F9', textAlign: 'center', letterSpacing: -0.8 },
  tagAccent: { fontSize: 30, fontWeight: '900', color: Colors.emerald, textAlign: 'center', marginBottom: 14, letterSpacing: -0.8 },
  tagSub: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 23 },
  inlineInput: { backgroundColor: '#0A0F1E', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 17, color: '#F1F5F9', fontSize: 16, borderWidth: 1.5, borderColor: '#1E293B', marginBottom: 12 },
  inlineError: { color: '#FB7185', fontSize: 13, marginBottom: 10, fontWeight: '600', textAlign: 'center' },
  toggleWrap: { alignItems: 'center', marginTop: 18 },
  toggleText: { fontSize: 14, color: '#475569' },
  toggleLink: { color: Colors.emerald, fontWeight: '700' },
  ctaP: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.emerald, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 20 },
  ctaPT: { fontSize: 19, fontWeight: '900', color: '#050A18' },
  ctaPS: { fontSize: 13, color: '#050A18', opacity: 0.5, marginTop: 2 },
  ctaArr: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(5,10,24,0.12)', justifyContent: 'center', alignItems: 'center' },
  ctaArrT: { fontSize: 20, color: '#050A18', fontWeight: '700' },
  ctaS: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0A0F1E', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 16, borderWidth: 1.5, borderColor: '#1E293B' },
  ctaST: { fontSize: 16, fontWeight: '800', color: '#E2E8F0' },
  ctaSS: { fontSize: 18, color: '#64748B' },
  intLabels: { marginTop: 32 },
  intTitle: { fontSize: 11, fontWeight: '800', color: '#475569', letterSpacing: 1.5, textAlign: 'center', marginBottom: 16, textTransform: 'uppercase' },
  intRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  intChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#080D1C', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 24, borderWidth: 1 },
  intChipText: { fontSize: 11, fontWeight: '700' },
  statsBar: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 28, marginBottom: 20, backgroundColor: '#080D1C', borderRadius: 20, paddingVertical: 20, borderWidth: 1, borderColor: '#1E293B' },
  stat: { alignItems: 'center' },
  statV: { fontSize: 30, fontWeight: '900' },
  statL: { fontSize: 10, color: '#475569', fontWeight: '700', marginTop: 4, letterSpacing: 0.5, textTransform: 'uppercase' },
  footer: { textAlign: 'center', color: '#1E293B', fontSize: 11, marginTop: 8 },
});
