import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { authFetch } from '../../utils/api';
import { Colors, Spacing, BorderRadius, FontSizes, Shadows } from '../../constants/theme';

const { width } = Dimensions.get('window');

type Metrics = {
  total_stores: number; active_agents: number; tasks_completed: number;
  total_revenue: number; total_orders: number; social_posts: number;
  recent_activity: Array<{ type: string; message: string; timestamp: string }>;
};

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
    </View></SafeAreaView>
  );

  const cards = [
    { label: 'STORES', value: metrics?.total_stores ?? 0, color: Colors.emerald, icon: '🏪' },
    { label: 'AGENTS', value: metrics?.active_agents ?? 0, color: Colors.amber, icon: '🤖' },
    { label: 'REVENUE', value: `$${(metrics?.total_revenue ?? 0).toLocaleString()}`, color: Colors.cyan, icon: '💰' },
    { label: 'ORDERS', value: metrics?.total_orders ?? 0, color: Colors.rose, icon: '📦' },
    { label: 'TASKS DONE', value: metrics?.tasks_completed ?? 0, color: Colors.emerald, icon: '✅' },
    { label: 'POSTS', value: metrics?.social_posts ?? 0, color: Colors.amber, icon: '📣' },
  ];

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMetrics(); }} tintColor={Colors.emerald} />}>

        <View style={s.header}>
          <View>
            <Text style={s.overline}>COMMAND CENTER</Text>
            <Text style={s.heroTitle}>orchestr<Text style={{ color: Colors.emerald }}>AI</Text></Text>
            <Text style={s.subtitle}>Welcome, {user?.name || 'Maestro'}</Text>
          </View>
          <TouchableOpacity testID="logout-btn" onPress={logout} style={s.logoutBtn}>
            <Text style={s.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={s.grid}>
          {cards.map((m, i) => (
            <TouchableOpacity key={i} testID={`metric-card-${i}`}
              style={[s.metricCard, { borderColor: m.color + '20' }]} activeOpacity={0.8}>
              <View style={[s.iconWrap, { backgroundColor: m.color + '15' }]}>
                <Text style={s.icon}>{m.icon}</Text>
              </View>
              <Text style={[s.metricVal, { color: m.color }]}>{m.value}</Text>
              <Text style={s.metricLabel}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Agent Fleet Status</Text>
          {[
            { name: 'Store Commander', color: Colors.emerald },
            { name: 'Growth Engine', color: Colors.amber },
            { name: 'Insight Oracle', color: Colors.cyan },
            { name: 'Support Shield', color: Colors.rose },
          ].map((a, i) => (
            <View key={i} style={s.agentRow}>
              <View style={[s.agentDot, { backgroundColor: a.color }]} />
              <Text style={s.agentName}>{a.name}</Text>
              <Text style={[s.agentStatus, { color: a.color }]}>ONLINE</Text>
            </View>
          ))}
        </View>

        {(metrics?.recent_activity?.length ?? 0) > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Recent Activity</Text>
            {metrics?.recent_activity.map((a, i) => (
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

const cw = (width - Spacing.lg * 2 - Spacing.md) / 2;
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: Spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xxl },
  overline: { fontSize: FontSizes.xs, fontWeight: '800', letterSpacing: 3, color: Colors.emerald, marginBottom: 4 },
  heroTitle: { fontSize: FontSizes.hero, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -1 },
  subtitle: { fontSize: FontSizes.md, color: Colors.textSecondary, marginTop: 4 },
  logoutBtn: { backgroundColor: Colors.surfaceElevated, paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border },
  logoutText: { color: Colors.rose, fontSize: FontSizes.sm, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.xxl },
  metricCard: { width: cw, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, ...Shadows.card },
  iconWrap: { width: 40, height: 40, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm },
  icon: { fontSize: 20 },
  metricVal: { fontSize: FontSizes.xxl, fontWeight: '900', letterSpacing: -0.5 },
  metricLabel: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5, marginTop: 4 },
  section: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg, ...Shadows.card },
  sectionTitle: { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.lg },
  agentRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  agentDot: { width: 10, height: 10, borderRadius: 5 },
  agentName: { flex: 1, fontSize: FontSizes.md, color: Colors.textPrimary, fontWeight: '600' },
  agentStatus: { fontSize: FontSizes.xs, fontWeight: '800', letterSpacing: 1 },
  actItem: { flexDirection: 'row', gap: Spacing.md, paddingVertical: Spacing.sm },
  actDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.emerald, marginTop: 6 },
  actMsg: { fontSize: FontSizes.md, color: Colors.textPrimary, fontWeight: '500' },
  actTime: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
});
