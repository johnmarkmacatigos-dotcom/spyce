import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'react-native-linear-gradient';
import { router } from 'expo-router';
import { useAuthStore, formatPiBalance } from '../../store/authStore';
import { apiGet } from '../../services/api';

const PERIODS = [
  { key: 'day', label: '24h' },
  { key: 'week', label: '7d' },
  { key: 'month', label: '30d' },
  { key: 'all', label: 'All' },
];

const EARN_TYPE_LABELS: Record<string, { icon: string; label: string }> = {
  earn_reaction:      { icon: '❤️', label: 'Video Reactions' },
  earn_challenge:     { icon: '🏆', label: 'Challenges' },
  earn_referral:      { icon: '👥', label: 'Referrals' },
  earn_watch:         { icon: '👁️', label: 'Watch Bonus' },
  earn_creator_fund:  { icon: '🎬', label: 'Creator Fund' },
  earn_bounty:        { icon: '📣', label: 'Brand Bounties' },
  earn_vault_interest:{ icon: '🔒', label: 'Vault Interest' },
  earn_tip:           { icon: '💸', label: 'Tips Received' },
};

export default function EarningsScreen() {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState('week');
  const { user } = useAuthStore();

  const { data: earnings, isLoading } = useQuery({
    queryKey: ['earnings', period],
    queryFn: () => apiGet(`/earnings/summary?period=${period}`),
    enabled: !!user,
  });

  const { data: vaults } = useQuery({
    queryKey: ['vaults'],
    queryFn: () => apiGet('/earnings/vaults'),
  });

  const balance = user?.piBalance ? formatPiBalance(user.piBalance) : '0.0000';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Balance Card */}
        <LinearGradient colors={['#FF6B2B', '#E84040']} style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Pi Balance</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balancePiIcon}>π</Text>
            <Text style={styles.balanceAmount}>{balance}</Text>
          </View>
          <Text style={styles.balanceSub}>
            {earnings?.totalPi ? `+π${earnings.totalPi} this ${period}` : 'Loading...'}
          </Text>
          <View style={styles.balanceActions}>
            <TouchableOpacity
              style={styles.balanceActionBtn}
              onPress={() => router.push('/earnings/vault')}
            >
              <Text style={styles.balanceActionIcon}>🔒</Text>
              <Text style={styles.balanceActionText}>Lock in Vault</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.balanceActionBtn}
              onPress={() => router.push('/earnings/withdraw')}
            >
              <Text style={styles.balanceActionIcon}>↗️</Text>
              <Text style={styles.balanceActionText}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Period Selector */}
        <View style={styles.periodRow}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[styles.periodBtn, period === p.key && styles.periodBtnActive]}
              onPress={() => setPeriod(p.key)}
            >
              <Text style={[styles.periodLabel, period === p.key && styles.periodLabelActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Earnings Breakdown */}
        <Text style={styles.sectionTitle}>Earnings Breakdown</Text>
        <View style={styles.breakdownGrid}>
          {earnings?.breakdown?.map((item: any) => {
            const meta = EARN_TYPE_LABELS[item.type] || { icon: '💰', label: item.type };
            return (
              <View key={item.type} style={styles.breakdownCard}>
                <Text style={styles.breakdownIcon}>{meta.icon}</Text>
                <Text style={styles.breakdownLabel}>{meta.label}</Text>
                <Text style={styles.breakdownAmount}>π{item.amountPi}</Text>
              </View>
            );
          })}
        </View>

        {/* Pi Vaults */}
        {vaults?.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Pi Vaults 🔒</Text>
            {vaults.map((vault: any) => {
              const unlockDate = new Date(vault.lockedUntil);
              const isUnlocked = unlockDate <= new Date();
              const piAmount = (Number(vault.amount) / 1_000_000).toFixed(4);
              return (
                <View key={vault.id} style={styles.vaultCard}>
                  <View style={styles.vaultLeft}>
                    <Text style={styles.vaultIcon}>{isUnlocked ? '🔓' : '🔒'}</Text>
                    <View>
                      <Text style={styles.vaultAmount}>π{piAmount}</Text>
                      <Text style={styles.vaultApy}>{vault.apyBps / 100}% APY</Text>
                    </View>
                  </View>
                  <View style={styles.vaultRight}>
                    <Text style={styles.vaultStatus}>{isUnlocked ? 'Ready to claim' : `Unlocks ${unlockDate.toLocaleDateString()}`}</Text>
                    {isUnlocked && (
                      <TouchableOpacity style={styles.claimBtn}>
                        <Text style={styles.claimText}>Claim</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* Quick Earn Actions */}
        <Text style={styles.sectionTitle}>Earn More Pi</Text>
        <View style={styles.earnGrid}>
          {[
            { icon: '🏆', label: 'Daily Challenges', sub: 'Up to π0.5/day', route: '/(tabs)/challenges' },
            { icon: '👥', label: 'Refer Friends', sub: 'π0.1 per referral', route: '/earnings/referrals' },
            { icon: '🎬', label: 'Post Videos', sub: 'Earn on reactions', route: '/(tabs)/camera' },
            { icon: '📣', label: 'Brand Bounties', sub: 'Pi-paid campaigns', route: '/bounties' },
          ].map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.earnCard}
              onPress={() => router.push(action.route as any)}
            >
              <Text style={styles.earnIcon}>{action.icon}</Text>
              <Text style={styles.earnLabel}>{action.label}</Text>
              <Text style={styles.earnSub}>{action.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Transactions */}
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {earnings?.transactions?.slice(0, 10).map((tx: any) => {
          const meta = EARN_TYPE_LABELS[tx.type] || { icon: '💰', label: tx.type };
          const piAmt = (Number(tx.amountMicroPi) / 1_000_000).toFixed(6);
          const isCredit = tx.direction === 'credit';
          return (
            <View key={tx.id} style={styles.txRow}>
              <Text style={styles.txIcon}>{meta.icon}</Text>
              <View style={styles.txInfo}>
                <Text style={styles.txLabel}>{meta.label}</Text>
                <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleString()}</Text>
              </View>
              <Text style={[styles.txAmount, { color: isCredit ? '#4CAF50' : '#FF6B2B' }]}>
                {isCredit ? '+' : '-'}π{piAmt}
              </Text>
            </View>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  balanceCard: { margin: 20, borderRadius: 24, padding: 24 },
  balanceLabel: { color: '#ffffffcc', fontSize: 14, fontWeight: '600' },
  balanceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginVertical: 4 },
  balancePiIcon: { color: '#fff', fontSize: 32, fontWeight: '900' },
  balanceAmount: { color: '#fff', fontSize: 40, fontWeight: '900' },
  balanceSub: { color: '#ffffff99', fontSize: 13 },
  balanceActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  balanceActionBtn: { flex: 1, backgroundColor: '#ffffff22', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  balanceActionIcon: { fontSize: 18 },
  balanceActionText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  periodRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 20 },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: '#1A1A1A', alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  periodBtnActive: { backgroundColor: '#FF6B2B22', borderColor: '#FF6B2B' },
  periodLabel: { color: '#FFFFFF66', fontWeight: '700', fontSize: 13 },
  periodLabelActive: { color: '#FF6B2B' },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '800', paddingHorizontal: 20, marginBottom: 12, marginTop: 8 },
  breakdownGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, gap: 8, marginBottom: 20 },
  breakdownCard: { backgroundColor: '#141414', borderRadius: 14, padding: 14, width: '47%', borderWidth: 1, borderColor: '#222', alignItems: 'center' },
  breakdownIcon: { fontSize: 28, marginBottom: 6 },
  breakdownLabel: { color: '#FFFFFF77', fontSize: 11, textAlign: 'center', marginBottom: 4 },
  breakdownAmount: { color: '#FFD700', fontWeight: '800', fontSize: 14 },
  vaultCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#141414', marginHorizontal: 20, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#222' },
  vaultLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vaultIcon: { fontSize: 28 },
  vaultAmount: { color: '#fff', fontWeight: '700', fontSize: 16 },
  vaultApy: { color: '#4CAF50', fontSize: 12 },
  vaultRight: { alignItems: 'flex-end', gap: 6 },
  vaultStatus: { color: '#FFFFFF66', fontSize: 12 },
  claimBtn: { backgroundColor: '#FF6B2B', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6 },
  claimText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  earnGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, gap: 8, marginBottom: 20 },
  earnCard: { backgroundColor: '#141414', borderRadius: 16, padding: 16, width: '47%', borderWidth: 1, borderColor: '#222', alignItems: 'center' },
  earnIcon: { fontSize: 32, marginBottom: 8 },
  earnLabel: { color: '#fff', fontWeight: '700', fontSize: 14, textAlign: 'center' },
  earnSub: { color: '#FFFFFF55', fontSize: 11, textAlign: 'center', marginTop: 4 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#111' },
  txIcon: { fontSize: 24, width: 36, textAlign: 'center' },
  txInfo: { flex: 1 },
  txLabel: { color: '#fff', fontWeight: '600', fontSize: 14 },
  txDate: { color: '#FFFFFF44', fontSize: 11, marginTop: 2 },
  txAmount: { fontWeight: '700', fontSize: 14 },
});
