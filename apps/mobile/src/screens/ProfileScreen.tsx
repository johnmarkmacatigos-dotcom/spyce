import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, SafeAreaView, FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuthStore } from '../store/auth.store';
import { SpyceScoreBadge } from '../components/3d/SpyceScoreBadge';

export function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuthStore();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => api.users.profile(user!.id).then(r => r.data),
    enabled: !!user?.id,
  });

  const { data: videos } = useQuery({
    queryKey: ['user-videos', user?.id],
    queryFn: () => api.users.profile(user!.id).then(r => r.data?.videos ?? []),
    enabled: !!user?.id,
  });

  const stats = [
    { label: 'Videos', value: profile?.videoCount ?? 0 },
    { label: 'Followers', value: profile?.followerCount ?? 0 },
    { label: 'Following', value: profile?.followingCount ?? 0 },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>@{user?.piUsername}</Text>
          <TouchableOpacity onPress={() => navigation.push('Settings')}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Profile info */}
        <View style={styles.profileRow}>
          <Image source={{ uri: user?.avatarUrl ?? 'https://via.placeholder.com/80' }} style={styles.avatar} />
          <View style={styles.profileInfo}>
            <Text style={styles.displayName}>{user?.displayName}</Text>
            <Text style={styles.piBalance}>💰 {user?.piBalance?.toFixed(4) ?? '0.0000'} π</Text>
          </View>
          <SpyceScoreBadge score={user?.spyceScore ?? 0} size={80} />
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {stats.map(s => (
            <View key={s.label} style={styles.stat}>
              <Text style={styles.statVal}>{s.value.toLocaleString()}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Action buttons */}
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.outlineBtn} onPress={() => navigation.push('EditProfile')}>
            <Text style={styles.outlineBtnText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlineBtn} onPress={() => navigation.push('Wallet')}>
            <Text style={styles.outlineBtnText}>💰 Wallet</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlineBtn} onPress={logout}>
            <Text style={[styles.outlineBtnText, { color: '#F87171' }]}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Referral code */}
        {profile?.referralCode && (
          <View style={styles.referralBox}>
            <Text style={styles.referralTitle}>🎁 Invite friends, earn Pi!</Text>
            <Text style={styles.referralCode}>{profile.referralCode}</Text>
            <Text style={styles.referralSub}>Share your code. Earn 0.1 Pi per qualified referral.</Text>
          </View>
        )}

        {/* Videos grid */}
        <Text style={styles.sectionTitle}>Videos</Text>
        <FlatList
          data={profile?.videos ?? []}
          numColumns={3}
          scrollEnabled={false}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.videoThumb} onPress={() => navigation.push('VideoPlayer', { videoId: item.id })}>
              <Image source={{ uri: item.thumbnailUrl ?? 'https://via.placeholder.com/120' }} style={styles.videoThumbImg} />
              <Text style={styles.videoViews}>👁 {(item.viewCount / 1000).toFixed(1)}K</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ gap: 2 }}
          columnWrapperStyle={{ gap: 2 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  settingsIcon: { fontSize: 24 },
  profileRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 16, marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: '#FF6B2B' },
  profileInfo: { flex: 1, gap: 4 },
  displayName: { color: '#fff', fontSize: 20, fontWeight: '700' },
  piBalance: { color: '#FF6B2B', fontSize: 15, fontWeight: '600' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginHorizontal: 20, marginBottom: 16 },
  stat: { alignItems: 'center' },
  statVal: { color: '#fff', fontSize: 20, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
  btnRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  outlineBtn: { flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  outlineBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  referralBox: { marginHorizontal: 16, marginBottom: 20, backgroundColor: 'rgba(255,107,43,0.1)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,107,43,0.3)', alignItems: 'center', gap: 6 },
  referralTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  referralCode: { color: '#FF6B2B', fontSize: 24, fontWeight: '900', letterSpacing: 3 },
  referralSub: { color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center' },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', paddingHorizontal: 20, marginBottom: 8 },
  videoThumb: { flex: 1/3, aspectRatio: 1, overflow: 'hidden', position: 'relative' },
  videoThumbImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  videoViews: { position: 'absolute', bottom: 4, left: 4, color: '#fff', fontSize: 10, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
});