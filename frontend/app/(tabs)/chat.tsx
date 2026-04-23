import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Colors, Typography } from '../../constants/theme';
import { Send, Bot, ShieldCheck, Megaphone, Activity, ShoppingBag, Package, Tag, Building2, Warehouse, ShoppingCart, Store, CircleCheckBig, CircleX } from 'lucide-react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import * as Haptics from 'expo-haptics';
import { authFetch } from '../../utils/api';

const { width } = Dimensions.get('window');

const AGENTS: Record<string, { name: string, icon: any, color: string }> = {
  store_manager: { name: 'Store Commander', icon: ShoppingBag, color: Colors.emerald },
  shopify: { name: 'Shopify EA', icon: ShoppingBag, color: '#96BF48' },
  etsy: { name: 'Etsy EA', icon: Package, color: '#F1641E' },
  ebay: { name: 'eBay EA', icon: Tag, color: '#E53238' },
  walmart: { name: 'Walmart EA', icon: Building2, color: '#0071DC' },
  faire: { name: 'Faire EA', icon: Warehouse, color: '#FF6B35' },
  mercari: { name: 'Mercari EA', icon: ShoppingCart, color: '#E24444' },
  poshmark: { name: 'Poshmark EA', icon: Store, color: '#C12B5B' },
  marketing_suite: { name: 'Growth Engine', icon: Megaphone, color: '#FE2C55' },
  analytics: { name: 'Insight Oracle', icon: Activity, color: '#0866FF' },
  general: { name: 'orchestrAI Maestro', icon: Bot, color: Colors.emerald },
};

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  agent_type?: string;
}

interface PendingAction {
  id: string;
  action_type: string;
  store_name: string;
  platform: string;
  payload: any;
}

