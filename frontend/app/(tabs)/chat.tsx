import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSizes, AgentColors } from '../../constants/theme';

const API = process.env.EXPO_PUBLIC_BACKEND_URL;

type Message = {
  role: string;
  content: string;
  timestamp: string;
  agent_type?: string;
};

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
      const res = await fetch(`${API}/api/chat/history/${selectedAgent}`);
      const data = await res.json();
      setMessages(data);
    } catch (e) {
      console.error('Load history error:', e);
    } finally {
      setLoadingHistory(false);
    }
  }, [selectedAgent]);

  useEffect(() => {
    setLoadingHistory(true);
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    Keyboard.dismiss();

    const userMsg: Message = {
      role: 'user', content: text,
      timestamp: new Date().toISOString(), agent_type: selectedAgent,
    };
    setMessages(prev => [...prev, userMsg]);
    setSending(true);

    try {
      const res = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, agent_type: selectedAgent }),
      });
      const data = await res.json();

      if (data.content) {
        const aiMsg: Message = {
          role: 'assistant', content: data.content,
          timestamp: new Date().toISOString(), agent_type: selectedAgent,
        };
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch (e) {
      const errMsg: Message = {
        role: 'assistant',
        content: 'Connection error. Please try again.',
        timestamp: new Date().toISOString(),
        agent_type: selectedAgent,
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setSending(false);
    }
  };

  const clearChat = async () => {
    try {
      await fetch(`${API}/api/chat/history/${selectedAgent}`, { method: 'DELETE' });
      setMessages([]);
    } catch (e) {
      console.error('Clear chat error:', e);
    }
  };

  const agentColor = AgentColors[selectedAgent]?.primary || Colors.emerald;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Agent Selector */}
        <View style={styles.agentBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.agentBarScroll}>
            {AGENTS.map((agent) => {
              const isSelected = selectedAgent === agent.type;
              const color = AgentColors[agent.type]?.primary || Colors.emerald;
              return (
                <TouchableOpacity
                  key={agent.type}
                  testID={`agent-select-${agent.type}`}
                  style={[styles.agentChip, isSelected && { backgroundColor: color + '20', borderColor: color + '50' }]}
                  onPress={() => setSelectedAgent(agent.type)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.agentChipIcon}>{agent.icon}</Text>
                  <Text style={[styles.agentChipText, isSelected && { color }]}>{agent.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity testID="clear-chat-btn" onPress={clearChat} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {loadingHistory ? (
            <View style={styles.center}>
              <ActivityIndicator size="small" color={agentColor} />
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatIcon}>
                {AGENTS.find(a => a.type === selectedAgent)?.icon || '⚡'}
              </Text>
              <Text style={styles.emptyChatTitle}>
                {selectedAgent === 'general' ? 'Talk to THEONE' : `Talk to ${AGENTS.find(a => a.type === selectedAgent)?.name}`}
              </Text>
              <Text style={styles.emptyChatSub}>
                {selectedAgent === 'general'
                  ? 'Your AI co-founder is ready. Ask anything about your eCommerce empire.'
                  : 'This specialized agent is ready to help with its domain expertise.'}
              </Text>
              <View style={styles.suggestionWrap}>
                {getSuggestions(selectedAgent).map((s, i) => (
                  <TouchableOpacity
                    key={i}
                    testID={`suggestion-${i}`}
                    style={[styles.suggestionPill, { borderColor: agentColor + '30' }]}
                    onPress={() => setInput(s)}
                  >
                    <Text style={[styles.suggestionText, { color: agentColor }]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            messages.map((msg, i) => (
              <View
                key={i}
                style={[styles.msgRow, msg.role === 'user' ? styles.msgRowUser : styles.msgRowAi]}
              >
                {msg.role === 'assistant' && (
                  <View style={[styles.msgAvatar, { backgroundColor: agentColor + '20' }]}>
                    <Text style={styles.msgAvatarText}>
                      {AGENTS.find(a => a.type === selectedAgent)?.icon || '⚡'}
                    </Text>
                  </View>
                )}
                <View
                  style={[
                    styles.msgBubble,
                    msg.role === 'user' ? styles.userBubble : [styles.aiBubble, { borderColor: agentColor + '15' }],
                  ]}
                >
                  <Text style={[styles.msgText, msg.role === 'user' && styles.userMsgText]}>
                    {msg.content}
                  </Text>
                </View>
              </View>
            ))
          )}
          {sending && (
            <View style={[styles.msgRow, styles.msgRowAi]}>
              <View style={[styles.msgAvatar, { backgroundColor: agentColor + '20' }]}>
                <Text style={styles.msgAvatarText}>
                  {AGENTS.find(a => a.type === selectedAgent)?.icon || '⚡'}
                </Text>
              </View>
              <View style={[styles.aiBubble, styles.msgBubble, { borderColor: agentColor + '15' }]}>
                <ActivityIndicator size="small" color={agentColor} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            testID="chat-input"
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder={`Message ${AGENTS.find(a => a.type === selectedAgent)?.name || 'THEONE'}...`}
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={2000}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            blurOnSubmit
          />
          <TouchableOpacity
            testID="send-message-btn"
            style={[styles.sendBtn, { backgroundColor: input.trim() ? agentColor : Colors.surfaceElevated }]}
            onPress={sendMessage}
            disabled={!input.trim() || sending}
            activeOpacity={0.7}
          >
            <Text style={[styles.sendBtnText, { color: input.trim() ? Colors.bg : Colors.textMuted }]}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getSuggestions(agentType: string): string[] {
  const suggestions: Record<string, string[]> = {
    general: ['What can you do for my store?', 'Help me grow my revenue', 'Create a marketing plan'],
    store_manager: ['Analyze my inventory levels', 'Suggest pricing optimizations', 'Help with order management'],
    marketing: ['Create an Instagram campaign', 'Write ad copy for my product', 'Plan a product launch'],
    analytics: ['What are my sales trends?', 'Identify my best products', 'Customer behavior insights'],
    customer_service: ['Draft FAQ for my store', 'Handle a refund request', 'Create response templates'],
  };
  return suggestions[agentType] || suggestions.general;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  agentBar: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  agentBarScroll: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm },
  agentChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
  },
  agentChipIcon: { fontSize: 16 },
  agentChipText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textSecondary },
  clearBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  clearBtnText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.rose },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  emptyChat: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  emptyChatIcon: { fontSize: 48, marginBottom: 16 },
  emptyChatTitle: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  emptyChatSub: { fontSize: FontSizes.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  suggestionWrap: { marginTop: 24, gap: 10, width: '100%' },
  suggestionPill: {
    borderWidth: 1, borderRadius: BorderRadius.lg,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  suggestionText: { fontSize: FontSizes.md, fontWeight: '600' },
  msgRow: { flexDirection: 'row', marginBottom: Spacing.md, maxWidth: '90%' },
  msgRowUser: { alignSelf: 'flex-end' },
  msgRowAi: { alignSelf: 'flex-start' },
  msgAvatar: {
    width: 32, height: 32, borderRadius: BorderRadius.md,
    justifyContent: 'center', alignItems: 'center', marginRight: 8, marginTop: 4,
  },
  msgAvatarText: { fontSize: 16 },
  msgBubble: { borderRadius: BorderRadius.lg, padding: Spacing.md, maxWidth: '100%' },
  userBubble: { backgroundColor: Colors.emerald + '15', borderWidth: 1, borderColor: Colors.emerald + '25' },
  aiBubble: { backgroundColor: Colors.surfaceElevated, borderWidth: 1 },
  msgText: { fontSize: FontSizes.md, color: Colors.textPrimary, lineHeight: 22 },
  userMsgText: { color: Colors.emerald },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm,
    padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  textInput: {
    flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    color: Colors.textPrimary, fontSize: FontSizes.md,
    maxHeight: 100, borderWidth: 1, borderColor: Colors.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: BorderRadius.lg,
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnText: { fontSize: 22, fontWeight: '800' },
});
