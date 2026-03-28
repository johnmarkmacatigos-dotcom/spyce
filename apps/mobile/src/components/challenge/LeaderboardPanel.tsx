import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';

type LbType = 'earnings' | 'challenges';
type Period = 'weekly' | 'monthly' | 'alltime';

export function LeaderboardPanel() {
  const [type, setType] = useState<LbType>('earnings');
  const [period, setPeriod] = useState<Period>('weekly');

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', type, period],
    queryFn: () => api.challenges.leaderboard(type, period).then(r => r.data),
  });

  const medals = ['🥇','🥈','🥉'];

  return (
    <View style={styles.container}>
      <View style={styles.typeRow}>
        {(['earnings','challenges'] as LbType[]).map(t => (
          <TouchableOpacity key={t} style={[styles.typeBtn, type===t && styles.typeBtnActive]} onPress={() => setType(t)}>
            <Text style={[styles.typeBtnText, type===t && styles.typeBtnTextActive]}>{t === 'earnings' ? '💰 Earnings' : '🏆 Challenges'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.periodRow}>
        {(['weekly','monthly','alltime'] as Period[]).map(p => (
          <TouchableOpacity key={p} style={[styles.periodBtn, period===p && styles.periodBtnActive]} onPress={() => setPeriod(p)}>
            <Text style={[styles.periodText, period===p && styles.periodTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color="#FF6B2B" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item: any) => item.user?.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          renderItem={({ item, index }) => (
            <View style={[styles.row, index < 3 && styles.topRow]}>
              <Text style={styles.rank}>{medals[index] ?? `#${index+1}`}</Text>
              <Image source={{ uri: item.user?.avatarUrl || 'https://via.placeholder.com/36' }} style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.user?.displayName}</Text>
                <Text style={styles.piUsername}>@{item.user?.piUsername}</Text>
              </View>
              <Text style={styles.score}>
                {type === 'earnings' ? `${(item.score/1_000_000).toFixed(2)} π` : `${item.score} ✅`}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  typeRow: { flexDirection: 'row', marginHorizontal: 16, gap: 8, marginBottom: 8 },
  typeBtn: { flex: 1, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center' },
  typeBtnActive: { backgroundColor: '#FF6B2B' },
  typeBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },
  typeBtnTextActive: { color: '#fff' },
  periodRow: { flexDirection: 'row', marginHorizontal: 16, gap: 6, marginBottom: 16 },
  periodBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
  periodBtnActive: { backgroundColor: 'rgba(255,107,43,0.3)' },
  periodText: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  periodTextActive: { color: '#FF6B2B', fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  topRow: { backgroundColor: 'rgba(255,107,43,0.05)', borderRadius: 12, paddingHorizontal: 8, marginBottom: 4 },
  rank: { fontSize: 22, width: 36, textAlign: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  name: { color: '#fff', fontSize: 14, fontWeight: '600' },
  piUsername: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  score: { color: '#FF6B2B', fontWeight: '700', fontSize: 14 },
});