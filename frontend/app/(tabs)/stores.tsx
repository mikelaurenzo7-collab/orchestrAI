import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authFetch } from '../../utils/api';
import { Colors, Spacing, BorderRadius, FontSizes, Shadows, PlatformColors } from '../../constants/theme';

type Store = { id: string; name: string; platform: string; store_url: string | null; status: string; connected_at: string; products_synced: number; orders_total: number; revenue: number };
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
  const [storeName, setStoreName] = useState('');
  const [storeUrl, setStoreUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('shopify');

  const fetchStores = useCallback(async () => {
    try { const res = await authFetch('/api/stores'); if (res.ok) setStores(await res.json()); }
    catch (e) { console.error(e); } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchStores(); }, [fetchStores]);

  const connectStore = async () => {
    if (!storeName.trim()) return;
    setConnecting(true); Keyboard.dismiss();
    try {
      const res = await authFetch('/api/stores', { method: 'POST', body: JSON.stringify({ name: storeName.trim(), platform: selectedPlatform, store_url: storeUrl.trim() || null, api_key: apiKey.trim() || null }) });
      const data = await res.json();
      if (res.ok) { setStores(p => [data, ...p]); setShowModal(false); setStoreName(''); setStoreUrl(''); setApiKey(''); }
    } catch (e) { console.error(e); } finally { setConnecting(false); }
  };

  const disconnectStore = async (id: string) => {
    try { await authFetch(`/api/stores/${id}`, { method: 'DELETE' }); setStores(p => p.filter(s => s.id !== id)); } catch (e) { console.error(e); }
  };

  if (loading) return <SafeAreaView style={s.container}><View style={s.center}><ActivityIndicator size="large" color={Colors.emerald} /></View></SafeAreaView>;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStores(); }} tintColor={Colors.emerald} />}>
        <View style={s.headerRow}>
          <View><Text style={s.overline}>STORE HUB</Text><Text style={s.title}>Connections</Text><Text style={s.subtitle}>{stores.length} store{stores.length !== 1 ? 's' : ''} connected</Text></View>
          <TouchableOpacity testID="connect-store-btn" style={s.connectBtn} onPress={() => setShowModal(true)}>
            <Text style={s.connectBtnText}>+ Connect</Text>
          </TouchableOpacity>
        </View>

        {stores.length === 0 ? (
          <View style={s.empty}>
            <Text style={{ fontSize: 48 }}>🏪</Text>
            <Text style={s.emptyTitle}>No stores connected</Text>
            <Text style={s.emptyText}>Connect your Shopify, WooCommerce, or Etsy store to unleash AI agents.</Text>
            <TouchableOpacity testID="empty-connect-btn" style={s.emptyBtn} onPress={() => setShowModal(true)}>
              <Text style={s.emptyBtnText}>Connect First Store</Text>
            </TouchableOpacity>
          </View>
        ) : stores.map(store => {
          const plat = STORE_PLATFORMS.find(p => p.id === store.platform);
          return (
            <View key={store.id} style={[s.storeCard, { borderColor: (plat?.color || Colors.border) + '25' }]}>
              <View style={s.storeHeader}>
                <View style={[s.platBadge, { backgroundColor: (plat?.color || Colors.emerald) + '15' }]}>
                  <Text style={{ fontSize: 24 }}>{plat?.icon || '🏪'}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: Spacing.md }}>
                  <Text style={s.storeName}>{store.name}</Text>
                  <Text style={[s.storePlat, { color: plat?.color }]}>{plat?.name || store.platform}</Text>
                </View>
                <View style={[s.connBadge, { backgroundColor: Colors.emeraldGlow }]}>
                  <View style={[s.connDot, { backgroundColor: Colors.emerald }]} />
                  <Text style={[s.connText, { color: Colors.emerald }]}>CONNECTED</Text>
                </View>
              </View>
              {store.store_url && <Text style={s.storeUrl}>{store.store_url}</Text>}
              <View style={s.metrics}>
                <View style={{ flex: 1 }}><Text style={s.metricVal}>{store.products_synced}</Text><Text style={s.metricLabel}>Products</Text></View>
                <View style={{ flex: 1 }}><Text style={s.metricVal}>{store.orders_total}</Text><Text style={s.metricLabel}>Orders</Text></View>
                <View style={{ flex: 1 }}><Text style={s.metricVal}>${store.revenue.toLocaleString()}</Text><Text style={s.metricLabel}>Revenue</Text></View>
              </View>
              <View style={s.actions}>
                <TouchableOpacity testID={`disconnect-store-${store.id}`} style={s.discBtn} onPress={() => disconnectStore(store.id)}>
                  <Text style={s.discText}>Disconnect</Text>
                </TouchableOpacity>
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
            <Text style={s.modalTitle}>Connect Store</Text>
            <Text style={s.label}>Platform</Text>
            <View style={s.platGrid}>
              {STORE_PLATFORMS.map(p => (
                <TouchableOpacity key={p.id} testID={`store-platform-${p.id}`}
                  style={[s.platOpt, selectedPlatform === p.id && { borderColor: p.color, backgroundColor: p.color + '12' }]}
                  onPress={() => setSelectedPlatform(p.id)}>
                  <Text style={{ fontSize: 16 }}>{p.icon}</Text>
                  <Text style={[s.platOptText, selectedPlatform === p.id && { color: p.color }]}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.label}>Store Name</Text>
            <TextInput testID="store-name-input" style={s.input} value={storeName} onChangeText={setStoreName} placeholder="My Awesome Store" placeholderTextColor={Colors.textMuted} />
            <Text style={s.label}>Store URL (optional)</Text>
            <TextInput testID="store-url-input" style={s.input} value={storeUrl} onChangeText={setStoreUrl} placeholder="https://mystore.myshopify.com" placeholderTextColor={Colors.textMuted} autoCapitalize="none" />
            <Text style={s.label}>API Key (optional)</Text>
            <TextInput testID="store-api-key-input" style={s.input} value={apiKey} onChangeText={setApiKey} placeholder="shpat_xxxxxxxxxx..." placeholderTextColor={Colors.textMuted} secureTextEntry autoCapitalize="none" />
            <View style={s.modalActions}>
              <TouchableOpacity testID="cancel-connect-btn" style={s.cancelBtn} onPress={() => setShowModal(false)}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity testID="submit-connect-btn" style={[s.submitBtn, !storeName.trim() && { opacity: 0.5 }]} onPress={connectStore} disabled={!storeName.trim() || connecting}>
                {connecting ? <ActivityIndicator size="small" color={Colors.bg} /> : <Text style={s.submitText}>Connect</Text>}
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xxl },
  overline: { fontSize: FontSizes.xs, fontWeight: '800', letterSpacing: 3, color: Colors.emerald, marginBottom: 4 },
  title: { fontSize: FontSizes.xxxl, fontWeight: '900', color: Colors.textPrimary },
  subtitle: { fontSize: FontSizes.md, color: Colors.textSecondary, marginTop: 4 },
  connectBtn: { backgroundColor: Colors.emerald, paddingHorizontal: 20, paddingVertical: 12, borderRadius: BorderRadius.lg },
  connectBtnText: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.bg },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.textPrimary },
  emptyText: { fontSize: FontSizes.md, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 24 },
  emptyBtn: { backgroundColor: Colors.emerald, paddingHorizontal: 24, paddingVertical: 14, borderRadius: BorderRadius.lg, marginTop: 8 },
  emptyBtnText: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.bg },
  storeCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl, borderWidth: 1, marginBottom: Spacing.lg, ...Shadows.card },
  storeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  platBadge: { width: 48, height: 48, borderRadius: BorderRadius.lg, justifyContent: 'center', alignItems: 'center' },
  storeName: { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.textPrimary },
  storePlat: { fontSize: FontSizes.sm, fontWeight: '700', marginTop: 2 },
  connBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  connDot: { width: 6, height: 6, borderRadius: 3 },
  connText: { fontSize: FontSizes.xs, fontWeight: '800', letterSpacing: 0.5 },
  storeUrl: { fontSize: FontSizes.sm, color: Colors.textMuted, marginBottom: Spacing.md },
  metrics: { flexDirection: 'row', gap: Spacing.lg, paddingVertical: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, marginBottom: Spacing.md },
  metricVal: { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.textPrimary },
  metricLabel: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  actions: { flexDirection: 'row', gap: Spacing.md },
  discBtn: { flex: 1, paddingVertical: 12, borderRadius: BorderRadius.lg, backgroundColor: Colors.roseGlow, alignItems: 'center', borderWidth: 1, borderColor: Colors.rose + '30' },
  discText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.rose },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.xxl, borderTopRightRadius: BorderRadius.xxl, padding: Spacing.xxl, paddingBottom: 40, borderTopWidth: 1, borderColor: Colors.border },
  modalHandle: { width: 40, height: 4, backgroundColor: Colors.textMuted, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.xl },
  modalTitle: { fontSize: FontSizes.xl, fontWeight: '900', color: Colors.textPrimary, marginBottom: Spacing.lg },
  label: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6, marginTop: Spacing.md },
  input: { backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, color: Colors.textPrimary, fontSize: FontSizes.md, borderWidth: 1, borderColor: Colors.border },
  platGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  platOpt: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceElevated },
  platOptText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textSecondary },
  modalActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xxl },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: BorderRadius.lg, backgroundColor: Colors.surfaceElevated, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  cancelText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.textSecondary },
  submitBtn: { flex: 1, paddingVertical: 14, borderRadius: BorderRadius.lg, backgroundColor: Colors.emerald, alignItems: 'center' },
  submitText: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.bg },
});
