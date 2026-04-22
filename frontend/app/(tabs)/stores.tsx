import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn, LinearTransition } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Colors, Typography } from '../../constants/theme';
import { Plus, Link, Power, PowerOff, ShieldCheck, ShoppingCart, ShieldAlert, Package, Tag, Building2, Warehouse, Store as StoreIcon, ExternalLink, X } from 'lucide-react-native';
import AnimatedPressable from '../../components/AnimatedPressable';
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

function formatConnectedAt(timestamp?: string): string {
  if (!timestamp) return 'Awaiting first sync';
  const date = new Date(timestamp);
  return `Connected ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
}

const PLATFORMS = [
  { id: 'shopify', name: 'Shopify', icon: ShoppingCart, color: '#96BF48', tag: 'E-Commerce' },
  { id: 'etsy', name: 'Etsy', icon: Package, color: '#F1641E', tag: 'Handmade' },
  { id: 'ebay', name: 'eBay', icon: Tag, color: '#E53238', tag: 'Marketplace' },
  { id: 'walmart', name: 'Walmart', icon: Building2, color: '#0071DC', tag: 'Marketplace' },
  { id: 'faire', name: 'Faire', icon: Warehouse, color: '#FF6B35', tag: 'Wholesale' },
  { id: 'mercari', name: 'Mercari', icon: ShoppingCart, color: '#E24444', tag: 'Resale' },
  { id: 'poshmark', name: 'Poshmark', icon: StoreIcon, color: '#C12B5B', tag: 'Fashion' },
];

export default function StoresScreen() {
  const [stores, setStores] = useState<OrgStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [shopDomain, setShopDomain] = useState('');
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [integrationNotice, setIntegrationNotice] = useState<string | null>(null);

  const fetchStores = useCallback(async () => {
    try {
      const res = await authFetch('/api/stores');
      if (res.ok) setStores(await res.json());
    } catch (e) { } 
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchStores(); }, [fetchStores]);

  const handleAddIntegration = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPickerVisible(true);
  };

  const startIntegration = async (platformId: string) => {
    const platform = PLATFORMS.find((entry) => entry.id === platformId);
    if (!platform) return;

    if (!OAUTH_READY.has(platformId)) {
      setIntegrationNotice(`${platform.name} mobile connection will be added next. Use the web workflow for this platform today.`);
      return;
    }

    if (platformId === 'shopify' && !shopDomain.trim()) {
      setIntegrationNotice('Enter your Shopify store domain to start OAuth.');
      return;
    }

    setConnectingPlatform(platformId);
    try {
      const path = platformId === 'shopify'
        ? `/api/shopify/auth?shop=${encodeURIComponent(shopDomain.trim())}`
        : `/api/${platformId}/auth`;
      const res = await authFetch(path);
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.auth_url) {
        setIntegrationNotice(formatApiError(data?.detail));
        return;
      }

      setPickerVisible(false);
      setIntegrationNotice(`Opened ${platform.name} authorization. Return here after approval to refresh your connections.`);
      await WebBrowser.openBrowserAsync(data.auth_url);
      setRefreshing(true);
      fetchStores();
    } catch {
      setIntegrationNotice(`Unable to start the ${platform.name} connection flow right now.`);
    } finally {
      setConnectingPlatform(null);
    }
  };

  const renderStore = ({ item, index }: { item: OrgStore, index: number }) => {
    const isLive = item.status === 'connected';
    const isPending = item.status === 'pending';
    const plat = PLATFORMS.find(p => p.id === item.platform) || PLATFORMS[3];
    const Icon = plat.icon;
    const statusColor = isLive ? Colors.emerald : isPending ? Colors.accent : Colors.error;
    const statusLabel = isLive ? 'Connected' : isPending ? 'Pending' : item.status === 'disconnected' ? 'Disconnected' : 'Needs attention';

    return (
      <Animated.View entering={FadeInDown.delay(index * 100).duration(500).springify().damping(14)} layout={LinearTransition}>
        <AnimatedPressable scaleDown={0.98} style={styles.cardBox} onPress={() => Haptics.selectionAsync()}>
          <BlurView intensity={30} tint="dark" style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: `${plat.color}15`, borderColor: `${plat.color}40` }]}>
                <Icon size={24} color={plat.color} />
              </View>
              <View style={styles.statusBadge}>
                {isLive ? <Power size={14} color={statusColor} /> : <ShieldAlert size={14} color={statusColor} />}
                <Text style={[styles.statusTxt, { color: statusColor }]}>
                  {statusLabel}
                </Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.storeName}>{item.name}</Text>
              <Text style={styles.platformName}>{plat.tag} • {formatConnectedAt(item.connected_at)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.cardFooter}>
              <View style={styles.footerRow}>
                <Link size={16} color={Colors.textSecondary} />
                <Text style={styles.footerUrl}>{item.store_url || 'N/A'}</Text>
              </View>
              {isLive ? <ShieldCheck size={18} color={Colors.textDisabled} /> : <ExternalLink size={18} color={Colors.textDisabled} />}
            </View>
          </BlurView>
        </AnimatedPressable>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
        <View>
          <Text style={styles.title}>Integrations</Text>
          <Text style={styles.subtitle}>Connect your business data</Text>
        </View>
        <AnimatedPressable scaleDown={0.9} style={styles.addBtn} onPress={handleAddIntegration}>
          <Plus size={24} color={Colors.bg} />
        </AnimatedPressable>
      </Animated.View>

      {integrationNotice ? <Text style={styles.notice}>{integrationNotice}</Text> : null}

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
              <AnimatedPressable scaleDown={0.92} style={styles.modalClose} onPress={() => setPickerVisible(false)}>
                <X size={18} color={Colors.text} />
              </AnimatedPressable>
            </View>

            <View style={styles.modalList}>
              {PLATFORMS.map((platform) => {
                const Icon = platform.icon;
                const isOauthReady = OAUTH_READY.has(platform.id);
                return (
                  <AnimatedPressable
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
                  style={styles.shopifyInput}
                  value={shopDomain}
                  onChangeText={setShopDomain}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="your-store.myshopify.com"
                  placeholderTextColor={Colors.textDisabled}
                />
                <AnimatedPressable
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
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontFamily: Typography.fonts.outfitL,
    fontSize: 34,
    color: Colors.text,
    letterSpacing: -1,
  },
  subtitle: {
    fontFamily: Typography.fonts.manropeB,
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.text,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  notice: {
    fontFamily: Typography.fonts.manropeM,
    fontSize: 13,
    color: Colors.textSecondary,
    paddingHorizontal: 24,
    marginBottom: 8,
    lineHeight: 20,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
    gap: 16,
  },
  cardBox: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  card: {
    padding: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusTxt: {
    fontFamily: Typography.fonts.outfitSB,
    fontSize: 13,
  },
  cardBody: {
    marginBottom: 20,
  },
  storeName: {
    fontFamily: Typography.fonts.outfitB,
    fontSize: 22,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  platformName: {
    fontFamily: Typography.fonts.manropeB,
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerUrl: {
    fontFamily: Typography.fonts.manropeM,
    fontSize: 14,
    color: Colors.textDisabled,
  },
  modalScrim: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.82)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#09101F',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 36,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  modalTitle: {
    fontFamily: Typography.fonts.outfitB,
    fontSize: 22,
    color: Colors.text,
  },
  modalSubtitle: {
    fontFamily: Typography.fonts.manropeM,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 6,
    lineHeight: 20,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalList: {
    gap: 12,
    marginTop: 20,
  },
  platformCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  platformCardDisabled: {
    opacity: 0.6,
  },
  platformIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  platformCopy: {
    flex: 1,
  },
  platformTitle: {
    fontFamily: Typography.fonts.outfitSB,
    fontSize: 16,
    color: Colors.text,
  },
  platformCaption: {
    fontFamily: Typography.fonts.manropeM,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  shopifyBox: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  shopifyLabel: {
    fontFamily: Typography.fonts.manropeSB,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  shopifyInput: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.text,
    fontFamily: Typography.fonts.manropeM,
    fontSize: 15,
  },
  shopifyButton: {
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: Colors.emerald,
    paddingVertical: 14,
    alignItems: 'center',
  },
  shopifyButtonText: {
    fontFamily: Typography.fonts.manropeSB,
    fontSize: 15,
    color: Colors.bg,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  emptyTitle: {
    fontFamily: Typography.fonts.outfitB,
    fontSize: 24,
    color: Colors.text,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontFamily: Typography.fonts.manropeM,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
