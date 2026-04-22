import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, KeyboardAvoidingView, Platform, Keyboard, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, FadeIn, LinearTransition, Easing, withRepeat, withTiming, useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { Colors, Typography } from '../../constants/theme';
import { Send, Bot, ShoppingCart, TrendingUp, Mail, Users, Calculator, BrainCircuit, BarChart2, Shield, Settings, Headphones, CircleCheckBig, CircleX } from 'lucide-react-native';
import AnimatedPressable from '../../components/AnimatedPressable';
import * as Haptics from 'expo-haptics';
import { authFetch } from '../../utils/api';

const { width: W } = Dimensions.get('window');

type Message = { id: string; role: string; content: string; timestamp: string; agent_type?: string };
type PendingAction = {
  id: string;
  action_type: string;
  status: string;
  created_at: string;
  store_name?: string;
  platform?: string;
  payload?: {
    title?: string;
    price?: string;
  };
};

function createStarterMessage(agentType: string): Message {
  return {
    id: `starter_${agentType}`,
    role: 'assistant',
    content: 'How can I assist you with your workspace operations today?',
    timestamp: new Date().toISOString(),
    agent_type: agentType,
  };
}

function formatApiError(detail: unknown): string {
  if (!detail) return 'Something went wrong. Please try again.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((item) => String(item?.msg || item)).join(' ');
  if (typeof detail === 'object' && detail && 'detail' in detail) return formatApiError((detail as { detail?: unknown }).detail);
  return String(detail);
}

const AGENTS: Record<string, { name: string; icon: any; color: string }> = {
  general: { name: 'orchestrAI', icon: BrainCircuit, color: Colors.emerald },
  shopify: { name: 'Shopify EA', icon: ShoppingCart, color: '#95BF47' },
  store_manager: { name: 'Store Manager', icon: ShoppingCart, color: Colors.emerald },
  marketing_suite: { name: 'Marketing Exec', icon: TrendingUp, color: Colors.blue },
  analytics: { name: 'Data Analyst', icon: BarChart2, color: Colors.accent },
  customer_service: { name: 'Customer Care', icon: Headphones, color: '#FB7185' },
  email: { name: 'Comms Exec', icon: Mail, color: '#fff' },
  crm: { name: 'CRM Specialist', icon: Users, color: '#F59E0B' },
  finance: { name: 'CFO AI', icon: Calculator, color: '#10B981' },
  operations: { name: 'Ops Manager', icon: Settings, color: '#8B5CF6' },
  legal: { name: 'Compliance AI', icon: Shield, color: '#EF4444' },
};

function TypingIndicator() {
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  useEffect(() => {
    dot1.value = withRepeat(withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }), -1, true);
    setTimeout(() => { dot2.value = withRepeat(withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }), -1, true); }, 200);
    setTimeout(() => { dot3.value = withRepeat(withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }), -1, true); }, 400);
  }, []);

  const d1 = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const d2 = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const d3 = useAnimatedStyle(() => ({ opacity: dot3.value }));

  return (
    <View style={styles.typingBox}>
      <Animated.View style={[styles.dot, d1]} />
      <Animated.View style={[styles.dot, d2]} />
      <Animated.View style={[styles.dot, d3]} />
    </View>
  );
}

