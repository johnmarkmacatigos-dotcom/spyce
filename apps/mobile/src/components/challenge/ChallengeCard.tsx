import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const DIFFICULTY_COLORS: Record<string, string[]> = {
  bronze: ['#CD7F32', '#8B5E3C'],
  silver: ['#9CA3AF', '#6B7280'],
  gold: ['#F59E0B', '#D97706'],
  diamond: ['#6366F1', '#4F46E5'],
};

const CATEGORY_ICONS: Record<string, string> = {
  fitness: '💪', health: '❤️', learning: '📚',
  community: '🤝', nutrition: '🥗', mindfulness: '🧘',
};

export function ChallengeCard({ challenge, onPress }: { challenge: any; onPress?: () => void }) {
  const colors = DIFFICULTY_COLORS[challenge.difficulty] ?? ['#FF6B2B', '#E84040'];
  const icon = CATEGORY_ICONS[challenge.category] ?? '🌶';
  const piReward = Number(challenge.piReward) / 1_000_000;
  const isCompleted = challenge.userProgress?.status === 'completed';

  return (
    <TouchableOpacity onPress={onPress} disabled={isCompleted} activeOpacity={0.85}>
      <LinearGradient colors={[colors[0] + '33', colors[1] + '11']} style={[styles.card, isCompleted && styles.completed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.leftCol}>
          <View style={[styles.iconWrap, { backgroundColor: colors[0] + '33' }]}>
            <Text style={styles.icon}>{icon}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>{challenge.title}</Text>
          <Text style={styles.desc} numberOfLines={2}>{challenge.description}</Text>
          <View style={styles.meta}>
            <View style={[styles.badge, { backgroundColor: colors[0] + '44' }]}>
              <Text style={[styles.badgeText, { color: colors[0] }]}>{challenge.difficulty.toUpperCase()}</Text>
            </View>
            {challenge.targetValue && (
              <Text style={styles.target}>{challenge.targetValue} {challenge.targetUnit}</Text>
            )}
          </View>
        </View>

        <View style={styles.rightCol}>
          <Text style={styles.piAmount}>+{piReward.toFixed(3)}</Text>
          <Text style={styles.piLabel}>π</Text>
          {challenge.streak?.currentStreak > 0 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>🔥 {challenge.streak.currentStreak}</Text>
            </View>
          )}
          {isCompleted && <Text style={styles.doneCheck}>✅</Text>}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 12 },
  completed: { opacity: 0.6 },
  leftCol: { justifyContent: 'center' },
  iconWrap: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  icon: { fontSize: 26 },
  content: { flex: 1, gap: 4 },
  title: { color: '#fff', fontSize: 15, fontWeight: '700' },
  desc: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  target: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
  rightCol: { alignItems: 'flex-end', justifyContent: 'center', minWidth: 60 },
  piAmount: { color: '#FF6B2B', fontSize: 18, fontWeight: '800' },
  piLabel: { color: '#FF6B2B', fontSize: 12 },
  streakBadge: { marginTop: 4, backgroundColor: 'rgba(255,107,43,0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  streakText: { color: '#FF6B2B', fontSize: 11, fontWeight: '600' },
  doneCheck: { fontSize: 20, marginTop: 4 },
});