import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Dimensions, Animated, Easing, ScrollView, KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { authFetch } from '../utils/api';
import { Colors, Spacing, BorderRadius, FontSizes } from '../constants/theme';

const { width } = Dimensions.get('window');

const STEPS = [
  { id: 'welcome', title: 'Welcome to orchestrAI', subtitle: 'Let\'s set up your AI-powered commerce empire in 60 seconds.', icon: '🎵' },
  { id: 'brand', title: 'Tell Us About Your Brand', subtitle: 'This helps your AI agents give hyper-personalized advice.', icon: '🏷️' },
  { id: 'goal', title: 'What\'s Your Main Goal?', subtitle: 'Your agents will prioritize actions around this.', icon: '🎯' },
  { id: 'ready', title: 'You\'re All Set!', subtitle: 'Your 4 AI agents are online and ready to work.', icon: '🚀' },
];

const GOALS = [
  { id: 'launch', label: 'Launch my first store', icon: '🏗️', desc: 'Build and launch from scratch' },
  { id: 'grow', label: 'Grow existing revenue', icon: '📈', desc: 'Scale what\'s already working' },
  { id: 'automate', label: 'Automate operations', icon: '⚡', desc: 'Save time on manual tasks' },
  { id: 'market', label: 'Improve marketing', icon: '📣', desc: 'Get more traffic and sales' },
];

const VOICES = [
  { id: 'professional', label: 'Professional', emoji: '👔' },
  { id: 'casual', label: 'Casual', emoji: '😎' },
  { id: 'luxury', label: 'Luxury', emoji: '💎' },
  { id: 'playful', label: 'Playful', emoji: '🎉' },
];

