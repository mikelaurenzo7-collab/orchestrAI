import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSizes, Shadows } from '../../constants/theme';

const API = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width } = Dimensions.get('window');

type Metrics = {
  total_stores: number;
  active_agents: number;
  tasks_completed: number;
  total_revenue: number;
  total_orders: number;
  social_posts: number;
  recent_activity: Array<{ type: string; message: string; timestamp: string }>;
};

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      setMetrics(data);
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  const onRefresh = () => { setRefreshing(true); fetchMetrics(); };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.emerald} />
          <Text style={styles.loadingText}>Initializing Command Center...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const metricCards = [
    { label: 'STORES', value: metrics?.total_stores ?? 0, color: Colors.emerald, icon: '🏪' },
    { label: 'AGENTS', value: metrics?.active_agents ?? 0, color: Colors.amber, icon: '🤖' },
    { label: 'REVENUE', value: `$${(metrics?.total_revenue ?? 0).toLocaleString()}`, color: Colors.cyan, icon: '💰' },
    { label: 'ORDERS', value: metrics?.total_orders ?? 0, color: Colors.rose, icon: '📦' },
    { label: 'TASKS DONE', value: metrics?.tasks_completed ?? 0, color: Colors.emerald, icon: '✅' },
    { label: 'POSTS', value: metrics?.social_posts ?? 0, color: Colors.amber, icon: '📣' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.emerald} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.overline}>COMMAND CENTER</Text>
            <Text style={styles.heroTitle}>THEONE</Text>
            <Text style={styles.subtitle}>Your AI eCommerce Empire</Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>LIVE</Text>
          </View>
        </View>

        {/* Metric Grid */}
        <View style={styles.metricGrid}>
          {metricCards.map((m, i) => (
            <TouchableOpacity
              key={i}
              testID={`metric-card-${m.label.toLowerCase().replace(' ', '-')}`}
              style={[styles.metricCard, { borderColor: m.color + '20' }]}
              activeOpacity={0.8}
            >
              <View style={[styles.metricIconWrap, { backgroundColor: m.color + '15' }]}>
                <Text style={styles.metricIcon}>{m.icon}</Text>
              </View>
              <Text style={[styles.metricValue, { color: m.color }]}>{m.value}</Text>
              <Text style={styles.metricLabel}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Agent Status */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Agent Fleet Status</Text>
          <View style={styles.agentStatusRow}>
            {[
              { name: 'Store Commander', type: 'store_manager', color: Colors.emerald },
              { name: 'Growth Engine', type: 'marketing', color: Colors.amber },
              { name: 'Insight Oracle', type: 'analytics', color: Colors.cyan },
              { name: 'Support Shield', type: 'customer_service', color: Colors.rose },
            ].map((agent, i) => (
              <View key={i} style={styles.agentStatusItem}>
                <View style={[styles.agentStatusDot, { backgroundColor: agent.color }]} />
                <Text style={styles.agentStatusName} numberOfLines={1}>{agent.name}</Text>
                <Text style={[styles.agentStatusLabel, { color: agent.color }]}>ONLINE</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            {[
              { label: 'Connect Store', icon: '🔗', color: Colors.emerald },
              { label: 'Generate Content', icon: '✨', color: Colors.amber },
              { label: 'New Task', icon: '📋', color: Colors.cyan },
              { label: 'Talk to Agent', icon: '💬', color: Colors.rose },
            ].map((action, i) => (
              <TouchableOpacity
                key={i}
                testID={`quick-action-${i}`}
                style={[styles.quickActionBtn, { borderColor: action.color + '30' }]}
                activeOpacity={0.7}
              >
                <Text style={styles.quickActionIcon}>{action.icon}</Text>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {(metrics?.recent_activity?.length ?? 0) === 0 ? (
            <View style={styles.emptyActivity}>
              <Text style={styles.emptyIcon}>🚀</Text>
              <Text style={styles.emptyText}>No activity yet. Connect your first store to get started!</Text>
            </View>
          ) : (
            metrics?.recent_activity.map((act, i) => (
              <View key={i} style={styles.activityItem}>
                <View style={styles.activityDot} />
                <View style={styles.activityContent}>
                  <Text style={styles.activityMsg}>{act.message}</Text>
                  <Text style={styles.activityTime}>{new Date(act.timestamp).toLocaleString()}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const cardWidth = (width - Spacing.lg * 2 - Spacing.md) / 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { color: Colors.textSecondary, fontSize: FontSizes.md },
  scrollContent: { padding: Spacing.lg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: Spacing.xxl,
  },
  overline: {
    fontSize: FontSizes.xs, fontWeight: '800', letterSpacing: 3,
    color: Colors.emerald, marginBottom: 4,
  },
  heroTitle: {
    fontSize: FontSizes.hero, fontWeight: '900', color: Colors.textPrimary,
    letterSpacing: -1,
  },
  subtitle: { fontSize: FontSizes.md, color: Colors.textSecondary, marginTop: 4 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.emeraldGlow, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.emerald + '30',
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.emerald },
  statusText: { fontSize: FontSizes.xs, fontWeight: '800', color: Colors.emerald, letterSpacing: 1 },
  metricGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.xxl,
  },
  metricCard: {
    width: cardWidth, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, borderWidth: 1, ...Shadows.card,
  },
  metricIconWrap: {
    width: 40, height: 40, borderRadius: BorderRadius.md,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm,
  },
  metricIcon: { fontSize: 20 },
  metricValue: { fontSize: FontSizes.xxl, fontWeight: '900', letterSpacing: -0.5 },
  metricLabel: {
    fontSize: FontSizes.xs, fontWeight: '700', color: Colors.textMuted,
    letterSpacing: 1.5, marginTop: 4,
  },
  sectionCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg, ...Shadows.card,
  },
  sectionTitle: {
    fontSize: FontSizes.lg, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.lg,
  },
  agentStatusRow: { gap: Spacing.md },
  agentStatusItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  agentStatusDot: { width: 10, height: 10, borderRadius: 5 },
  agentStatusName: { flex: 1, fontSize: FontSizes.md, color: Colors.textPrimary, fontWeight: '600' },
  agentStatusLabel: { fontSize: FontSizes.xs, fontWeight: '800', letterSpacing: 1 },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  quickActionBtn: {
    width: (width - Spacing.lg * 2 - Spacing.xl * 2 - Spacing.sm) / 2,
    backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, borderWidth: 1, alignItems: 'center', gap: 8,
  },
  quickActionIcon: { fontSize: 24 },
  quickActionLabel: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textPrimary },
  emptyActivity: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: 12 },
  emptyIcon: { fontSize: 32 },
  emptyText: { fontSize: FontSizes.md, color: Colors.textSecondary, textAlign: 'center' },
  activityItem: { flexDirection: 'row', gap: Spacing.md, paddingVertical: Spacing.sm },
  activityDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.emerald,
    marginTop: 6,
  },
  activityContent: { flex: 1 },
  activityMsg: { fontSize: FontSizes.md, color: Colors.textPrimary, fontWeight: '500' },
  activityTime: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
});
