import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform, Modal, Alert, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSizes, Shadows, PlatformColors } from '../../constants/theme';

const API = process.env.EXPO_PUBLIC_BACKEND_URL;

type Store = {
  id: string;
  name: string;
  platform: string;
  store_url: string | null;
  status: string;
  connected_at: string;
  products_synced: number;
  orders_total: number;
  revenue: number;
};

const STORE_PLATFORMS = [
  { id: 'shopify', name: 'Shopify', icon: '🟢', color: PlatformColors.shopify },
  { id: 'woocommerce', name: 'WooCommerce', icon: '🟣', color: PlatformColors.woocommerce },
  { id: 'etsy', name: 'Etsy', icon: '🟠', color: PlatformColors.etsy },
  { id: 'custom', name: 'Custom API', icon: '🔧', color: Colors.emerald },
];

export default function StoresScreen() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Form
  const [storeName, setStoreName] = useState('');
  const [storeUrl, setStoreUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('shopify');

  const fetchStores = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/stores`);
      const data = await res.json();
      setStores(data);
    } catch (e) {
      console.error('Stores fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchStores(); }, [fetchStores]);

  const connectStore = async () => {
    if (!storeName.trim()) return;
    setConnecting(true);
    Keyboard.dismiss();

    try {
      const res = await fetch(`${API}/api/stores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: storeName.trim(),
          platform: selectedPlatform,
          store_url: storeUrl.trim() || null,
          api_key: apiKey.trim() || null,
        }),
      });
      const data = await res.json();
      setStores(prev => [data, ...prev]);
      setShowModal(false);
      setStoreName('');
      setStoreUrl('');
      setApiKey('');
    } catch (e) {
      console.error('Connect store error:', e);
    } finally {
      setConnecting(false);
    }
  };

  const disconnectStore = async (storeId: string) => {
    try {
      await fetch(`${API}/api/stores/${storeId}`, { method: 'DELETE' });
      setStores(prev => prev.filter(s => s.id !== storeId));
    } catch (e) {
      console.error('Disconnect error:', e);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.emerald} />
          <Text style={styles.loadingText}>Loading Store Hub...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStores(); }} tintColor={Colors.emerald} />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.overline}>STORE HUB</Text>
            <Text style={styles.title}>Connections</Text>
            <Text style={styles.subtitle}>{stores.length} store{stores.length !== 1 ? 's' : ''} connected</Text>
          </View>
          <TouchableOpacity
            testID="connect-store-btn"
            style={styles.connectBtn}
            onPress={() => setShowModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.connectBtnText}>+ Connect</Text>
          </TouchableOpacity>
        </View>

        {/* Connected Stores */}
        {stores.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏪</Text>
            <Text style={styles.emptyTitle}>No stores connected</Text>
            <Text style={styles.emptyText}>
              Connect your Shopify, WooCommerce, or Etsy store to unleash the power of AI agents.
            </Text>
            <TouchableOpacity
              testID="empty-connect-btn"
              style={styles.emptyBtn}
              onPress={() => setShowModal(true)}
            >
              <Text style={styles.emptyBtnText}>Connect First Store</Text>
            </TouchableOpacity>
          </View>
        ) : (
          stores.map((store) => {
            const platform = STORE_PLATFORMS.find(p => p.id === store.platform);
            return (
              <View key={store.id} style={[styles.storeCard, { borderColor: (platform?.color || Colors.border) + '25' }]}>
                <View style={styles.storeHeader}>
                  <View style={[styles.storePlatformBadge, { backgroundColor: (platform?.color || Colors.emerald) + '15' }]}>
                    <Text style={styles.storePlatformIcon}>{platform?.icon || '🏪'}</Text>
                  </View>
                  <View style={styles.storeInfo}>
                    <Text style={styles.storeName}>{store.name}</Text>
                    <Text style={[styles.storePlatform, { color: platform?.color }]}>
                      {platform?.name || store.platform}
                    </Text>
                  </View>
                  <View style={[styles.connStatusBadge, { backgroundColor: store.status === 'connected' ? Colors.emeraldGlow : Colors.amberGlow }]}>
                    <View style={[styles.connStatusDot, { backgroundColor: store.status === 'connected' ? Colors.emerald : Colors.amber }]} />
                    <Text style={[styles.connStatusText, { color: store.status === 'connected' ? Colors.emerald : Colors.amber }]}>
                      {store.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {store.store_url && (
                  <Text style={styles.storeUrl}>{store.store_url}</Text>
                )}

                <View style={styles.storeMetrics}>
                  <View style={styles.storeMetric}>
                    <Text style={styles.storeMetricVal}>{store.products_synced}</Text>
                    <Text style={styles.storeMetricLabel}>Products</Text>
                  </View>
                  <View style={styles.storeMetric}>
                    <Text style={styles.storeMetricVal}>{store.orders_total}</Text>
                    <Text style={styles.storeMetricLabel}>Orders</Text>
                  </View>
                  <View style={styles.storeMetric}>
                    <Text style={styles.storeMetricVal}>${store.revenue.toLocaleString()}</Text>
                    <Text style={styles.storeMetricLabel}>Revenue</Text>
                  </View>
                </View>

                <View style={styles.storeActions}>
                  <TouchableOpacity
                    testID={`sync-store-${store.id}`}
                    style={styles.syncBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.syncBtnText}>Sync Now</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    testID={`disconnect-store-${store.id}`}
                    style={styles.disconnectBtn}
                    onPress={() => disconnectStore(store.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.disconnectBtnText}>Disconnect</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.connectedDate}>
                  Connected {new Date(store.connected_at).toLocaleDateString()}
                </Text>
              </View>
            );
          })
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Connect Store Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Connect Store</Text>

            <Text style={styles.inputLabel}>Platform</Text>
            <View style={styles.platformGrid}>
              {STORE_PLATFORMS.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  testID={`store-platform-${p.id}`}
                  style={[styles.platformOption, selectedPlatform === p.id && { borderColor: p.color, backgroundColor: p.color + '12' }]}
                  onPress={() => setSelectedPlatform(p.id)}
                >
                  <Text style={styles.platformOptionIcon}>{p.icon}</Text>
                  <Text style={[styles.platformOptionText, selectedPlatform === p.id && { color: p.color }]}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Store Name</Text>
            <TextInput
              testID="store-name-input"
              style={styles.input}
              value={storeName}
              onChangeText={setStoreName}
              placeholder="My Awesome Store"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.inputLabel}>Store URL (optional)</Text>
            <TextInput
              testID="store-url-input"
              style={styles.input}
              value={storeUrl}
              onChangeText={setStoreUrl}
              placeholder="https://mystore.myshopify.com"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              keyboardType="url"
            />

            <Text style={styles.inputLabel}>API Key (optional)</Text>
            <TextInput
              testID="store-api-key-input"
              style={styles.input}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="shpat_xxxxxxxxxx..."
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity testID="cancel-connect-btn" style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="submit-connect-btn"
                style={[styles.connectSubmitBtn, !storeName.trim() && styles.btnDisabled]}
                onPress={connectStore}
                disabled={!storeName.trim() || connecting}
              >
                {connecting ? (
                  <ActivityIndicator size="small" color={Colors.bg} />
                ) : (
                  <Text style={styles.connectSubmitText}>Connect</Text>
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xxl },
  overline: { fontSize: FontSizes.xs, fontWeight: '800', letterSpacing: 3, color: Colors.emerald, marginBottom: 4 },
  title: { fontSize: FontSizes.xxxl, fontWeight: '900', color: Colors.textPrimary },
  subtitle: { fontSize: FontSizes.md, color: Colors.textSecondary, marginTop: 4 },
  connectBtn: {
    backgroundColor: Colors.emerald, paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: BorderRadius.lg,
  },
  connectBtnText: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.bg },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.textPrimary },
  emptyText: { fontSize: FontSizes.md, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 24 },
  emptyBtn: {
    backgroundColor: Colors.emerald, paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: BorderRadius.lg, marginTop: 8,
  },
  emptyBtnText: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.bg },
  storeCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.xl, borderWidth: 1, marginBottom: Spacing.lg, ...Shadows.card,
  },
  storeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  storePlatformBadge: {
    width: 48, height: 48, borderRadius: BorderRadius.lg,
    justifyContent: 'center', alignItems: 'center',
  },
  storePlatformIcon: { fontSize: 24 },
  storeInfo: { flex: 1, marginLeft: Spacing.md },
  storeName: { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.textPrimary },
  storePlatform: { fontSize: FontSizes.sm, fontWeight: '700', marginTop: 2 },
  connStatusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full,
  },
  connStatusDot: { width: 6, height: 6, borderRadius: 3 },
  connStatusText: { fontSize: FontSizes.xs, fontWeight: '800', letterSpacing: 0.5 },
  storeUrl: { fontSize: FontSizes.sm, color: Colors.textMuted, marginBottom: Spacing.md },
  storeMetrics: {
    flexDirection: 'row', gap: Spacing.lg, paddingVertical: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.border, marginBottom: Spacing.md,
  },
  storeMetric: { flex: 1 },
  storeMetricVal: { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.textPrimary },
  storeMetricLabel: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  storeActions: { flexDirection: 'row', gap: Spacing.md },
  syncBtn: {
    flex: 1, paddingVertical: 12, borderRadius: BorderRadius.lg,
    backgroundColor: Colors.emeraldGlow, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.emerald + '30',
  },
  syncBtnText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.emerald },
  disconnectBtn: {
    flex: 1, paddingVertical: 12, borderRadius: BorderRadius.lg,
    backgroundColor: Colors.roseGlow, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.rose + '30',
  },
  disconnectBtnText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.rose },
  connectedDate: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: Spacing.md },
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
  modalTitle: { fontSize: FontSizes.xl, fontWeight: '900', color: Colors.textPrimary, marginBottom: Spacing.lg },
  inputLabel: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6, marginTop: Spacing.md },
  input: {
    backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    color: Colors.textPrimary, fontSize: FontSizes.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  platformGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  platformOption: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceElevated,
  },
  platformOptionIcon: { fontSize: 16 },
  platformOptionText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textSecondary },
  modalActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xxl },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceElevated, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  cancelBtnText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.textSecondary },
  connectSubmitBtn: {
    flex: 1, paddingVertical: 14, borderRadius: BorderRadius.lg,
    backgroundColor: Colors.emerald, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  connectSubmitText: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.bg },
});
