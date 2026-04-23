import { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Dimensions, ScrollView, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { authFetch } from '../utils/api';
import { Colors } from '../constants/theme';
import { Bot, ShieldCheck, Zap, BrainCircuit, Rocket, Activity, ChevronRight, Check } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown, SlideInRight, useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const VOICES = [
  { id: 'professional', label: 'Professional', emoji: '👔' },
  { id: 'playful', label: 'Playful', emoji: '🎉' },
  { id: 'luxury', label: 'Luxury', emoji: '💎' },
  { id: 'casual', label: 'Casual', emoji: '👕' },
];

const GOALS = [
  { id: 'revenue', label: 'Grow my revenue', icon: '💰' },
  { id: 'automation', label: 'Automate operations', icon: '🤖' },
  { id: 'market', label: 'Launch in new markets', icon: '🌍' },
  { id: 'efficiency', label: 'Improve efficiency', icon: '⚡' },
];

const AGENT_PREVIEWS = [
  { name: 'Maestro', type: 'CORE', icon: Bot, color: Colors.emerald },
  { name: 'Aria', type: 'MARKETING', icon: Zap, color: '#FE2C55' },
  { name: 'Cadence', type: 'ANALYTICS', icon: Activity, color: '#0866FF' },
  { name: 'Harmony', type: 'CUSTOMER', icon: ShieldCheck, color: '#FB7185' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [brandName, setBrandName] = useState('');
  const [niche, setNiche] = useState('');
  const [voice, setVoice] = useState('professional');
  const [goal, setGoal] = useState('');
  const [isFinishing, setIsFinishing] = useState(false);

  const opacity = useSharedValue(1);

  const animateStep = (next: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    opacity.value = withTiming(0, { duration: 200 }, () => {
      setStep(next);
      opacity.value = withTiming(1, { duration: 300 });
    });
  };

  const finish = async () => {
    setIsFinishing(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await authFetch('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({ brand_name: brandName, brand_voice: voice, niche, goals: goal })
      });
      router.replace('/(tabs)');
    } catch {
      router.replace('/(tabs)');
    }
  };

  const progressStyle = useAnimatedStyle(() => ({
    width: withSpring(`${((step + 1) / 4) * 100}%`, { damping: 20, stiffness: 90 }),
  }));

  const animatedBody = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: withSpring(opacity.value === 0 ? 50 : 0) }],
  }));

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} bounces={false} keyboardShouldPersistTaps="handled">
          <View style={s.progressWrap}>
            <Text style={s.progressLabel}>{step + 1}/4</Text>
            <View style={s.progressTrack}>
              <Animated.View style={[s.progressFill, progressStyle]} />
            </View>
          </View>

          <Animated.View style={[s.body, animatedBody]}>
            {/* STEP 0 — Welcome */}
            {step === 0 && (
              <View>
                <Text style={s.heroEmoji}>👋</Text>
                <Text style={s.h1}>Meet Your <Text style={s.accent}>Workforce</Text></Text>
                <Text style={s.sub}>orchestrAI gives you a full executive team from day one.</Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.agentScroll}>
                  {AGENT_PREVIEWS.map((a, i) => (
                    <Animated.View key={i} entering={FadeInDown.delay(i * 100).springify()} style={[s.agentPill, { borderColor: `${a.color}40` }]}>
                      <a.icon size={28} color={a.color} />
                      <Text style={[s.agentPillName, { color: a.color }]}>{a.name}</Text>
                      <Text style={s.agentPillType}>{a.type}</Text>
                    </Animated.View>
                  ))}
                </ScrollView>

                <View style={s.welcomeCard}>
                  <Text style={s.welcomeHi}>Your AI agents don't just advise.</Text>
                  <Text style={s.welcomeBody}>They execute. From product descriptions to social campaigns, they are your co-founders in a box.</Text>
                </View>
              </View>
            )}

            {/* STEP 1 — Brand */}
            {step === 1 && (
              <View>
                <Text style={s.heroEmoji}>🏷️</Text>
                <Text style={s.h1}>Your Brand</Text>
                <Text style={s.sub}>Help your agents understand who you are.</Text>

                <View style={s.field}>
                  <Text style={s.label}>Brand name</Text>
                  <TextInput testID="onboard-brand-input" style={s.input} value={brandName} onChangeText={setBrandName}
                    placeholder="Luna Vintage, FitGear Co..." placeholderTextColor="#475569" />
                </View>
                <View style={s.field}>
                  <Text style={s.label}>What do you sell?</Text>
                  <TextInput testID="onboard-niche-input" style={s.input} value={niche} onChangeText={setNiche}
                    placeholder="Handmade jewelry, fitness gear..." placeholderTextColor="#475569" />
                </View>
                <View style={s.field}>
                  <Text style={s.label}>Brand voice</Text>
                  <View style={s.voiceRow}>
                    {VOICES.map(v => (
                      <TouchableOpacity key={v.id} testID={`voice-option-${v.id}`}
                        style={[s.voiceChip, voice === v.id && s.voiceActive]}
                        onPress={() => { setVoice(v.id); Haptics.selectionAsync(); }}>
                        <Text style={{ fontSize: 16 }}>{v.emoji}</Text>
                        <Text style={[s.voiceLabel, voice === v.id && { color: Colors.emerald }]}>{v.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* STEP 2 — Goal */}
            {step === 2 && (
              <View>
                <Text style={s.heroEmoji}>🎯</Text>
                <Text style={s.h1}>Your Priority</Text>
                <Text style={s.sub}>Your agents will focus here first.</Text>

                <View style={s.goalList}>
                  {GOALS.map(g => (
                    <TouchableOpacity key={g.id} testID={`goal-option-${g.id}`}
                      style={[s.goalRow, goal === g.id && s.goalActive]}
                      onPress={() => { setGoal(g.id); Haptics.selectionAsync(); }} activeOpacity={0.7}>
                      <Text style={{ fontSize: 24 }}>{g.icon}</Text>
                      <Text style={[s.goalText, goal === g.id && { color: Colors.emerald }]}>{g.label}</Text>
                      {goal === g.id && <View style={s.goalCheck}><Check size={14} color="#050A18" /></View>}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* STEP 3 — Ready */}
            {step === 3 && (
              <View style={s.readyWrap}>
                <Text style={{ fontSize: 56, textAlign: 'center' }}>🚀</Text>
                <Text style={s.h1}>You're Ready</Text>
                <Text style={s.sub}>Your AI team is online and waiting.</Text>

                <View style={s.readyCard}>
                  {brandName ? <Text style={s.readyBrand}>{brandName}</Text> : null}
                  <View style={s.readyStats}>
                    <View style={s.readyStat}>
                      <Text style={[s.readyNum, { color: Colors.emerald }]}>8</Text>
                      <Text style={s.readyLabel}>Agents</Text>
                    </View>
                    <View style={s.readyDivider} />
                    <View style={s.readyStat}>
                      <Text style={[s.readyNum, { color: '#FBBF24' }]}>24/7</Text>
                      <Text style={s.readyLabel}>Uptime</Text>
                    </View>
                    <View style={s.readyDivider} />
                    <View style={s.readyStat}>
                      <Text style={[s.readyNum, { color: '#22D3EE' }]}>∞</Text>
                      <Text style={s.readyLabel}>Potential</Text>
                    </View>
                  </View>
                </View>

                <Text style={s.readyTip}>Connect your first store or social account to activate your agents.</Text>
              </View>
            )}
          </Animated.View>

          {/* Navigation */}
          <View style={s.nav}>
            {step > 0 && step < 3 ? (
              <TouchableOpacity testID="onboard-back-btn" style={s.backBtn} onPress={() => animateStep(step - 1)}>
                <Text style={s.backText}>Back</Text>
              </TouchableOpacity>
            ) : <View style={{ width: 60 }} />}
            <View style={{ flex: 1 }} />
            {step < 3 ? (
              <TouchableOpacity testID="onboard-next-btn"
                style={[s.nextBtn, step === 2 && !goal && { opacity: 0.35 }]}
                onPress={() => { Keyboard.dismiss(); animateStep(step + 1); }}
                disabled={step === 2 && !goal}>
                <Text style={s.nextText}>{step === 0 ? "Let's go" : 'Continue'}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity testID="onboard-finish-btn" style={s.launchBtn} onPress={finish} disabled={isFinishing}>
                {isFinishing ? <ActivityIndicator color="#050A18" /> : <Text style={s.launchText}>Enter Command Center</Text>}
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#050A18' },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 24, justifyContent: 'space-between' },
  progressWrap: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 32, gap: 12 },
  progressTrack: { flex: 1, height: 3, backgroundColor: '#1E293B', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.emerald, borderRadius: 2 },
  progressLabel: { fontSize: 12, fontWeight: '700', color: '#475569', width: 28 },
  body: { flex: 1 },
  heroEmoji: { fontSize: 44, textAlign: 'center', marginBottom: 16 },
  h1: { fontSize: 32, fontWeight: '900', color: '#F1F5F9', textAlign: 'center', letterSpacing: -0.5, lineHeight: 38 },
  accent: { color: Colors.emerald },
  sub: { fontSize: 16, color: '#94A3B8', textAlign: 'center', lineHeight: 24, marginTop: 8, marginBottom: 28 },
  agentScroll: { paddingVertical: 4, gap: 10, paddingRight: 24 },
  agentPill: { width: 72, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6, backgroundColor: '#0A0F1E', borderRadius: 16, borderWidth: 1.5, gap: 4 },
  agentPillName: { fontSize: 10, fontWeight: '800' },
  agentPillType: { fontSize: 7, fontWeight: '800', color: '#475569', letterSpacing: 1 },
  welcomeCard: { marginTop: 24, backgroundColor: '#0A0F1E', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#1E293B' },
  welcomeHi: { fontSize: 18, fontWeight: '800', color: Colors.emerald, marginBottom: 8 },
  welcomeBody: { fontSize: 14, color: '#94A3B8', lineHeight: 22 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#0A0F1E', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 16, color: '#F1F5F9', fontSize: 16, borderWidth: 1, borderColor: '#1E293B' },
  voiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  voiceChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, backgroundColor: '#0A0F1E', borderWidth: 1.5, borderColor: '#1E293B' },
  voiceActive: { borderColor: Colors.emerald, backgroundColor: Colors.emerald + '08' },
  voiceLabel: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  goalList: { gap: 12 },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 18, paddingHorizontal: 20, backgroundColor: '#0A0F1E', borderRadius: 16, borderWidth: 1.5, borderColor: '#1E293B' },
  goalActive: { borderColor: Colors.emerald, backgroundColor: Colors.emerald + '06' },
  goalText: { fontSize: 17, fontWeight: '700', color: '#CBD5E1', flex: 1 },
  goalCheck: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.emerald, justifyContent: 'center', alignItems: 'center' },
  readyWrap: { alignItems: 'center' },
  readyCard: { backgroundColor: '#0A0F1E', borderRadius: 24, padding: 28, borderWidth: 1, borderColor: Colors.emerald + '20', width: '100%', alignItems: 'center', marginTop: 8 },
  readyBrand: { fontSize: 24, fontWeight: '900', color: Colors.emerald, marginBottom: 20 },
  readyStats: { flexDirection: 'row', alignItems: 'center', gap: 0, width: '100%', justifyContent: 'space-around' },
  readyStat: { alignItems: 'center', flex: 1 },
  readyNum: { fontSize: 32, fontWeight: '900' },
  readyLabel: { fontSize: 11, color: '#475569', fontWeight: '700', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  readyDivider: { width: 1, height: 40, backgroundColor: '#1E293B' },
  readyTip: { fontSize: 14, color: '#475569', textAlign: 'center', marginTop: 24, lineHeight: 22 },
  nav: { flexDirection: 'row', alignItems: 'center', paddingTop: 24 },
  backBtn: { paddingVertical: 16, paddingHorizontal: 8 },
  backText: { fontSize: 16, color: '#475569', fontWeight: '600' },
  nextBtn: { backgroundColor: Colors.emerald, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 32 },
  nextText: { fontSize: 16, fontWeight: '800', color: '#050A18' },
  launchBtn: { flex: 1, backgroundColor: Colors.emerald, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  launchText: { fontSize: 17, fontWeight: '900', color: '#050A18' },
});
