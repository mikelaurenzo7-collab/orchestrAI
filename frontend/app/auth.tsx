import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Dimensions, KeyboardAvoidingView, Platform, Keyboard, ScrollView } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, FadeIn, withSpring, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, Easing, interpolateColor } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Shadows } from '../constants/theme';
import { Mail, Lock, User, ArrowRight, Zap, Database, BrainCircuit, Globe, Bot, Binary } from 'lucide-react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';

const { width: W, height: H } = Dimensions.get('window');

const ORB_COLORS = [Colors.emerald, Colors.accent, Colors.blue, Colors.textSecondary];
const ORB_ICONS = [Zap, Database, BrainCircuit, Globe, Bot, Binary];

function FloatingOrb({ index, icon: Icon, color }: { index: number, icon: any, color: string }) {
  const tY = useSharedValue(0);
  const tX = useSharedValue(0);

  useEffect(() => {
    tY.value = withRepeat(
      withSequence(
        withTiming(-20 - Math.random() * 40, { duration: 4000 + Math.random() * 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(20 + Math.random() * 40, { duration: 4000 + Math.random() * 2000, easing: Easing.inOut(Easing.ease) })
      ), -1, true
    );
    tX.value = withRepeat(
      withSequence(
        withTiming(-20 - Math.random() * 40, { duration: 5000 + Math.random() * 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(20 + Math.random() * 40, { duration: 5000 + Math.random() * 3000, easing: Easing.inOut(Easing.ease) })
      ), -1, true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: tY.value }, { translateX: tX.value }],
  }));

  const l = 20 + Math.random() * 60;
  const t = 10 + Math.random() * 60;

  return (
    <Animated.View style={[s.orb, animatedStyle, { left: `${l}%`, top: `${t}%`, borderColor: color }]}>
      <Icon size={24} color={color} opacity={0.6} />
    </Animated.View>
  );
}

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email || !password || (!isLogin && !name)) {
      setError('Please fill all fields');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setError(null);
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = isLogin
      ? await login(email, password)
      : await register(email, password, name);

    if (result) {
      setError(result);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setLoading(false);
  };

  return (
    <View style={s.container}>
      {ORB_ICONS.map((Icon, i) => (
        <FloatingOrb key={i} index={i} icon={Icon} color={ORB_COLORS[i % ORB_COLORS.length]} />
      ))}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <ScrollView contentContainerStyle={s.scroll} bounces={false} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInDown.duration(1000).springify()} style={s.content}>
            <View style={s.logoWrap}>
              <View style={s.logoIcon}>
                <BrainCircuit size={40} color={Colors.emerald} />
              </View>
              <Text style={s.logoText}>orchestr<Text style={{ color: Colors.emerald }}>AI</Text></Text>
              <Text style={s.tagline}>Supercharge your workforce with autonomous AI agents.</Text>
            </View>

            <BlurView intensity={25} tint="dark" style={s.card}>
              <Text style={s.h1}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
              
              {error && <Text style={s.error}>{error}</Text>}

              <View style={s.form}>
                {!isLogin && (
                  <View style={s.inputWrap}>
                    <User size={20} color={Colors.textMuted} style={s.icon} />
                    <TextInput
                      testID="auth-name-input"
                      placeholder="Full Name"
                      placeholderTextColor={Colors.textMuted}
                      style={s.input}
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                    />
                  </View>
                )}

                <View style={s.inputWrap}>
                  <Mail size={20} color={Colors.textMuted} style={s.icon} />
                  <TextInput
                    testID="auth-email-input"
                    placeholder="Email Address"
                    placeholderTextColor={Colors.textMuted}
                    style={s.input}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <View style={s.inputWrap}>
                  <Lock size={20} color={Colors.textMuted} style={s.icon} />
                  <TextInput
                    testID="auth-password-input"
                    placeholder="Password"
                    placeholderTextColor={Colors.textMuted}
                    style={s.input}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>

                <AnimatedPressable
                  testID="auth-submit-btn"
                  scaleDown={0.96}
                  style={s.btn}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  <Text style={s.btnText}>{isLogin ? 'Sign In' : 'Get Started'}</Text>
                  <ArrowRight size={20} color={Colors.bg} />
                </AnimatedPressable>
              </View>

              <TouchableOpacity
                testID="auth-toggle-btn"
                onPress={() => { setIsLogin(!isLogin); setError(null); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={s.toggle}
              >
                <Text style={s.toggleText}>
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <Text style={{ color: Colors.emerald, fontWeight: '700' }}>{isLogin ? 'Sign up' : 'Login'}</Text>
                </Text>
              </TouchableOpacity>
            </BlurView>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  orb: { position: 'absolute', width: 60, height: 60, borderRadius: 30, borderWidth: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
  content: { alignItems: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: 40 },
  logoIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: `${Colors.emerald}10`, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: `${Colors.emerald}30`, marginBottom: 20 },
  logoText: { fontSize: 42, fontWeight: '900', color: '#FFF', letterSpacing: -1.5 },
  tagline: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', marginTop: 12, lineHeight: 24, paddingHorizontal: 20 },
  card: { width: '100%', borderRadius: 32, padding: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  h1: { fontSize: 28, fontWeight: '800', color: '#FFF', marginBottom: 24, textAlign: 'center' },
  form: { gap: 16 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16 },
  icon: { marginRight: 12 },
  input: { flex: 1, height: 56, color: '#FFF', fontSize: 16 },
  btn: { backgroundColor: Colors.emerald, height: 64, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 12, ...Shadows.glow(Colors.emerald) },
  btnText: { color: Colors.bg, fontSize: 18, fontWeight: '800' },
  error: { color: Colors.error, textAlign: 'center', marginBottom: 16, fontWeight: '600' },
  toggle: { marginTop: 24, alignItems: 'center' },
  toggleText: { color: Colors.textSecondary, fontSize: 15 },
});