export default function ChatScreen() {
  const { agent: initialAgent } = useLocalSearchParams<{ agent: string }>();
  const [agentType, setAgentType] = useState(initialAgent || 'general');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [updatingActionId, setUpdatingActionId] = useState<string | null>(null);
  
  const listRef = useRef<FlatList>(null);
  const currentAgent = AGENTS[agentType] || AGENTS.general;
  const ActiveIcon = currentAgent.icon;

  const fetchHistory = useCallback(async () => {
    try {
      const res = await authFetch(`/api/chat/history/${agentType}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.map((m: any, i: number) => ({ ...m, id: i.toString() })));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  }, [agentType]);

  const fetchPendingActions = useCallback(async () => {
    try {
      const res = await authFetch('/api/stores/actions/pending');
      if (res.ok) setPendingActions(await res.json());
    } catch (e) { }
  }, []);

  useEffect(() => {
    fetchHistory();
    fetchPendingActions();
  }, [fetchHistory, fetchPendingActions]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const res = await authFetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: userMsg.content, agent_type: agentType })
      });

      if (res.ok) {
        const data = await res.json();
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.content,
          timestamp: new Date().toISOString(),
          agent_type: agentType,
        };
        setMessages(prev => [...prev, aiMsg]);
        if (data.queued_actions) fetchPendingActions();
      }
    } catch (e) {
      Alert.alert('Error', 'Communication with agent failed.');
    } finally {
      setSending(false);
    }
  };

  const updateActionStatus = async (id: string, status: 'approve' | 'reject') => {
    setUpdatingActionId(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await authFetch(`/api/stores/actions/${id}/${status}`, { method: 'POST' });
      if (res.ok) {
        setPendingActions(prev => prev.filter(a => a.id !== id));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      Alert.alert('Error', `Failed to ${status} action.`);
    } finally {
      setUpdatingActionId(null);
    }
  };

  const TypingIndicator = () => (
    <View style={styles.typingBox}>
      <Animated.View entering={FadeInDown.duration(600).delay(0)} style={styles.dot} />
      <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.dot} />
      <Animated.View entering={FadeInDown.duration(600).delay(400)} style={styles.dot} />
    </View>
  );

  const renderPendingActions = () => {
    if (!pendingActions.length) return null;
    return (
      <View style={styles.pendingSection}>
        <Text style={styles.pendingTitle}>Execution Queue</Text>
        <Text style={styles.pendingSubtitle}>Review store actions before they execute.</Text>
        <View style={styles.pendingList}>
          {pendingActions.slice(0, 3).map((action) => (
            <View key={action.id} style={styles.pendingCard}>
              <View style={styles.pendingCardHeader}>
                <Text style={styles.pendingActionType}>{action.action_type.replace(/_/g, ' ')}</Text>
                <Text style={styles.pendingPlatform}>{action.platform || action.store_name || 'Store action'}</Text>
              </View>
              <Text style={styles.pendingActionTitle}>{action.payload?.title || 'Awaiting approval'}</Text>
              {action.payload?.price ? <Text style={styles.pendingMeta}>Price: {action.payload.price}</Text> : null}
              <View style={styles.pendingActionsRow}>
                <AnimatedPressable
                  testID={`approve-action-${action.id}`}
                  scaleDown={0.94}
                  style={[styles.pendingBtn, styles.pendingApprove, updatingActionId === action.id && styles.pendingBtnDisabled]}
                  onPress={() => updateActionStatus(action.id, 'approve')}
                  disabled={updatingActionId === action.id}
                >
                  <CircleCheckBig size={16} color={Colors.bg} />
                  <Text style={styles.pendingApproveText}>Approve</Text>
                </AnimatedPressable>
                <AnimatedPressable
                  testID={`reject-action-${action.id}`}
                  scaleDown={0.94}
                  style={[styles.pendingBtn, styles.pendingReject, updatingActionId === action.id && styles.pendingBtnDisabled]}
                  onPress={() => updateActionStatus(action.id, 'reject')}
                  disabled={updatingActionId === action.id}
                >
                  <CircleX size={16} color={Colors.text} />
                  <Text style={styles.pendingRejectText}>Reject</Text>
                </AnimatedPressable>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderMessage = ({ item, index }: { item: Message, index: number }) => {
    const isUser = item.role === 'user';
    const AgentIcon = (item.agent_type && AGENTS[item.agent_type]) ? AGENTS[item.agent_type].icon : Bot;
    const agColor = (item.agent_type && AGENTS[item.agent_type]) ? AGENTS[item.agent_type].color : Colors.emerald;

    return (
      <Animated.View entering={FadeInDown.delay(index > 0 ? 0 : 300).duration(400).springify()} layout={LinearTransition} style={[styles.bubbleWrapper, isUser ? styles.bubbleWrapperRight : styles.bubbleWrapperLeft]}>
        {!isUser && (
          <View style={[styles.avatar, { borderColor: `${agColor}30`, backgroundColor: `${agColor}10` }]}>
            <AgentIcon size={16} color={agColor} />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
          <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAI]}>
            {item.content}
          </Text>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <BlurView intensity={20} tint="dark" style={styles.header}>
        <View style={styles.headerInfo}>
          <View style={[styles.headerAvatar, { backgroundColor: `${currentAgent.color}15`, borderColor: `${currentAgent.color}40` }]}>
            <ActiveIcon size={24} color={currentAgent.color} />
          </View>
          <View>
            <Text style={styles.headerTitle}>{currentAgent.name}</Text>
            <Text style={styles.headerStatus}>● Active and ready</Text>
          </View>
        </View>
      </BlurView>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={sending ? <TypingIndicator /> : null}
        ListEmptyComponent={loadingHistory ? <ActivityIndicator size="small" color={Colors.emerald} /> : null}
        ListHeaderComponent={renderPendingActions}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <BlurView intensity={30} tint="dark" style={styles.inputArea}>
          <View style={styles.inputBox}>
            <TextInput
              testID="chat-input"
              style={styles.input}
              placeholder="Ask your agents..."
              placeholderTextColor={Colors.textDisabled}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={2000}
            />
            <AnimatedPressable testID="chat-send-btn" scaleDown={0.8} style={[styles.sendBtn, !input.trim() && { opacity: 0.5 }]} onPress={sendMessage}>
              {sending ? <ActivityIndicator color={Colors.bg} size="small" /> : <Send size={20} color={Colors.bg} />}
            </AnimatedPressable>
          </View>
        </BlurView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerAvatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  headerTitle: { fontFamily: Typography.fonts.outfitB, fontSize: 20, color: Colors.text, letterSpacing: -0.3 },
  headerStatus: { fontFamily: Typography.fonts.manropeB, fontSize: 13, color: Colors.emerald, marginTop: 2 },
  listContent: { padding: 24, paddingBottom: 40, gap: 20 },
  pendingSection: { marginBottom: 24 },
  pendingTitle: { fontFamily: Typography.fonts.outfitB, fontSize: 18, color: Colors.text },
  pendingSubtitle: { fontFamily: Typography.fonts.manropeM, fontSize: 13, color: Colors.textSecondary, marginTop: 4, marginBottom: 12 },
  pendingList: { gap: 12 },
  pendingCard: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 16 },
  pendingCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 12 },
  pendingActionType: { fontFamily: Typography.fonts.outfitSB, fontSize: 14, color: Colors.emerald, textTransform: 'capitalize' },
  pendingPlatform: { fontFamily: Typography.fonts.manropeM, fontSize: 12, color: Colors.textSecondary },
  pendingActionTitle: { fontFamily: Typography.fonts.manropeSB, fontSize: 15, color: Colors.text },
  pendingMeta: { fontFamily: Typography.fonts.manropeM, fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  pendingActionsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  pendingBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderRadius: 14, paddingVertical: 12 },
  pendingApprove: { backgroundColor: Colors.emerald },
  pendingReject: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  pendingBtnDisabled: { opacity: 0.55 },
  pendingApproveText: { fontFamily: Typography.fonts.manropeSB, fontSize: 14, color: Colors.bg },
  pendingRejectText: { fontFamily: Typography.fonts.manropeSB, fontSize: 14, color: Colors.text },
  bubbleWrapper: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 8, maxWidth: '85%' },
  bubbleWrapperLeft: { alignSelf: 'flex-start' },
  bubbleWrapperRight: { alignSelf: 'flex-end' },
  avatar: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 10, borderWidth: 1 },
  bubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  bubbleUser: { backgroundColor: Colors.emerald, borderBottomRightRadius: 4 },
  bubbleAI: { backgroundColor: 'rgba(255,255,255,0.08)', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  bubbleText: { fontFamily: Typography.fonts.manropeM, fontSize: 16, lineHeight: 24 },
  bubbleTextUser: { color: Colors.bg, fontFamily: Typography.fonts.manropeSB },
  bubbleTextAI: { color: Colors.text },
  inputArea: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: Platform.OS === 'ios' ? 32 : 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  inputBox: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 8 },
  input: { flex: 1, color: Colors.text, fontFamily: Typography.fonts.manropeM, fontSize: 16, maxHeight: 120, minHeight: 40, paddingTop: 10 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.emerald, justifyContent: 'center', alignItems: 'center', marginLeft: 12, marginBottom: 0 },
  typingBox: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 16, alignSelf: 'flex-start', marginLeft: 38, marginTop: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, borderBottomLeftRadius: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.emerald },
});
