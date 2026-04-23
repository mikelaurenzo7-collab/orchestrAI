import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Colors, Typography, Spacing, Shadows } from '../constants/theme';
import { Check, ChevronLeft, Zap, ShieldCheck, Rocket, Sparkles, TrendingUp, Info } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown, SlideInRight } from 'react-native-reanimated';
import { AnimatedPressable } from '../components/AnimatedPressable';
import * as Haptics from 'expo-haptics';
import { authFetch } from '../utils/api';

const { width } = Dimensions.get('window');

interface PlanLimit {
  max_agents: number | string;
  max_stores: number | string;
  max_social_connectors: number | string;
  actions_per_month: number | string;
}

interface UserPlanInfo {
  plan: string;
  limits: PlanLimit;
  usage: {
    agents: number;
    stores: number;
    actions_this_month: number;
  };
}

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$29',
    interval: 'month',
    color: Colors.emerald,
    desc: 'Perfect for new sellers.',
    features: ['1 Store Connection', '3 AI Agents', '1,000 Actions/mo', 'Basic Analytics', 'Safety Controls']
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '$79',
    interval: 'month',
    color: '#0866FF',
    popular: true,
    desc: 'Scale your operations.',
    features: ['3 Store Connections', '8 AI Agents', '5,000 Actions/mo', 'Marketing Suite', 'Finance AI', 'Priority Support']
  },
  {
    id: 'business',
    name: 'Business',
    price: '$199',
    interval: 'month',
    color: '#F1641E',
    desc: 'Full autonomous fleet.',
    features: ['All 7 Store Platforms', 'All 16 AI Agents', '25,000 Actions/mo', 'Custom Workflows', 'Legal & HR AI', 'Enterprise Security']
  }
];

