import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authFetch } from '../../utils/api';
import { Colors, Spacing, BorderRadius, FontSizes, AgentColors } from '../../constants/theme';

type Message = { role: string; content: string; timestamp: string; agent_type?: string };
const AGENTS = [
  { type: 'general', name: 'THEONE', icon: '⚡' },
  { type: 'store_manager', name: 'Store', icon: '📦' },
  { type: 'marketing', name: 'Growth', icon: '📣' },
  { type: 'analytics', name: 'Insights', icon: '📊' },
  { type: 'customer_service', name: 'Support', icon: '🎧' },
];

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('general');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  const loadHistory = useCallback(async () => {
    try {
      const res = await authFetch(`/api/chat/history/${selectedAgent}`);
      if (res.ok) setMessages(await res.json());
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
      if (data.content) setMessages(p => [...p, { role: 'assistant', content: data.content, timestamp: new Date().toISOString(), agent_type: selectedAgent }]);
    } catch (e) {
      setMessages(p => [...p, { role: 'assistant', content: 'Connection error. Try again.', timestamp: new Date().toISOString() }]);
    } finally { setSending(false); }
  };

  const clearChat = async () => {
    try { await authFetch(`/api/chat/history/${selectedAgent}`, { method: 'DELETE' }); setMessages([]); } catch (e) { console.error(e); }
  };

  const agentColor = AgentColors[selectedAgent]?.primary || Colors.emerald;
  const suggestions: Record<string, string[]> = {
    general: ['What can you do for my store?', 'Help me grow revenue', 'Create a marketing plan'],
    store_manager: ['Analyze my inventory', 'Suggest pricing optimizations', 'Order management tips'],
    marketing: ['Create an Instagram campaign', 'Write ad copy for my product', 'Plan a product launch'],
    analytics: ['What are my sales trends?', 'Identify best products', 'Customer behavior insights'],
    customer_service: ['Draft FAQ for my store', 'Handle a refund request', 'Create response templates'],
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
