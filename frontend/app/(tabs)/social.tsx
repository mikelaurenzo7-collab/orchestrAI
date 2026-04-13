import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authFetch } from '../../utils/api';
import { Colors, Spacing, BorderRadius, FontSizes, AgentColors } from '../../constants/theme';

type ActionDef = { id: string; name: string; icon: string; desc: string };
type WorkflowTemplate = { id: string; name: string; icon: string; desc: string; steps: any[] };

export default function ExecuteScreen() {
  const [tab, setTab] = useState<'actions' | 'workflows' | 'builder'>('actions');
  const [catalog, setCatalog] = useState<Record<string, ActionDef[]>>({});
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState<string | null>(null);
  const [resultModal, setResultModal] = useState<any>(null);
  // Builder state — conversational
  const [showBuilder, setShowBuilder] = useState(false);
  const [niche, setNiche] = useState('');
  const [storeName, setStoreName] = useState('');
  const [style, setStyle] = useState('modern');
  const [building, setBuilding] = useState(false);
  const [buildId, setBuildId] = useState<string | null>(null);
  const [buildChat, setBuildChat] = useState<any[]>([]);
  const [buildComplete, setBuildComplete] = useState(false);
  const [buildPlan, setBuildPlan] = useState<any>(null);
  const [buildMsg, setBuildMsg] = useState('');
  const [autopilot, setAutopilot] = useState(true);
  const buildScrollRef = useRef<ScrollView>(null);
  // Browser agent state
  const [browserUrl, setBrowserUrl] = useState('');
  const [browserInstructions, setBrowserInstructions] = useState('');
  const [browserType, setBrowserType] = useState('research');
  const [browsing, setBrowsing] = useState(false);
  const [browserResult, setBrowserResult] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [catRes, tplRes, histRes] = await Promise.all([
        authFetch('/api/actions/catalog'),
        authFetch('/api/workflows/templates'),
        authFetch('/api/actions/history'),
      ]);
      if (catRes.ok) setCatalog(await catRes.json());
      if (tplRes.ok) setTemplates(await tplRes.json());
      if (histRes.ok) setHistory(await histRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const executeAction = async (agentType: string, actionId: string) => {
    setExecuting(`${agentType}_${actionId}`);
    try {
      const res = await authFetch('/api/actions/execute', {
        method: 'POST', body: JSON.stringify({ action_id: actionId, agent_type: agentType }),
      });
      const data = await res.json();
      if (data.result) setResultModal(data);
      fetchData();
    } catch (e) { console.error(e); }
    finally { setExecuting(null); }
  };

  const executeWorkflow = async (templateId: string) => {
    setExecuting(`wf_${templateId}`);
    try {
      const res = await authFetch('/api/workflows/execute', {
        method: 'POST', body: JSON.stringify({ template_id: templateId }),
      });
      const data = await res.json();
      if (data.steps_results) setResultModal(data);
      fetchData();
    } catch (e) { console.error(e); }
    finally { setExecuting(null); }
  };

  const startBuild = async () => {
    if (!niche.trim()) return;
    setBuilding(true); Keyboard.dismiss();
    try {
      const res = await authFetch('/api/store-builder/start', {
        method: 'POST', body: JSON.stringify({ niche: niche.trim(), store_name: storeName.trim() || null, style, autopilot }),
      });
      const data = await res.json();
      setBuildId(data.build_id);
      setBuildChat(data.chat_log || []);
      setShowBuilder(false);
      // Auto-run all steps
      runBuildSteps(data.build_id);
    } catch (e) { console.error(e); setBuilding(false); }
  };

  const runBuildSteps = async (id: string) => {
    for (let i = 0; i < 6; i++) {
      try {
        const res = await authFetch(`/api/store-builder/step/${id}`, { method: 'POST' });
        const data = await res.json();
        setBuildChat(data.chat_log || []);
        if (data.plan) setBuildPlan(data.plan);
        if (data.status === 'complete') { setBuildComplete(true); break; }
        // Small delay between steps for UX
        await new Promise(r => setTimeout(r, 500));
      } catch (e) { console.error(e); break; }
    }
    setBuilding(false);
  };

  const sendBuildChat = async () => {
    if (!buildMsg.trim() || !buildId) return;
    const msg = buildMsg.trim();
    setBuildMsg(''); Keyboard.dismiss();
    try {
      const res = await authFetch(`/api/store-builder/chat/${buildId}`, {
        method: 'POST', body: JSON.stringify({ build_id: buildId, message: msg }),
      });
      const data = await res.json();
      setBuildChat(data.chat_log || []);
    } catch (e) { console.error(e); }
  };

  const executeBrowser = async () => {
    setBrowsing(true); Keyboard.dismiss();
    try {
      const res = await authFetch('/api/browser/execute', {
        method: 'POST', body: JSON.stringify({
          task_type: browserType, url: browserUrl.trim() || null,
          instructions: browserInstructions.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.result) setBrowserResult(data);
    } catch (e) { console.error(e); }
    finally { setBrowsing(false); }
  };

  if (loading) return <SafeAreaView style={s.container}><View style={s.center}><ActivityIndicator size="large" color={Colors.emerald} /></View></SafeAreaView>;

  const agentOrder = ['store_manager', 'marketing', 'analytics', 'customer_service'];
  const agentNames: Record<string, string> = { store_manager: 'Store Commander', marketing: 'Growth Engine', analytics: 'Insight Oracle', customer_service: 'Support Shield' };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.emerald} />}>
        <Text style={s.overline}>EXECUTION ENGINE</Text>
        <Text style={s.title}>Execute</Text>

        {/* Tab Switcher */}
        <View style={s.tabs}>
          {[
            { id: 'actions' as const, label: 'Actions', icon: '⚡' },
            { id: 'workflows' as const, label: 'Workflows', icon: '🔄' },
            { id: 'builder' as const, label: 'Build', icon: '🏗️' },
            { id: 'browser' as const, label: 'Browse', icon: '🌐' },
          ].map(t => (
            <TouchableOpacity key={t.id} testID={`tab-${t.id}`}
              style={[s.tabBtn, tab === t.id && s.tabActive]} onPress={() => setTab(t.id)}>
              <Text style={s.tabIcon}>{t.icon}</Text>
              <Text style={[s.tabLabel, tab === t.id && s.tabLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ACTIONS TAB */}
        {tab === 'actions' && agentOrder.map(agentType => {
          const actions = catalog[agentType] || [];
          const ac = AgentColors[agentType] || AgentColors.general;
          if (!actions.length) return null;
          return (
            <View key={agentType} style={s.agentSection}>
              <Text style={[s.agentLabel, { color: ac.primary }]}>{agentNames[agentType]}</Text>
              {actions.map(action => {
                const isExec = executing === `${agentType}_${action.id}`;
                return (
                  <TouchableOpacity key={action.id} testID={`action-${action.id}`}
                    style={[s.actionCard, { borderColor: ac.primary + '15' }]}
                    onPress={() => executeAction(agentType, action.id)} disabled={!!executing} activeOpacity={0.7}>
                    <View style={s.actionRow}>
                      <Text style={s.actionIcon}>{action.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={s.actionName}>{action.name}</Text>
                        <Text style={s.actionDesc}>{action.desc}</Text>
                      </View>
                      {isExec ? <ActivityIndicator size="small" color={ac.primary} /> :
                        <View style={[s.runBadge, { backgroundColor: ac.glow, borderColor: ac.primary + '30' }]}>
                          <Text style={[s.runText, { color: ac.primary }]}>RUN</Text>
                        </View>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}

        {/* WORKFLOWS TAB */}
        {tab === 'workflows' && (
          <View>
            <Text style={s.sectionSub}>Multi-step AI pipelines — each agent passes context to the next</Text>
            {templates.map(wf => {
              const isExec = executing === `wf_${wf.id}`;
              return (
                <TouchableOpacity key={wf.id} testID={`workflow-${wf.id}`}
                  style={s.wfCard} onPress={() => executeWorkflow(wf.id)} disabled={!!executing} activeOpacity={0.7}>
                  <View style={s.wfHeader}>
                    <Text style={s.wfIcon}>{wf.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.wfName}>{wf.name}</Text>
                      <Text style={s.wfDesc}>{wf.desc}</Text>
                    </View>
                  </View>
                  <View style={s.wfSteps}>
                    {wf.steps.map((step: any, i: number) => (
                      <View key={i} style={s.wfStep}>
                        <View style={[s.wfStepDot, { backgroundColor: (AgentColors[step.agent] || AgentColors.general).primary }]} />
                        <Text style={s.wfStepText}>{step.agent.replace('_', ' ')}</Text>
                        {i < wf.steps.length - 1 && <Text style={s.wfArrow}>→</Text>}
                      </View>
                    ))}
                  </View>
                  {isExec ? <ActivityIndicator size="small" color={Colors.emerald} style={{ marginTop: 12 }} /> :
                    <View style={s.wfRunBtn}><Text style={s.wfRunText}>Execute Pipeline</Text></View>}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* STORE BUILDER TAB — Conversational */}
        {tab === 'builder' && (
          <View>
            {!buildId ? (
              <>
                <Text style={s.sectionSub}>Tell us your niche — AI builds your entire store while you watch. Chat with the builder anytime.</Text>
                <TouchableOpacity testID="start-builder-btn" style={s.builderBtn} onPress={() => setShowBuilder(true)}>
                  <Text style={s.builderBtnIcon}>🏗️</Text>
                  <Text style={s.builderBtnTitle}>Build a New Store</Text>
                  <Text style={s.builderBtnSub}>Pick a niche → AI creates brand, products, pricing, policies, marketing → Deploy to any platform</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={s.buildChatWrap}>
                <View style={s.buildProgress}>
                  <Text style={s.buildProgressText}>
                    {buildComplete ? '✅ Build Complete!' : building ? '🔨 Building...' : 'Ready'}
                  </Text>
                </View>
                <ScrollView ref={buildScrollRef} style={s.buildChatScroll} showsVerticalScrollIndicator={false}
                  onContentSizeChange={() => buildScrollRef.current?.scrollToEnd({ animated: true })}>
                  {buildChat.map((msg: any, i: number) => (
                    <View key={i} style={[s.buildMsg, msg.role === 'user' ? s.buildMsgUser : s.buildMsgAgent]}>
                      {msg.role !== 'user' && <View style={s.buildMsgDot} />}
                      <Text style={[s.buildMsgText, msg.role === 'user' && { color: Colors.emerald }]}>{msg.content}</Text>
                    </View>
                  ))}
                  {building && <ActivityIndicator size="small" color={Colors.emerald} style={{ marginTop: 12 }} />}
                </ScrollView>

                {/* Chat input during build */}
                <View style={s.buildInputBar}>
                  <TextInput testID="build-chat-input" style={s.buildInput} value={buildMsg} onChangeText={setBuildMsg}
                    placeholder="Feedback or changes..." placeholderTextColor="#475569" />
                  <TouchableOpacity testID="build-chat-send" style={s.buildSendBtn} onPress={sendBuildChat} disabled={!buildMsg.trim()}>
                    <Text style={s.buildSendText}>↑</Text>
                  </TouchableOpacity>
                </View>

                {buildComplete && buildPlan && (
                  <View style={s.planCard}>
                    <Text style={s.planTitle}>{buildPlan.brand_name || 'Your Store'}</Text>
                    {buildPlan.tagline && <Text style={s.planTagline}>{buildPlan.tagline}</Text>}
                    {buildPlan.estimated_monthly_revenue && (
                      <View style={s.revBadge}><Text style={s.revText}>Est: {buildPlan.estimated_monthly_revenue}</Text></View>
                    )}
                    <Text style={s.planSection}>Products ({buildPlan.products?.length || 0})</Text>
                    {(buildPlan.products || []).slice(0, 5).map((p: any, i: number) => (
                      <View key={i} style={s.productRow}>
                        <View style={{ flex: 1 }}><Text style={s.productName}>{p.title}</Text></View>
                        <Text style={s.productPrice}>${p.price}</Text>
                      </View>
                    ))}
                    {(buildPlan.products?.length || 0) > 5 && (
                      <Text style={s.moreText}>+ {buildPlan.products.length - 5} more</Text>
                    )}
                  </View>
                )}

                {buildComplete && (
                  <TouchableOpacity style={s.newBuildBtn} onPress={() => { setBuildId(null); setBuildChat([]); setBuildComplete(false); setBuildPlan(null); }}>
                    <Text style={s.newBuildText}>Start Another Build</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* BROWSER AGENT TAB */}
        {tab === 'browser' && (
          <View>
            <Text style={s.sectionSub}>AI-powered browser agent — researches competitors, scrapes products, monitors prices, and more.</Text>

            <Text style={s.agentLabel}>Task Type</Text>
            <View style={s.styleRow}>
              {[
                { id: 'research', label: 'Research', icon: '🔍' },
                { id: 'scrape', label: 'Scrape', icon: '📋' },
                { id: 'monitor', label: 'Monitor', icon: '👁️' },
                { id: 'screenshot', label: 'Screenshot', icon: '📸' },
                { id: 'custom', label: 'Custom', icon: '🎯' },
              ].map(t => (
                <TouchableOpacity key={t.id} testID={`browser-type-${t.id}`}
                  style={[s.stylePill, browserType === t.id && { borderColor: Colors.cyan, backgroundColor: Colors.cyanGlow }]}
                  onPress={() => setBrowserType(t.id)}>
                  <Text style={{ fontSize: 14 }}>{t.icon}</Text>
                  <Text style={[s.styleText, browserType === t.id && { color: Colors.cyan }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[s.label, { marginTop: 16 }]}>URL (optional for research)</Text>
            <TextInput testID="browser-url-input" style={s.input} value={browserUrl} onChangeText={setBrowserUrl}
              placeholder="https://competitor-store.com" placeholderTextColor={Colors.textMuted} autoCapitalize="none" />

            <Text style={s.label}>Instructions</Text>
            <TextInput testID="browser-instructions-input" style={[s.input, { height: 80, textAlignVertical: 'top' }]}
              value={browserInstructions} onChangeText={setBrowserInstructions} multiline
              placeholder="e.g., Find their bestselling products and pricing strategy" placeholderTextColor={Colors.textMuted} />

            <TouchableOpacity testID="browser-execute-btn"
              style={[s.wfRunBtn, { backgroundColor: Colors.cyan }]}
              onPress={executeBrowser} disabled={browsing}>
              {browsing ? <ActivityIndicator size="small" color={Colors.bg} /> :
                <Text style={s.wfRunText}>Launch Browser Agent</Text>}
            </TouchableOpacity>

            {browserResult && (
              <View style={[s.planCard, { borderColor: Colors.cyan + '25', marginTop: 16 }]}>
                <Text style={[s.planTitle, { color: Colors.cyan }]}>Browser Agent Report</Text>
                {browserResult.scraped_data?.length > 0 && (
                  <View>
                    <Text style={s.planSection}>Extracted Data ({browserResult.scraped_data.length} items)</Text>
                    {browserResult.scraped_data.slice(0, 5).map((item: any, i: number) => (
                      <View key={i} style={s.productRow}>
                        <Text style={s.productName}>{item.title || item.price || JSON.stringify(item)}</Text>
                        {item.price && <Text style={[s.productPrice, { color: Colors.cyan }]}>{item.price}</Text>}
                      </View>
                    ))}
                  </View>
                )}
                <Text style={s.planSection}>AI Analysis</Text>
                <Text style={s.resultContent}>{browserResult.result}</Text>
                {browserResult.screenshots?.length > 0 && (
                  <Text style={[s.moreText, { color: Colors.cyan }]}>{browserResult.screenshots.length} screenshot(s) captured</Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Recent History */}
        {history.length > 0 && tab === 'actions' && (
          <View style={s.histSection}>
            <Text style={s.histTitle}>Recent Executions</Text>
            {history.slice(0, 5).map((h, i) => (
              <TouchableOpacity key={i} style={s.histItem} onPress={() => setResultModal(h)}>
                <View style={[s.histDot, { backgroundColor: h.status === 'completed' ? Colors.emerald : Colors.rose }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.histName}>{h.action_name}</Text>
                  <Text style={s.histTime}>{new Date(h.created_at).toLocaleString()}</Text>
                </View>
                <Text style={s.histArrow}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Result Modal */}
      <Modal visible={!!resultModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.resultSheet}>
            <View style={s.modalHandle} />
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
              <Text style={s.resultTitle}>{resultModal?.action_name || resultModal?.name || 'Result'}</Text>
              <Text style={s.resultContent}>
                {resultModal?.result || resultModal?.steps_results?.map((sr: any) => `## ${sr.action_name}\n${sr.result}\n\n`).join('') || 'No result'}
              </Text>
            </ScrollView>
            <TouchableOpacity testID="close-result-btn" style={s.closeBtn} onPress={() => setResultModal(null)}>
              <Text style={s.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Builder Modal */}
      <Modal visible={showBuilder} animationType="slide" transparent>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.resultSheet}>
            <View style={s.modalHandle} />
            <Text style={s.resultTitle}>Build Your Store</Text>
            <Text style={s.builderSub}>Describe your niche and we'll create a full store blueprint</Text>
            <Text style={s.label}>What do you sell? *</Text>
            <TextInput testID="niche-input" style={s.input} value={niche} onChangeText={setNiche}
              placeholder="e.g., vintage jewelry, fitness gear, organic skincare" placeholderTextColor={Colors.textMuted} />
            <Text style={s.label}>Brand Name (optional)</Text>
            <TextInput testID="brand-input" style={s.input} value={storeName} onChangeText={setStoreName}
              placeholder="We'll suggest one if blank" placeholderTextColor={Colors.textMuted} />
            <Text style={s.label}>Style</Text>
            <View style={s.styleRow}>
              {['modern', 'minimal', 'bold', 'luxury', 'playful'].map(st => (
                <TouchableOpacity key={st} testID={`style-${st}`}
                  style={[s.stylePill, style === st && { borderColor: Colors.emerald, backgroundColor: Colors.emeraldGlow }]}
                  onPress={() => setStyle(st)}>
                  <Text style={[s.styleText, style === st && { color: Colors.emerald }]}>{st}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowBuilder(false)}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="generate-plan-btn"
                style={[s.genBtn, !niche.trim() && { opacity: 0.5 }]}
                onPress={startBuild} disabled={!niche.trim() || building}>
                {building ? <ActivityIndicator size="small" color={Colors.bg} /> :
                  <Text style={s.genText}>Generate Blueprint</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: Spacing.lg },
  overline: { fontSize: FontSizes.xs, fontWeight: '800', letterSpacing: 3, color: Colors.amber, marginBottom: 4 },
  title: { fontSize: FontSizes.xxxl, fontWeight: '900', color: Colors.textPrimary, marginBottom: Spacing.lg },
  tabs: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: BorderRadius.lg, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  tabActive: { backgroundColor: Colors.emeraldGlow, borderColor: Colors.emerald + '40' },
  tabIcon: { fontSize: 16 },
  tabLabel: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textMuted },
  tabLabelActive: { color: Colors.emerald },
  sectionSub: { fontSize: FontSizes.md, color: Colors.textSecondary, marginBottom: Spacing.xl, lineHeight: 22 },
  agentSection: { marginBottom: Spacing.xl },
  agentLabel: { fontSize: FontSizes.md, fontWeight: '800', letterSpacing: 1, marginBottom: Spacing.md },
  actionCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, marginBottom: Spacing.sm, ...Shadows.card },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  actionIcon: { fontSize: 24, width: 36, textAlign: 'center' },
  actionName: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.textPrimary },
  actionDesc: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  runBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.lg, borderWidth: 1 },
  runText: { fontSize: FontSizes.xs, fontWeight: '800', letterSpacing: 1 },
  wfCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg, ...Shadows.card },
  wfHeader: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  wfIcon: { fontSize: 32 },
  wfName: { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.textPrimary },
  wfDesc: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginTop: 4, lineHeight: 20 },
  wfSteps: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center' },
  wfStep: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  wfStepDot: { width: 8, height: 8, borderRadius: 4 },
  wfStepText: { fontSize: FontSizes.xs, color: Colors.textSecondary, fontWeight: '600', textTransform: 'capitalize' },
  wfArrow: { fontSize: FontSizes.xs, color: Colors.textMuted, marginHorizontal: 2 },
  wfRunBtn: { backgroundColor: Colors.emerald, borderRadius: BorderRadius.lg, paddingVertical: 12, alignItems: 'center', marginTop: Spacing.md },
  wfRunText: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.bg },
  builderBtn: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xxl, borderWidth: 1, borderColor: Colors.emerald + '25', alignItems: 'center', gap: 8, ...Shadows.card },
  builderBtnIcon: { fontSize: 40 },
  builderBtnTitle: { fontSize: FontSizes.xl, fontWeight: '900', color: Colors.textPrimary },
  builderBtnSub: { fontSize: FontSizes.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  planCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl, borderWidth: 1, borderColor: Colors.emerald + '25', marginTop: Spacing.xl, ...Shadows.card },
  planTitle: { fontSize: FontSizes.xxl, fontWeight: '900', color: Colors.emerald },
  planTagline: { fontSize: FontSizes.md, color: Colors.textSecondary, fontStyle: 'italic', marginTop: 4 },
  revBadge: { backgroundColor: Colors.emeraldGlow, paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.lg, alignSelf: 'flex-start', marginTop: Spacing.md, borderWidth: 1, borderColor: Colors.emerald + '30' },
  revText: { fontSize: FontSizes.sm, fontWeight: '800', color: Colors.emerald },
  planSection: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.textPrimary, marginTop: Spacing.xl, marginBottom: Spacing.md },
  productRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  productName: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.textPrimary },
  productDesc: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  productPrice: { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.emerald, marginLeft: Spacing.md },
  moreText: { fontSize: FontSizes.sm, color: Colors.textMuted, marginTop: Spacing.md, textAlign: 'center' },
  // Build chat
  buildChatWrap: { flex: 1 },
  buildProgress: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, marginBottom: 8 },
  buildProgressText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.emerald },
  buildChatScroll: { maxHeight: 320, backgroundColor: '#0A0F1E', borderRadius: 16, padding: 16, marginBottom: 12 },
  buildMsg: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 8 },
  buildMsgUser: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
  buildMsgAgent: { alignSelf: 'flex-start' },
  buildMsgDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.emerald, marginTop: 6 },
  buildMsgText: { fontSize: FontSizes.md, color: '#E2E8F0', lineHeight: 22, flex: 1 },
  buildInputBar: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  buildInput: { flex: 1, backgroundColor: '#0D1424', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: '#F1F5F9', fontSize: FontSizes.md, borderWidth: 1, borderColor: '#1E293B' },
  buildSendBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.emerald, justifyContent: 'center', alignItems: 'center' },
  buildSendText: { fontSize: 20, fontWeight: '800', color: '#050A18' },
  newBuildBtn: { backgroundColor: '#0D1424', borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#1E293B', marginTop: 12 },
  newBuildText: { fontSize: FontSizes.md, fontWeight: '700', color: '#94A3B8' },
  histSection: { marginTop: Spacing.xl },
  histTitle: { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.md },
  histItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  histDot: { width: 10, height: 10, borderRadius: 5 },
  histName: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.textPrimary },
  histTime: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  histArrow: { fontSize: FontSizes.lg, color: Colors.emerald },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  resultSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.xxl, borderTopRightRadius: BorderRadius.xxl, padding: Spacing.xxl, paddingBottom: 40, borderTopWidth: 1, borderColor: Colors.border, maxHeight: '85%' },
  modalHandle: { width: 40, height: 4, backgroundColor: Colors.textMuted, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.xl },
  resultTitle: { fontSize: FontSizes.xl, fontWeight: '900', color: Colors.textPrimary, marginBottom: Spacing.md },
  resultContent: { fontSize: FontSizes.md, color: Colors.textSecondary, lineHeight: 24 },
  closeBtn: { backgroundColor: Colors.surfaceElevated, paddingVertical: 14, borderRadius: BorderRadius.lg, alignItems: 'center', marginTop: Spacing.xl, borderWidth: 1, borderColor: Colors.border },
  closeBtnText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.textSecondary },
  builderSub: { fontSize: FontSizes.md, color: Colors.textSecondary, marginBottom: Spacing.xl },
  label: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6, marginTop: Spacing.md },
  input: { backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, color: Colors.textPrimary, fontSize: FontSizes.md, borderWidth: 1, borderColor: Colors.border },
  styleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  stylePill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceElevated },
  styleText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textSecondary, textTransform: 'capitalize' },
  modalActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xxl },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: BorderRadius.lg, backgroundColor: Colors.surfaceElevated, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  cancelText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.textSecondary },
  genBtn: { flex: 1, paddingVertical: 14, borderRadius: BorderRadius.lg, backgroundColor: Colors.emerald, alignItems: 'center' },
  genText: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.bg },
});
