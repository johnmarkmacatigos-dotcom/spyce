import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, Dimensions, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import FastImage from 'react-native-fast-image';
import { LinearGradient } from 'react-native-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuthStore, formatPiBalance } from '../../store/authStore';
import { apiGet, apiPost } from '../../services/api';
import { SpyceScoreBadge } from '../../components/3d/SpyceScoreBadge';

const { width } = Dimensions.get('window');
const THUMB_SIZE = width / 3 - 2;

export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { user: me } = useAuthStore();
  const isMyProfile = !id || id === me?.id;
  const targetId = id || me?.id;

  const [activeTab, setActiveTab] = useState<'videos' | 'challenges' | 'shop'>('videos');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', targetId],
    queryFn: () => apiGet(`/users/${targetId}`),
    enabled: !!targetId,
  });

  const { data: videos } = useQuery({
    queryKey: ['user-videos', targetId],
    queryFn: () => apiGet(`/users/${targetId}/videos`),
    enabled: !!targetId,
  });

  const { data: products } = useQuery({
    queryKey: ['user-products', targetId],
    queryFn: () => apiGet(`/users/${targetId}/products`),
    enabled: activeTab === 'shop' && !!targetId,
  });

  const followMutation = useMutation({
    mutationFn: () => apiPost(`/users/${targetId}/follow`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', targetId] }),
  });

  if (isLoading) return (
    <View style={styles.loader}>
      <ActivityIndicator color="#FF6B2B" size="large" />
    </View>
  );

  const piBalance = profile?.piBalance ? formatPiBalance(profile.piBalance) : '0';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Back button */}
      {!isMyProfile && (
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cover */}
        <View style={styles.coverWrap}>
          {profile?.coverUrl ? (
            <FastImage source={{ uri: profile.coverUrl }} style={styles.cover} resizeMode="cover" />
          ) : (
            <LinearGradient colors={['#1A0800', '#0A0A0A']} style={styles.cover} />
          )}
        </View>

        {/* Avatar + Score Badge */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            <FastImage
              source={{ uri: profile?.avatarUrl || `https://ui-avatars.com/api/?name=${profile?.displayName}&background=FF6B2B&color=fff&size=100` }}
              style={styles.avatar}
            />
            {profile?.isVerified && (
              <View style={styles.verifiedBadge}><Text style={styles.verifiedText}>✓</Text></View>
            )}
          </View>
          <View style={styles.scoreBadgeWrap}>
            <SpyceScoreBadge score={profile?.spyceScore || 0} />
          </View>
        </View>

        {/* Name + Username */}
        <View style={styles.nameSection}>
          <Text style={styles.displayName}>{profile?.displayName}</Text>
          <Text style={styles.username}>@{profile?.piUsername}</Text>
          {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{profile?.followerCount || 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{profile?.followingCount || 0}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>π{piBalance}</Text>
            <Text style={styles.statLabel}>Balance</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{profile?.spyceScore || 0}</Text>
            <Text style={styles.statLabel}>Score</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          {isMyProfile ? (
            <>
              <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/profile/edit')}>
                <Text style={styles.editBtnText}>Edit Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareBtn} onPress={() => {}}>
                <Text style={styles.shareBtnText}>↗️</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.followBtn, profile?.isFollowing && styles.followingBtn]}
                onPress={() => followMutation.mutate()}
              >
                <Text style={styles.followBtnText}>
                  {profile?.isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.messageBtn}>
                <Text style={styles.messageBtnText}>Message</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tipBtn} onPress={() => router.push(`/tip/${targetId}`)}>
                <Text style={styles.tipBtnText}>π Tip</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          {(['videos', 'challenges', 'shop'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={styles.tabIcon}>
                {tab === 'videos' ? '🎬' : tab === 'challenges' ? '🏆' : '🛍️'}
              </Text>
              <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Videos Grid */}
        {activeTab === 'videos' && (
          <View style={styles.videoGrid}>
            {videos?.map((video: any) => (
              <TouchableOpacity
                key={video.id}
                style={styles.videoThumb}
                onPress={() => router.push(`/video/${video.id}`)}
              >
                <FastImage
                  source={{ uri: video.thumbnailUrl }}
                  style={styles.thumbImg}
                  resizeMode="cover"
                />
                <View style={styles.thumbOverlay}>
                  <Text style={styles.thumbViews}>▶ {video.viewCount}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Products */}
        {activeTab === 'shop' && (
          <View style={styles.productsGrid}>
            {products?.map((product: any) => (
              <TouchableOpacity
                key={product.id}
                style={styles.productItem}
                onPress={() => router.push(`/marketplace/${product.id}`)}
              >
                <Text style={styles.productTitle} numberOfLines={2}>{product.title}</Text>
                <Text style={styles.productPrice}>π{(Number(product.priceMicroPi) / 1_000_000).toFixed(4)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  loader: { flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' },
  backBtn: { position: 'absolute', top: 50, left: 16, zIndex: 10, backgroundColor: '#00000066', borderRadius: 20, padding: 8 },
  backIcon: { color: '#fff', fontSize: 20 },
  coverWrap: { height: 160 },
  cover: { flex: 1 },
  avatarSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, marginTop: -50 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: '#0A0A0A' },
  verifiedBadge: { position: 'absolute', bottom: 4, right: 4, backgroundColor: '#FF6B2B', borderRadius: 12, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  verifiedText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  scoreBadgeWrap: {},
  nameSection: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  displayName: { color: '#fff', fontSize: 22, fontWeight: '900' },
  username: { color: '#FFFFFF66', fontSize: 14, marginTop: 2 },
  bio: { color: '#FFFFFFAA', fontSize: 14, marginTop: 8, lineHeight: 20 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#1A1A1A' },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { color: '#fff', fontSize: 16, fontWeight: '800' },
  statLabel: { color: '#FFFFFF55', fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#1A1A1A' },
  actionRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 16 },
  editBtn: { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  editBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  shareBtn: { backgroundColor: '#1A1A1A', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: '#333' },
  shareBtnText: { fontSize: 16 },
  followBtn: { flex: 1, backgroundColor: '#FF6B2B', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  followingBtn: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#FF6B2B' },
  followBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  messageBtn: { backgroundColor: '#1A1A1A', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, borderWidth: 1, borderColor: '#333' },
  messageBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  tipBtn: { backgroundColor: '#FFD70022', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: '#FFD700' },
  tipBtnText: { color: '#FFD700', fontWeight: '700', fontSize: 14 },
  tabBar: { flexDirection: 'row', borderTopWidth: 1, borderColor: '#1A1A1A' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#FF6B2B' },
  tabIcon: { fontSize: 16 },
  tabLabel: { color: '#FFFFFF55', fontSize: 13, fontWeight: '600' },
  tabLabelActive: { color: '#FF6B2B' },
  videoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  videoThumb: { width: THUMB_SIZE, height: THUMB_SIZE * 1.3 },
  thumbImg: { flex: 1 },
  thumbOverlay: { position: 'absolute', bottom: 4, left: 4, backgroundColor: '#00000088', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  thumbViews: { color: '#fff', fontSize: 10 },
  productsGrid: { padding: 16, gap: 8 },
  productItem: { backgroundColor: '#141414', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#222' },
  productTitle: { color: '#fff', fontWeight: '700', fontSize: 15 },
  productPrice: { color: '#FFD700', fontWeight: '700', fontSize: 14, marginTop: 4 },
});
