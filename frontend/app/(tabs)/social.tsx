import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn, LinearTransition } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Colors, Typography, Shadows } from '../../constants/theme';
import { PenTool, MoreHorizontal, Heart, MessageCircle, Share2, BarChart2, Bot, Globe, Repeat } from 'lucide-react-native';
import AnimatedPressable from '../../components/AnimatedPressable';
import * as Haptics from 'expo-haptics';
import { authFetch } from '../../utils/api';

const { width: W } = Dimensions.get('window');

interface SocialPost {
  id: string;
  content: string;
  platform?: string;
  platforms?: string[];
  product_name?: string;
  status: 'draft' | 'published' | 'scheduled';
  scheduled_for?: string;
  created_at: string;
  metrics?: { likes: number, clicks: number, shares: number };
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
        if (data.length > 0) setPosts(data);
      }
    } catch (e) { } 
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleCompose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const renderPost = ({ item, index }: { item: SocialPost, index: number }) => {
    return (
      <Animated.View entering={FadeInDown.delay(index * 150).duration(600).springify().damping(16)} layout={LinearTransition}>
        <AnimatedPressable testID={`social-post-${item.id}`} scaleDown={0.97} onPress={() => Haptics.selectionAsync()} style={styles.cardBox}>
          <BlurView intensity={25} tint="dark" style={styles.card}>
            
            <View style={styles.cardHeader}>
              <View style={styles.authorBadgeRow}>
                <View style={styles.avatar}>
                  <Bot size={20} color={Colors.emerald} strokeWidth={1.5} />
                </View>
                <View>
                  <Text style={styles.authorName}>{item.product_name || 'Marketing AI Exec'}</Text>
                  <Text style={styles.timestamp}>{new Date(item.created_at).toLocaleDateString()} • {item.platform || item.platforms?.join(', ')}</Text>
                </View>
              </View>
              <AnimatedPressable onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                <MoreHorizontal size={24} color={Colors.textSecondary} strokeWidth={1.5} />
              </AnimatedPressable>
            </View>

            <Text style={styles.bodyText}>{item.content}</Text>

            <View style={styles.mediaContainer}>
              <BlurView intensity={10} tint="light" style={styles.mediaPlaceholder}>
                <BarChart2 size={40} color={Colors.emerald} opacity={0.6} strokeWidth={1.5} />
                <Text style={styles.mediaPlaceholderText}>Attached Media</Text>
              </BlurView>
            </View>

            <View style={styles.divider} />

            <View style={styles.actionRow}>
              <AnimatedPressable style={styles.actionBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                <Heart size={20} color={Colors.textSecondary} strokeWidth={1.5} />
                <Text style={styles.actionTxt}>{(item.metrics?.likes || 0).toLocaleString()}</Text>
              </AnimatedPressable>

              <AnimatedPressable style={styles.actionBtn}>
                <MessageCircle size={20} color={Colors.textSecondary} strokeWidth={1.5} />
                <Text style={styles.actionTxt}>{(item.metrics?.clicks || 0).toLocaleString()}</Text>
              </AnimatedPressable>

              <AnimatedPressable style={styles.actionBtn}>
                <Repeat size={20} color={Colors.textSecondary} strokeWidth={1.5} />
                <Text style={styles.actionTxt}>{(item.metrics?.shares || 0).toLocaleString()}</Text>
              </AnimatedPressable>

              <AnimatedPressable style={[styles.actionBtn, { marginLeft: 'auto' }]}>
                <Share2 size={20} color={Colors.emerald} strokeWidth={1.5} />
              </AnimatedPressable>
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
          <Text style={styles.subtitle}>AI-generated social campaigns</Text>
        </View>
        <AnimatedPressable testID="social-draft-button" haptic={Haptics.ImpactFeedbackStyle.Medium} scaleDown={0.9} style={styles.composeBtn} onPress={handleCompose}>
          <PenTool size={20} color={Colors.bg} strokeWidth={1.5} />
          <Text style={styles.composeTxt}>Draft</Text>
        </AnimatedPressable>
      </Animated.View>

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
    marginBottom: 16,
  },
  mediaContainer: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  mediaPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  mediaPlaceholderText: {
    fontFamily: Typography.fonts.manropeB,
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  actionTxt: {
    fontFamily: Typography.fonts.manropeB,
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
