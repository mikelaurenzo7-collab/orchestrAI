import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { authFetch } from '../../utils/api';
import { Colors, Spacing, BorderRadius, FontSizes, AgentColors } from '../../constants/theme';

type Message = { role: string; content: string; timestamp: string; agent_type?: string };
const AGENTS = [
  { type: 'general', name: 'orchestrAI', icon: '🎵' },
  { type: 'store_manager', name: 'Store', icon: '📦' },
  { type: 'marketing', name: 'Growth', icon: '📣' },
  { type: 'analytics', name: 'Insights', icon: '📊' },
  { type: 'customer_service', name: 'Support', icon: '🎧' },
];

export default function ChatScreen() {
  const params = useLocalSearchParams<{ agent?: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(params.agent || 'general');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [pendingActions, setPendingActions] = useState<any[]>([]);
  const [approvingAction, setApprovingAction] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Update agent when navigated from Agent Hub
  useEffect(() => {
    if (params.agent && params.agent !== selectedAgent) {
      setSelectedAgent(params.agent);
    }
  }, [params.agent]);

  const loadHistory = useCallback(async () => {
    try {
      const [histRes, actionsRes] = await Promise.all([
        authFetch(`/api/chat/history/${selectedAgent}`),
        authFetch('/api/stores/actions/pending'),
      ]);
      if (histRes.ok) setMessages(await histRes.json());
      if (actionsRes.ok) setPendingActions(await actionsRes.json());
    } catch (e) { console.error(e); }
    finally { setLoadingHistory(false); }
  }, [selectedAgent]);

  useEffect(() => { setLoadingHistory(true); loadHistory(); }, [loadHistory]);
  useEffect(() => { setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput(''); Keyboard.dismiss();
    setMessages(p => [...p, { role: 'user', content: text, timestamp: new Date().toISOString(), agent_type: selectedAgent }]);
    setSending(true);
    try {
      const res = await authFetch('/api/chat', { method: 'POST', body: JSON.stringify({ message: text, agent_type: selectedAgent }) });
      const data = await res.json();
      if (data.content) {
        setMessages(p => [...p, { role: 'assistant', content: data.content, timestamp: new Date().toISOString(), agent_type: selectedAgent }]);
        if (data.queued_actions?.length) {
          setPendingActions(prev => [...data.queued_actions.map((a: any) => ({
            ...a, id: a.id, action_type: a.type, status: 'pending',
            payload: { title: a.title, price: a.price },
          })), ...prev]);
        }
      }
    } catch (e) {
      setMessages(p => [...p, { role: 'assistant', content: 'Connection error. Try again.', timestamp: new Date().toISOString() }]);
    } finally { setSending(false); }
  };

  const approveAction = async (actionId: string) => {
    setApprovingAction(actionId);
    try {
      const res = await authFetch(`/api/stores/actions/${actionId}/approve`, { method: 'POST' });
      if (res.ok) {
        setPendingActions(prev => prev.filter(a => a.id !== actionId));
        setMessages(p => [...p, { role: 'assistant', content: '✅ Action approved and executed on your store!', timestamp: new Date().toISOString(), agent_type: selectedAgent }]);
      }
    } catch (e) { console.error(e); }
    finally { setApprovingAction(null); }
  };

  const rejectAction = async (actionId: string) => {
    try {
      await authFetch(`/api/stores/actions/${actionId}/reject`, { method: 'POST' });
      setPendingActions(prev => prev.filter(a => a.id !== actionId));
    } catch (e) { console.error(e); }
  };

  const clearChat = async () => {
    try { await authFetch(`/api/chat/history/${selectedAgent}`, { method: 'DELETE' }); setMessages([]); } catch (e) { console.error(e); }
  };

  const agentColor = AgentColors[selectedAgent]?.primary || Colors.emerald;
  const suggestions: Record<string, string[]> = {
    general: ['Give me a full business health check', 'What should I focus on this week?', 'How do I 10x my revenue?'],
    store_manager: ['Audit my product catalog for quick wins', 'What pricing changes would boost my margins?', 'Create an inventory management plan'],
    marketing: ['Build me a 7-day social media calendar', 'Write 3 Instagram posts for my best products', 'Design a product launch campaign'],
    analytics: ['Break down my store performance', 'Which products should I double down on?', 'What does my customer data tell you?'],
    customer_service: ['Write a returns policy for my store', 'Create 10 FAQ answers for common questions', 'Draft response templates for complaints'],
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.agentBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.agentBarScroll}>
            {AGENTS.map((a) => {
              const sel = selectedAgent === a.type;
              const c = AgentColors[a.type]?.primary || Colors.emerald;
              return (
                <TouchableOpacity key={a.type} testID={`agent-select-${a.type}`}
                  style={[s.chip, sel && { backgroundColor: c + '20', borderColor: c + '50' }]}
                  onPress={() => setSelectedAgent(a.type)}>
                  <Text style={{ fontSize: 16 }}>{a.icon}</Text>
                  <Text style={[s.chipText, sel && { color: c }]}>{a.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity testID="clear-chat-btn" onPress={clearChat} style={s.clearBtn}>
            <Text style={s.clearText}>Clear</Text>
          </TouchableOpacity>
        </View>

        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={s.msgContent} showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
          {/* Pending Actions Banner */}
          {pendingActions.length > 0 && (
            <View style={s.pendingBanner}>
              <Text style={s.pendingTitle}>📋 {pendingActions.length} Pending Action{pendingActions.length > 1 ? 's' : ''}</Text>
              {pendingActions.slice(0, 5).map((action) => (
                <View key={action.id} style={s.pendingCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.pendingType}>{(action.action_type || '').replace('_', ' ').toUpperCase()}</Text>
                    <Text style={s.pendingDetail} numberOfLines={1}>{action.payload?.title || action.title || 'Action'}{action.payload?.price || action.price ? ` — $${action.payload?.price || action.price}` : ''}</Text>
                  </View>
                  <View style={s.pendingBtns}>
                    <TouchableOpacity style={s.approveBtn} onPress={() => approveAction(action.id)}
                      disabled={approvingAction === action.id}>
                      {approvingAction === action.id ? <ActivityIndicator size="small" color="#fff" /> :
                        <Text style={s.approveBtnText}>✓</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity style={s.rejectBtn} onPress={() => rejectAction(action.id)}>
                      <Text style={s.rejectBtnText}>✗</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
          {loadingHistory ? <View style={s.center}><ActivityIndicator size="small" color={agentColor} /></View>
          : messages.length === 0 ? (
            <View style={s.empty}>
              <Text style={{ fontSize: 48 }}>{AGENTS.find(a => a.type === selectedAgent)?.icon || '⚡'}</Text>
              <Text style={s.emptyTitle}>Talk to {AGENTS.find(a => a.type === selectedAgent)?.name || 'THEONE'}</Text>
              <Text style={s.emptySub}>Your AI agent is ready to help.</Text>
              <View style={s.sugWrap}>
                {(suggestions[selectedAgent] || suggestions.general).map((sug, i) => (
                  <TouchableOpacity key={i} testID={`suggestion-${i}`} style={[s.sugPill, { borderColor: agentColor + '30' }]}
                    onPress={() => setInput(sug)}>
                    <Text style={[s.sugText, { color: agentColor }]}>{sug}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : messages.map((msg, i) => (
            <View key={i} style={[s.msgRow, msg.role === 'user' ? s.msgUser : s.msgAi]}>
              {msg.role === 'assistant' && (
                <View style={[s.msgAvatar, { backgroundColor: agentColor + '20' }]}>
                  <Text style={{ fontSize: 16 }}>{AGENTS.find(a => a.type === selectedAgent)?.icon || '⚡'}</Text>
                </View>
              )}
              <View style={[s.bubble, msg.role === 'user' ? s.userBubble : [s.aiBubble, { borderColor: agentColor + '15' }]]}>
                <Text style={[s.msgText, msg.role === 'user' && { color: Colors.emerald }]}>{msg.content}</Text>
              </View>
            </View>
          ))}
          {sending && (
            <View style={[s.msgRow, s.msgAi]}>
              <View style={[s.msgAvatar, { backgroundColor: agentColor + '20' }]}>
                <Text style={{ fontSize: 16 }}>{AGENTS.find(a => a.type === selectedAgent)?.icon || '⚡'}</Text>
              </View>
              <View style={[s.bubble, s.aiBubble, { borderColor: agentColor + '15' }]}>
                <ActivityIndicator size="small" color={agentColor} />
              </View>
            </View>
          )}
        </ScrollView>

        <View style={s.inputBar}>
          <TextInput testID="chat-input" style={s.textInput} value={input} onChangeText={setInput}
            placeholder={`Message ${AGENTS.find(a => a.type === selectedAgent)?.name || 'THEONE'}...`}
            placeholderTextColor={Colors.textMuted} multiline maxLength={2000} />
          <TouchableOpacity testID="send-message-btn"
            style={[s.sendBtn, { backgroundColor: input.trim() ? agentColor : Colors.surfaceElevated }]}
            onPress={sendMessage} disabled={!input.trim() || sending}>
            <Text style={[s.sendText, { color: input.trim() ? Colors.bg : Colors.textMuted }]}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  agentBar: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  agentBarScroll: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceElevated },
  chipText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textSecondary },
  clearBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  clearText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.rose },
  msgContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.textPrimary, marginTop: 16 },
  emptySub: { fontSize: FontSizes.md, color: Colors.textSecondary, textAlign: 'center', marginTop: 8 },
  sugWrap: { marginTop: 24, gap: 10, width: '100%' },
  sugPill: { borderWidth: 1, borderRadius: BorderRadius.lg, paddingHorizontal: 16, paddingVertical: 12 },
  sugText: { fontSize: FontSizes.md, fontWeight: '600' },
  pendingBanner: { backgroundColor: '#FBBF24' + '10', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#FBBF24' + '25' },
  pendingTitle: { fontSize: 15, fontWeight: '800', color: '#FBBF24', marginBottom: 10 },
  pendingCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  pendingType: { fontSize: 10, fontWeight: '800', color: '#FBBF24', letterSpacing: 0.5 },
  pendingDetail: { fontSize: 14, color: Colors.textPrimary, fontWeight: '600', marginTop: 2 },
  pendingBtns: { flexDirection: 'row', gap: 8, marginLeft: 12 },
  approveBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.emerald, justifyContent: 'center', alignItems: 'center' },
  approveBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  rejectBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceElevated, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  rejectBtnText: { fontSize: 16, fontWeight: '600', color: Colors.textMuted },
  msgRow: { flexDirection: 'row', marginBottom: Spacing.md, maxWidth: '90%' },
  msgUser: { alignSelf: 'flex-end' },
  msgAi: { alignSelf: 'flex-start' },
  msgAvatar: { width: 32, height: 32, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center', marginRight: 8, marginTop: 4 },
  bubble: { borderRadius: BorderRadius.lg, padding: Spacing.md, maxWidth: '100%' },
  userBubble: { backgroundColor: Colors.emerald + '15', borderWidth: 1, borderColor: Colors.emerald + '25' },
  aiBubble: { backgroundColor: Colors.surfaceElevated, borderWidth: 1 },
  msgText: { fontSize: FontSizes.md, color: Colors.textPrimary, lineHeight: 22 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface },
  textInput: { flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, color: Colors.textPrimary, fontSize: FontSizes.md, maxHeight: 100, borderWidth: 1, borderColor: Colors.border },
  sendBtn: { width: 44, height: 44, borderRadius: BorderRadius.lg, justifyContent: 'center', alignItems: 'center' },
  sendText: { fontSize: 22, fontWeight: '800' },
});
