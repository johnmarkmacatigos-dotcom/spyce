import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

export function VideoInfo({ video, onUserPress }: { video: any; onUserPress?: () => void }) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.userRow} onPress={onUserPress}>
        <Image source={{ uri: video.user?.avatarUrl || 'https://via.placeholder.com/32' }} style={styles.avatar} />
        <Text style={styles.username}>@{video.user?.piUsername}</Text>
        {video.user?.isVerified && <Text style={styles.verified}>✓</Text>}
      </TouchableOpacity>

      {video.title && <Text style={styles.title} numberOfLines={2}>{video.title}</Text>}
      {video.description && <Text style={styles.desc} numberOfLines={2}>{video.description}</Text>}

      {/* Hashtags */}
      {video.hashtags?.length > 0 && (
        <View style={styles.tagsRow}>
          {video.hashtags.slice(0, 4).map((tag: string) => (
            <Text key={tag} style={styles.tag}>#{tag}</Text>
          ))}
        </View>
      )}

      {/* Sound info */}
      {video.sound && (
        <View style={styles.soundRow}>
          <Text style={styles.soundText}>🎵 {video.sound.title} · {video.sound.artist}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: 90, left: 12, right: 80, gap: 6 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#fff' },
  username: { color: '#fff', fontWeight: '700', fontSize: 15 },
  verified: { color: '#1DA1F2', fontSize: 14 },
  title: { color: '#fff', fontSize: 15, fontWeight: '600' },
  desc: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tag: { color: '#fff', fontWeight: '700', fontSize: 13 },
  soundRow: { flexDirection: 'row', alignItems: 'center' },
  soundText: { color: 'rgba(255,255,255,0.9)', fontSize: 12 },
});