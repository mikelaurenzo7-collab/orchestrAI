import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, Keyboard,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authFetch } from '../../utils/api';
import { Colors, Spacing, BorderRadius, FontSizes, Shadows, PlatformColors } from '../../constants/theme';

type Store = { id: string; name: string; platform: string; store_url: string | null; status: string; connected_at: string; products_synced: number; orders_total: number; revenue: number };

const STORE_PLATFORMS = [
  { id: 'shopify', name: 'Shopify', icon: '🟢', color: PlatformColors.shopify, hasOAuth: true },
  { id: 'etsy', name: 'Etsy', icon: '🟠', color: PlatformColors.etsy, hasOAuth: true },
  { id: 'ebay', name: 'eBay', icon: '🏷️', color: '#E53238', hasOAuth: true },
  { id: 'woocommerce', name: 'WooCommerce', icon: '🟣', color: PlatformColors.woocommerce, hasOAuth: false },
  { id: 'amazon', name: 'Amazon', icon: '📦', color: '#FF9900', hasOAuth: false },
  { id: 'bigcommerce', name: 'BigCommerce', icon: '🔷', color: '#34313F', hasOAuth: false },
  { id: 'square', name: 'Square', icon: '⬛', color: '#006AFF', hasOAuth: false },
  { id: 'wix', name: 'Wix', icon: '🌐', color: '#0C6EFC', hasOAuth: false },
  { id: 'custom', name: 'Custom API', icon: '🔧', color: Colors.emerald, hasOAuth: false },
];

