import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Dimensions, KeyboardAvoidingView, Platform, Keyboard, ScrollView } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, FadeIn, withSpring, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, Easing, interpolateColor } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Shadows } from '../constants/theme';
import { Mail, Lock, User, ArrowRight, Zap, Database, BrainCircuit, Globe, Bot, Binary } from 'lucide-react-native';
import AnimatedPressable from '../components/AnimatedPressable';

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

  const size = 60 + Math.random() * 40;

  return (
    <Animated.View style={[
      styles.orb, animatedStyle, 
      {
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: `${color}15`,
        borderColor: `${color}30`,
        top: Math.random() * H * 0.7,
        left: Math.random() * W * 0.8,
      }
    ]}>
      <Icon size={size * 0.4} color={color} opacity={0.6} />
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

  const modeTransition = useSharedValue(0);

  useEffect(() => {
    modeTransition.value = withSpring(isLogin ? 0 : 1, { damping: 15, stiffness: 100 });
  }, [isLogin]);

  const handleSubmit = async () => {
    if (!email || !password || (!isLogin && !name)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setLoading(true);
    Keyboard.dismiss();
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      alert(e.message || 'Authentication failed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    Haptics.selectionAsync();
    setIsLogin(!isLogin);
  };

  return (
    <View style={styles.container}>
      {/* Background Orbs effect */}
      <View style={StyleSheet.absoluteFillObject}>
        {Array.from({ length: 8 }).map((_, i) => (
          <FloatingOrb 
            key={`orb-${i}`} 
            index={i} 
            icon={ORB_ICONS[i % ORB_ICONS.length]} 
            color={ORB_COLORS[i % ORB_COLORS.length]} 
          />
        ))}
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.duration(800).springify().damping(14)} style={styles.header}>
            <View style={styles.logoBox}>
              <BrainCircuit size={40} color={Colors.emerald} strokeWidth={1.5} />
            </View>
            <Text style={styles.title}>orchestr<Text style={{ color: Colors.emerald, fontFamily: Typography.fonts.outfitB }}>AI</Text></Text>
            <Text style={styles.subtitle}>Supercharge your workforce with autonomous AI agents.</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(1000).delay(200).springify().damping(14)} style={styles.cardWrapper}>
            <BlurView intensity={25} tint="dark" style={styles.card}>
              
              {!isLogin && (
                <Animated.View entering={FadeIn.duration(400)} style={styles.inputGroup}>
                  <User size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    testID="auth-name-input"
                    style={styles.input}
                    placeholder="Full Name"
                    placeholderTextColor={Colors.textSecondary}
                    value={name}
                    onChangeText={setName}
                    editable={!loading}
                  />
                </Animated.View>
              )}

              <View style={styles.inputGroup}>
                <Mail size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  testID="auth-email-input"
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor={Colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Lock size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  testID="auth-password-input"
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={Colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!loading}
                />
              </View>

              <AnimatedPressable testID="auth-submit-button" haptic={Haptics.ImpactFeedbackStyle.Heavy} scaleDown={0.96} style={styles.submitBtn} onPress={handleSubmit}>
                <Text style={styles.submitTxt}>{loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}</Text>
                {!loading && <ArrowRight size={20} color={Colors.bg} />}
              </AnimatedPressable>

              <View style={styles.footer}>
                <Text style={styles.footerTxt}>
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                </Text>
                <AnimatedPressable testID="auth-toggle-mode" onPress={toggleMode}>
                  <Text style={styles.footerLink}>{isLogin ? 'Sign up' : 'Sign in'}</Text>
                </AnimatedPressable>
              </View>

            </BlurView>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  orb: {
    position: 'absolute',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  title: {
    fontFamily: Typography.fonts.outfitL,
    fontSize: 42,
    color: Colors.text,
    letterSpacing: -1,
  },
  subtitle: {
    fontFamily: Typography.fonts.manropeB,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  cardWrapper: {
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  card: {
    padding: 32,
    gap: 20,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 64,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontFamily: Typography.fonts.manropeB,
    fontSize: 16,
    color: Colors.text,
  },
  submitBtn: {
    height: 64,
    backgroundColor: Colors.emerald,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  submitTxt: {
    fontFamily: Typography.fonts.outfitB,
    fontSize: 18,
    color: Colors.bg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  footerTxt: {
    fontFamily: Typography.fonts.manropeB,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  footerLink: {
    fontFamily: Typography.fonts.manropeSB,
    color: Colors.emerald,
    fontSize: 14,
  },
});