export default function OnboardingScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [brandName, setBrandName] = useState('');
  const [niche, setNiche] = useState('');
  const [voice, setVoice] = useState('professional');
  const [goal, setGoal] = useState('');
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateStep = (next: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -30, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    });
  };

  const saveProfile = async () => {
    try {
      await authFetch('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({ brand_name: brandName.trim() || undefined, niche: niche.trim() || undefined, brand_voice: voice, goals: goal }),
      });
    } catch (e) { console.error(e); }
  };

  const finish = async () => {
    await saveProfile();
    router.replace('/(tabs)');
  };

  const canNext = () => {
    if (step === 1) return true; // brand is optional
    if (step === 2) return !!goal;
    return true;
  };

  const currentStep = STEPS[step];

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Progress dots */}
          <View style={s.dots}>
            {STEPS.map((_, i) => (
              <View key={i} style={[s.dot, i === step && s.dotActive, i < step && s.dotDone]} />
            ))}
          </View>

          {/* Step content */}
          <Animated.View style={[s.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={s.stepIcon}>{currentStep.icon}</Text>
            <Text style={s.stepTitle}>{currentStep.title}</Text>
            <Text style={s.stepSub}>{currentStep.subtitle}</Text>

            {/* Welcome */}
            {step === 0 && (
              <View style={s.welcomeCard}>
                <Text style={s.welcomeName}>Hey {user?.name || 'there'}!</Text>
                <Text style={s.welcomeText}>Your AI agents are warming up. Let's give them some context about your business so they can hit the ground running.</Text>
                <View style={s.agentGrid}>
                  {[
                    { name: 'Shopify EA', emoji: '🛍️', color: '#96BF48' },
                    { name: 'Twitter EA', emoji: '🐦', color: '#1DA1F2' },
                    { name: 'Pinterest EA', emoji: '📌', color: '#E60023' },
                    { name: 'Analytics', emoji: '📊', color: Colors.cyan },
                  ].map((a, i) => (
                    <View key={i} style={[s.agentMini, { borderColor: a.color + '30' }]}>
                      <Text style={{ fontSize: 20 }}>{a.emoji}</Text>
                      <Text style={[s.agentMiniName, { color: a.color }]}>{a.name}</Text>
                      <Text style={s.agentMiniStatus}>READY</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Brand Profile */}
            {step === 1 && (
              <View style={s.formWrap}>
                <Text style={s.label}>Brand / Store Name</Text>
                <TextInput testID="onboard-brand" style={s.input} value={brandName} onChangeText={setBrandName}
                  placeholder="e.g., Luna Vintage, FitGear Co." placeholderTextColor="#475569" />
                <Text style={s.label}>What do you sell?</Text>
                <TextInput testID="onboard-niche" style={s.input} value={niche} onChangeText={setNiche}
                  placeholder="e.g., handmade jewelry, fitness equipment" placeholderTextColor="#475569" />
                <Text style={s.label}>Your brand voice</Text>
                <View style={s.voiceGrid}>
                  {VOICES.map(v => (
                    <TouchableOpacity key={v.id} testID={`voice-${v.id}`}
                      style={[s.voiceChip, voice === v.id && { borderColor: Colors.emerald, backgroundColor: Colors.emerald + '12' }]}
                      onPress={() => setVoice(v.id)}>
                      <Text style={{ fontSize: 18 }}>{v.emoji}</Text>
                      <Text style={[s.voiceText, voice === v.id && { color: Colors.emerald }]}>{v.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={s.hint}>Skip any field — you can always update later.</Text>
              </View>
            )}

            {/* Goal */}
            {step === 2 && (
              <View style={s.goalGrid}>
                {GOALS.map(g => (
                  <TouchableOpacity key={g.id} testID={`goal-${g.id}`}
                    style={[s.goalCard, goal === g.id && { borderColor: Colors.emerald, backgroundColor: Colors.emerald + '08' }]}
                    onPress={() => setGoal(g.id)} activeOpacity={0.8}>
                    <Text style={s.goalIcon}>{g.icon}</Text>
                    <Text style={[s.goalLabel, goal === g.id && { color: Colors.emerald }]}>{g.label}</Text>
                    <Text style={s.goalDesc}>{g.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Ready */}
            {step === 3 && (
              <View style={s.readyWrap}>
                <View style={s.readyCard}>
                  {brandName ? <Text style={s.readyBrand}>{brandName}</Text> : null}
                  {niche ? <Text style={s.readyNiche}>{niche}</Text> : null}
                  <View style={s.readyRow}>
                    <View style={s.readyStat}><Text style={[s.readyStatV, { color: Colors.emerald }]}>8</Text><Text style={s.readyStatL}>Agents Online</Text></View>
                    <View style={s.readyStat}><Text style={[s.readyStatV, { color: Colors.amber }]}>24</Text><Text style={s.readyStatL}>Actions Ready</Text></View>
                    <View style={s.readyStat}><Text style={[s.readyStatV, { color: Colors.cyan }]}>30</Text><Text style={s.readyStatL}>Days Free</Text></View>
                  </View>
                </View>
                <Text style={s.readyTip}>Your agents will learn more about your business with every interaction.</Text>
              </View>
            )}
          </Animated.View>

          {/* Navigation */}
          <View style={s.nav}>
            {step > 0 && step < 3 && (
              <TouchableOpacity testID="onboard-back" style={s.backBtn} onPress={() => animateStep(step - 1)}>
                <Text style={s.backText}>← Back</Text>
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }} />
            {step < 3 ? (
              <TouchableOpacity testID="onboard-next" style={[s.nextBtn, !canNext() && { opacity: 0.4 }]}
                onPress={() => { Keyboard.dismiss(); animateStep(step + 1); }} disabled={!canNext()}>
                <Text style={s.nextText}>{step === 0 ? "Let's Go" : 'Next'} →</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity testID="onboard-finish" style={s.launchBtn} onPress={finish}>
                <Text style={s.launchText}>Launch Command Center →</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050A18' },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'space-between' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 32, marginTop: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1E293B' },
  dotActive: { width: 24, backgroundColor: Colors.emerald },
  dotDone: { backgroundColor: Colors.emerald + '60' },
  content: { flex: 1 },
  stepIcon: { fontSize: 48, textAlign: 'center', marginBottom: 16 },
  stepTitle: { fontSize: 26, fontWeight: '900', color: '#F1F5F9', textAlign: 'center', marginBottom: 8 },
  stepSub: { fontSize: 15, color: '#94A3B8', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  // Welcome
  welcomeCard: { backgroundColor: '#0A0F1E', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#1E293B' },
  welcomeName: { fontSize: 20, fontWeight: '800', color: Colors.emerald, marginBottom: 8 },
  welcomeText: { fontSize: 14, color: '#94A3B8', lineHeight: 22, marginBottom: 20 },
  agentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  agentMini: { width: (width - 48 - 40 - 10) / 2, backgroundColor: '#0D1424', borderRadius: 14, padding: 14, borderWidth: 1, alignItems: 'center', gap: 6 },
  agentMiniName: { fontSize: 12, fontWeight: '800' },
  agentMiniStatus: { fontSize: 9, fontWeight: '800', color: Colors.emerald, letterSpacing: 1 },
  // Form
  formWrap: { gap: 4 },
  label: { fontSize: 13, fontWeight: '700', color: '#94A3B8', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#0D1424', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 15, color: '#F1F5F9', fontSize: 16, borderWidth: 1, borderColor: '#1E293B' },
  voiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  voiceChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, backgroundColor: '#0D1424', borderWidth: 1, borderColor: '#1E293B' },
  voiceText: { fontSize: 14, fontWeight: '700', color: '#94A3B8' },
  hint: { fontSize: 12, color: '#475569', marginTop: 16, textAlign: 'center' },
  // Goals
  goalGrid: { gap: 12 },
  goalCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#0A0F1E', borderRadius: 16, padding: 18, borderWidth: 1.5, borderColor: '#1E293B' },
  goalIcon: { fontSize: 28 },
  goalLabel: { fontSize: 16, fontWeight: '800', color: '#E2E8F0' },
  goalDesc: { fontSize: 12, color: '#64748B', position: 'absolute', right: 18, bottom: 8 },
  // Ready
  readyWrap: { alignItems: 'center' },
  readyCard: { backgroundColor: '#0A0F1E', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: Colors.emerald + '25', width: '100%', alignItems: 'center', gap: 8 },
  readyBrand: { fontSize: 22, fontWeight: '900', color: Colors.emerald },
  readyNiche: { fontSize: 14, color: '#94A3B8' },
  readyRow: { flexDirection: 'row', gap: 20, marginTop: 16 },
  readyStat: { alignItems: 'center' },
  readyStatV: { fontSize: 28, fontWeight: '900' },
  readyStatL: { fontSize: 10, color: '#64748B', fontWeight: '700', marginTop: 4 },
  readyTip: { fontSize: 13, color: '#475569', textAlign: 'center', marginTop: 20, lineHeight: 20 },
  // Nav
  nav: { flexDirection: 'row', alignItems: 'center', paddingTop: 20 },
  backBtn: { paddingVertical: 14, paddingHorizontal: 20 },
  backText: { fontSize: 15, color: '#64748B', fontWeight: '600' },
  nextBtn: { backgroundColor: Colors.emerald, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 28 },
  nextText: { fontSize: 16, fontWeight: '800', color: '#050A18' },
  launchBtn: { flex: 1, backgroundColor: Colors.emerald, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  launchText: { fontSize: 17, fontWeight: '900', color: '#050A18' },
});
