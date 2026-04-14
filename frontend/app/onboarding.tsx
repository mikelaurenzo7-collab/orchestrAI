import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Dimensions, Animated, Easing, ScrollView, KeyboardAvoidingView, Platform, Keyboard, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { authFetch } from '../utils/api';
import { Colors, BorderRadius } from '../constants/theme';

const { width: W } = Dimensions.get('window');

const PLATFORM_AGENTS = [
  { name: 'Shopify', emoji: '🛍️', color: '#96BF48', type: 'store' },
  { name: 'Etsy', emoji: '🧶', color: '#F1641E', type: 'store' },
  { name: 'eBay', emoji: '🏷️', color: '#E53238', type: 'store' },
  { name: 'Twitter', emoji: '🐦', color: '#1DA1F2', type: 'social' },
  { name: 'Pinterest', emoji: '📌', color: '#E60023', type: 'social' },
  { name: 'TikTok', emoji: '🎵', color: '#010101', type: 'social' },
  { name: 'Meta', emoji: '📘', color: '#0866FF', type: 'social' },
  { name: 'Analytics', emoji: '📊', color: '#22D3EE', type: 'intelligence' },
];

const GOALS = [
  { id: 'launch', label: 'Launch my first store', icon: '🏗️' },
  { id: 'grow', label: 'Grow existing revenue', icon: '📈' },
  { id: 'automate', label: 'Automate everything', icon: '⚡' },
  { id: 'market', label: 'Dominate social media', icon: '📣' },
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

  const totalSteps = 4;

  const animateStep = (next: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -20, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      slideAnim.setValue(20);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
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

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Progress bar */}
          <View style={s.progressWrap}>
            <View style={s.progressTrack}>
              <Animated.View style={[s.progressFill, { width: `${((step + 1) / totalSteps) * 100}%` }]} />
            </View>
            <Text style={s.progressLabel}>{step + 1}/{totalSteps}</Text>
          </View>

          <Animated.View style={[s.body, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

            {/* STEP 0 — Welcome */}
            {step === 0 && (
              <View>
                <Image source={require('../assets/images/orchestrai-logo-small.png')} style={{ width: 56, height: 56, alignSelf: 'center', marginBottom: 16 }} resizeMode="contain" />
                <Text style={s.h1}>Welcome to{'\n'}orchestr<Text style={s.accent}>AI</Text></Text>
                <Text style={s.sub}>8 AI Executive Assistants. One mission: grow your business on autopilot.</Text>

                {/* Agent scroll */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.agentScroll}
                  snapToInterval={78} decelerationRate="fast">
                  {PLATFORM_AGENTS.map((a, i) => (
                    <View key={i} style={[s.agentPill, { borderColor: a.color + '40' }]}>
                      <Text style={{ fontSize: 22 }}>{a.emoji}</Text>
                      <Text style={[s.agentPillName, { color: a.color }]}>{a.name}</Text>
                      <Text style={s.agentPillType}>{a.type === 'store' ? 'STORE' : a.type === 'social' ? 'SOCIAL' : 'INTEL'}</Text>
                    </View>
                  ))}
                </ScrollView>

                <View style={s.welcomeCard}>
                  <Text style={s.welcomeHi}>Hey {user?.name?.split(' ')[0] || 'there'} 👋</Text>
                  <Text style={s.welcomeBody}>Each platform you connect gets its own dedicated AI assistant. They learn your brand, work 24/7, and get smarter every day.</Text>
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
                  <TextInput testID="onboard-brand" style={s.input} value={brandName} onChangeText={setBrandName}
                    placeholder="Luna Vintage, FitGear Co..." placeholderTextColor="#475569" />
                </View>
                <View style={s.field}>
                  <Text style={s.label}>What do you sell?</Text>
                  <TextInput testID="onboard-niche" style={s.input} value={niche} onChangeText={setNiche}
                    placeholder="Handmade jewelry, fitness gear..." placeholderTextColor="#475569" />
                </View>
                <View style={s.field}>
                  <Text style={s.label}>Brand voice</Text>
                  <View style={s.voiceRow}>
                    {VOICES.map(v => (
                      <TouchableOpacity key={v.id} testID={`voice-${v.id}`}
                        style={[s.voiceChip, voice === v.id && s.voiceActive]}
                        onPress={() => setVoice(v.id)}>
                        <Text style={{ fontSize: 16 }}>{v.emoji}</Text>
                        <Text style={[s.voiceLabel, voice === v.id && { color: Colors.emerald }]}>{v.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <Text style={s.skip}>All fields optional — update anytime</Text>
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
                    <TouchableOpacity key={g.id} testID={`goal-${g.id}`}
                      style={[s.goalRow, goal === g.id && s.goalActive]}
                      onPress={() => setGoal(g.id)} activeOpacity={0.7}>
                      <Text style={{ fontSize: 24 }}>{g.icon}</Text>
                      <Text style={[s.goalText, goal === g.id && { color: Colors.emerald }]}>{g.label}</Text>
                      {goal === g.id && <View style={s.goalCheck}><Text style={{ fontSize: 12, color: '#050A18' }}>✓</Text></View>}
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
              <TouchableOpacity testID="onboard-back" style={s.backBtn} onPress={() => animateStep(step - 1)}>
                <Text style={s.backText}>Back</Text>
              </TouchableOpacity>
            ) : <View style={{ width: 60 }} />}
            <View style={{ flex: 1 }} />
            {step < 3 ? (
              <TouchableOpacity testID="onboard-next"
                style={[s.nextBtn, step === 2 && !goal && { opacity: 0.35 }]}
                onPress={() => { Keyboard.dismiss(); animateStep(step + 1); }}
                disabled={step === 2 && !goal}>
                <Text style={s.nextText}>{step === 0 ? "Let's go" : 'Continue'}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity testID="onboard-finish" style={s.launchBtn} onPress={finish}>
                <Text style={s.launchText}>Enter Command Center</Text>
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
  // Progress
  progressWrap: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 32, gap: 12 },
  progressTrack: { flex: 1, height: 3, backgroundColor: '#1E293B', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.emerald, borderRadius: 2 },
  progressLabel: { fontSize: 12, fontWeight: '700', color: '#475569', width: 28 },
  // Typography
  body: { flex: 1 },
  heroEmoji: { fontSize: 44, textAlign: 'center', marginBottom: 16 },
  h1: { fontSize: 32, fontWeight: '900', color: '#F1F5F9', textAlign: 'center', letterSpacing: -0.5, lineHeight: 38 },
  accent: { color: Colors.emerald },
  sub: { fontSize: 16, color: '#94A3B8', textAlign: 'center', lineHeight: 24, marginTop: 8, marginBottom: 28 },
  // Agents horizontal scroll
  agentScroll: { paddingVertical: 4, gap: 10, paddingRight: 24 },
  agentPill: { width: 72, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6, backgroundColor: '#0A0F1E', borderRadius: 16, borderWidth: 1.5, gap: 4 },
  agentPillName: { fontSize: 10, fontWeight: '800' },
  agentPillType: { fontSize: 7, fontWeight: '800', color: '#475569', letterSpacing: 1 },
  // Welcome card
  welcomeCard: { marginTop: 24, backgroundColor: '#0A0F1E', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#1E293B' },
  welcomeHi: { fontSize: 18, fontWeight: '800', color: Colors.emerald, marginBottom: 8 },
  welcomeBody: { fontSize: 14, color: '#94A3B8', lineHeight: 22 },
  // Fields
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#0A0F1E', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 16, color: '#F1F5F9', fontSize: 16, borderWidth: 1, borderColor: '#1E293B' },
  voiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  voiceChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, backgroundColor: '#0A0F1E', borderWidth: 1.5, borderColor: '#1E293B' },
  voiceActive: { borderColor: Colors.emerald, backgroundColor: Colors.emerald + '08' },
  voiceLabel: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  skip: { fontSize: 12, color: '#334155', textAlign: 'center', marginTop: 20 },
  // Goals
  goalList: { gap: 12 },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 18, paddingHorizontal: 20, backgroundColor: '#0A0F1E', borderRadius: 16, borderWidth: 1.5, borderColor: '#1E293B' },
  goalActive: { borderColor: Colors.emerald, backgroundColor: Colors.emerald + '06' },
  goalText: { fontSize: 17, fontWeight: '700', color: '#CBD5E1', flex: 1 },
  goalCheck: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.emerald, justifyContent: 'center', alignItems: 'center' },
  // Ready
  readyWrap: { alignItems: 'center' },
  readyCard: { backgroundColor: '#0A0F1E', borderRadius: 24, padding: 28, borderWidth: 1, borderColor: Colors.emerald + '20', width: '100%', alignItems: 'center', marginTop: 8 },
  readyBrand: { fontSize: 24, fontWeight: '900', color: Colors.emerald, marginBottom: 20 },
  readyStats: { flexDirection: 'row', alignItems: 'center', gap: 0, width: '100%', justifyContent: 'space-around' },
  readyStat: { alignItems: 'center', flex: 1 },
  readyNum: { fontSize: 32, fontWeight: '900' },
  readyLabel: { fontSize: 11, color: '#475569', fontWeight: '700', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  readyDivider: { width: 1, height: 40, backgroundColor: '#1E293B' },
  readyTip: { fontSize: 14, color: '#475569', textAlign: 'center', marginTop: 24, lineHeight: 22 },
  // Nav
  nav: { flexDirection: 'row', alignItems: 'center', paddingTop: 24 },
  backBtn: { paddingVertical: 16, paddingHorizontal: 8 },
  backText: { fontSize: 16, color: '#475569', fontWeight: '600' },
  nextBtn: { backgroundColor: Colors.emerald, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 32 },
  nextText: { fontSize: 16, fontWeight: '800', color: '#050A18' },
  launchBtn: { flex: 1, backgroundColor: Colors.emerald, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  launchText: { fontSize: 17, fontWeight: '900', color: '#050A18' },
});
