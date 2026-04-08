import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'react-native-linear-gradient';
import { router } from 'expo-router';
import { apiGet } from '../../services/api';

const DIFFICULTY_CONFIG = {
  bronze:  { color: '#CD7F32', icon: '🥉', label: 'Bronze' },
  silver:  { color: '#C0C0C0', icon: '🥈', label: 'Silver' },
  gold:    { color: '#FFD700', icon: '🥇', label: 'Gold' },
  diamond: { color: '#B9F2FF', icon: '💎', label: 'Diamond' },
};

const CATEGORY_ICONS: Record<string, string> = {
  fitness:     '💪',
  health:      '❤️',
  learning:    '📚',
  community:   '🤝',
  nutrition:   '🥗',
  mindfulness: '🧘',
};

export default function ChallengesScreen() {
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState('all');

  const { data: challenges, isLoading, refetch } = useQuery({
    queryKey: ['daily-challenges'],
    queryFn: () => apiGet('/challenges/daily'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: streaks } = useQuery({
    queryKey: ['my-streaks'],
    queryFn: () => apiGet('/challenges/my-streaks'),
  });

  const categories = ['all', 'fitness', 'health', 'learning', 'community', 'nutrition', 'mindfulness'];
  const filtered = activeCategory === 'all'
    ? challenges
    : challenges?.filter((c: any) => c.category === activeCategory);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Daily Challenges</Text>
          <Text style={styles.headerSub}>Complete to earn Pi 🌶</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/challenge/leaderboard')} style={styles.leaderboardBtn}>
          <Text style={styles.leaderboardIcon}>🏆</Text>
          <Text style={styles.leaderboardText}>Leaderboard</Text>
        </TouchableOpacity>
      </View>

      {/* Streak Banner */}
      {streaks?.topStreak > 0 && (
        <LinearGradient colors={['#FF6B2B22', '#E8404022']} style={styles.streakBanner}>
          <Text style={styles.streakFire}>🔥</Text>
          <View>
            <Text style={styles.streakTitle}>{streaks.topStreak}-Day Streak!</Text>
            <Text style={styles.streakSub}>Keep it going to earn bonus Pi</Text>
          </View>
          <View style={styles.streakPill}>
            <Text style={styles.streakPillText}>+{streaks.bonusPi} π bonus</Text>
          </View>
        </LinearGradient>
      )}

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catContent}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.catChip, activeCategory === cat && styles.catChipActive]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text style={styles.catIcon}>{cat === 'all' ? '✨' : CATEGORY_ICONS[cat]}</Text>
            <Text style={[styles.catLabel, activeCategory === cat && styles.catLabelActive]}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Challenge List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#FF6B2B" />}
      >
        {filtered?.map((challenge: any) => {
          const diff = DIFFICULTY_CONFIG[challenge.difficulty as keyof typeof DIFFICULTY_CONFIG];
          const streak = streaks?.byChallenge?.[challenge.id];
          const piReward = (Number(challenge.piReward) / 1_000_000).toFixed(4);

          return (
            <TouchableOpacity
              key={challenge.id}
              style={styles.card}
              onPress={() => router.push(`/challenge/${challenge.id}`)}
              activeOpacity={0.85}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardIconWrap}>
                  <Text style={styles.cardCatIcon}>{CATEGORY_ICONS[challenge.category] || '🎯'}</Text>
                </View>
                <View style={styles.cardTitleWrap}>
                  <Text style={styles.cardTitle}>{challenge.title}</Text>
                  <View style={styles.diffRow}>
                    <Text style={[styles.diffBadge, { color: diff?.color }]}>{diff?.icon} {diff?.label}</Text>
                    {streak?.currentStreak > 0 && (
                      <Text style={styles.streakBadge}>🔥 {streak.currentStreak}d</Text>
                    )}
                  </View>
                </View>
                <View style={styles.rewardWrap}>
                  <Text style={styles.rewardPi}>π</Text>
                  <Text style={styles.rewardAmt}>{piReward}</Text>
                </View>
              </View>
              {challenge.description && (
                <Text style={styles.cardDesc} numberOfLines={2}>{challenge.description}</Text>
              )}
              {challenge.targetValue && (
                <View style={styles.targetRow}>
                  <Text style={styles.targetText}>
                    Target: {challenge.targetValue} {challenge.targetUnit}
                  </Text>
                  <Text style={styles.verifyBadge}>{challenge.verification} verified</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff' },
  headerSub: { fontSize: 13, color: '#FFFFFF66', marginTop: 2 },
  leaderboardBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FF6B2B22', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  leaderboardIcon: { fontSize: 16 },
  leaderboardText: { color: '#FF6B2B', fontWeight: '700', fontSize: 13 },
  streakBanner: { marginHorizontal: 20, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, borderWidth: 1, borderColor: '#FF6B2B33' },
  streakFire: { fontSize: 32 },
  streakTitle: { color: '#FF6B2B', fontWeight: '800', fontSize: 16 },
  streakSub: { color: '#FFFFFF88', fontSize: 12 },
  streakPill: { marginLeft: 'auto', backgroundColor: '#FF6B2B', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  streakPillText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  catScroll: { maxHeight: 50 },
  catContent: { paddingHorizontal: 20, gap: 8, alignItems: 'center' },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#1A1A1A', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: '#333' },
  catChipActive: { backgroundColor: '#FF6B2B22', borderColor: '#FF6B2B' },
  catIcon: { fontSize: 14 },
  catLabel: { color: '#FFFFFF66', fontSize: 13, fontWeight: '600' },
  catLabelActive: { color: '#FF6B2B' },
  listContent: { padding: 20, gap: 12 },
  card: { backgroundColor: '#141414', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#222' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  cardIconWrap: { width: 48, height: 48, backgroundColor: '#1A1A1A', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardCatIcon: { fontSize: 24 },
  cardTitleWrap: { flex: 1 },
  cardTitle: { color: '#fff', fontWeight: '700', fontSize: 16 },
  diffRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  diffBadge: { fontSize: 12, fontWeight: '600' },
  streakBadge: { fontSize: 12, color: '#FF6B2B' },
  rewardWrap: { alignItems: 'center' },
  rewardPi: { color: '#FFD700', fontSize: 18, fontWeight: '900' },
  rewardAmt: { color: '#FFD700', fontSize: 12, fontWeight: '700' },
  cardDesc: { color: '#FFFFFF77', fontSize: 13, lineHeight: 18, marginBottom: 8 },
  targetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  targetText: { color: '#FFFFFF55', fontSize: 12 },
  verifyBadge: { color: '#FF6B2B88', fontSize: 11, backgroundColor: '#FF6B2B11', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
});
