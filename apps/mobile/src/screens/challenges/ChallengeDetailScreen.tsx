import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'react-native-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Pedometer } from 'expo-sensors';
import * as ImagePicker from 'expo-image-picker';
import { apiGet, apiPost } from '../../services/api';

const { width } = Dimensions.get('window');

const DIFF_COLORS = { bronze: '#CD7F32', silver: '#C0C0C0', gold: '#FFD700', diamond: '#B9F2FF' };

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [sensorData, setSensorData] = useState<any>(null);
  const [trackingSteps, setTrackingSteps] = useState(false);
  const [currentSteps, setCurrentSteps] = useState(0);

  const { data: challenge, isLoading } = useQuery({
    queryKey: ['challenge', id],
    queryFn: () => apiGet(`/challenges/${id}`),
    enabled: !!id,
  });

  const { data: streak } = useQuery({
    queryKey: ['streak', id],
    queryFn: () => apiGet(`/challenges/${id}/streak`),
    enabled: !!id,
  });

  const submitMutation = useMutation({
    mutationFn: (data: any) => apiPost('/challenges/submit', data),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['daily-challenges'] });
      qc.invalidateQueries({ queryKey: ['my-streaks'] });
      Alert.alert(
        '🌶 Submitted!',
        result.status === 'completed'
          ? `You earned π${(Number(result.piAwarded) / 1_000_000).toFixed(4)}!`
          : 'Proof submitted for verification. Check back soon!',
      );
      router.back();
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const handleStartStepTracking = async () => {
    const available = await Pedometer.isAvailableAsync();
    if (!available) {
      Alert.alert('Sensor Not Available', 'Step tracking is not available on this device.');
      return;
    }
    setTrackingSteps(true);
    setCurrentSteps(0);

    const subscription = Pedometer.watchStepCount((result) => {
      setCurrentSteps(result.steps);
    });

    // Auto-stop when target reached
    const interval = setInterval(async () => {
      const target = challenge?.targetValue || 10000;
      if (currentSteps >= target) {
        clearInterval(interval);
        subscription.remove();
        setTrackingSteps(false);
        setSensorData({ steps: currentSteps, source: 'pedometer' });
        Alert.alert('Target Reached! 🎉', `You hit ${currentSteps} steps! Ready to submit?`);
      }
    }, 5000);
  };

  const handleVideoProof = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      videoMaxDuration: 120,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setSubmitting(true);
      try {
        // Upload proof video
        const { videoId, uploadUrl } = await apiPost('/videos/upload-url', {
          filename: `proof_${Date.now()}.mp4`,
          contentType: 'video/mp4',
        });
        const blob = await (await fetch(result.assets[0].uri)).blob();
        await fetch(uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': 'video/mp4' } });

        submitMutation.mutate({
          challengeId: id,
          proofType: 'video',
          proofUrl: videoId,
        });
      } catch (err) {
        Alert.alert('Upload Failed', 'Could not upload proof. Try again.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleSelfReport = () => {
    Alert.alert(
      'Self-Report',
      `Did you complete "${challenge?.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, I did it!',
          onPress: () => submitMutation.mutate({
            challengeId: id,
            proofType: 'self',
            sensorData,
          }),
        },
      ],
    );
  };

  if (isLoading) return <View style={styles.loader}><ActivityIndicator color="#FF6B2B" /></View>;
  if (!challenge) return null;

  const diffColor = DIFF_COLORS[challenge.difficulty as keyof typeof DIFF_COLORS] || '#CD7F32';
  const piReward = (Number(challenge.piReward) / 1_000_000).toFixed(4);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={['#1A0800', '#0A0A0A']} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.category}>{challenge.category?.toUpperCase()}</Text>
          <Text style={styles.title}>{challenge.title}</Text>

          <View style={styles.metaRow}>
            <View style={[styles.diffBadge, { borderColor: diffColor }]}>
              <Text style={[styles.diffText, { color: diffColor }]}>{challenge.difficulty}</Text>
            </View>
            <View style={styles.rewardChip}>
              <Text style={styles.rewardPi}>π{piReward}</Text>
              <Text style={styles.rewardLabel}>reward</Text>
            </View>
            {(challenge.bonusStreak ?? 0) > 0 && (
              <View style={styles.streakChip}>
                <Text style={styles.streakText}>🔥 +π{(Number(challenge.bonusStreak) / 1_000_000).toFixed(4)} streak</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About this challenge</Text>
          <Text style={styles.description}>{challenge.description}</Text>
          {challenge.targetValue && (
            <View style={styles.targetCard}>
              <Text style={styles.targetLabel}>Target</Text>
              <Text style={styles.targetValue}>{challenge.targetValue} {challenge.targetUnit}</Text>
            </View>
          )}
        </View>

        {/* Streak status */}
        {streak && (
          <View style={styles.streakSection}>
            <Text style={styles.sectionTitle}>Your Streak</Text>
            <View style={styles.streakBar}>
              {Array.from({ length: 7 }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.streakDay, i < (streak.currentStreak % 7) && styles.streakDayFilled]}
                />
              ))}
            </View>
            <Text style={styles.streakCount}>
              🔥 {streak.currentStreak} days current streak (best: {streak.longestStreak})
            </Text>
          </View>
        )}

        {/* Verification info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How to verify</Text>
          <View style={styles.verifyCard}>
            <Text style={styles.verifyIcon}>
              {challenge.verification === 'sensor' ? '📱' :
               challenge.verification === 'video' ? '🎬' :
               challenge.verification === 'ai' ? '🤖' :
               challenge.verification === 'peer' ? '👥' : '✅'}
            </Text>
            <View style={styles.verifyInfo}>
              <Text style={styles.verifyType}>{challenge.verification?.toUpperCase()} Verified</Text>
              <Text style={styles.verifyDesc}>
                {challenge.verification === 'sensor' && 'Uses your phone sensors (pedometer, accelerometer)'}
                {challenge.verification === 'video' && 'Record a video proof — AI will verify your form'}
                {challenge.verification === 'ai' && 'AI pose estimation analyzes your movement'}
                {challenge.verification === 'peer' && 'Community members review your submission'}
                {challenge.verification === 'self' && 'Self-reported — honor system with fraud detection'}
              </Text>
            </View>
          </View>
        </View>

        {/* Step tracking widget */}
        {challenge.verification === 'sensor' && challenge.targetUnit === 'steps' && (
          <View style={styles.section}>
            {trackingSteps ? (
              <View style={styles.trackingCard}>
                <Text style={styles.trackingSteps}>{currentSteps}</Text>
                <Text style={styles.trackingLabel}>steps of {challenge.targetValue}</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${Math.min((currentSteps / (challenge.targetValue || 1)) * 100, 100)}%` }]} />
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.startTrackBtn} onPress={handleStartStepTracking}>
                <Text style={styles.startTrackText}>📱 Start Step Tracking</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Submit CTA */}
      <View style={[styles.submitBar, { paddingBottom: insets.bottom + 12 }]}>
        {challenge.verification === 'video' || challenge.verification === 'ai' ? (
          <TouchableOpacity style={styles.submitBtn} onPress={handleVideoProof} disabled={submitting || submitMutation.isPending}>
            <LinearGradient colors={['#FF6B2B', '#E84040']} style={styles.submitGradient}>
              {(submitting || submitMutation.isPending) ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>🎬 Record & Submit Proof</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSelfReport}
            disabled={submitMutation.isPending}
          >
            <LinearGradient colors={['#FF6B2B', '#E84040']} style={styles.submitGradient}>
              {submitMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>✅ Mark as Complete</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  loader: { flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' },
  header: { padding: 20, paddingTop: 16 },
  backBtn: { marginBottom: 16 },
  backIcon: { color: '#fff', fontSize: 22 },
  category: { color: '#FF6B2B', fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 6 },
  title: { color: '#fff', fontSize: 26, fontWeight: '900', marginBottom: 14, lineHeight: 32 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  diffBadge: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5 },
  diffText: { fontWeight: '700', fontSize: 12 },
  rewardChip: { backgroundColor: '#FFD70022', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 4 },
  rewardPi: { color: '#FFD700', fontWeight: '900', fontSize: 15 },
  rewardLabel: { color: '#FFD70088', fontSize: 11 },
  streakChip: { backgroundColor: '#FF6B2B22', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5 },
  streakText: { color: '#FF6B2B', fontWeight: '700', fontSize: 12 },
  section: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#111' },
  sectionTitle: { color: '#FFFFFF77', fontSize: 12, fontWeight: '700', letterSpacing: 1.5, marginBottom: 12 },
  description: { color: '#FFFFFFCC', fontSize: 15, lineHeight: 22 },
  targetCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#141414', borderRadius: 12, padding: 14, marginTop: 12 },
  targetLabel: { color: '#FFFFFF66', fontSize: 13 },
  targetValue: { color: '#FF6B2B', fontWeight: '800', fontSize: 16 },
  streakSection: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#111' },
  streakBar: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  streakDay: { flex: 1, height: 8, borderRadius: 4, backgroundColor: '#222' },
  streakDayFilled: { backgroundColor: '#FF6B2B' },
  streakCount: { color: '#FFFFFF77', fontSize: 13 },
  verifyCard: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  verifyIcon: { fontSize: 36 },
  verifyInfo: {},
  verifyType: { color: '#fff', fontWeight: '700', fontSize: 14, marginBottom: 4 },
  verifyDesc: { color: '#FFFFFF66', fontSize: 13, lineHeight: 19 },
  startTrackBtn: { backgroundColor: '#FF6B2B22', borderWidth: 1.5, borderColor: '#FF6B2B', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  startTrackText: { color: '#FF6B2B', fontWeight: '700', fontSize: 16 },
  trackingCard: { backgroundColor: '#141414', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#FF6B2B33' },
  trackingSteps: { color: '#FF6B2B', fontSize: 52, fontWeight: '900' },
  trackingLabel: { color: '#FFFFFF66', fontSize: 14, marginBottom: 14 },
  progressBar: { width: '100%', height: 8, backgroundColor: '#222', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#FF6B2B', borderRadius: 4 },
  submitBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: '#0A0A0ACC' },
  submitBtn: { borderRadius: 16, overflow: 'hidden' },
  submitGradient: { paddingVertical: 18, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 17 },
});
