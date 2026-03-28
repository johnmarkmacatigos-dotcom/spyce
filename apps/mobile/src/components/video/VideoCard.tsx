import React, { useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
} from 'react-native';
import Video from 'react-native-video';
import FastImage from 'react-native-fast-image';
import { LinearGradient } from 'react-native-linear-gradient';
import { router } from 'expo-router';

const { width, height } = Dimensions.get('window');

interface VideoCardProps {
  video: any;
  isActive: boolean;
  onLike: () => void;
}

export default function VideoCard({ video, isActive, onLike }: VideoCardProps) {
  const videoRef = useRef(null);

  return (
    <View style={styles.container}>
      {/* HLS Video Player */}
      {video.hlsUrl ? (
        <Video
          ref={videoRef}
          source={{ uri: video.hlsUrl }}
          style={styles.video}
          resizeMode="cover"
          repeat
          paused={!isActive}
          muted={false}
          bufferConfig={{
            minBufferMs: 2000,
            maxBufferMs: 10000,
            bufferForPlaybackMs: 1000,
            bufferForPlaybackAfterRebufferMs: 2000,
          }}
        />
      ) : (
        <FastImage source={{ uri: video.thumbnailUrl }} style={styles.video} resizeMode="cover" />
      )}

      {/* Gradient overlay */}
      <LinearGradient
        colors={['transparent', 'transparent', 'rgba(0,0,0,0.85)']}
        style={styles.gradient}
        pointerEvents="none"
      />

      {/* Bottom info */}
      <View style={styles.bottomInfo}>
        {/* User info */}
        <TouchableOpacity
          style={styles.userRow}
          onPress={() => router.push(`/profile/${video.user.id}`)}
        >
          <FastImage
            source={{ uri: video.user.avatarUrl || `https://ui-avatars.com/api/?name=${video.user.displayName}&background=FF6B2B&color=fff` }}
            style={styles.avatar}
          />
          <View>
            <Text style={styles.username}>@{video.user.piUsername}</Text>
            {video.user.isVerified && <Text style={styles.verified}>✓ Verified</Text>}
          </View>
        </TouchableOpacity>

        {/* Caption */}
        {video.title && (
          <Text style={styles.caption} numberOfLines={2}>{video.title}</Text>
        )}

        {/* Hashtags */}
        {video.hashtags?.length > 0 && (
          <View style={styles.hashtagRow}>
            {video.hashtags.slice(0, 3).map((tag: string) => (
              <TouchableOpacity key={tag} onPress={() => router.push(`/search?tag=${tag}`)}>
                <Text style={styles.hashtag}>#{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Sound */}
        {video.sound && (
          <View style={styles.soundRow}>
            <Text style={styles.soundIcon}>🎵</Text>
            <Text style={styles.soundName} numberOfLines={1}>
              {video.sound.title} - {video.sound.artist}
            </Text>
          </View>
        )}

        {/* Challenge badge */}
        {video.isChallenge && (
          <View style={styles.challengeBadge}>
            <Text style={styles.challengeBadgeText}>🏆 Challenge</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width, height, backgroundColor: '#000' },
  video: { position: 'absolute', top: 0, left: 0, width, height },
  gradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: height * 0.45 },
  bottomInfo: {
    position: 'absolute', bottom: 80, left: 16, right: 72,
  },
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#FF6B2B' },
  username: { color: '#fff', fontWeight: '700', fontSize: 15 },
  verified: { color: '#FF6B2B', fontSize: 11, fontWeight: '600' },
  caption: { color: '#fff', fontSize: 14, lineHeight: 20, marginBottom: 8 },
  hashtagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  hashtag: { color: '#FF6B2B', fontSize: 13, fontWeight: '600' },
  soundRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  soundIcon: { fontSize: 13 },
  soundName: { color: '#ffffffcc', fontSize: 12, flex: 1 },
  challengeBadge: {
    backgroundColor: '#FF6B2B22', borderWidth: 1, borderColor: '#FF6B2B',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
    alignSelf: 'flex-start', marginTop: 8,
  },
  challengeBadgeText: { color: '#FF6B2B', fontSize: 12, fontWeight: '700' },
});
