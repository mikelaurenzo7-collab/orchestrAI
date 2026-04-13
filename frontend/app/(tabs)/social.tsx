import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authFetch } from '../../utils/api';
import { Colors, Spacing, BorderRadius, FontSizes, Shadows, PlatformColors } from '../../constants/theme';

type SocialContent = { id: string; platform: string; content: string; hashtags: string[]; product_name: string; created_at: string; status: string };
const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: '📸', color: PlatformColors.instagram },
  { id: 'twitter', name: 'Twitter/X', icon: '🐦', color: PlatformColors.twitter },
  { id: 'facebook', name: 'Facebook', icon: '📘', color: PlatformColors.facebook },
  { id: 'tiktok', name: 'TikTok', icon: '🎵', color: PlatformColors.tiktok },
];

export default function SocialScreen() {
  const [content, setContent] = useState<SocialContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [productName, setProductName] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('instagram');
  const [tone, setTone] = useState('engaging');

  const fetchContent = useCallback(async () => {
    try { const res = await authFetch('/api/social/content'); if (res.ok) setContent(await res.json()); }
    catch (e) { console.error(e); } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  const generateContent = async () => {
    if (!productName.trim() || !productDesc.trim()) return;
    setGenerating(true); Keyboard.dismiss();
    try {
      const res = await authFetch('/api/social/generate', {
        method: 'POST', body: JSON.stringify({ product_name: productName.trim(), product_description: productDesc.trim(), platform: selectedPlatform, tone }),
      });
      const data = await res.json();
      if (data.content) { setContent(p => [data, ...p]); setShowModal(false); setProductName(''); setProductDesc(''); }
    } catch (e) { console.error(e); } finally { setGenerating(false); }
  };

  if (loading) return <SafeAreaView style={s.container}><View style={s.center}><ActivityIndicator size="large" color={Colors.amber} /></View></SafeAreaView>;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchContent(); }} tintColor={Colors.amber} />}>
        <View style={s.headerRow}>
          <View><Text style={s.overline}>CONTENT STUDIO</Text><Text style={s.title}>Social Media</Text></View>
          <TouchableOpacity testID="create-content-btn" style={s.createBtn} onPress={() => setShowModal(true)}>
            <Text style={s.createBtnText}>+ Create</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.xl }}>
          {PLATFORMS.map(p => {
            const count = content.filter(c => c.platform === p.id).length;
            return (
              <View key={p.id} style={[s.platformStat, { borderColor: p.color + '30' }]}>
                <Text style={{ fontSize: 24 }}>{p.icon}</Text>
                <Text style={[s.platformCount, { color: p.color }]}>{count}</Text>
                <Text style={s.platformName}>{p.name}</Text>
              </View>
            );
          })}
        </ScrollView>

        {content.length === 0 ? (
          <View style={s.empty}>
            <Text style={{ fontSize: 48 }}>✨</Text>
            <Text style={s.emptyTitle}>No content yet</Text>
            <TouchableOpacity testID="empty-create-btn" style={s.emptyBtn} onPress={() => setShowModal(true)}>
              <Text style={s.emptyBtnText}>Generate Content</Text>
            </TouchableOpacity>
          </View>
        ) : content.map(item => {
          const plat = PLATFORMS.find(p => p.id === item.platform);
          return (
            <View key={item.id} style={[s.contentCard, { borderColor: (plat?.color || Colors.border) + '20' }]}>
              <View style={s.contentHeader}>
                <Text style={{ fontSize: 28 }}>{plat?.icon || '📱'}</Text>
                <View style={{ flex: 1, marginLeft: Spacing.md }}>
                  <Text style={[s.contentPlatform, { color: plat?.color }]}>{plat?.name}</Text>
                  <Text style={s.contentProduct}>{item.product_name}</Text>
                </View>
              </View>
              <Text style={s.contentText}>{item.content}</Text>
              <View style={s.hashWrap}>
                {item.hashtags.slice(0, 5).map((t, i) => <Text key={i} style={[s.hash, { color: plat?.color }]}>{t}</Text>)}
              </View>
            </View>
          );
        })}
        <View style={{ height: 32 }} />
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Generate Content</Text>
            <Text style={s.label}>Product Name</Text>
            <TextInput testID="product-name-input" style={s.input} value={productName} onChangeText={setProductName} placeholder="e.g., Wireless Earbuds Pro" placeholderTextColor={Colors.textMuted} />
            <Text style={s.label}>Description</Text>
            <TextInput testID="product-desc-input" style={[s.input, { height: 80, textAlignVertical: 'top' }]} value={productDesc} onChangeText={setProductDesc} placeholder="Product features..." placeholderTextColor={Colors.textMuted} multiline />
            <Text style={s.label}>Platform</Text>
            <View style={s.platPicker}>
              {PLATFORMS.map(p => (
                <TouchableOpacity key={p.id} testID={`platform-${p.id}`}
                  style={[s.platItem, selectedPlatform === p.id && { borderColor: p.color, backgroundColor: p.color + '15' }]}
                  onPress={() => setSelectedPlatform(p.id)}>
                  <Text style={{ fontSize: 16 }}>{p.icon}</Text>
                  <Text style={[s.platText, selectedPlatform === p.id && { color: p.color }]}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.label}>Tone</Text>
            <View style={s.toneRow}>
              {['engaging', 'professional', 'casual', 'luxury'].map(t => (
                <TouchableOpacity key={t} testID={`tone-${t}`}
                  style={[s.tonePill, tone === t && { borderColor: Colors.amber, backgroundColor: Colors.amberGlow }]}
                  onPress={() => setTone(t)}>
                  <Text style={[s.toneText, tone === t && { color: Colors.amber }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.modalActions}>
              <TouchableOpacity testID="cancel-generate-btn" style={s.cancelBtn} onPress={() => setShowModal(false)}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity testID="generate-btn" style={[s.genBtn, (!productName.trim() || !productDesc.trim()) && { opacity: 0.5 }]}
                onPress={generateContent} disabled={!productName.trim() || !productDesc.trim() || generating}>
                {generating ? <ActivityIndicator size="small" color={Colors.bg} /> : <Text style={s.genText}>Generate</Text>}
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xl },
  overline: { fontSize: FontSizes.xs, fontWeight: '800', letterSpacing: 3, color: Colors.amber, marginBottom: 4 },
  title: { fontSize: FontSizes.xxxl, fontWeight: '900', color: Colors.textPrimary },
  createBtn: { backgroundColor: Colors.amber, paddingHorizontal: 20, paddingVertical: 12, borderRadius: BorderRadius.lg },
  createBtnText: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.bg },
  platformStat: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.lg, marginRight: Spacing.md, alignItems: 'center', minWidth: 90 },
  platformCount: { fontSize: FontSizes.xl, fontWeight: '900' },
  platformName: { fontSize: FontSizes.xs, color: Colors.textMuted, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.textPrimary },
  emptyBtn: { backgroundColor: Colors.amber, paddingHorizontal: 24, paddingVertical: 14, borderRadius: BorderRadius.lg, marginTop: 8 },
  emptyBtnText: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.bg },
  contentCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl, borderWidth: 1, marginBottom: Spacing.lg, ...Shadows.card },
  contentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  contentPlatform: { fontSize: FontSizes.md, fontWeight: '800' },
  contentProduct: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  contentText: { fontSize: FontSizes.md, color: Colors.textPrimary, lineHeight: 24, marginBottom: Spacing.md },
  hashWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hash: { fontSize: FontSizes.sm, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.xxl, borderTopRightRadius: BorderRadius.xxl, padding: Spacing.xxl, paddingBottom: 40, borderTopWidth: 1, borderColor: Colors.border },
  modalHandle: { width: 40, height: 4, backgroundColor: Colors.textMuted, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.xl },
  modalTitle: { fontSize: FontSizes.xl, fontWeight: '900', color: Colors.textPrimary, marginBottom: Spacing.lg },
  label: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6, marginTop: Spacing.md },
  input: { backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, color: Colors.textPrimary, fontSize: FontSizes.md, borderWidth: 1, borderColor: Colors.border },
  platPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  platItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceElevated },
  platText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textSecondary },
  toneRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tonePill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceElevated },
  toneText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textSecondary, textTransform: 'capitalize' },
  modalActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xxl },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: BorderRadius.lg, backgroundColor: Colors.surfaceElevated, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  cancelText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.textSecondary },
  genBtn: { flex: 1, paddingVertical: 14, borderRadius: BorderRadius.lg, backgroundColor: Colors.amber, alignItems: 'center' },
  genText: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.bg },
});
