import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn, LinearTransition } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Colors, Typography } from '../../constants/theme';
import { RefreshCcw, MoreHorizontal, Hash, Bot } from 'lucide-react-native';
import AnimatedPressable from '../../components/AnimatedPressable';
import * as Haptics from 'expo-haptics';
import { authFetch } from '../../utils/api';

const { width: W } = Dimensions.get('window');

interface SocialPost {
  id: string;
  content: string;
  platform: string;
  status: 'draft' | 'published' | 'scheduled';
  created_at: string;
  hashtags: string[];
  product_name: string;
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export default function SocialScreen() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await authFetch('/api/social/content');
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (e) { } 
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleCompose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    fetchPosts();
  };

  const renderPost = ({ item, index }: { item: SocialPost, index: number }) => {
    const statusColor = item.status === 'published' ? Colors.emerald : item.status === 'scheduled' ? Colors.accent : Colors.textSecondary;

    return (
      <Animated.View entering={FadeInDown.delay(index * 150).duration(600).springify().damping(16)} layout={LinearTransition}>
        <AnimatedPressable scaleDown={0.97} onPress={() => Haptics.selectionAsync()} style={styles.cardBox}>
          <BlurView intensity={25} tint="dark" style={styles.card}>
            
            <View style={styles.cardHeader}>
              <View style={styles.authorBadgeRow}>
                <View style={styles.avatar}>
                  <Bot size={20} color={Colors.emerald} />
                </View>
                <View>
                  <Text style={styles.authorName}>Marketing Executive Assistant</Text>
                  <Text style={styles.timestamp}>{formatTimestamp(item.created_at)} • {item.platform}</Text>
                </View>
              </View>
              <AnimatedPressable onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                <MoreHorizontal size={24} color={Colors.textSecondary} />
              </AnimatedPressable>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.productBadge}>
                <Text style={styles.productBadgeText}>{item.product_name}</Text>
              </View>
              <View style={[styles.statusBadge, { borderColor: `${statusColor}45` }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
              </View>
            </View>

            <Text style={styles.bodyText}>{item.content}</Text>

            <View style={styles.hashWrap}>
              {item.hashtags.slice(0, 5).map((tag) => (
                <View key={tag} style={styles.hashChip}>
                  <Hash size={12} color={Colors.emerald} />
                  <Text style={styles.hashText}>{tag.replace(/^#/, '')}</Text>
                </View>
              ))}
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
          <Text style={styles.title}>Broadcast</Text>
          <Text style={styles.subtitle}>Generated social content across connected channels</Text>
        </View>
        <AnimatedPressable scaleDown={0.9} style={styles.composeBtn} onPress={handleCompose}>
          <RefreshCcw size={20} color={Colors.bg} />
          <Text style={styles.composeTxt}>Refresh</Text>
        </AnimatedPressable>
      </Animated.View>

      {loading && !posts.length ? <ActivityIndicator size="large" color={Colors.emerald} style={styles.loader} /> : null}

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl tintColor={Colors.emerald} refreshing={refreshing} onRefresh={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setRefreshing(true);
            fetchPosts();
          }} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <View style={styles.avatar}>
                <Bot size={24} color={Colors.emerald} />
              </View>
              <Text style={styles.emptyTitle}>No social content yet</Text>
              <Text style={styles.emptySubtitle}>Generated drafts and published posts will appear here as soon as your marketing agent creates them.</Text>
            </View>
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
  composeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.emerald,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 100,
    shadowColor: Colors.emerald,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  composeTxt: {
    fontFamily: Typography.fonts.outfitB,
    fontSize: 16,
    color: Colors.bg,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 16,
  },
  loader: {
    marginTop: 48,
  },
  cardBox: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  card: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  authorBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  productBadge: {
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  productBadgeText: {
    fontFamily: Typography.fonts.manropeSB,
    fontSize: 12,
    color: Colors.emerald,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  statusText: {
    fontFamily: Typography.fonts.manropeSB,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  authorName: {
    fontFamily: Typography.fonts.outfitB,
    fontSize: 18,
    color: Colors.text,
  },
  timestamp: {
    fontFamily: Typography.fonts.manropeM,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  bodyText: {
    fontFamily: Typography.fonts.manropeM,
    fontSize: 15,
    color: Colors.text,
    lineHeight: 24,
    marginBottom: 14,
  },
  hashWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hashChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  hashText: {
    fontFamily: Typography.fonts.manropeM,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontFamily: Typography.fonts.outfitB,
    fontSize: 20,
    color: Colors.text,
    marginTop: 20,
  },
  emptySubtitle: {
    fontFamily: Typography.fonts.manropeM,
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
});
