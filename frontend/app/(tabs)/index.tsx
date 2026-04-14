import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { authFetch } from '../../utils/api';
import { Colors, Spacing, BorderRadius, FontSizes, Shadows, Fonts } from '../../constants/theme';
import { BlurView } from 'expo-blur';
import { Sparkles, ArrowRight, Store, Bot, CheckCircle2, DollarSign, ShoppingCart, Share2, Activity, ShieldCheck, TrendingUp } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn, SlideInRight } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { AnimatedPressable } from '../../components/AnimatedPressable';

const { width } = Dimensions.get('window');

type Metrics = {
  total_stores: number; active_agents: number; tasks_completed: number;
  total_revenue: number; total_orders: number; social_posts: number;
  recent_activity: Array<{ type: string; message: string; timestamp: string }>;
};

function TrialBanner({ trialEnds }: { trialEnds?: string }) {
  if (!trialEnds) return null;
  const end = new Date(trialEnds);
  const now = new Date();
  const days = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  
  return (
    <Animated.View entering={FadeInDown.duration(600).delay(100)}>
      <BlurView intensity={40} tint="dark" style={tb.banner}>
        <View style={tb.left}>
          <View style={tb.iconContainer}>
            <Sparkles size={20} color={Colors.emerald} />
          </View>
          <View>
            <Text style={tb.title}>Free Trial</Text>
            <Text style={tb.sub}>{days} days remaining</Text>
          </View>
        </View>
        <AnimatedPressable haptic={Haptics.ImpactFeedbackStyle.Medium} style={tb.btn} scaleDown={0.92}>
          <Text style={tb.btnText}>Upgrade</Text>
        </AnimatedPressable>
      </BlurView>
    </Animated.View>
  );
}

