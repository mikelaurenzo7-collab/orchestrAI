import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, ActivityIndicator, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSizes, Shadows, AgentColors } from '../../constants/theme';

const API = process.env.EXPO_PUBLIC_BACKEND_URL;

type Agent = {
  id: string;
  name: string;
  agent_type: string;
  description: string;
  personality: string;
  tone: string;
  auto_execute: boolean;
  is_active: boolean;
  capabilities: string[];
  tasks_completed: number;
  last_active: string | null;
};

export default function AgentsScreen() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/agents`);
      const data = await res.json();
      setAgents(data);
    } catch (e) {
      console.error('Agents fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const toggleAgent = async (agentId: string, isActive: boolean) => {
    try {
      await fetch(`${API}/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      });
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, is_active: !isActive } : a));
    } catch (e) {
      console.error('Toggle agent error:', e);
    }
  };

  const toggleAutoExec = async (agentId: string, autoExec: boolean) => {
    try {
      await fetch(`${API}/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_execute: !autoExec }),
      });
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, auto_execute: !autoExec } : a));
    } catch (e) {
      console.error('Toggle auto-exec error:', e);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.emerald} />
          <Text style={styles.loadingText}>Loading Agent Fleet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAgents(); }} tintColor={Colors.emerald} />}
      >
        <Text style={styles.overline}>AI FLEET</Text>
        <Text style={styles.title}>Agent Hub</Text>
        <Text style={styles.subtitle}>{agents.length} specialized agents at your command</Text>

        {agents.map((agent) => {
          const agentColor = AgentColors[agent.agent_type] || AgentColors.general;
          const isExpanded = expandedId === agent.id;

          return (
            <TouchableOpacity
              key={agent.id}
              testID={`agent-card-${agent.agent_type}`}
              style={[styles.agentCard, { borderColor: agent.is_active ? agentColor.primary + '30' : Colors.border }]}
              activeOpacity={0.85}
              onPress={() => setExpandedId(isExpanded ? null : agent.id)}
            >
              {/* Header */}
              <View style={styles.agentHeader}>
                <View style={[styles.agentAvatar, { backgroundColor: agentColor.glow }]}>
                  <Text style={styles.agentAvatarText}>
                    {agent.agent_type === 'store_manager' ? '📦' :
                     agent.agent_type === 'marketing' ? '📣' :
                     agent.agent_type === 'analytics' ? '📊' : '🎧'}
                  </Text>
                </View>
                <View style={styles.agentInfo}>
                  <Text style={styles.agentName}>{agent.name}</Text>
                  <Text style={styles.agentType}>{agent.agent_type.replace('_', ' ').toUpperCase()}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: agent.is_active ? agentColor.glow : Colors.surfaceElevated }]}>
                  <View style={[styles.statusDot, { backgroundColor: agent.is_active ? agentColor.primary : Colors.textMuted }]} />
                  <Text style={[styles.statusLabel, { color: agent.is_active ? agentColor.primary : Colors.textMuted }]}>
                    {agent.is_active ? 'ACTIVE' : 'OFF'}
                  </Text>
                </View>
              </View>

              <Text style={styles.agentDesc}>{agent.description}</Text>

              {/* Stats Row */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: agentColor.primary }]}>{agent.tasks_completed}</Text>
                  <Text style={styles.statLabel}>Tasks Done</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: agentColor.primary }]}>{agent.capabilities.length}</Text>
                  <Text style={styles.statLabel}>Capabilities</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: agentColor.primary }]}>{agent.personality}</Text>
                  <Text style={styles.statLabel}>Persona</Text>
                </View>
              </View>

              {/* Expanded Section */}
              {isExpanded && (
                <View style={styles.expandedSection}>
                  <View style={styles.divider} />

                  {/* Capabilities */}
                  <Text style={styles.capTitle}>Capabilities</Text>
                  <View style={styles.capsWrap}>
                    {agent.capabilities.map((cap, i) => (
                      <View key={i} style={[styles.capPill, { borderColor: agentColor.primary + '30' }]}>
                        <Text style={[styles.capText, { color: agentColor.primary }]}>
                          {cap.replace(/_/g, ' ')}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Controls */}
                  <View style={styles.controlRow}>
                    <Text style={styles.controlLabel}>Active</Text>
                    <Switch
                      testID={`agent-toggle-${agent.agent_type}`}
                      value={agent.is_active}
                      onValueChange={() => toggleAgent(agent.id, agent.is_active)}
                      trackColor={{ false: Colors.surfaceElevated, true: agentColor.primary + '50' }}
                      thumbColor={agent.is_active ? agentColor.primary : Colors.textMuted}
                    />
                  </View>
                  <View style={styles.controlRow}>
                    <Text style={styles.controlLabel}>Auto-Execute Tasks</Text>
                    <Switch
                      testID={`agent-autoexec-${agent.agent_type}`}
                      value={agent.auto_execute}
                      onValueChange={() => toggleAutoExec(agent.id, agent.auto_execute)}
                      trackColor={{ false: Colors.surfaceElevated, true: agentColor.primary + '50' }}
                      thumbColor={agent.auto_execute ? agentColor.primary : Colors.textMuted}
                    />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { color: Colors.textSecondary, fontSize: FontSizes.md },
  scrollContent: { padding: Spacing.lg },
  overline: {
    fontSize: FontSizes.xs, fontWeight: '800', letterSpacing: 3,
    color: Colors.amber, marginBottom: 4,
  },
  title: { fontSize: FontSizes.xxxl, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: FontSizes.md, color: Colors.textSecondary, marginBottom: Spacing.xxl },
  agentCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.xl, borderWidth: 1, marginBottom: Spacing.lg, ...Shadows.card,
  },
  agentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  agentAvatar: {
    width: 48, height: 48, borderRadius: BorderRadius.lg,
    justifyContent: 'center', alignItems: 'center',
  },
  agentAvatarText: { fontSize: 24 },
  agentInfo: { flex: 1, marginLeft: Spacing.md },
  agentName: { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.textPrimary },
  agentType: {
    fontSize: FontSizes.xs, fontWeight: '700', color: Colors.textMuted,
    letterSpacing: 1.5, marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: FontSizes.xs, fontWeight: '800', letterSpacing: 0.5 },
  agentDesc: { fontSize: FontSizes.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.md },
  statsRow: { flexDirection: 'row', gap: Spacing.lg },
  statItem: { flex: 1 },
  statValue: { fontSize: FontSizes.lg, fontWeight: '800' },
  statLabel: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  expandedSection: { marginTop: Spacing.md },
  divider: { height: 1, backgroundColor: Colors.border, marginBottom: Spacing.lg },
  capTitle: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textSecondary, marginBottom: Spacing.sm },
  capsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  capPill: {
    borderWidth: 1, borderRadius: BorderRadius.full,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  capText: { fontSize: FontSizes.xs, fontWeight: '700', textTransform: 'capitalize' },
  controlRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  controlLabel: { fontSize: FontSizes.md, color: Colors.textPrimary, fontWeight: '600' },
});
