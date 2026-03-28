import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { createPiPayment } from '../services/piAuth';
import { useAuthStore } from '../store/auth.store';
import { LinearGradient } from 'expo-linear-gradient';

export function WalletScreen({ navigation }: any) {
  const [period, setPeriod] = useState<'day'|'week'|'month'>('week');
  const { user } = useAuthStore();

  const { data: wallet } = useQuery({ queryKey: ['wallet'], queryFn: () => api.users.wallet().then(r => r.data) });
  const { data: earnings } = useQuery({ queryKey: ['earnings', period], queryFn: () => api.users.earnings(period).then(r => r.data) });

  const handleLockVault = async (durationDays: number) => {
    // ⚠️  UPDATE: The amount should be user-selected via a UI input
    const amountPi = 1; // Example: 1 Pi
    const paymentData = await api.payments.lockVault(amountPi, durationDays);
    await createPiPayment({
      amount: amountPi,
      memo: `SPYCE Vault Lock ${durationDays}d`,
      metadata: { type: 'vault_lock', durationDays },
      onApprove: async (paymentId) => { await api.payments.approve(paymentId); },
      onComplete: async (paymentId, txid) => { await api.payments.complete(paymentId, txid); },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Balance Card */}
        <LinearGradient colors={['#FF6B2B', '#E84040']} style={styles.balanceCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>{(wallet?.availableBalance ?? 0).toFixed(4)} π</Text>
          <Text style={styles.balanceSub}>≈ {((wallet?.availableBalance ?? 0) * 1.0).toFixed(2)} USD</Text>
          <View style={styles.lockedRow}>
            <Text style={styles.lockedText}>🔒 {(wallet?.lockedInVaults ?? 0).toFixed(4)} π locked in vaults</Text>
          </View>
        </LinearGradient>

        {/* Earnings Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earnings</Text>
          <View style={styles.periodRow}>
            {(['day','week','month'] as const).map(p => (
              <TouchableOpacity key={p} style={[styles.periodBtn, period===p && styles.periodBtnActive]} onPress={() => setPeriod(p)}>
                <Text style={[styles.periodText, period===p && styles.periodTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {earnings?.breakdown?.map((item: any) => (
            <View key={item.type} style={styles.earningRow}>
              <Text style={styles.earningType}>{formatEarnType(item.type)}</Text>
              <Text style={styles.earningAmt}>+{item.amountPi.toFixed(4)} π</Text>
            </View>
          ))}
          <View style={styles.earningTotal}>
            <Text style={styles.earningTotalLabel}>Total</Text>
            <Text style={styles.earningTotalAmt}>{(earnings?.totalPi ?? 0).toFixed(4)} π</Text>
          </View>
        </View>

        {/* Pi Vault */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔒 Pi Savings Vault (5% APY)</Text>
          <Text style={styles.vaultDesc}>Lock your Pi to earn interest. Funds are locked for the duration you choose.</Text>
          <View style={styles.vaultOptions}>
            {[30, 60, 90].map(days => (
              <TouchableOpacity key={days} style={styles.vaultBtn} onPress={() => handleLockVault(days)}>
                <Text style={styles.vaultBtnTitle}>{days} Days</Text>
                <Text style={styles.vaultBtnSub}>{(5 * days / 365).toFixed(2)}% return</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {wallet?.recentTransactions?.slice(0, 10).map((tx: any) => (
            <View key={tx.id} style={styles.txRow}>
              <View>
                <Text style={styles.txType}>{formatEarnType(tx.type)}</Text>
                <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleDateString()}</Text>
              </View>
              <Text style={[styles.txAmount, tx.direction === 'credit' ? styles.credit : styles.debit]}>
                {tx.direction === 'credit' ? '+' : '-'}{tx.amountPi?.toFixed(4)} π
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatEarnType(type: string): string {
  const map: Record<string, string> = {
    earn_reaction: '❤️ Reaction', earn_challenge: '🏆 Challenge', earn_watch: '👀 Watch',
    earn_referral: '👥 Referral', earn_creator_fund: '🎨 Creator Fund', earn_gift: '🎁 Gift',
    earn_vault_interest: '🔒 Vault Interest', spend_boost: '🚀 Boost', spend_purchase: '🛒 Purchase',
    spend_tip: '💸 Tip', earn_tip: '💰 Tip Received', earn_bounty: '📋 Bounty',
  };
  return map[type] ?? type;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  back: { color: '#fff', fontSize: 24 },
  title: { color: '#fff', fontSize: 20, fontWeight: '800' },
  scroll: { paddingHorizontal: 16, paddingBottom: 40, gap: 20 },
  balanceCard: { borderRadius: 20, padding: 24 },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  balanceAmount: { color: '#fff', fontSize: 44, fontWeight: '800', marginVertical: 4 },
  balanceSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  lockedRow: { marginTop: 16, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  lockedText: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  section: { gap: 12 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  periodRow: { flexDirection: 'row', gap: 8 },
  periodBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.07)' },
  periodBtnActive: { backgroundColor: '#FF6B2B' },
  periodText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' },
  periodTextActive: { color: '#fff' },
  earningRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  earningType: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  earningAmt: { color: '#4ADE80', fontWeight: '600' },
  earningTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12 },
  earningTotalLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
  earningTotalAmt: { color: '#FF6B2B', fontSize: 16, fontWeight: '800' },
  vaultDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  vaultOptions: { flexDirection: 'row', gap: 10 },
  vaultBtn: { flex: 1, backgroundColor: 'rgba(255,107,43,0.15)', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,107,43,0.3)' },
  vaultBtnTitle: { color: '#FF6B2B', fontWeight: '700', fontSize: 15 },
  vaultBtnSub: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  txType: { color: '#fff', fontSize: 13, fontWeight: '500' },
  txDate: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '700' },
  credit: { color: '#4ADE80' },
  debit: { color: '#F87171' },
});