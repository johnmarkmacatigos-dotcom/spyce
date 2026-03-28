import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { router } from 'expo-router';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const { height } = Dimensions.get('window');

interface FeedSidebarProps {
  video: any;
  onLike: () => void;
}

export default function FeedSidebar({ video, onLike }: FeedSidebarProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleLike = () => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.4, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
    onLike();
  };

  const actions = [
    {
      id: 'avatar',
      render: () => (
        <TouchableOpacity onPress={() => router.push(`/profile/${video.user.id}`)}>
          <FastImage
            source={{ uri: video.user.avatarUrl || `https://ui-avatars.com/api/?name=${video.user.displayName}&background=FF6B2B&color=fff` }}
            style={styles.avatarImg}
          />
          <View style={styles.followDot}><Text style={styles.followPlus}>+</Text></View>
        </TouchableOpacity>
      ),
    },
    {
      id: 'like',
      render: () => (
        <TouchableOpacity onPress={handleLike} style={styles.actionBtn}>
          <Animated.Text style={[styles.actionIcon, { transform: [{ scale: scaleAnim }], color: video.hasLiked ? '#FF6B2B' : '#fff' }]}>
            {video.hasLiked ? '❤️' : '🤍'}
          </Animated.Text>
          <Text style={styles.actionCount}>{formatCount(video.likeCount)}</Text>
        </TouchableOpacity>
      ),
    },
    {
      id: 'comment',
      render: () => (
        <TouchableOpacity onPress={() => router.push(`/video/${video.id}?tab=comments`)} style={styles.actionBtn}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionCount}>{formatCount(video.commentCount)}</Text>
        </TouchableOpacity>
      ),
    },
    {
      id: 'share',
      render: () => (
        <TouchableOpacity onPress={() => {}} style={styles.actionBtn}>
          <Text style={styles.actionIcon}>↗️</Text>
          <Text style={styles.actionCount}>{formatCount(video.shareCount)}</Text>
        </TouchableOpacity>
      ),
    },
    {
      id: 'save',
      render: () => (
        <TouchableOpacity onPress={() => {}} style={styles.actionBtn}>
          <Text style={styles.actionIcon}>🔖</Text>
          <Text style={styles.actionCount}>{formatCount(video.saveCount)}</Text>
        </TouchableOpacity>
      ),
    },
    {
      id: 'shop',
      render: () =>
        video.product ? (
          <TouchableOpacity onPress={() => router.push(`/marketplace/${video.product.id}`)} style={styles.actionBtn}>
            <View style={styles.shopBadge}>
              <Text style={styles.shopIcon}>🛍️</Text>
            </View>
            <Text style={styles.actionCount}>Shop</Text>
          </TouchableOpacity>
        ) : null,
    },
  ];

  return (
    <View style={styles.sidebar}>
      {actions.map((a) => {
        const node = a.render();
        if (!node) return null;
        return <View key={a.id} style={styles.actionWrapper}>{node}</View>;
      })}

      {/* Spyce Score display */}
      <View style={styles.scoreChip}>
        <Text style={styles.scoreText}>🌶 {video.user.spyceScore}</Text>
      </View>
    </View>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const styles = StyleSheet.create({
  sidebar: {
    position: 'absolute', right: 12, bottom: 100,
    alignItems: 'center', gap: 20,
  },
  actionWrapper: { alignItems: 'center' },
  actionBtn: { alignItems: 'center' },
  actionIcon: { fontSize: 30 },
  actionCount: { color: '#fff', fontSize: 12, fontWeight: '600', marginTop: 2 },
  avatarImg: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#FF6B2B' },
  followDot: {
    position: 'absolute', bottom: -6, alignSelf: 'center',
    backgroundColor: '#FF6B2B', borderRadius: 10, width: 20, height: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  followPlus: { color: '#fff', fontSize: 14, fontWeight: '900', lineHeight: 20 },
  shopBadge: {
    backgroundColor: '#FF6B2B22', borderWidth: 1.5, borderColor: '#FF6B2B',
    borderRadius: 12, width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
  },
  shopIcon: { fontSize: 22 },
  scoreChip: {
    backgroundColor: '#FF6B2B22', borderWidth: 1, borderColor: '#FF6B2B44',
    borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4,
  },
  scoreText: { color: '#FF6B2B', fontSize: 11, fontWeight: '700' },
});