export default function PricingScreen() {
  const router = useRouter();
  const [userPlan, setUserPlan] = useState<UserPlanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  const fetchLimits = useCallback(async () => {
    try {
      const res = await authFetch('/api/plan/limits');
      if (res.ok) setUserPlan(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLimits();
  }, [fetchLimits]);

  const handleUpgrade = async (planId: string) => {
    if (userPlan?.plan === planId) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setUpgrading(planId);

    try {
      const res = await authFetch('/api/plan/upgrade', {
        method: 'POST',
        body: JSON.stringify({ plan: planId })
      });

      if (res.ok) {
        const data = await res.json();
        Alert.alert('Success', data.message);
        fetchLimits();
      } else {
        const err = await res.json();
        Alert.alert('Error', err.detail || 'Upgrade failed');
      }
    } catch (e) {
      Alert.alert('Error', 'Connection error. Please try again.');
    } finally {
      setUpgrading(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.emerald} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <AnimatedPressable testID="pricing-back" scaleDown={0.9} style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={Colors.text} />
        </AnimatedPressable>
        <Text style={styles.title}>Subscription</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Current Plan Usage */}
        <Animated.View entering={FadeIn.duration(800)} style={styles.usageCard}>
          <BlurView intensity={30} tint="dark" style={styles.usageInner}>
            <View style={styles.usageHeader}>
              <View>
                <Text style={styles.usageLabel}>Current Plan</Text>
                <Text style={styles.currentPlanName}>{userPlan?.plan.toUpperCase()}</Text>
              </View>
              <View style={styles.usageIcon}>
                <ShieldCheck size={24} color={Colors.emerald} />
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{userPlan?.usage.agents} / {userPlan?.limits.max_agents}</Text>
                <Text style={styles.statLabel}>Agents</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{userPlan?.usage.stores} / {userPlan?.limits.max_stores}</Text>
                <Text style={styles.statLabel}>Stores</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{userPlan?.usage.actions_this_month}</Text>
                <Text style={styles.statLabel}>Actions Run</Text>
              </View>
            </View>
          </BlurView>
        </Animated.View>

        <Text style={styles.secTitle}>Choose Your Tier</Text>
        <Text style={styles.secSub}>Power up your autonomous workforce.</Text>

        {PLANS.map((plan, i) => (
          <Animated.View key={plan.id} entering={FadeInDown.delay(200 + i * 150).duration(600)}>
            <TouchableOpacity
              testID={`plan-card-${plan.id}`}
              activeOpacity={0.9}
              disabled={userPlan?.plan === plan.id}
              style={[
                styles.planCard,
                { borderColor: plan.popular ? plan.color : 'rgba(255,255,255,0.06)' },
                userPlan?.plan === plan.id && styles.activePlanCard
              ]}
              onPress={() => handleUpgrade(plan.id)}
            >
              {plan.popular && (
                <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
                  <Sparkles size={12} color={Colors.bg} fill={Colors.bg} />
                  <Text style={styles.popularText}>MOST POPULAR</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <View>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planDesc}>{plan.desc}</Text>
                </View>
                <View style={styles.priceWrap}>
                  <Text style={styles.price}>{plan.price}</Text>
                  <Text style={styles.interval}>/{plan.interval}</Text>
                </View>
              </View>

              <View style={styles.featureList}>
                {plan.features.map((feat, idx) => (
                  <View key={idx} style={styles.featureRow}>
                    <Check size={16} color={plan.color} strokeWidth={3} />
                    <Text style={styles.featureText}>{feat}</Text>
                  </View>
                ))}
              </View>

              <AnimatedPressable
                testID={`upgrade-btn-${plan.id}`}
                scaleDown={0.96}
                style={[
                  styles.upgradeBtn,
                  { backgroundColor: userPlan?.plan === plan.id ? 'rgba(255,255,255,0.05)' : plan.color }
                ]}
                onPress={() => handleUpgrade(plan.id)}
                disabled={userPlan?.plan === plan.id || !!upgrading}
              >
                {upgrading === plan.id ? (
                  <ActivityIndicator color={Colors.bg} size="small" />
                ) : (
                  <Text style={[styles.upgradeBtnText, { color: userPlan?.plan === plan.id ? Colors.textDisabled : Colors.bg }]}>
                    {userPlan?.plan === plan.id ? 'Current Plan' : `Upgrade to ${plan.name}`}
                  </Text>
                )}
              </AnimatedPressable>
            </TouchableOpacity>
          </Animated.View>
        ))}

        <View style={styles.enterpriseBox}>
          <Rocket size={24} color={Colors.textSecondary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.entTitle}>Need more power?</Text>
            <Text style={styles.entSub}>Custom agents, unlimited scale, and dedicated support for large empires.</Text>
          </View>
          <TouchableOpacity testID="pricing-contact" style={styles.contactBtn}>
             <Text style={styles.contactTxt}>Contact</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  title: { fontFamily: Typography.fonts.outfitB, fontSize: 20, color: Colors.text },
  scroll: { padding: 24 },
  usageCard: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 32 },
  usageInner: { padding: 20 },
  usageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  usageLabel: { fontFamily: Typography.fonts.manropeB, fontSize: 12, color: Colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  currentPlanName: { fontFamily: Typography.fonts.outfitB, fontSize: 24, color: Colors.emerald, marginTop: 4 },
  usageIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(16, 185, 129, 0.1)', justifyContent: 'center', alignItems: 'center' },
  statsGrid: { flexDirection: 'row', alignItems: 'center' },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: { fontFamily: Typography.fonts.outfitB, fontSize: 18, color: Colors.text },
  statLabel: { fontFamily: Typography.fonts.manropeM, fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.06)' },
  secTitle: { fontFamily: Typography.fonts.outfitB, fontSize: 28, color: Colors.text, letterSpacing: -0.5 },
  secSub: { fontFamily: Typography.fonts.manropeM, fontSize: 15, color: Colors.textSecondary, marginTop: 6, marginBottom: 24 },
  planCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 28, borderWidth: 1, padding: 24, marginBottom: 20 },
  activePlanCard: { opacity: 0.8 },
  popularBadge: { position: 'absolute', top: -12, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  popularText: { fontFamily: Typography.fonts.outfitB, fontSize: 10, color: Colors.bg, letterSpacing: 0.5 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  planName: { fontFamily: Typography.fonts.outfitB, fontSize: 22, color: Colors.text },
  planDesc: { fontFamily: Typography.fonts.manropeM, fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  priceWrap: { alignItems: 'flex-end' },
  price: { fontFamily: Typography.fonts.outfitB, fontSize: 28, color: Colors.text },
  interval: { fontFamily: Typography.fonts.manropeM, fontSize: 12, color: Colors.textMuted },
  featureList: { gap: 14, marginBottom: 28 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureText: { fontFamily: Typography.fonts.manropeM, fontSize: 15, color: Colors.textSecondary },
  upgradeBtn: { borderRadius: 18, paddingVertical: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  upgradeBtnText: { fontFamily: Typography.fonts.outfitB, fontSize: 16 },
  enterpriseBox: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', marginTop: 12 },
  entTitle: { fontFamily: Typography.fonts.outfitB, fontSize: 16, color: Colors.text },
  entSub: { fontFamily: Typography.fonts.manropeM, fontSize: 13, color: Colors.textMuted, marginTop: 2, lineHeight: 18 },
  contactBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)' },
  contactTxt: { fontFamily: Typography.fonts.manropeB, fontSize: 13, color: Colors.textSecondary }
});
