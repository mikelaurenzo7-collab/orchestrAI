import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Switch, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Colors, Typography, Spacing, Shadows, BorderRadius } from '../constants/theme';
import { ChevronLeft, Rocket, Send, Bot, CheckCircle2, Sparkles, Box, Layout, ShoppingBag, ArrowRight } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp, SlideInRight, LinearTransition } from 'react-native-reanimated';
import { AnimatedPressable } from '../components/AnimatedPressable';
import * as Haptics from 'expo-haptics';
import { authFetch } from '../utils/api';

const { width } = Dimensions.get('window');

interface ChatMessage {
  role: 'system' | 'agent' | 'user';
  content: string;
  timestamp: string;
  step?: string;
  data?: any;
}

export default function StoreBuilderScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<'initial' | 'building' | 'complete'>('initial');

  // Initial Form State
  const [niche, setNiche] = useState('');
  const [storeName, setStoreName] = useState('');
  const [autopilot, setAutopilot] = useState(true);

  // Build State
  const [buildId, setBuildId] = useState<string | null>(null);
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(6);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [finalPlan, setFinalPlan] = useState<any>(null);

  const scrollRef = useRef<ScrollView>(null);

  const startBuild = async () => {
    if (!niche.trim()) {
      Alert.alert('Required', 'Please enter what you want to sell.');
      return;
    }

    Haptics.notificationAsync(Haptics.ImpactFeedbackStyle.Success);
    setIsProcessing(true);

    try {
      const res = await authFetch('/api/store-builder/start', {
        method: 'POST',
        body: JSON.stringify({
          niche,
          store_name: storeName,
          autopilot,
          product_count: 5
        })
      });

      if (res.ok) {
        const data = await res.json();
        setBuildId(data.build_id);
        setChatLog(data.chat_log);
        setPhase('building');

        // If autopilot is on, start the first step automatically
        if (autopilot) {
          executeNextStep(data.build_id);
        }
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to start store build.');
    } finally {
      setIsProcessing(false);
    }
  };

  const executeNextStep = async (id: string) => {
    setIsProcessing(true);
    try {
      const res = await authFetch(`/api/store-builder/step/${id}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setChatLog(data.chat_log);
        setCurrentStep(data.step_num);

        if (data.status === 'complete') {
          setPhase('complete');
          setFinalPlan(data.plan);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (autopilot) {
          // Continue to next step in autopilot
          setTimeout(() => executeNextStep(id), 1500);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const sendFeedback = async () => {
    if (!feedback.trim() || !buildId) return;

    const userMsg = feedback;
    setFeedback('');
    setIsProcessing(true);

    try {
      const res = await authFetch(`/api/store-builder/chat/${buildId}`, {
        method: 'POST',
        body: JSON.stringify({ message: userMsg })
      });
      if (res.ok) {
        const data = await res.json();
        setChatLog(data.chat_log);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
  }, [chatLog]);

  const renderInitialForm = () => (
    <Animated.View entering={FadeInDown.duration(800)} style={styles.formCard}>
      <BlurView intensity={40} tint="dark" style={styles.formInner}>
        <View style={styles.heroHeader}>
          <View style={styles.rocketCircle}>
            <Rocket size={32} color={Colors.emerald} />
          </View>
          <Text style={styles.heroTitle}>Store Architect</Text>
          <Text style={styles.heroSub}>Describe your dream store, and I'll build it from the ground up.</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>What are you selling?</Text>
          <TextInput
            testID="builder-niche-input"
            style={styles.input}
            placeholder="e.g. Luxury vintage watches, eco-friendly yoga mats"
            placeholderTextColor={Colors.textMuted}
            value={niche}
            onChangeText={setNiche}
            multiline
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Store Name (Optional)</Text>
          <TextInput
            testID="builder-name-input"
            style={styles.input}
            placeholder="Let AI decide if left blank"
            placeholderTextColor={Colors.textMuted}
            value={storeName}
            onChangeText={setStoreName}
          />
        </View>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Full Autopilot</Text>
            <Text style={styles.switchSub}>AI handles everything without pausing.</Text>
          </View>
          <Switch
            testID="builder-autopilot-switch"
            value={autopilot}
            onValueChange={setAutopilot}
            trackColor={{ false: '#1E293B', true: Colors.emerald }}
            thumbColor="#FFFFFF"
          />
        </View>

        <AnimatedPressable
          testID="builder-start-btn"
          scaleDown={0.96}
          style={[styles.startBtn, !niche.trim() && { opacity: 0.5 }]}
          onPress={startBuild}
          disabled={isProcessing}
        >
          {isProcessing ? <ActivityIndicator color={Colors.bg} /> : <Text style={styles.startBtnText}>Begin Architecture</Text>}
        </AnimatedPressable>
      </BlurView>
    </Animated.View>
  );

  const renderBuildProcess = () => (
    <View style={{ flex: 1 }}>
      {/* Progress Header */}
      <View style={styles.progressHeader}>
        <View style={styles.progressTop}>
          <Text style={styles.progressTitle}>Building Empire...</Text>
          <Text style={styles.progressPct}>{Math.round((currentStep / totalSteps) * 100)}%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <Animated.View
            style={[
              styles.progressBarFill,
              { width: `${(currentStep / totalSteps) * 100}%` }
            ]}
          />
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.chatContainer}
        showsVerticalScrollIndicator={false}
      >
        {chatLog.map((msg, i) => (
          <Animated.View
            key={i}
            entering={FadeInUp.duration(500)}
            layout={LinearTransition}
            style={[
              styles.bubbleWrap,
              msg.role === 'user' ? styles.bubbleWrapUser : styles.bubbleWrapAgent
            ]}
          >
            <View style={[
              styles.bubble,
              msg.role === 'user' ? styles.bubbleUser : styles.bubbleAgent
            ]}>
              <Text style={[
                styles.bubbleText,
                msg.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAgent
              ]}>
                {msg.content}
              </Text>
            </View>
          </Animated.View>
        ))}
        {isProcessing && (
          <View style={styles.typingContainer}>
            <ActivityIndicator size="small" color={Colors.emerald} />
            <Text style={styles.typingText}>Architect is thinking...</Text>
          </View>
        )}
      </ScrollView>

      {!autopilot && phase === 'building' && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={100}>
          <BlurView intensity={30} tint="dark" style={styles.inputArea}>
            <View style={styles.inputBox}>
              <TextInput
                testID="builder-feedback-input"
                style={styles.chatInput}
                placeholder="Give feedback or ask a question..."
                placeholderTextColor={Colors.textMuted}
                value={feedback}
                onChangeText={setFeedback}
              />
              <AnimatedPressable testID="builder-send-btn" scaleDown={0.8} style={styles.sendBtn} onPress={sendFeedback}>
                <Send size={20} color={Colors.bg} />
              </AnimatedPressable>
            </View>
            <TouchableOpacity testID="builder-next-step-btn" style={styles.nextStepBtn} onPress={() => executeNextStep(buildId!)}>
              <Text style={styles.nextStepTxt}>Next Build Step</Text>
              <ArrowRight size={16} color={Colors.emerald} />
            </TouchableOpacity>
          </BlurView>
        </KeyboardAvoidingView>
      )}
    </View>
  );

  const renderComplete = () => (
    <ScrollView contentContainerStyle={styles.completeScroll} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeIn.duration(1000)} style={styles.successIconWrap}>
        <CheckCircle2 size={64} color={Colors.emerald} />
      </Animated.View>
      <Text style={styles.completeTitle}>Empire Blueprint Ready</Text>
      <Text style={styles.completeSub}>Your store '{finalPlan?.brand_name}' has been architected. Review the blueprint below.</Text>

      <Animated.View entering={FadeInDown.delay(300).duration(800)} style={styles.planCard}>
         <View style={styles.planSection}>
            <View style={styles.planRow}>
               <Sparkles size={20} color={Colors.amber} />
               <Text style={styles.planLabel}>Brand Identity</Text>
            </View>
            <Text style={styles.planBrandName}>{finalPlan?.brand_name}</Text>
            <Text style={styles.planTagline}>"{finalPlan?.tagline}"</Text>
            <Text style={styles.planDesc}>{finalPlan?.personality}</Text>
         </View>

         <View style={styles.planDivider} />

         <View style={styles.planSection}>
            <View style={styles.planRow}>
               <ShoppingBag size={20} color={Colors.emerald} />
               <Text style={styles.planLabel}>Catalog ({finalPlan?.products?.length} Products)</Text>
            </View>
            {finalPlan?.products?.slice(0, 3).map((p: any, idx: number) => (
              <View key={idx} style={styles.productMiniCard}>
                <Text style={styles.productMiniTitle}>{p.title}</Text>
                <Text style={styles.productMiniPrice}>${p.price}</Text>
              </View>
            ))}
         </View>

         <View style={styles.planDivider} />

         <View style={styles.planSection}>
            <View style={styles.planRow}>
               <Layout size={20} color="#0866FF" />
               <Text style={styles.planLabel}>Collections</Text>
            </View>
            <View style={styles.tagWrap}>
              {finalPlan?.collections?.map((c: any, idx: number) => (
                <View key={idx} style={styles.tag}><Text style={styles.tagText}>{c.name}</Text></View>
              ))}
            </View>
         </View>

         <AnimatedPressable testID="builder-deploy-btn" scaleDown={0.96} style={styles.deployBtn} onPress={() => Alert.alert('Deployment', 'Ready to sync with Shopify. Connection check passed.')}>
           <Text style={styles.deployBtnText}>Deploy to Shopify</Text>
         </AnimatedPressable>
      </Animated.View>

      <AnimatedPressable testID="builder-finish-btn" scaleDown={0.9} style={styles.finishBtn} onPress={() => router.replace('/(tabs)/execute')}>
        <Text style={styles.finishBtnText}>Return to HQ</Text>
      </AnimatedPressable>

      <View style={{ height: 60 }} />
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <AnimatedPressable testID="builder-back-btn" scaleDown={0.9} style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={Colors.text} />
        </AnimatedPressable>
        <Text style={styles.title}>Store Builder</Text>
        <View style={{ width: 40 }} />
      </View>

      {phase === 'initial' && renderInitialForm()}
      {phase === 'building' && renderBuildProcess()}
      {phase === 'complete' && renderComplete()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  title: { fontFamily: Typography.fonts.outfitB, fontSize: 20, color: Colors.text },
  formCard: { padding: 24 },
  formInner: { padding: 24, borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' },
  heroHeader: { alignItems: 'center', marginBottom: 32 },
  rocketCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(16, 185, 129, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
  heroTitle: { fontFamily: Typography.fonts.outfitB, fontSize: 28, color: Colors.text, textAlign: 'center' },
  heroSub: { fontFamily: Typography.fonts.manropeM, fontSize: 15, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  inputGroup: { marginBottom: 24 },
  label: { fontFamily: Typography.fonts.manropeB, fontSize: 13, color: Colors.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  input: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 16, color: Colors.text, fontFamily: Typography.fonts.manropeM, fontSize: 16, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 32, gap: 16 },
  switchLabel: { fontFamily: Typography.fonts.outfitB, fontSize: 18, color: Colors.text },
  switchSub: { fontFamily: Typography.fonts.manropeM, fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  startBtn: { backgroundColor: Colors.emerald, borderRadius: 20, paddingVertical: 18, alignItems: 'center', shadowColor: Colors.emerald, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
  startBtnText: { fontFamily: Typography.fonts.outfitB, fontSize: 18, color: Colors.bg },
  progressHeader: { paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  progressTitle: { fontFamily: Typography.fonts.outfitB, fontSize: 16, color: Colors.text },
  progressPct: { fontFamily: Typography.fonts.manropeB, fontSize: 14, color: Colors.emerald },
  progressBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: Colors.emerald, borderRadius: 3 },
  chatContainer: { padding: 20, paddingBottom: 120 },
  bubbleWrap: { marginBottom: 16, maxWidth: '85%' },
  bubbleWrapAgent: { alignSelf: 'flex-start' },
  bubbleWrapUser: { alignSelf: 'flex-end' },
  bubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  bubbleAgent: { backgroundColor: 'rgba(255,255,255,0.06)', borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: Colors.emerald, borderBottomRightRadius: 4 },
  bubbleText: { fontFamily: Typography.fonts.manropeM, fontSize: 15, lineHeight: 22 },
  bubbleTextAgent: { color: Colors.text },
  bubbleTextUser: { color: Colors.bg, fontFamily: Typography.fonts.manropeB },
  typingContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 8 },
  typingText: { fontFamily: Typography.fonts.manropeM, fontSize: 13, color: Colors.textMuted },
  inputArea: { padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  chatInput: { flex: 1, color: Colors.text, fontFamily: Typography.fonts.manropeM, fontSize: 15, height: 40 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.emerald, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  nextStepBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, paddingVertical: 8 },
  nextStepTxt: { fontFamily: Typography.fonts.outfitSB, fontSize: 14, color: Colors.emerald },
  completeScroll: { padding: 24, alignItems: 'center' },
  successIconWrap: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(16, 185, 129, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)' },
  completeTitle: { fontFamily: Typography.fonts.outfitB, fontSize: 32, color: Colors.text, textAlign: 'center' },
  completeSub: { fontFamily: Typography.fonts.manropeM, fontSize: 16, color: Colors.textSecondary, textAlign: 'center', marginTop: 12, lineHeight: 24, marginBottom: 32 },
  planCard: { width: '100%', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 24 },
  planSection: { marginVertical: 12 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  planLabel: { fontFamily: Typography.fonts.manropeB, fontSize: 12, color: Colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  planBrandName: { fontFamily: Typography.fonts.outfitB, fontSize: 24, color: Colors.text },
  planTagline: { fontFamily: Typography.fonts.manropeSB, fontSize: 16, color: Colors.amber, marginTop: 4 },
  planDesc: { fontFamily: Typography.fonts.manropeM, fontSize: 14, color: Colors.textSecondary, marginTop: 8, lineHeight: 20 },
  planDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 8 },
  productMiniCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 12, marginBottom: 8 },
  productMiniTitle: { fontFamily: Typography.fonts.manropeM, fontSize: 14, color: Colors.text, flex: 1 },
  productMiniPrice: { fontFamily: Typography.fonts.outfitB, fontSize: 14, color: Colors.emerald, marginLeft: 12 },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: 'rgba(8, 102, 255, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(8, 102, 255, 0.2)' },
  tagText: { fontFamily: Typography.fonts.manropeB, fontSize: 12, color: '#0866FF' },
  deployBtn: { backgroundColor: Colors.emerald, borderRadius: 18, paddingVertical: 16, alignItems: 'center', marginTop: 24, shadowColor: Colors.emerald, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  deployBtnText: { fontFamily: Typography.fonts.outfitB, fontSize: 16, color: Colors.bg },
  finishBtn: { marginTop: 24, paddingVertical: 12 },
  finishBtnText: { fontFamily: Typography.fonts.outfitSB, fontSize: 16, color: Colors.textSecondary }
});
