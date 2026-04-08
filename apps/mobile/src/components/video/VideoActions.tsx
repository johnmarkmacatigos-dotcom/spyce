import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import Animated from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface VideoActionsProps {
  video: any;
  liked: boolean;
  likeCount: number;
  heartAnimStyle: any;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
}

export function VideoActions({ video, liked, likeCount, heartAnimStyle, onLike, onComment, onShare }: VideoActionsProps) {
  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onLike?.();
  };

  return (
    <View style={styles.container}>
      {/* Creator avatar */}
      <TouchableOpacity style={styles.avatarWrap}>
        <Image source={{ uri: video.user?.avatarUrl || 'https://via.placeholder.com/44' }} style={styles.avatar} />
        <View style={styles.followBtn}><Text style={styles.followBtnText}>+</Text></View>
      </TouchableOpacity>

      {/* Like */}
      <TouchableOpacity style={styles.action} onPress={handleLike}>
        <Animated.Text style={[styles.actionIcon, heartAnimStyle, liked && styles.liked]}>
          {liked ? '❤️' : '🤍'}
        </Animated.Text>
        <Text style={styles.actionText}>{formatCount(likeCount)}</Text>
      </TouchableOpacity>

      {/* Comment */}
      <TouchableOpacity style={styles.action} onPress={onComment}>
        <Text style={styles.actionIcon}>💬</Text>
        <Text style={styles.actionText}>{formatCount(video.commentCount ?? 0)}</Text>
      </TouchableOpacity>

      {/* Share */}
      <TouchableOpacity style={styles.action} onPress={onShare}>
        <Text style={styles.actionIcon}>↗️</Text>
        <Text style={styles.actionText}>{formatCount(video.shareCount ?? 0)}</Text>
      </TouchableOpacity>

      {/* Pi earn indicator */}
      {video.piReward && (
        <TouchableOpacity style={styles.action}>
          <Text style={styles.piIcon}>🌶</Text>
          <Text style={styles.piText}>{(video.piReward / 1_000_000).toFixed(2)} π</Text>
        </TouchableOpacity>
      )}

      {/* Sound disc */}
      <View style={styles.soundDisc}>
        <Text style={{ fontSize: 22 }}>🎵</Text>
      </View>
    </View>
  );
}

function formatCount(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

const styles = StyleSheet.create({
  container: { position: 'absolute', right: 12, bottom: 100, alignItems: 'center', gap: 16 },
  avatarWrap: { alignItems: 'center', marginBottom: 4 },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#fff' },
  followBtn: { position: 'absolute', bottom: -8, backgroundColor: '#FF6B2B', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  followBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', lineHeight: 20 },
  action: { alignItems: 'center' },
  actionIcon: { fontSize: 30 },
  liked: { transform: [{ scale: 1.1 }] },
  actionText: { color: '#fff', fontSize: 12, marginTop: 2, fontWeight: '600' },
  piIcon: { fontSize: 26 },
  piText: { color: '#FF6B2B', fontSize: 11, fontWeight: '700', marginTop: 2 },
  soundDisc: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
});