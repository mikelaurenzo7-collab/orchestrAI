import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { authFetch } from '../../utils/api';
import { Colors, Fonts } from '../../constants/theme';
import { BlurView } from 'expo-blur';
import { Bot, ShieldCheck, Activity, TerminalSquare, AlertCircle, ShoppingBag, Zap, Mail, Briefcase, FileText, Smartphone, Megaphone, Lock } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown, SlideInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import TracingBeam from '../../components/TracingBeam';

const { width } = Dimensions.get('window');

const AGENT_MAPPINGS: Record<string, { icon: any, color: string, badge: string }> = {
  general: { icon: TerminalSquare, color: Colors.emerald, badge: 'CORE' },
  shopify: { icon: ShoppingBag, color: '#96BF48', badge: 'COMMERCE' },
  etsy: { icon: StoreIcon, color: '#F1641E', badge: 'COMMERCE' },
  ebay: { icon: ShoppingBag, color: '#E53238', badge: 'COMMERCE' },
  marketing_suite: { icon: Megaphone, color: '#FE2C55', badge: 'MARKETING' },
  analytics: { icon: Activity, color: '#0866FF', badge: 'INTELLIGENCE' },
  email: { icon: Mail, color: '#EA4335', badge: 'COMMUNICATION' },
  crm: { icon: ShieldCheck, color: '#FF7A59', badge: 'SALES' },
  finance: { icon: Zap, color: '#2CA01C', badge: 'FINANCE' },
  hr: { icon: Briefcase, color: '#FF9900', badge: 'PEOPLE' },
  legal: { icon: FileText, color: '#7B51AD', badge: 'COMPLIANCE' },
  default: { icon: Bot, color: Colors.emerald, badge: 'AGENT' },
};

function StoreIcon(props: any) { return <ShoppingBag {...props} />; }

export default function AgentsHubScreen() {
  const router = useRouter();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await authFetch('/api/agents');
      if (res.ok) setAgents(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const navigateToChat = (agentType: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/chat', params: { agent: agentType } });
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Animated.View entering={FadeIn.duration(600)} style={s.header}>
        <View style={s.headerInner}>
          <View style={s.iconBg}><Bot size={24} color={Colors.emerald} /></View>
          <View>
            <Text style={s.title}>Agent Hub</Text>
            <Text style={s.sub}>Your autonomous AI workforce.</Text>
          </View>
        </View>
      </Animated.View>

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAgents(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }} tintColor={Colors.emerald} />}
      >
        <Animated.View entering={FadeInDown.duration(600).delay(100)} style={s.grid}>
          {agents.map((agent, i) => {
            const meta = AGENT_MAPPINGS[agent.agent_type] || AGENT_MAPPINGS.default;
            const Icon = meta.icon;
            return (
              <AnimatedPressable
                testID={`agent-card-${agent.agent_type}`}
                key={agent.agent_type}
                haptic={Haptics.ImpactFeedbackStyle.Light}
                scaleDown={0.92}
                onPress={() => navigateToChat(agent.agent_type)}
                style={[s.card, { borderColor: `${meta.color}20` }]}
              >
                <TracingBeam color={meta.color} active={agent.is_active}>
                <BlurView intensity={30} tint="dark" style={s.cardInner}>
                  <View style={s.cardHead}>
                    <View style={[s.badgeWrap, { backgroundColor: `${meta.color}20` }]}>
                      <Text style={[s.badgeTxt, { color: meta.color }]}>{meta.badge}</Text>
                    </View>
                    {agent.is_active ? <View style={s.activeDot} /> : null}
                  </View>
                  
                  <View style={[s.iconBox, { backgroundColor: `${meta.color}15` }]}>
                    <Icon size={32} color={meta.color} strokeWidth={1.5} />
                  </View>
                  
                  <Text style={s.agentName}>{agent.name}</Text>
                  
                  <View style={s.statsWrap}>
                    <View style={s.statBox}>
                      <Text style={s.statVal}>{agent.tasks_completed}</Text>
                      <Text style={s.statLabel}>Tasks</Text>
                    </View>
                    <View style={s.statDiv} />
                    <View style={s.statBox}>
                      <Text style={s.statVal}>Lvl {agent.level}</Text>
                      <Text style={s.statLabel}>Skill</Text>
                    </View>
                  </View>
                  
                </BlurView>
                </TracingBeam>
              </AnimatedPressable>
            );
          })}
          
          {/* Add New Agent Placeholder */}
          <AnimatedPressable testID="hire-agent-button" haptic={Haptics.ImpactFeedbackStyle.Medium} style={[s.card, s.cardDashed]} onPress={() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)}>
             <BlurView intensity={15} tint="dark" style={[s.cardInner, s.center]}>
                <View style={[s.iconBox, { backgroundColor: `${Colors.amber}15` }]}>
                  <Lock size={32} color={Colors.amber} strokeWidth={1.5} />
                </View>
                <Text style={[s.agentName, { color: Colors.textSecondary }]}>Premium Agent</Text>
                <Text style={[s.statLabel, { color: Colors.amber }]}>Requires Pro Plan</Text>
             </BlurView>
          </AnimatedPressable>

        </Animated.View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { padding: 20, paddingTop: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  headerInner: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconBg: { width: 48, height: 48, borderRadius: 24, backgroundColor: `${Colors.emerald}15`, justifyContent: 'center', alignItems: 'center' },
  title: { color: Colors.textPrimary, fontSize: 32, fontFamily: Fonts.bold, letterSpacing: -0.5 },
  sub: { color: Colors.textSecondary, fontSize: 15, fontFamily: Fonts.bodyMedium, marginTop: 4 },
  scroll: { padding: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: { width: (width - 48) / 2, backgroundColor: `${Colors.surface}60`, borderRadius: 24, overflow: 'hidden', borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 8 },
  cardInner: { padding: 16, alignItems: 'center', minHeight: 220 },
  cardDashed: { borderColor: `${Colors.textMuted}40`, borderStyle: 'dashed' },
  center: { justifyContent: 'center' },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: 16 },
  badgeWrap: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeTxt: { fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 0.5 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.emerald, shadowColor: Colors.emerald, shadowOpacity: 0.8, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
  iconBox: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  agentName: { color: Colors.textPrimary, fontSize: 18, fontFamily: Fonts.bold, letterSpacing: -0.3, textAlign: 'center' },
  statsWrap: { flexDirection: 'row', marginTop: 'auto', paddingTop: 16, width: '100%', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  statBox: { flex: 1, alignItems: 'center' },
  statDiv: { width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.1)' },
  statVal: { color: Colors.textPrimary, fontSize: 16, fontFamily: Fonts.bold },
  statLabel: { color: Colors.textMuted, fontSize: 11, fontFamily: Fonts.bodyMedium, marginTop: 2 },
});
