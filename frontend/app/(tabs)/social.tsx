import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform, Modal, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSizes, Shadows, PlatformColors } from '../../constants/theme';

const API = process.env.EXPO_PUBLIC_BACKEND_URL;

type SocialContent = {
  id: string;
  platform: string;
  content: string;
  hashtags: string[];
  product_name: string;
  created_at: string;
  status: string;
};

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

  // Form state
  const [productName, setProductName] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('instagram');
  const [tone, setTone] = useState('engaging');

  const fetchContent = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/social/content`);
      const data = await res.json();
      setContent(data);
    } catch (e) {
      console.error('Social fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  const generateContent = async () => {
    if (!productName.trim() || !productDesc.trim()) return;
    setGenerating(true);
    Keyboard.dismiss();

    try {
      const res = await fetch(`${API}/api/social/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_name: productName.trim(),
          product_description: productDesc.trim(),
          platform: selectedPlatform,
          tone,
        }),
      });
      const data = await res.json();
      if (data.content) {
        setContent(prev => [data, ...prev]);
        setShowModal(false);
        setProductName('');
        setProductDesc('');
      }
    } catch (e) {
      console.error('Generate error:', e);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.amber} />
          <Text style={styles.loadingText}>Loading Social Studio...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchContent(); }} tintColor={Colors.amber} />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.overline}>CONTENT STUDIO</Text>
            <Text style={styles.title}>Social Media</Text>
            <Text style={styles.subtitle}>AI-powered content for every platform</Text>
          </View>
          <TouchableOpacity
            testID="create-content-btn"
            style={styles.createBtn}
            onPress={() => setShowModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.createBtnText}>+ Create</Text>
          </TouchableOpacity>
        </View>

        {/* Platform Stats */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.platformStats}>
          {PLATFORMS.map((p) => {
            const count = content.filter(c => c.platform === p.id).length;
            return (
              <View key={p.id} style={[styles.platformStat, { borderColor: p.color + '30' }]}>
                <Text style={styles.platformIcon}>{p.icon}</Text>
                <Text style={[styles.platformCount, { color: p.color }]}>{count}</Text>
                <Text style={styles.platformName}>{p.name}</Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Content List */}
        {content.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>✨</Text>
            <Text style={styles.emptyTitle}>No content yet</Text>
            <Text style={styles.emptyText}>Generate your first AI-powered social media post!</Text>
            <TouchableOpacity
              testID="empty-create-btn"
              style={styles.emptyBtn}
              onPress={() => setShowModal(true)}
            >
              <Text style={styles.emptyBtnText}>Generate Content</Text>
            </TouchableOpacity>
          </View>
        ) : (
          content.map((item) => {
            const platform = PLATFORMS.find(p => p.id === item.platform);
            return (
              <View key={item.id} style={[styles.contentCard, { borderColor: (platform?.color || Colors.border) + '20' }]}>
                <View style={styles.contentHeader}>
                  <Text style={styles.contentPlatformIcon}>{platform?.icon || '📱'}</Text>
                  <View style={styles.contentMeta}>
                    <Text style={[styles.contentPlatform, { color: platform?.color }]}>{platform?.name || item.platform}</Text>
                    <Text style={styles.contentProduct}>{item.product_name}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: item.status === 'draft' ? Colors.amberGlow : Colors.emeraldGlow }]}>
                    <Text style={[styles.statusText, { color: item.status === 'draft' ? Colors.amber : Colors.emerald }]}>
                      {item.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.contentText}>{item.content}</Text>
                <View style={styles.hashtagWrap}>
                  {item.hashtags.slice(0, 5).map((tag, i) => (
                    <Text key={i} style={[styles.hashtag, { color: platform?.color || Colors.emerald }]}>
                      {tag}
                    </Text>
                  ))}
                </View>
                <Text style={styles.contentDate}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
            );
          })
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Generate Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Generate Content</Text>

            <Text style={styles.inputLabel}>Product Name</Text>
            <TextInput
              testID="product-name-input"
              style={styles.input}
              value={productName}
              onChangeText={setProductName}
              placeholder="e.g., Wireless Earbuds Pro"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.inputLabel}>Product Description</Text>
            <TextInput
              testID="product-desc-input"
              style={[styles.input, styles.inputMulti]}
              value={productDesc}
              onChangeText={setProductDesc}
              placeholder="Describe your product features, benefits..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.inputLabel}>Platform</Text>
            <View style={styles.platformPicker}>
              {PLATFORMS.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  testID={`platform-${p.id}`}
                  style={[styles.platformPickerItem, selectedPlatform === p.id && { borderColor: p.color, backgroundColor: p.color + '15' }]}
                  onPress={() => setSelectedPlatform(p.id)}
                >
                  <Text style={styles.platformPickerIcon}>{p.icon}</Text>
                  <Text style={[styles.platformPickerText, selectedPlatform === p.id && { color: p.color }]}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Tone</Text>
            <View style={styles.toneRow}>
              {['engaging', 'professional', 'casual', 'luxury'].map((t) => (
                <TouchableOpacity
                  key={t}
                  testID={`tone-${t}`}
                  style={[styles.tonePill, tone === t && { borderColor: Colors.amber, backgroundColor: Colors.amberGlow }]}
                  onPress={() => setTone(t)}
                >
                  <Text style={[styles.toneText, tone === t && { color: Colors.amber }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity testID="cancel-generate-btn" style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="generate-btn"
                style={[styles.generateBtn, (!productName.trim() || !productDesc.trim()) && styles.generateBtnDisabled]}
                onPress={generateContent}
                disabled={!productName.trim() || !productDesc.trim() || generating}
              >
                {generating ? (
                  <ActivityIndicator size="small" color={Colors.bg} />
                ) : (
                  <Text style={styles.generateBtnText}>Generate</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { color: Colors.textSecondary, fontSize: FontSizes.md },
  scrollContent: { padding: Spacing.lg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xl },
  overline: { fontSize: FontSizes.xs, fontWeight: '800', letterSpacing: 3, color: Colors.amber, marginBottom: 4 },
  title: { fontSize: FontSizes.xxxl, fontWeight: '900', color: Colors.textPrimary },
  subtitle: { fontSize: FontSizes.md, color: Colors.textSecondary, marginTop: 4 },
  createBtn: {
    backgroundColor: Colors.amber, paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: BorderRadius.lg,
  },
  createBtnText: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.bg },
  platformStats: { marginBottom: Spacing.xl },
  platformStat: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1,
    padding: Spacing.lg, marginRight: Spacing.md, alignItems: 'center', minWidth: 90,
  },
  platformIcon: { fontSize: 24, marginBottom: 4 },
  platformCount: { fontSize: FontSizes.xl, fontWeight: '900' },
  platformName: { fontSize: FontSizes.xs, color: Colors.textMuted, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.textPrimary },
  emptyText: { fontSize: FontSizes.md, color: Colors.textSecondary, textAlign: 'center' },
  emptyBtn: {
    backgroundColor: Colors.amber, paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: BorderRadius.lg, marginTop: 8,
  },
  emptyBtnText: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.bg },
  contentCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.xl, borderWidth: 1, marginBottom: Spacing.lg, ...Shadows.card,
  },
  contentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  contentPlatformIcon: { fontSize: 28 },
  contentMeta: { flex: 1, marginLeft: Spacing.md },
  contentPlatform: { fontSize: FontSizes.md, fontWeight: '800' },
  contentProduct: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  statusText: { fontSize: FontSizes.xs, fontWeight: '800', letterSpacing: 0.5 },
  contentText: { fontSize: FontSizes.md, color: Colors.textPrimary, lineHeight: 24, marginBottom: Spacing.md },
  hashtagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.sm },
  hashtag: { fontSize: FontSizes.sm, fontWeight: '600' },
  contentDate: { fontSize: FontSizes.xs, color: Colors.textMuted },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl, padding: Spacing.xxl, paddingBottom: 40,
    borderTopWidth: 1, borderColor: Colors.border,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: Colors.textMuted, borderRadius: 2,
    alignSelf: 'center', marginBottom: Spacing.xl,
  },
  modalTitle: { fontSize: FontSizes.xl, fontWeight: '900', color: Colors.textPrimary, marginBottom: Spacing.xl },
  inputLabel: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6, marginTop: Spacing.md },
  input: {
    backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    color: Colors.textPrimary, fontSize: FontSizes.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  platformPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  platformPickerItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceElevated,
  },
  platformPickerIcon: { fontSize: 16 },
  platformPickerText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textSecondary },
  toneRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tonePill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceElevated,
  },
  toneText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textSecondary, textTransform: 'capitalize' },
  modalActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xxl },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceElevated, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  cancelBtnText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.textSecondary },
  generateBtn: {
    flex: 1, paddingVertical: 14, borderRadius: BorderRadius.lg,
    backgroundColor: Colors.amber, alignItems: 'center',
  },
  generateBtnDisabled: { opacity: 0.5 },
  generateBtnText: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.bg },
});
