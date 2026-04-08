import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, Modal, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { ChallengeCard } from '../components/challenge/ChallengeCard';
import { ProofSubmitModal } from '../components/challenge/ProofSubmitModal';
import { LeaderboardPanel } from '../components/challenge/LeaderboardPanel';
import { useAuthStore } from '../store/auth.store';

type Tab = 'daily' | 'leaderboard' | 'squads';

export function ChallengesScreen({ navigation }: any) {
  const [tab, setTab] = useState<Tab>('daily');
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
  const [showProof, setShowProof] = useState(false);
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const { data: dailyChallenges, isLoading } = useQuery({
    queryKey: ['daily-challenges'],
    queryFn: () => api.challenges.daily().then(r => r.data),
  });

  const submitMutation = useMutation({
    mutationFn: (data: any) => api.challenges.submit(data).then(r => r.data),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['daily-challenges'] });
      if (result.status === 'completed') {
        Alert.alert('🌶 Challenge Complete!', `You earned Pi! Keep your streak going.`);
      } else if (result.status === 'verifying') {
        Alert.alert('⏳ Verifying...', 'Your submission is being verified by AI. We will notify you when done!');
      }
      setShowProof(false);
    },
  });

  const challenges = dailyChallenges?.map((d: any) => d.template ?? d) ?? [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🌶 Challenges</Text>
        <Text style={styles.subtitle}>Complete daily challenges to earn Pi</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['daily','leaderboard','squads'] as Tab[]).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'daily' ? '📅 Daily' : t === 'leaderboard' ? '🏆 Board' : '👥 Squads'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'daily' && (
        <FlatList
          data={challenges}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ChallengeCard
              challenge={item}
              onPress={() => { setSelectedChallenge(item); setShowProof(true); }}
            />
          )}
        />
      )}

      {tab === 'leaderboard' && <LeaderboardPanel />}

      {tab === 'squads' && (
        <View style={styles.center}>
          <Text style={styles.comingSoon}>👥 Squad Challenges</Text>
          <Text style={styles.comingSoonSub}>Team up with friends and earn Pi together.</Text>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.push('CreateSquad')}>
            <Text style={styles.ctaBtnText}>Create a Squad</Text>
          </TouchableOpacity>
        </View>
      )}

      <ProofSubmitModal
        visible={showProof}
        challenge={selectedChallenge}
        onClose={() => setShowProof(false)}
        onSubmit={(data: any) => submitMutation.mutate({ challengeId: selectedChallenge?.id, ...data })}
        isLoading={submitMutation.isPending}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { color: '#fff', fontSize: 26, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 2 },
  tabs: { flexDirection: 'row', marginHorizontal: 20, marginVertical: 12, gap: 8 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center' },
  tabActive: { backgroundColor: '#FF6B2B' },
  tabText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  comingSoon: { color: '#fff', fontSize: 20, fontWeight: '700' },
  comingSoonSub: { color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
  ctaBtn: { backgroundColor: '#FF6B2B', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 30, marginTop: 8 },
  ctaBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});