function StatCard({ title, value, sub, Icon, color, delay }: { title: string, value: string | number, sub?: string, Icon: any, color: string, delay: number }) {
  return (
    <Animated.View entering={FadeInDown.duration(600).delay(delay)} style={[stat.card, { borderColor: `${color}30` }]}>
      <BlurView intensity={30} tint="dark" style={stat.blurInner}>
        <View style={[stat.iconWrap, { backgroundColor: `${color}15` }]}>
          <Icon size={20} color={color} />
        </View>
        <Text style={stat.title}>{title}</Text>
        <Text style={stat.val}>{value}</Text>
        {sub && <Text style={stat.sub}>{sub}</Text>}
      </BlurView>
    </Animated.View>
  );
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [refreshing, setRefreshing] = useState(true);

  const fetchDash = useCallback(async () => {
    try {
      const res = await authFetch('/api/dashboard');
      if (res.ok) setMetrics(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchDash(); }, [fetchDash]);

  if (!metrics && refreshing) {
    return <View style={s.center}><ActivityIndicator size="large" color={Colors.emerald} /></View>;
  }
  if (!metrics) return null;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Animated.View entering={FadeIn.duration(800)} style={s.header}>
        <View>
          <Text style={s.greets}>Good morning,</Text>
          <Text style={s.name}>{user?.name?.split(' ')[0] || 'Founder'}</Text>
        </View>
        <AnimatedPressable haptic={Haptics.ImpactFeedbackStyle.Light} scaleDown={0.9} style={s.profileBtn}>
          <Text style={s.profileInit}>{(user?.name?.[0] || 'O').toUpperCase()}</Text>
        </AnimatedPressable>
      </Animated.View>

      <ScrollView 
        contentContainerStyle={s.scroll} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setRefreshing(true); fetchDash(); }} tintColor={Colors.emerald} />}
      >
        <TrialBanner trialEnds={user?.trial_ends_at} />
        
        <Animated.Text entering={FadeInDown.duration(600).delay(200)} style={s.secTitle}>Operations</Animated.Text>
        <View style={s.grid}>
          <StatCard title="Revenue" value={`$${metrics.total_revenue.toLocaleString()}`} sub={`${metrics.total_orders} Total Orders`} Icon={DollarSign} color={Colors.emerald} delay={200} />
          <StatCard title="Storefronts" value={metrics.total_stores} sub="Active connections" Icon={Store} color="#0866FF" delay={300} />
          <StatCard title="AI Workforce" value={metrics.active_agents} sub="Online & active" Icon={Bot} color="#F1641E" delay={400} />
          <StatCard title="Actions Run" value={metrics.tasks_completed} sub="Automated tasks" Icon={TrendingUp} color="#FE2C55" delay={500} />
        </View>
        
        <Animated.Text entering={FadeInDown.duration(600).delay(600)} style={[s.secTitle, { marginTop: 32 }]}>Execution Log</Animated.Text>
        
        <Animated.View entering={FadeInDown.duration(600).delay(700)} style={act.cardWrap}>
          <BlurView intensity={30} tint="dark" style={act.card}>
            {metrics.recent_activity.length > 0 ? (
              <View style={act.list}>
                {metrics.recent_activity.map((a, i) => (
                  <View key={i} style={[act.row, i === metrics.recent_activity.length - 1 && act.lastRow]}>
                    <View style={act.dotWrap}>
                      <View style={act.dotTop} />
                      {i < metrics.recent_activity.length - 1 && <View style={act.dotLine} />}
                    </View>
                    <View style={act.rowTxt}>
                      <Text style={act.msg}>{a.message}</Text>
                      <Text style={act.time}>{new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={act.empty}>
                <ShieldCheck size={32} color={Colors.textMuted} />
                <Text style={act.emptyTxt}>No orchestrAI activity yet.</Text>
              </View>
            )}
          </BlurView>
        </Animated.View>
        
        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 24, paddingTop: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  greets: { color: Colors.textSecondary, fontSize: 16, fontFamily: Fonts.bodyMedium, marginBottom: 2 },
  name: { color: Colors.textPrimary, fontSize: 32, fontFamily: Fonts.bold, letterSpacing: -0.5 },
  profileBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: `${Colors.emerald}15`, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: `${Colors.emerald}40` },
  profileInit: { color: Colors.emerald, fontSize: 20, fontFamily: Fonts.bold },
  secTitle: { color: Colors.textPrimary, fontSize: 22, fontFamily: Fonts.bold, marginTop: 24, marginBottom: 16, letterSpacing: -0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
});

const tb = StyleSheet.create({
  banner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: `${Colors.emerald}15`, padding: 20, borderRadius: 24, marginBottom: 12, borderWidth: 1, borderColor: `${Colors.emerald}40`, overflow: 'hidden' },
  left: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: `${Colors.emerald}25`, justifyContent: 'center', alignItems: 'center' },
  title: { color: Colors.emerald, fontSize: 18, fontFamily: Fonts.bold },
  sub: { color: Colors.emerald, opacity: 0.8, fontSize: 14, fontFamily: Fonts.bodyMedium, marginTop: 2 },
  btn: { backgroundColor: Colors.emerald, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, shadowColor: Colors.emerald, shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  btnText: { color: '#000', fontSize: 15, fontFamily: Fonts.bold },
});

const stat = StyleSheet.create({
  card: { width: (width - 64) / 2, backgroundColor: `${Colors.surface}80`, borderRadius: 24, borderWidth: 1, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 8 },
  blurInner: { padding: 20, alignItems: 'flex-start', minHeight: 150 },
  iconWrap: { width: 44, height: 44, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { color: Colors.textSecondary, fontSize: 14, fontFamily: Fonts.bodyMedium, marginBottom: 8 },
  val: { color: Colors.textPrimary, fontSize: 28, fontFamily: Fonts.bold, letterSpacing: -0.5 },
  sub: { color: Colors.textMuted, fontSize: 13, fontFamily: Fonts.bodyRegular, marginTop: 6 },
});

const act = StyleSheet.create({
  cardWrap: { borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  card: { backgroundColor: `${Colors.surface}60`, padding: 24 },
  list: { marginTop: 4 },
  row: { flexDirection: 'row', minHeight: 56 },
  lastRow: { minHeight: 0 },
  dotWrap: { width: 24, alignItems: 'center', marginRight: 16 },
  dotTop: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.emerald, marginTop: 4, zIndex: 1, shadowColor: Colors.emerald, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6 },
  dotLine: { width: 2, flex: 1, backgroundColor: `${Colors.emerald}40`, marginTop: -4, marginBottom: -4 },
  rowTxt: { flex: 1, paddingBottom: 28, paddingTop: 0 },
  msg: { color: Colors.textPrimary, fontSize: 16, fontFamily: Fonts.bodyMedium, lineHeight: 24 },
  time: { color: Colors.textMuted, fontSize: 13, fontFamily: Fonts.bodyRegular, marginTop: 6 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyTxt: { color: Colors.textSecondary, fontSize: 15, fontFamily: Fonts.bodyMedium, textAlign: 'center' },
});
