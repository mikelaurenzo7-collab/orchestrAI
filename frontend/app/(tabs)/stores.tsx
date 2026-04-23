import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn, LinearTransition } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Colors, Typography } from '../../constants/theme';
import { Plus, Link, Power, PowerOff, ShieldCheck, ShoppingCart, ShieldAlert, Package, Tag, Building2, Warehouse, Store as StoreIcon, ExternalLink, X } from 'lucide-react-native';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import * as Haptics from 'expo-haptics';
import { authFetch } from '../../utils/api';
import * as WebBrowser from 'expo-web-browser';

interface OrgStore {
  id: string;
  name: string;
  store_url?: string;
  platform: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending' | string;
  connected_at?: string;
  last_sync?: string;
}

const OAUTH_READY = new Set(['shopify', 'etsy', 'ebay']);

function formatApiError(detail: unknown): string {
  if (!detail) return 'Something went wrong. Please try again.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((item) => String(item?.msg || item)).join(' ');
  return String(detail);
}

const PLATFORMS = [
  { id: 'shopify', name: 'Shopify', icon: ShoppingBag, color: '#96BF48' },
  { id: 'etsy', name: 'Etsy', icon: Package, color: '#F1641E' },
  { id: 'ebay', name: 'eBay', icon: Tag, color: '#E53238' },
  { id: 'walmart', name: 'Walmart', icon: Building2, color: '#0071DC' },
  { id: 'faire', name: 'Faire', icon: Warehouse, color: '#FF6B35' },
];

import { ShoppingBag } from 'lucide-react-native';

