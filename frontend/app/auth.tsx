import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, TextInput,
  Dimensions, Animated, Keyboard, Easing, Image, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { Colors, BorderRadius } from '../constants/theme';

const { width: W, height: H } = Dimensions.get('window');
const CENTER = W / 2;
const ROBOT_SIZE = 160;
const ORBIT_R = 120;

// Integration logos that orbit the robot
const INTEGRATIONS = [
  { label: 'Shopify', emoji: '🟢', color: '#96BF48' },
  { label: 'Etsy', emoji: '🟠', color: '#F1641E' },
  { label: 'Woo', emoji: '🟣', color: '#7B51AD' },
  { label: 'Insta', emoji: '📸', color: '#E1306C' },
  { label: 'X', emoji: '🐦', color: '#1DA1F2' },
  { label: 'TikTok', emoji: '🎵', color: '#FE2C55' },
  { label: 'GPT', emoji: '🧠', color: '#10A37F' },
  { label: 'Meta', emoji: '📘', color: '#1877F2' },
];

function OrbitalHero() {
  const robotPulse = useRef(new Animated.Value(1)).current;
  const robotGlow = useRef(new Animated.Value(0.3)).current;
  const orbitAngle = useRef(new Animated.Value(0)).current;
  // Individual integration pulses
  const intPulses = useRef(INTEGRATIONS.map(() => new Animated.Value(0.6))).current;

  useEffect(() => {
    // Robot breathe
    Animated.loop(Animated.sequence([
      Animated.timing(robotPulse, { toValue: 1.06, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(robotPulse, { toValue: 0.96, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
    // Robot glow breathe
    Animated.loop(Animated.sequence([
      Animated.timing(robotGlow, { toValue: 0.6, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(robotGlow, { toValue: 0.2, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
    // Orbit rotation
    Animated.loop(
      Animated.timing(orbitAngle, { toValue: 1, duration: 30000, easing: Easing.linear, useNativeDriver: false })
    ).start();
    // Integration pulses
    intPulses.forEach((p, i) => {
      const delay = i * 400;
      setTimeout(() => {
        Animated.loop(Animated.sequence([
          Animated.timing(p, { toValue: 1, duration: 1200 + i * 200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(p, { toValue: 0.5, duration: 1200 + i * 200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])).start();
      }, delay);
    });
  }, []);

  // Calculate orbital positions
  const rotation = orbitAngle.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={o.container}>
      {/* Glow ring behind robot */}
      <Animated.View style={[o.glowRing, { opacity: robotGlow }]} />
      <Animated.View style={[o.glowRing2, { opacity: robotGlow }]} />

      {/* Orbit ring visual */}
      <View style={o.orbitRing} />

      {/* Orbiting integrations */}
      <Animated.View style={[o.orbitGroup, { transform: [{ rotate: rotation }] }]}>
        {INTEGRATIONS.map((int, i) => {
          const angle = (i / INTEGRATIONS.length) * Math.PI * 2;
          const x = Math.cos(angle) * ORBIT_R;
          const y = Math.sin(angle) * ORBIT_R;
          return (
            <Animated.View key={i} style={[o.intBubble, {
              left: CENTER - 22 + x, top: ROBOT_SIZE / 2 + 20 - 22 + y,
              opacity: intPulses[i],
              borderColor: int.color + '50',
              shadowColor: int.color, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 0 },
            }]}>
              <Text style={o.intEmoji}>{int.emoji}</Text>
            </Animated.View>
          );
        })}
      </Animated.View>

      {/* Central Robot */}
      <Animated.View style={[o.robotWrap, { transform: [{ scale: robotPulse }] }]}>
        <Image source={require('../assets/images/robot.png')} style={o.robotImg} resizeMode="contain" />
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
            <Text style={s.tagSub}>Agents that build, manage, and grow{'\n'}your store — autonomously.</Text>
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
              { v: '4', l: 'AI Agents', c: Colors.emerald },
              { v: '24', l: 'Actions', c: Colors.amber },
              { v: '30', l: 'Day Trial', c: Colors.cyan },
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
  container: { height: ROBOT_SIZE + ORBIT_R * 2 + 60, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  glowRing: {
    position: 'absolute', width: ROBOT_SIZE + 80, height: ROBOT_SIZE + 80, borderRadius: (ROBOT_SIZE + 80) / 2,
    backgroundColor: Colors.emerald, top: ORBIT_R - 20, alignSelf: 'center',
  },
  glowRing2: {
    position: 'absolute', width: ROBOT_SIZE + 140, height: ROBOT_SIZE + 140, borderRadius: (ROBOT_SIZE + 140) / 2,
    backgroundColor: Colors.emerald, opacity: 0.08, top: ORBIT_R - 50, alignSelf: 'center',
  },
  orbitRing: {
    position: 'absolute', width: ORBIT_R * 2 + 44, height: ORBIT_R * 2 + 44, borderRadius: ORBIT_R + 22,
    borderWidth: 1, borderColor: Colors.emerald + '20', borderStyle: 'dashed',
    top: ROBOT_SIZE / 2 + 20 - ORBIT_R - 22, alignSelf: 'center',
  },
  orbitGroup: { position: 'absolute', width: W, height: ROBOT_SIZE + ORBIT_R * 2 + 60 },
  intBubble: {
    position: 'absolute', width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#0D1424', borderWidth: 1.5, justifyContent: 'center', alignItems: 'center',
  },
  intEmoji: { fontSize: 20 },
  robotWrap: { zIndex: 10 },
  robotImg: { width: ROBOT_SIZE, height: ROBOT_SIZE },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050A18' },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 12 },
  topBrand: { flexDirection: 'row', alignItems: 'baseline', alignSelf: 'center', marginBottom: 8 },
  brandLight: { fontSize: 20, fontWeight: '300', color: '#94A3B8' },
  brandBold: { fontSize: 20, fontWeight: '900', color: Colors.emerald },
  tagWrap: { alignItems: 'center', marginBottom: 28 },
  tagMain: { fontSize: 28, fontWeight: '900', color: '#F1F5F9', textAlign: 'center' },
  tagAccent: { fontSize: 28, fontWeight: '900', color: Colors.emerald, textAlign: 'center', marginBottom: 12 },
  tagSub: { fontSize: 15, color: '#94A3B8', textAlign: 'center', lineHeight: 23 },
  inlineInput: { backgroundColor: '#0D1424', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 15, color: '#F1F5F9', fontSize: 16, borderWidth: 1, borderColor: '#1E293B', marginBottom: 10 },
  inlineError: { color: Colors.rose, fontSize: 13, marginBottom: 10, fontWeight: '600', textAlign: 'center' },
  toggleWrap: { alignItems: 'center', marginTop: 16 },
  toggleText: { fontSize: 14, color: '#64748B' },
  toggleLink: { color: Colors.emerald, fontWeight: '700' },
  ctaP: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.emerald, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 20 },
  ctaPT: { fontSize: 19, fontWeight: '900', color: '#050A18' },
  ctaPS: { fontSize: 13, color: '#050A18', opacity: 0.55, marginTop: 2 },
  ctaArr: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(5,10,24,0.15)', justifyContent: 'center', alignItems: 'center' },
  ctaArrT: { fontSize: 20, color: '#050A18', fontWeight: '700' },
  ctaS: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0D1424', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 16, borderWidth: 1, borderColor: '#1E293B' },
  ctaST: { fontSize: 16, fontWeight: '800', color: '#E2E8F0' },
  ctaSS: { fontSize: 18, color: '#64748B' },
  intLabels: { marginTop: 28 },
  intTitle: { fontSize: 12, fontWeight: '700', color: '#64748B', letterSpacing: 1, textAlign: 'center', marginBottom: 14, textTransform: 'uppercase' },
  intRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  intChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0A0F1E', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  intChipText: { fontSize: 11, fontWeight: '700' },
  statsBar: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 24, marginBottom: 16 },
  stat: { alignItems: 'center' },
  statV: { fontSize: 28, fontWeight: '900' },
  statL: { fontSize: 10, color: '#64748B', fontWeight: '700', marginTop: 4, letterSpacing: 0.5 },
  footer: { textAlign: 'center', color: '#334155', fontSize: 11, marginTop: 8 },
});
