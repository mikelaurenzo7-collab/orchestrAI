import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Dimensions, Keyboard, RefreshControl, ActionSheetIOS } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn, LinearTransition } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Colors, Typography } from '../../constants/theme';
import { Plus, Link, Power, PowerOff, ShieldCheck, CreditCard, ShoppingCart, Key, ShieldAlert } from 'lucide-react-native';
import AnimatedPressable from '../../components/AnimatedPressable';
import * as Haptics from 'expo-haptics';
import { authFetch } from '../../utils/api';

const { width: W, height: H } = Dimensions.get('window');

interface OrgStore {
  id: string;
  name: string;
  store_url?: string;
  platform: string;
  status: 'active' | 'error' | 'pending';
  last_sync?: string;
}

const PLATFORMS = [
  { id: 'shopify', name: 'Shopify', icon: ShoppingCart, color: Colors.emerald, tag: 'E-Commerce' },
  { id: 'stripe', name: 'Stripe', icon: CreditCard, color: '#635BFF', tag: 'Payments' },
  { id: 'amazon', name: 'Amazon', icon: ShoppingCart, color: '#FF9900', tag: 'Marketplace' },
  { id: 'custom', name: 'Custom API', icon: Key, color: Colors.accent, tag: 'Developer' },
];

export default function StoresScreen() {
  const [stores, setStores] = useState<OrgStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: 'Add Integration',
        message: 'Select a platform to connect your workspace',
        options: ['Cancel', ...PLATFORMS.map(p => p.name)],
        cancelButtonIndex: 0,
      },
      (buttonIndex) => {
        if (buttonIndex === 0) return;
        Haptics.selectionAsync();
        // Trigger modal flow here in a real app
        alert('Platform selected: ' + PLATFORMS[buttonIndex - 1].name);
      }
    );
  };

  const renderStore = ({ item, index }: { item: OrgStore, index: number }) => {
    const isLive = item.status === 'active';
    const plat = PLATFORMS.find(p => p.id === item.platform) || PLATFORMS[3];
    const Icon = plat.icon;

    return (
      <Animated.View entering={FadeInDown.delay(index * 100).duration(500).springify().damping(14)} layout={LinearTransition}>
        <AnimatedPressable scaleDown={0.98} style={styles.cardBox} onPress={() => Haptics.selectionAsync()}>
          <BlurView intensity={30} tint="dark" style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: `${plat.color}15`, borderColor: `${plat.color}40` }]}>
                <Icon size={24} color={plat.color} />
              </View>
              <View style={styles.statusBadge}>
                {isLive ? <Power size={14} color={Colors.emerald} /> : <ShieldAlert size={14} color={Colors.error} />}
                <Text style={[styles.statusTxt, { color: isLive ? Colors.emerald : Colors.error }]}>
                  {isLive ? 'Connected' : 'Action Required'}
                </Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.storeName}>{item.name}</Text>
              <Text style={styles.platformName}>{plat.tag} • Last synced 2m ago</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.cardFooter}>
              <View style={styles.footerRow}>
                <Link size={16} color={Colors.textSecondary} />
                <Text style={styles.footerUrl}>{item.store_url || 'N/A'}</Text>
              </View>
              <ShieldCheck size={18} color={Colors.textDisabled} />
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