export default function StoresScreen() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [storeName, setStoreName] = useState('');
  const [storeUrl, setStoreUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('shopify');
  const [shopifyDomain, setShopifyDomain] = useState('');
  const [oauthLoading, setOauthLoading] = useState(false);

  const fetchStores = useCallback(async () => {
    try { const res = await authFetch('/api/stores'); if (res.ok) setStores(await res.json()); }
    catch (e) { console.error(e); } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchStores(); }, [fetchStores]);

  const startShopifyOAuth = async () => {
    if (!shopifyDomain.trim()) return;
    setOauthLoading(true);
    try {
      const res = await authFetch(`/api/shopify/auth?shop=${encodeURIComponent(shopifyDomain.trim())}`);
      const data = await res.json();
      if (data.auth_url) {
        await Linking.openURL(data.auth_url);
        setShowModal(false);
        // Poll for new store after OAuth
        setTimeout(() => fetchStores(), 5000);
        setTimeout(() => fetchStores(), 10000);
      }
    } catch (e) { console.error(e); }
    finally { setOauthLoading(false); }
  };

  const startEtsyOAuth = async () => {
    setOauthLoading(true);
    try {
      const res = await authFetch('/api/etsy/auth');
      const data = await res.json();
      if (data.auth_url) {
        await Linking.openURL(data.auth_url);
        setShowModal(false);
      }
    } catch (e) { console.error(e); }
    finally { setOauthLoading(false); }
  };

  const startEbayOAuth = async () => {
    setOauthLoading(true);
    try {
      const res = await authFetch('/api/ebay/auth');
      const data = await res.json();
      if (data.auth_url) {
        await Linking.openURL(data.auth_url);
        setShowModal(false);
        setTimeout(() => fetchStores(), 5000);
        setTimeout(() => fetchStores(), 10000);
      }
    } catch (e) { console.error(e); }
    finally { setOauthLoading(false); }
  };

  const connectManualStore = async () => {
    if (!storeName.trim()) return;
    setConnecting(true); Keyboard.dismiss();
    try {
      const res = await authFetch('/api/stores', { method: 'POST', body: JSON.stringify({ name: storeName.trim(), platform: selectedPlatform, store_url: storeUrl.trim() || null, api_key: apiKey.trim() || null }) });
      const data = await res.json();
      if (res.ok) { setStores(p => [data, ...p]); setShowModal(false); setStoreName(''); setStoreUrl(''); setApiKey(''); }
    } catch (e) { console.error(e); } finally { setConnecting(false); }
  };

  const syncStore = async (storeId: string, platform: string) => {
    setSyncing(storeId);
    try {
      const syncUrl = platform === 'ebay' ? `/api/ebay/sync/${storeId}` : `/api/shopify/sync/${storeId}`;
      const res = await authFetch(syncUrl, { method: 'POST' });
      if (res.ok) await fetchStores();
    } catch (e) { console.error(e); }
    finally { setSyncing(null); }
  };

  const disconnectStore = async (id: string) => {
    try { await authFetch(`/api/stores/${id}`, { method: 'DELETE' }); setStores(p => p.filter(s => s.id !== id)); } catch (e) { console.error(e); }
  };

  const selPlatform = STORE_PLATFORMS.find(p => p.id === selectedPlatform);

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
            <Text style={s.emptyText}>Connect Shopify, Etsy, or WooCommerce to unleash your AI agents.</Text>
            <View style={s.oauthGrid}>
              {STORE_PLATFORMS.filter(p => p.hasOAuth).map(p => (
                <TouchableOpacity key={p.id} testID={`quick-connect-${p.id}`}
                  style={[s.oauthBtn, { borderColor: p.color + '40' }]}
                  onPress={() => { setSelectedPlatform(p.id); setShowModal(true); }}>
                  <Text style={{ fontSize: 24 }}>{p.icon}</Text>
                  <Text style={[s.oauthBtnText, { color: p.color }]}>Connect {p.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={s.manualBtn} onPress={() => { setSelectedPlatform('woocommerce'); setShowModal(true); }}>
              <Text style={s.manualBtnText}>Or connect via API key →</Text>
            </TouchableOpacity>
          </View>
        ) : stores.map(store => {
          const plat = STORE_PLATFORMS.find(p => p.id === store.platform);
          const isSyncing = syncing === store.id;
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
                  <Text style={[s.connText, { color: Colors.emerald }]}>LIVE</Text>
                </View>
              </View>
              {store.store_url && <Text style={s.storeUrl}>{store.store_url}</Text>}
              <View style={s.metrics}>
                <View style={{ flex: 1 }}><Text style={s.metricVal}>{store.products_synced}</Text><Text style={s.metricLabel}>Products</Text></View>
                <View style={{ flex: 1 }}><Text style={s.metricVal}>{store.orders_total}</Text><Text style={s.metricLabel}>Orders</Text></View>
                <View style={{ flex: 1 }}><Text style={s.metricVal}>${store.revenue.toLocaleString()}</Text><Text style={s.metricLabel}>Revenue</Text></View>
              </View>
              <View style={s.actions}>
                <TouchableOpacity testID={`sync-store-${store.id}`} style={s.syncBtn} onPress={() => syncStore(store.id, store.platform)} disabled={isSyncing}>
                  {isSyncing ? <ActivityIndicator size="small" color={Colors.emerald} /> : <Text style={s.syncText}>Sync</Text>}
                </TouchableOpacity>
                <TouchableOpacity testID={`disconnect-store-${store.id}`} style={s.discBtn} onPress={() => disconnectStore(store.id)}>
                  <Text style={s.discText}>Remove</Text>
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
                  {p.hasOAuth && <View style={s.oauthTag}><Text style={s.oauthTagText}>OAuth</Text></View>}
                </TouchableOpacity>
              ))}
            </View>

            {/* Shopify OAuth flow */}
            {selectedPlatform === 'shopify' && (
              <View style={s.oauthSection}>
                <Text style={s.oauthTitle}>Connect via Shopify OAuth</Text>
                <Text style={s.oauthDesc}>Enter your store domain to authorize orchestrAI</Text>
                <TextInput testID="shopify-domain-input" style={s.input} value={shopifyDomain} onChangeText={setShopifyDomain}
                  placeholder="mystore.myshopify.com" placeholderTextColor={Colors.textMuted} autoCapitalize="none" />
                <TouchableOpacity testID="shopify-oauth-btn" style={[s.oauthConnBtn, { backgroundColor: PlatformColors.shopify }]}
                  onPress={startShopifyOAuth} disabled={!shopifyDomain.trim() || oauthLoading}>
                  {oauthLoading ? <ActivityIndicator size="small" color="#fff" /> :
                    <Text style={s.oauthConnText}>Authorize with Shopify</Text>}
                </TouchableOpacity>
                <View style={s.divider}><View style={s.divLine} /><Text style={s.divText}>or add manually</Text><View style={s.divLine} /></View>
              </View>
            )}

            {/* Etsy OAuth flow */}
            {selectedPlatform === 'etsy' && (
              <View style={s.oauthSection}>
                <Text style={s.oauthTitle}>Connect via Etsy OAuth</Text>
                <Text style={s.oauthDesc}>Authorize orchestrAI to access your Etsy shop</Text>
                <TouchableOpacity testID="etsy-oauth-btn" style={[s.oauthConnBtn, { backgroundColor: PlatformColors.etsy }]}
                  onPress={startEtsyOAuth} disabled={oauthLoading}>
                  {oauthLoading ? <ActivityIndicator size="small" color="#fff" /> :
                    <Text style={s.oauthConnText}>Authorize with Etsy</Text>}
                </TouchableOpacity>
                <View style={s.divider}><View style={s.divLine} /><Text style={s.divText}>or add manually</Text><View style={s.divLine} /></View>
              </View>
            )}

            {/* eBay OAuth flow */}
            {selectedPlatform === 'ebay' && (
              <View style={s.oauthSection}>
                <Text style={s.oauthTitle}>Connect via eBay OAuth</Text>
                <Text style={s.oauthDesc}>Authorize orchestrAI to manage your eBay listings and orders</Text>
                <TouchableOpacity testID="ebay-oauth-btn" style={[s.oauthConnBtn, { backgroundColor: '#E53238' }]}
                  onPress={startEbayOAuth} disabled={oauthLoading}>
                  {oauthLoading ? <ActivityIndicator size="small" color="#fff" /> :
                    <Text style={s.oauthConnText}>Authorize with eBay</Text>}
                </TouchableOpacity>
                <View style={s.divider}><View style={s.divLine} /><Text style={s.divText}>or add manually</Text><View style={s.divLine} /></View>
              </View>
            )}

            {/* Manual connection fields */}
            <Text style={s.label}>Store Name</Text>
            <TextInput testID="store-name-input" style={s.input} value={storeName} onChangeText={setStoreName} placeholder="My Store" placeholderTextColor={Colors.textMuted} />
            <Text style={s.label}>Store URL (optional)</Text>
            <TextInput testID="store-url-input" style={s.input} value={storeUrl} onChangeText={setStoreUrl} placeholder="https://mystore.com" placeholderTextColor={Colors.textMuted} autoCapitalize="none" />
            <Text style={s.label}>API Key (optional)</Text>
            <TextInput testID="store-api-key-input" style={s.input} value={apiKey} onChangeText={setApiKey} placeholder="Your API key..." placeholderTextColor={Colors.textMuted} secureTextEntry autoCapitalize="none" />

            <View style={s.modalActions}>
              <TouchableOpacity testID="cancel-connect-btn" style={s.cancelBtn} onPress={() => setShowModal(false)}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity testID="submit-connect-btn" style={[s.submitBtn, !storeName.trim() && { opacity: 0.5 }]} onPress={connectManualStore} disabled={!storeName.trim() || connecting}>
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
  empty: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyTitle: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.textPrimary },
  emptyText: { fontSize: FontSizes.md, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 24, marginBottom: 8 },
  oauthGrid: { flexDirection: 'row', gap: Spacing.md, marginTop: 8 },
  oauthBtn: {
    flex: 1, paddingVertical: 20, paddingHorizontal: 16, borderRadius: BorderRadius.xl,
    backgroundColor: Colors.surface, borderWidth: 1, alignItems: 'center', gap: 8, ...Shadows.card,
  },
  oauthBtnText: { fontSize: FontSizes.sm, fontWeight: '800' },
  manualBtn: { marginTop: 16 },
  manualBtnText: { fontSize: FontSizes.sm, color: Colors.textMuted, fontWeight: '600' },
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
  syncBtn: { flex: 1, paddingVertical: 12, borderRadius: BorderRadius.lg, backgroundColor: Colors.emeraldGlow, alignItems: 'center', borderWidth: 1, borderColor: Colors.emerald + '30' },
  syncText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.emerald },
  discBtn: { flex: 1, paddingVertical: 12, borderRadius: BorderRadius.lg, backgroundColor: Colors.roseGlow, alignItems: 'center', borderWidth: 1, borderColor: Colors.rose + '30' },
  discText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.rose },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.xxl, borderTopRightRadius: BorderRadius.xxl, padding: Spacing.xxl, paddingBottom: 40, borderTopWidth: 1, borderColor: Colors.border, maxHeight: '90%' },
  modalHandle: { width: 40, height: 4, backgroundColor: Colors.textMuted, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.xl },
  modalTitle: { fontSize: FontSizes.xl, fontWeight: '900', color: Colors.textPrimary, marginBottom: Spacing.lg },
  label: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6, marginTop: Spacing.md },
  input: { backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, color: Colors.textPrimary, fontSize: FontSizes.md, borderWidth: 1, borderColor: Colors.border },
  platGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  platOpt: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceElevated },
  platOptText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textSecondary },
  oauthTag: { backgroundColor: Colors.emeraldGlow, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  oauthTagText: { fontSize: 9, fontWeight: '800', color: Colors.emerald, letterSpacing: 0.5 },
  oauthSection: { marginTop: Spacing.lg, paddingTop: Spacing.md },
  oauthTitle: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  oauthDesc: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginBottom: Spacing.md },
  oauthConnBtn: { paddingVertical: 14, borderRadius: BorderRadius.lg, alignItems: 'center', marginTop: Spacing.sm },
  oauthConnText: { fontSize: FontSizes.md, fontWeight: '800', color: '#fff' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.xl },
  divLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  divText: { fontSize: FontSizes.sm, color: Colors.textMuted },
  modalActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xxl },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: BorderRadius.lg, backgroundColor: Colors.surfaceElevated, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  cancelText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.textSecondary },
  submitBtn: { flex: 1, paddingVertical: 14, borderRadius: BorderRadius.lg, backgroundColor: Colors.emerald, alignItems: 'center' },
  submitText: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.bg },
});
