import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { authFetch } from '../../utils/api';
import { Colors, Spacing, BorderRadius, FontSizes, Shadows } from '../../constants/theme';

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
    <View style={tb.banner}>
      <View style={tb.left}>
        <Text style={tb.icon}>✨</Text>
        <View>
          <Text style={tb.title}>Free Trial</Text>
          <Text style={tb.sub}>{days} days remaining</Text>
        </View>
      </View>
      <TouchableOpacity style={tb.btn}><Text style={tb.btnText}>Upgrade</Text></TouchableOpacity>
    </View>
  );
}

function OnboardingChecklist({ metrics }: { metrics: Metrics }) {
  const router = useRouter();
  const steps = [
    { done: true, label: 'Create your account', icon: '✅' },
    { done: metrics.active_agents > 0, label: 'Activate AI agents', icon: metrics.active_agents > 0 ? '✅' : '🤖', route: '/(tabs)/agents' },
    { done: metrics.total_stores > 0, label: 'Connect your first store', icon: metrics.total_stores > 0 ? '✅' : '🏪', route: '/(tabs)/stores' },
    { done: metrics.social_posts > 0, label: 'Generate social content', icon: metrics.social_posts > 0 ? '✅' : '✨', route: '/(tabs)/social' },
    { done: metrics.tasks_completed > 0, label: 'Chat with an agent', icon: metrics.tasks_completed > 0 ? '✅' : '💬', route: '/(tabs)/chat' },
  ];
  const completed = steps.filter(s => s.done).length;
  if (completed >= steps.length) return null;

  return (
    <View style={ob.card}>
      <View style={ob.headerRow}>
        <Text style={ob.title}>Getting Started</Text>
        <Text style={ob.progress}>{completed}/{steps.length}</Text>
      </View>
      <View style={ob.progressBar}>
        <View style={[ob.progressFill, { width: `${(completed / steps.length) * 100}%` }]} />
      </View>
      {steps.map((step, i) => (
        <TouchableOpacity key={i} style={ob.step} activeOpacity={step.done ? 1 : 0.7}
          onPress={() => !step.done && step.route && router.push(step.route as any)}>
          <Text style={ob.stepIcon}>{step.icon}</Text>
          <Text style={[ob.stepLabel, step.done && ob.stepDone]}>{step.label}</Text>
          {!step.done && <Text style={ob.stepArrow}>→</Text>}
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await authFetch('/api/dashboard');
      if (res.ok) setMetrics(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  if (loading) return (
    <SafeAreaView style={s.container}><View style={s.center}>
      <ActivityIndicator size="large" color={Colors.emerald} />
      <Text style={s.loadingText}>Tuning the symphony...</Text>
    </View></SafeAreaView>
  );

  const cards = [
    { label: 'REVENUE', value: `$${(metrics?.total_revenue ?? 0).toLocaleString()}`, color: Colors.emerald, icon: '💰', wide: true },
    { label: 'STORES', value: metrics?.total_stores ?? 0, color: '#96BF48', icon: '🏪' },
    { label: 'AGENTS', value: metrics?.active_agents ?? 0, color: '#1DA1F2', icon: '🤖' },
    { label: 'ORDERS', value: metrics?.total_orders ?? 0, color: Colors.cyan, icon: '📦' },
    { label: 'TASKS', value: metrics?.tasks_completed ?? 0, color: Colors.amber, icon: '✅' },
    { label: 'POSTS', value: metrics?.social_posts ?? 0, color: '#E60023', icon: '📣', wide: true },
  ];

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMetrics(); }} tintColor={Colors.emerald} />}>

        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Welcome back</Text>
            <Text style={s.heroTitle}>{user?.name || 'Command Center'}</Text>
          </View>
          <TouchableOpacity testID="logout-btn" onPress={logout} style={s.logoutBtn}>
            <Text style={s.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <TrialBanner trialEnds={(user as any)?.trial_ends_at} />
        {metrics && <OnboardingChecklist metrics={metrics} />}

        {/* Bento Grid */}
        <View style={s.grid}>
          {cards.map((m, i) => (
            <TouchableOpacity key={i} testID={`metric-card-${i}`}
              style={[s.metricCard, (m as any).wide && s.metricWide, { borderColor: m.color + '12' }]} activeOpacity={0.8}>
              <View style={s.metricTop}>
                <Text style={{ fontSize: 22 }}>{m.icon}</Text>
                <Text style={s.metricLabel}>{m.label}</Text>
              </View>
              <Text style={[s.metricVal, { color: m.color }]}>{m.value}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Agent Fleet — platform agents */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Agent Fleet</Text>
          {[
            { name: 'Shopify Executive Assistant', color: '#96BF48', icon: '🛍️' },
            { name: 'Twitter Executive Assistant', color: '#1DA1F2', icon: '🐦' },
            { name: 'Pinterest Executive Assistant', color: '#E60023', icon: '📌' },
            { name: 'Analytics Command Center', color: Colors.cyan, icon: '📊' },
          ].map((a, i) => (
            <View key={i} style={s.agentRow}>
              <Text style={{ fontSize: 18 }}>{a.icon}</Text>
              <Text style={s.agentName} numberOfLines={1}>{a.name}</Text>
              <View style={[s.agentPill, { backgroundColor: a.color + '15', borderColor: a.color + '25' }]}>
                <View style={[s.agentDot, { backgroundColor: a.color }]} />
                <Text style={[s.agentStatus, { color: a.color }]}>LIVE</Text>
              </View>
            </View>
          ))}
        </View>

        {(metrics?.recent_activity?.length ?? 0) > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Recent Activity</Text>
            {metrics?.recent_activity.slice(0, 5).map((a, i) => (
              <View key={i} style={s.actItem}>
                <View style={s.actDot} />
                <View style={{ flex: 1 }}>
                  <Text style={s.actMsg}>{a.message}</Text>
                  <Text style={s.actTime}>{new Date(a.timestamp).toLocaleString()}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const cw = (width - 28 * 2 - 12) / 2;
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: Colors.textSecondary, fontSize: FontSizes.md },
  scroll: { padding: 28 },
  // Header — minimal, big name
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xl },
  greeting: { fontSize: FontSizes.sm, fontWeight: '400', color: Colors.textMuted, marginBottom: 2 },
  heroTitle: { fontSize: 30, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -0.8 },
  logoutBtn: { backgroundColor: Colors.surfaceGlass, paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.borderGlass },
  logoutText: { color: Colors.rose, fontSize: FontSizes.xs, fontWeight: '700' },
  // Bento Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: Spacing.xxl },
  metricCard: {
    width: cw, backgroundColor: Colors.surfaceGlass, borderRadius: 20,
    padding: 20, borderWidth: 1, ...Shadows.glass,
  },
  metricWide: { width: '100%' },
  metricTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  metricVal: { fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  metricLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 2, textTransform: 'uppercase' },
  // Sections — glass cards
  section: { backgroundColor: Colors.surfaceGlass, borderRadius: 22, padding: 22, borderWidth: 1, borderColor: Colors.borderGlass, marginBottom: Spacing.lg, ...Shadows.glass },
  sectionTitle: { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.lg },
  agentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  agentDot: { width: 6, height: 6, borderRadius: 3 },
  agentName: { flex: 1, fontSize: FontSizes.sm, color: Colors.textPrimary, fontWeight: '600' },
  agentPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full, borderWidth: 1 },
  agentStatus: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  actItem: { flexDirection: 'row', gap: Spacing.md, paddingVertical: Spacing.sm },
  actDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.emerald, marginTop: 7 },
  actMsg: { fontSize: FontSizes.sm, color: Colors.textPrimary, fontWeight: '500', lineHeight: 20 },
  actTime: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
});

const tb = StyleSheet.create({
  banner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.emeraldGlow, borderRadius: BorderRadius.lg, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.emerald + '30', marginBottom: Spacing.xl,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  icon: { fontSize: 24 },
  title: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.emerald },
  sub: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  btn: { backgroundColor: Colors.emerald, paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.lg },
  btnText: { fontSize: FontSizes.sm, fontWeight: '800', color: Colors.bg },
});

const ob = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl,
    borderWidth: 1, borderColor: Colors.emerald + '20', marginBottom: Spacing.xl, ...Shadows.card,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  title: { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.textPrimary },
  progress: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.emerald },
  progressBar: { height: 4, backgroundColor: Colors.surfaceElevated, borderRadius: 2, marginBottom: Spacing.lg },
  progressFill: { height: 4, backgroundColor: Colors.emerald, borderRadius: 2 },
  step: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 10 },
  stepIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  stepLabel: { flex: 1, fontSize: FontSizes.md, color: Colors.textPrimary, fontWeight: '600' },
  stepDone: { color: Colors.textMuted, textDecorationLine: 'line-through' },
  stepArrow: { fontSize: FontSizes.lg, color: Colors.emerald, fontWeight: '700' },
});
