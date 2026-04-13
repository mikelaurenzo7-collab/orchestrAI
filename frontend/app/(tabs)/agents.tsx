import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, ActivityIndicator, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authFetch } from '../../utils/api';
import { Colors, Spacing, BorderRadius, FontSizes, Shadows, AgentColors } from '../../constants/theme';

type Agent = {
  id: string; name: string; agent_type: string; description: string;
  personality: string; tone: string; auto_execute: boolean; is_active: boolean;
  capabilities: string[]; tasks_completed: number; last_active: string | null;
};

export default function AgentsScreen() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await authFetch('/api/agents');
      if (res.ok) setAgents(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const toggleField = async (id: string, field: string, val: boolean) => {
    try {
      await authFetch(`/api/agents/${id}`, { method: 'PATCH', body: JSON.stringify({ [field]: !val }) });
      setAgents(p => p.map(a => a.id === id ? { ...a, [field]: !val } : a));
    } catch (e) { console.error(e); }
  };

  if (loading) return (
    <SafeAreaView style={s.container}><View style={s.center}>
      <ActivityIndicator size="large" color={Colors.emerald} />
    </View></SafeAreaView>
  );

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAgents(); }} tintColor={Colors.emerald} />}>
        <Text style={s.overline}>THE SYMPHONY</Text>
        <Text style={s.title}>Agent Hub</Text>
        <Text style={s.subtitle}>{agents.length} virtuoso agents conducting your empire</Text>

        {agents.map((agent) => {
          const ac = AgentColors[agent.agent_type] || AgentColors.general;
          const exp = expandedId === agent.id;
          const emoji = agent.agent_type === 'store_manager' ? '📦' : agent.agent_type === 'marketing' ? '📣' : agent.agent_type === 'analytics' ? '📊' : '🎧';

          return (
            <TouchableOpacity key={agent.id} testID={`agent-card-${agent.agent_type}`}
              style={[s.card, { borderColor: agent.is_active ? ac.primary + '30' : Colors.border }]}
              activeOpacity={0.85} onPress={() => setExpandedId(exp ? null : agent.id)}>
              <View style={s.row}>
                <View style={[s.avatar, { backgroundColor: ac.glow }]}><Text style={{ fontSize: 24 }}>{emoji}</Text></View>
                <View style={{ flex: 1, marginLeft: Spacing.md }}>
                  <Text style={s.agentName}>{agent.name}</Text>
                  <Text style={s.agentType}>{agent.agent_type.replace('_', ' ').toUpperCase()}</Text>
                </View>
                <View style={[s.pill, { backgroundColor: agent.is_active ? ac.glow : Colors.surfaceElevated }]}>
                  <View style={[s.pillDot, { backgroundColor: agent.is_active ? ac.primary : Colors.textMuted }]} />
                  <Text style={[s.pillText, { color: agent.is_active ? ac.primary : Colors.textMuted }]}>
                    {agent.is_active ? 'ACTIVE' : 'OFF'}
                  </Text>
                </View>
              </View>
              <Text style={s.desc}>{agent.description}</Text>
              <View style={s.statsRow}>
                <View style={{ flex: 1 }}><Text style={[s.statVal, { color: ac.primary }]}>{agent.tasks_completed}</Text><Text style={s.statLabel}>Tasks</Text></View>
                <View style={{ flex: 1 }}><Text style={[s.statVal, { color: ac.primary }]}>{agent.capabilities.length}</Text><Text style={s.statLabel}>Caps</Text></View>
                <View style={{ flex: 1 }}><Text style={[s.statVal, { color: ac.primary }]}>{agent.personality}</Text><Text style={s.statLabel}>Persona</Text></View>
              </View>
              {exp && (
                <View style={{ marginTop: Spacing.md }}>
                  <View style={s.divider} />
                  <Text style={s.capTitle}>Capabilities</Text>
                  <View style={s.caps}>
                    {agent.capabilities.map((c, i) => (
                      <View key={i} style={[s.capPill, { borderColor: ac.primary + '30' }]}>
                        <Text style={[s.capText, { color: ac.primary }]}>{c.replace(/_/g, ' ')}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={s.ctrlRow}>
                    <Text style={s.ctrlLabel}>Active</Text>
                    <Switch value={agent.is_active} onValueChange={() => toggleField(agent.id, 'is_active', agent.is_active)}
                      trackColor={{ false: Colors.surfaceElevated, true: ac.primary + '50' }} thumbColor={agent.is_active ? ac.primary : Colors.textMuted} />
                  </View>
                  <View style={s.ctrlRow}>
                    <Text style={s.ctrlLabel}>Auto-Execute</Text>
                    <Switch value={agent.auto_execute} onValueChange={() => toggleField(agent.id, 'auto_execute', agent.auto_execute)}
                      trackColor={{ false: Colors.surfaceElevated, true: ac.primary + '50' }} thumbColor={agent.auto_execute ? ac.primary : Colors.textMuted} />
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: Spacing.lg },
  overline: { fontSize: FontSizes.xs, fontWeight: '800', letterSpacing: 3, color: Colors.emerald, marginBottom: 4 },
  title: { fontSize: FontSizes.xxxl, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: FontSizes.md, color: Colors.textSecondary, marginBottom: Spacing.xxl },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl, borderWidth: 1, marginBottom: Spacing.lg, ...Shadows.card },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  avatar: { width: 48, height: 48, borderRadius: BorderRadius.lg, justifyContent: 'center', alignItems: 'center' },
  agentName: { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.textPrimary },
  agentType: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5, marginTop: 2 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: FontSizes.xs, fontWeight: '800', letterSpacing: 0.5 },
  desc: { fontSize: FontSizes.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.md },
  statsRow: { flexDirection: 'row', gap: Spacing.lg },
  statVal: { fontSize: FontSizes.lg, fontWeight: '800' },
  statLabel: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.border, marginBottom: Spacing.lg },
  capTitle: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textSecondary, marginBottom: Spacing.sm },
  caps: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  capPill: { borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 6 },
  capText: { fontSize: FontSizes.xs, fontWeight: '700', textTransform: 'capitalize' },
  ctrlRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm },
  ctrlLabel: { fontSize: FontSizes.md, color: Colors.textPrimary, fontWeight: '600' },
});