export default function ChatScreen() {
  const params = useLocalSearchParams<{ agent?: string }>();
  const selectedAgent = typeof params.agent === 'string' ? params.agent : 'general';
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [updatingActionId, setUpdatingActionId] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);
  
  const currentAgent = AGENTS[selectedAgent] || AGENTS.general;
  const ActiveIcon = currentAgent.icon;

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const [historyRes, actionsRes] = await Promise.all([
        authFetch(`/api/chat/history/${selectedAgent}`),
        authFetch('/api/stores/actions/pending'),
      ]);

      if (!historyRes.ok) {
        setMessages([createStarterMessage(selectedAgent)]);
      } else {
        const history = (await historyRes.json()) as Array<Omit<Message, 'id'> & { id?: string }>;
        if (!history.length) {
          setMessages([createStarterMessage(selectedAgent)]);
        } else {
          setMessages(history.map((message, index) => ({
            ...message,
            id: message.id || `${message.timestamp}_${message.role}_${index}`,
          })));
        }
      }

      if (actionsRes.ok) {
        setPendingActions(await actionsRes.json());
      } else {
        setPendingActions([]);
      }
    } catch {
      setMessages([createStarterMessage(selectedAgent)]);
      setPendingActions([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [selectedAgent]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input.trim(), timestamp: new Date().toISOString() };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();

    try {
      const res = await authFetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: userMessage.content, agent_type: selectedAgent })
      });

      const data = await res.json();
      if (!res.ok) {
        const errorMessage = formatApiError(data?.detail);
        setMessages(prev => [...prev, {
          id: `${Date.now()}_error`,
          role: 'assistant',
          content: errorMessage,
          timestamp: new Date().toISOString(),
          agent_type: selectedAgent,
        }]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      setMessages(prev => [...prev, {
        id: Date.now().toString() + 'r',
        role: 'assistant',
        content: data.content || 'No response returned.',
        timestamp: new Date().toISOString(),
        agent_type: selectedAgent,
      }]);
      if (Array.isArray(data.queued_actions) && data.queued_actions.length > 0) {
        setPendingActions(prev => [
          ...data.queued_actions.map((action: { id: string; type: string; title?: string; price?: string }) => ({
            id: action.id,
            action_type: action.type,
            status: 'pending',
            created_at: new Date().toISOString(),
            payload: {
              title: action.title,
              price: action.price,
            },
          })),
          ...prev,
        ]);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setMessages(prev => [...prev, {
        id: `${Date.now()}_network_error`,
        role: 'assistant',
        content: 'Connection error. Please try again.',
        timestamp: new Date().toISOString(),
        agent_type: selectedAgent,
      }]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSending(false);
    }
  };

  const updateActionStatus = async (actionId: string, decision: 'approve' | 'reject') => {
    if (updatingActionId) return;
    setUpdatingActionId(actionId);

    try {
      const res = await authFetch(`/api/stores/actions/${actionId}/${decision}`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, {
          id: `${Date.now()}_${decision}_error`,
          role: 'assistant',
          content: formatApiError(data?.detail),
          timestamp: new Date().toISOString(),
          agent_type: selectedAgent,
        }]);
        return;
      }

      setPendingActions(prev => prev.filter(action => action.id !== actionId));
      setMessages(prev => [...prev, {
        id: `${Date.now()}_${decision}`,
        role: 'assistant',
        content: decision === 'approve' ? 'Approved and dispatched that action.' : 'Rejected that pending action.',
        timestamp: new Date().toISOString(),
        agent_type: selectedAgent,
      }]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setMessages(prev => [...prev, {
        id: `${Date.now()}_${decision}_network_error`,
        role: 'assistant',
        content: 'Unable to update that action right now. Please try again.',
        timestamp: new Date().toISOString(),
        agent_type: selectedAgent,
      }]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setUpdatingActionId(null);
    }
  };

  const renderPendingActions = () => {
    if (!pendingActions.length) return null;

    return (
      <View style={styles.pendingSection}>
        <Text style={styles.pendingTitle}>Pending approvals</Text>
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
                  scaleDown={0.94}
                  style={[styles.pendingBtn, styles.pendingApprove, updatingActionId === action.id && styles.pendingBtnDisabled]}
                  onPress={() => updateActionStatus(action.id, 'approve')}
                  disabled={updatingActionId === action.id}
                >
                  <CircleCheckBig size={16} color={Colors.bg} />
                  <Text style={styles.pendingApproveText}>Approve</Text>
                </AnimatedPressable>
                <AnimatedPressable
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
              style={styles.input}
              placeholder="Ask your agents..."
              placeholderTextColor={Colors.textDisabled}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={2000}
            />
            <AnimatedPressable scaleDown={0.8} style={[styles.sendBtn, !input.trim() && { opacity: 0.5 }]} onPress={sendMessage}>
              {sending ? <ActivityIndicator color={Colors.bg} size="small" /> : <Send size={20} color={Colors.bg} />}
            </AnimatedPressable>
          </View>
        </BlurView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontFamily: Typography.fonts.outfitB,
    fontSize: 20,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  headerStatus: {
    fontFamily: Typography.fonts.manropeB,
    fontSize: 13,
    color: Colors.emerald,
    marginTop: 2,
  },
  listContent: {
    padding: 24,
    paddingBottom: 40,
    gap: 20,
  },
  pendingSection: {
    marginBottom: 24,
  },
  pendingTitle: {
    fontFamily: Typography.fonts.outfitB,
    fontSize: 18,
    color: Colors.text,
  },
  pendingSubtitle: {
    fontFamily: Typography.fonts.manropeM,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 12,
  },
  pendingList: {
    gap: 12,
  },
  pendingCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
  },
  pendingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  pendingActionType: {
    fontFamily: Typography.fonts.outfitSB,
    fontSize: 14,
    color: Colors.emerald,
    textTransform: 'capitalize',
  },
  pendingPlatform: {
    fontFamily: Typography.fonts.manropeM,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  pendingActionTitle: {
    fontFamily: Typography.fonts.manropeSB,
    fontSize: 15,
    color: Colors.text,
  },
  pendingMeta: {
    fontFamily: Typography.fonts.manropeM,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  pendingActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  pendingBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 12,
  },
  pendingApprove: {
    backgroundColor: Colors.emerald,
  },
  pendingReject: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pendingBtnDisabled: {
    opacity: 0.55,
  },
  pendingApproveText: {
    fontFamily: Typography.fonts.manropeSB,
    fontSize: 14,
    color: Colors.bg,
  },
  pendingRejectText: {
    fontFamily: Typography.fonts.manropeSB,
    fontSize: 14,
    color: Colors.text,
  },
  bubbleWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
    maxWidth: '85%',
  },
  bubbleWrapperLeft: {
    alignSelf: 'flex-start',
  },
  bubbleWrapperRight: {
    alignSelf: 'flex-end',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  bubbleUser: {
    backgroundColor: Colors.emerald,
    borderBottomRightRadius: 4,
  },
  bubbleAI: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  bubbleText: {
    fontFamily: Typography.fonts.manropeM,
    fontSize: 16,
    lineHeight: 24,
  },
  bubbleTextUser: {
    color: Colors.bg,
    fontFamily: Typography.fonts.manropeSB,
  },
  bubbleTextAI: {
    color: Colors.text,
  },
  inputArea: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontFamily: Typography.fonts.manropeM,
    fontSize: 16,
    maxHeight: 120,
    minHeight: 40,
    paddingTop: 10,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.emerald,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    marginBottom: 0,
  },
  typingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 16,
    alignSelf: 'flex-start',
    marginLeft: 38,
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.emerald,
  },
});
