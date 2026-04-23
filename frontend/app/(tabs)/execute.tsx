import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, RefreshControl, ActivityIndicator, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn, LinearTransition, SlideInRight } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Colors, Typography, Spacing } from '../../constants/theme';
import { RefreshCcw, Zap, Bot, Rocket, Calendar, ShieldCheck, Activity, Search, Hash, ChevronRight, Play, LayoutGrid } from 'lucide-react-native';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import * as Haptics from 'expo-haptics';
import { authFetch } from '../../utils/api';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

interface WorkflowTemplate {
  id: string;
  name: string;
  icon: string;
  desc: string;
  steps: any[];
}

interface AgentAction {
  id: string;
  name: string;
  icon: string;
  desc: string;
}

interface SocialPost {
  id: string;
  content: string;
  platform: string;
  status: 'draft' | 'published' | 'scheduled';
  created_at: string;
  hashtags: string[];
  product_name: string;
}

type TabType = 'workflows' | 'actions' | 'broadcast';

export default function ExecuteScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('workflows');
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>([]);
  const [actionCatalog, setActionCatalog] = useState<Record<string, AgentAction[]>>({});
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [executing, setExecuting] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [wfRes, actRes, socialRes] = await Promise.all([
        authFetch('/api/workflows/templates'),
        authFetch('/api/actions/catalog'),
        authFetch('/api/social/content')
      ]);

      if (wfRes.ok) setWorkflows(await wfRes.json());
      if (actRes.ok) setActionCatalog(await actRes.json());
      if (socialRes.ok) setPosts(await socialRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    fetchData();
  };

  const handleRunWorkflow = async (wf: WorkflowTemplate) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setExecuting(wf.id);
    try {
      const res = await authFetch('/api/workflows/execute', {
        method: 'POST',
        body: JSON.stringify({ template_id: wf.id })
      });
      if (res.ok) {
        Alert.alert('Workflow Initiated', `${wf.name} has started. Your agents are collaborating now.`);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to execute workflow.');
    } finally {
      setExecuting(null);
    }
  };

  const handleRunAction = async (agent: string, action: AgentAction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setExecuting(action.id);
    try {
      const res = await authFetch('/api/actions/execute', {
        method: 'POST',
        body: JSON.stringify({ agent_type: agent, action_id: action.id })
      });
      if (res.ok) {
        const result = await res.json();
        Alert.alert(action.name, 'Deliverable generated successfully. Check your broadcast feed or chat for details.');
        fetchData();
      }
    } catch (e) {
      Alert.alert('Error', 'Action execution failed.');
    } finally {
      setExecuting(null);
    }
  };

  const renderWorkflowItem = ({ item, index }: { item: WorkflowTemplate, index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 100).duration(600)} layout={LinearTransition}>
      <AnimatedPressable
        testID={`workflow-${item.id}`}
        scaleDown={0.96}
        style={styles.execCard}
        onPress={() => handleRunWorkflow(item)}
        disabled={!!executing}
      >
        <BlurView intensity={25} tint="dark" style={styles.execCardInner}>
          <View style={styles.execHeader}>
            <View style={styles.execIconWrap}>
              <Text style={{ fontSize: 24 }}>{item.icon}</Text>
            </View>
            <View style={styles.execInfo}>
              <Text style={styles.execTitle}>{item.name}</Text>
              <Text style={styles.execDesc} numberOfLines={2}>{item.desc}</Text>
            </View>
            <ChevronRight size={20} color={Colors.textMuted} />
          </View>
          <View style={styles.execFooter}>
            <Text style={styles.execStepCount}>{item.steps.length} Automated Steps</Text>
            <View style={[styles.runBtn, executing === item.id && { opacity: 0.7 }]}>
              {executing === item.id ? (
                <ActivityIndicator size="small" color={Colors.bg} />
              ) : (
                <>
                  <Play size={14} color={Colors.bg} fill={Colors.bg} />
                  <Text style={styles.runBtnText}>Run Workflow</Text>
                </>
              )}
            </View>
          </View>
        </BlurView>
      </AnimatedPressable>
    </Animated.View>
  );

  const renderActionItem = (agent: string, action: AgentAction, index: number) => (
    <Animated.View key={`${agent}-${action.id}`} entering={FadeInDown.delay(index * 50).duration(600)} layout={LinearTransition}>
      <AnimatedPressable
        testID={`action-${action.id}`}
        scaleDown={0.96}
        style={styles.actionItem}
        onPress={() => handleRunAction(agent, action)}
        disabled={!!executing}
      >
        <BlurView intensity={20} tint="dark" style={styles.actionInner}>
          <View style={styles.actionIcon}>
            {executing === action.id ? (
              <ActivityIndicator size="small" color={Colors.emerald} />
            ) : (
              <Text style={{ fontSize: 20 }}>{action.icon}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>{action.name}</Text>
            <Text style={styles.actionAgent}>{agent.replace(/_/g, ' ').toUpperCase()}</Text>
          </View>
          <Zap size={16} color={Colors.emerald} />
        </BlurView>
      </AnimatedPressable>
    </Animated.View>
  );

  const renderPost = ({ item, index }: { item: SocialPost, index: number }) => {
    const statusColor = item.status === 'published' ? Colors.emerald : item.status === 'scheduled' ? Colors.accent : Colors.textSecondary;
    return (
      <Animated.View entering={FadeInDown.delay(index * 100).duration(600)} layout={LinearTransition} style={styles.socialCard}>
        <BlurView intensity={25} tint="dark" style={styles.socialInner}>
          <View style={styles.socialHeader}>
            <View style={styles.socialAvatar}>
              <Bot size={18} color={Colors.emerald} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.socialAuthor}>Marketing EA</Text>
              <Text style={styles.socialMeta}>{item.platform.toUpperCase()} • {new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
            <View style={[styles.statusBadge, { borderColor: `${statusColor}40` }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
            </View>
          </View>
          <Text style={styles.socialBody} numberOfLines={3}>{item.content}</Text>
        </BlurView>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Execute</Text>
          <Text style={styles.subtitle}>Automate your commerce ecosystem</Text>
        </View>
        <AnimatedPressable
          testID="execute-store-builder-btn"
          scaleDown={0.9}
          style={styles.storeBuilderBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/store-builder');
          }}
        >
          <Rocket size={20} color={Colors.bg} />
          <Text style={styles.storeBuilderTxt}>Store Builder</Text>
        </AnimatedPressable>
      </View>

      <View style={styles.tabContainer}>
        {(['workflows', 'actions', 'broadcast'] as TabType[]).map((tab) => (
          <TouchableOpacity
            testID={`execute-tab-${tab}`}
            key={tab}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab(tab);
            }}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === 'workflows' && (
          <FlatList
            data={workflows}
            keyExtractor={(item) => item.id}
            renderItem={renderWorkflowItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl tintColor={Colors.emerald} refreshing={refreshing} onRefresh={onRefresh} />}
            ListHeaderComponent={
              <View style={styles.sectionHeader}>
                <Calendar size={18} color={Colors.emerald} />
                <Text style={styles.sectionTitle}>Workflow Templates</Text>
              </View>
            }
          />
        )}

        {activeTab === 'actions' && (
          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl tintColor={Colors.emerald} refreshing={refreshing} onRefresh={onRefresh} />}
          >
            <View style={styles.sectionHeader}>
              <LayoutGrid size={18} color={Colors.emerald} />
              <Text style={styles.sectionTitle}>Agent Action Catalog</Text>
            </View>
            {Object.entries(actionCatalog).map(([agent, actions]) => (
              <View key={agent} style={styles.agentGroup}>
                <Text style={styles.agentGroupTitle}>{agent.replace(/_/g, ' ').toUpperCase()}</Text>
                {actions.map((action, i) => renderActionItem(agent, action, i))}
              </View>
            ))}
          </ScrollView>
        )}

        {activeTab === 'broadcast' && (
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            renderItem={renderPost}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl tintColor={Colors.emerald} refreshing={refreshing} onRefresh={onRefresh} />}
            ListHeaderComponent={
              <View style={styles.sectionHeader}>
                <Hash size={18} color={Colors.emerald} />
                <Text style={styles.sectionTitle}>Broadcast Feed</Text>
              </View>
            }
            ListEmptyComponent={
              !loading && (
                <View style={styles.emptyState}>
                  <Bot size={48} color={Colors.textMuted} />
                  <Text style={styles.emptyText}>No social broadcasts yet.</Text>
                </View>
              )
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20 },
  title: { fontFamily: Typography.fonts.outfitL, fontSize: 34, color: Colors.text, letterSpacing: -1 },
  subtitle: { fontFamily: Typography.fonts.manropeB, fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  storeBuilderBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.emerald, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100 },
  storeBuilderTxt: { fontFamily: Typography.fonts.outfitB, fontSize: 14, color: Colors.bg },
  tabContainer: { flexDirection: 'row', marginHorizontal: 24, marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: 'rgba(255,255,255,0.1)' },
  tabText: { fontFamily: Typography.fonts.manropeB, fontSize: 14, color: Colors.textSecondary },
  activeTabText: { color: Colors.text },
  listContent: { paddingHorizontal: 24, paddingBottom: 100 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, marginTop: 8 },
  sectionTitle: { fontFamily: Typography.fonts.outfitB, fontSize: 18, color: Colors.text },
  execCard: { marginBottom: 16, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  execCardInner: { padding: 20 },
  execHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  execIconWrap: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(16, 185, 129, 0.1)', justifyContent: 'center', alignItems: 'center' },
  execInfo: { flex: 1 },
  execTitle: { fontFamily: Typography.fonts.outfitB, fontSize: 18, color: Colors.text },
  execDesc: { fontFamily: Typography.fonts.manropeM, fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  execFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  execStepCount: { fontFamily: Typography.fonts.manropeB, fontSize: 12, color: Colors.textMuted },
  runBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.emerald, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  runBtnText: { fontFamily: Typography.fonts.outfitB, fontSize: 12, color: Colors.bg },
  agentGroup: { marginBottom: 24 },
  agentGroupTitle: { fontFamily: Typography.fonts.manropeB, fontSize: 12, color: Colors.textMuted, letterSpacing: 1, marginBottom: 12 },
  actionItem: { marginBottom: 8, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  actionInner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  actionIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  actionTitle: { fontFamily: Typography.fonts.outfitSB, fontSize: 15, color: Colors.text },
  actionAgent: { fontFamily: Typography.fonts.manropeB, fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  socialCard: { marginBottom: 12, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  socialInner: { padding: 16 },
  socialHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  socialAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(16, 185, 129, 0.1)', justifyContent: 'center', alignItems: 'center' },
  socialAuthor: { fontFamily: Typography.fonts.outfitB, fontSize: 14, color: Colors.text },
  socialMeta: { fontFamily: Typography.fonts.manropeM, fontSize: 11, color: Colors.textMuted },
  socialBody: { fontFamily: Typography.fonts.manropeM, fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  statusBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontFamily: Typography.fonts.manropeB, fontSize: 10, textTransform: 'uppercase' },
  emptyState: { alignItems: 'center', marginTop: 60, gap: 16 },
  emptyText: { fontFamily: Typography.fonts.manropeM, fontSize: 15, color: Colors.textSecondary }
});