export default function StoresScreen() {
  const [stores, setStores] = useState<OrgStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [shopDomain, setShopDomain] = useState('');

  const fetchStores = useCallback(async () => {
    try {
      const res = await authFetch('/api/stores');
      if (res.ok) setStores(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const handleAddIntegration = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPickerVisible(true);
  };

  const startIntegration = async (platform: string) => {
    if (!OAUTH_READY.has(platform)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    try {
      let url = `/api/${platform}/auth`;
      if (platform === 'shopify') {
        if (!shopDomain.trim()) return;
        url += `?shop=${encodeURIComponent(shopDomain)}`;
      }

      const res = await authFetch(url);
      if (res.ok) {
        const { auth_url } = await res.json();
        setPickerVisible(false);
        setConnectingPlatform(null);
        setShopDomain('');

        const result = await WebBrowser.openAuthSessionAsync(auth_url);
        if (result.type === 'success') {
          fetchStores();
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const renderStore = ({ item, index }: { item: OrgStore, index: number }) => {
    const isError = item.status === 'error';
    const statusColor = isError ? Colors.error : Colors.emerald;
    const StatusIcon = isError ? ShieldAlert : ShieldCheck;

    return (
      <Animated.View entering={FadeInDown.delay(index * 100).duration(600)} layout={LinearTransition}>
        <AnimatedPressable
          testID={`store-card-${item.id}`}
          scaleDown={0.98}
          style={styles.cardBox}
          onPress={() => Haptics.selectionAsync()}
        >
          <BlurView intensity={25} tint="dark" style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: `${statusColor}10`, borderColor: `${statusColor}30` }]}>
                <StatusIcon size={24} color={statusColor} />
              </View>
              <View style={styles.statusBadge}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusTxt, { color: statusColor }]}>{item.status.toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.storeName}>{item.name}</Text>
              <Text style={styles.platformName}>{item.platform.toUpperCase()}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.cardFooter}>
              <View style={styles.footerRow}>
                <ExternalLink size={14} color={Colors.textMuted} />
                <Text style={styles.footerUrl} numberOfLines={1}>{item.store_url || 'Private connection'}</Text>
              </View>
            </View>
          </BlurView>
        </AnimatedPressable>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Connect</Text>
          <Text style={styles.subtitle}>Commerce & Marketplace Integrations</Text>
        </View>
        <AnimatedPressable testID="add-store-btn" scaleDown={0.9} style={styles.addBtn} onPress={handleAddIntegration}>
          <Plus size={24} color={Colors.bg} />
        </AnimatedPressable>
      </View>

      <FlatList
        data={stores || []}
        keyExtractor={(item, i) => item.id || i.toString()}
        renderItem={renderStore}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl tintColor={Colors.emerald} refreshing={refreshing} onRefresh={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setRefreshing(true);
            fetchStores();
          }} />
        }
        ListEmptyComponent={
          !loading ? (
            <Animated.View entering={FadeInDown.duration(800)} style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <PowerOff size={40} color={Colors.textSecondary} />
              </View>
              <Text style={styles.emptyTitle}>No integrations found</Text>
              <Text style={styles.emptySubtitle}>Connect external platforms to enable AI actions across your ecosystem.</Text>
            </Animated.View>
          ) : null
        }
      />

      <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <View style={styles.modalScrim}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Connect a storefront</Text>
                <Text style={styles.modalSubtitle}>Launch OAuth for the storefronts already wired in the backend.</Text>
              </View>
              <AnimatedPressable testID="close-picker-btn" scaleDown={0.92} style={styles.modalClose} onPress={() => setPickerVisible(false)}>
                <X size={18} color={Colors.text} />
              </AnimatedPressable>
            </View>

            <View style={styles.modalList}>
              {PLATFORMS.map((platform) => {
                const Icon = platform.icon;
                const isOauthReady = OAUTH_READY.has(platform.id);
                return (
                  <AnimatedPressable
                    testID={`platform-option-${platform.id}`}
                    key={platform.id}
                    scaleDown={0.98}
                    style={[styles.platformCard, !isOauthReady && styles.platformCardDisabled]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      if (platform.id === 'shopify') {
                        setConnectingPlatform(platform.id);
                      } else {
                        startIntegration(platform.id);
                      }
                    }}
                  >
                    <View style={[styles.platformIcon, { backgroundColor: `${platform.color}15`, borderColor: `${platform.color}40` }]}>
                      <Icon size={20} color={platform.color} />
                    </View>
                    <View style={styles.platformCopy}>
                      <Text style={styles.platformTitle}>{platform.name}</Text>
                      <Text style={styles.platformCaption}>{isOauthReady ? 'OAuth flow available' : 'Mobile flow coming next'}</Text>
                    </View>
                  </AnimatedPressable>
                );
              })}
            </View>

            {connectingPlatform === 'shopify' ? (
              <View style={styles.shopifyBox}>
                <Text style={styles.shopifyLabel}>Shopify domain</Text>
                <TextInput
                  testID="shopify-domain-input"
                  style={styles.shopifyInput}
                  value={shopDomain}
                  onChangeText={setShopDomain}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="your-store.myshopify.com"
                  placeholderTextColor={Colors.textDisabled}
                />
                <AnimatedPressable
                  testID="shopify-connect-btn"
                  scaleDown={0.96}
                  style={[styles.shopifyButton, connectingPlatform === 'shopify' && !shopDomain.trim() && styles.platformCardDisabled]}
                  onPress={() => startIntegration('shopify')}
                >
                  <Text style={styles.shopifyButtonText}>Continue with Shopify</Text>
                </AnimatedPressable>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
  title: { fontFamily: Typography.fonts.outfitL, fontSize: 34, color: Colors.text, letterSpacing: -1 },
  subtitle: { fontFamily: Typography.fonts.manropeB, fontSize: 15, color: Colors.textSecondary, marginTop: 4 },
  addBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.text, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 24, paddingBottom: 120, gap: 16 },
  cardBox: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  card: { padding: 24 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  iconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: { fontFamily: Typography.fonts.outfitSB, fontSize: 13 },
  cardBody: { marginBottom: 20 },
  storeName: { fontFamily: Typography.fonts.outfitB, fontSize: 22, color: Colors.text, letterSpacing: -0.5 },
  platformName: { fontFamily: Typography.fonts.manropeB, fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 16 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerUrl: { fontFamily: Typography.fonts.manropeM, fontSize: 14, color: Colors.textDisabled },
  modalScrim: { flex: 1, backgroundColor: 'rgba(3, 7, 18, 0.82)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#09101F', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 36, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
  modalTitle: { fontFamily: Typography.fonts.outfitB, fontSize: 22, color: Colors.text },
  modalSubtitle: { fontFamily: Typography.fonts.manropeM, fontSize: 13, color: Colors.textSecondary, marginTop: 6, lineHeight: 20 },
  modalClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' },
  modalList: { gap: 12, marginTop: 20 },
  platformCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  platformCardDisabled: { opacity: 0.6 },
  platformIcon: { width: 44, height: 44, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  platformCopy: { flex: 1 },
  platformTitle: { fontFamily: Typography.fonts.outfitSB, fontSize: 16, color: Colors.text },
  platformCaption: { fontFamily: Typography.fonts.manropeM, fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  shopifyBox: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  shopifyLabel: { fontFamily: Typography.fonts.manropeSB, fontSize: 13, color: Colors.textSecondary, marginBottom: 10 },
  shopifyInput: { borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 16, paddingVertical: 14, color: Colors.text, fontFamily: Typography.fonts.manropeM, fontSize: 15 },
  shopifyButton: { marginTop: 12, borderRadius: 16, backgroundColor: Colors.emerald, paddingVertical: 14, alignItems: 'center' },
  shopifyButtonText: { fontFamily: Typography.fonts.manropeSB, fontSize: 15, color: Colors.bg },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  emptyTitle: { fontFamily: Typography.fonts.outfitB, fontSize: 24, color: Colors.text, marginBottom: 12 },
  emptySubtitle: { fontFamily: Typography.fonts.manropeM, fontSize: 16, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 },
});
