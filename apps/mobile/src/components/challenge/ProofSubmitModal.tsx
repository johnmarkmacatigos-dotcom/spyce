import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Pedometer } from 'expo-sensors';
import { api } from '../../services/api';

interface Props {
  visible: boolean;
  challenge: any;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

export function ProofSubmitModal({ visible, challenge, onClose, onSubmit, isLoading }: Props) {
  const [mode, setMode] = useState<'choose' | 'sensor' | 'video' | 'self'>('choose');
  const [sensorValue, setSensorValue] = useState<number | null>(null);

  if (!challenge) return null;

  const handleSelfReport = () => {
    onSubmit({ proofType: 'self' });
  };

  const handleSensorData = async () => {
    setMode('sensor');
    if (challenge.targetUnit === 'steps') {
      const end = new Date();
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const result = await Pedometer.getStepCountAsync(start, end);
      setSensorValue(result.steps);
      onSubmit({ proofType: 'sensor', sensorData: { steps: result.steps, value: result.steps, unit: 'steps' } });
    }
  };

  const handleVideoProof = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Camera permission needed'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, videoMaxDuration: 60, quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      // Upload video proof
      const asset = result.assets[0];
      const uploadRes = await api.videos.getUploadUrl(`proof_${Date.now()}.mp4`, 'video/mp4');
      const { uploadUrl, rawKey } = uploadRes.data;
      await fetch(uploadUrl, { method: 'PUT', body: { uri: asset.uri } as any, headers: { 'Content-Type': 'video/mp4' } });
      onSubmit({ proofType: challenge.verification === 'ai' ? 'ai' : 'video', proofUrl: rawKey });
    }
  };

  const piReward = Number(challenge.piReward) / 1_000_000;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.handle} />
        <Text style={styles.title}>{challenge.title}</Text>
        <Text style={styles.reward}>Earn +{piReward.toFixed(3)} π</Text>
        <Text style={styles.desc}>{challenge.description}</Text>

        <View style={styles.options}>
          {challenge.verification === 'self' && (
            <TouchableOpacity style={styles.optionBtn} onPress={handleSelfReport} disabled={isLoading}>
              <Text style={styles.optionIcon}>✅</Text>
              <Text style={styles.optionTitle}>I did it!</Text>
              <Text style={styles.optionSub}>Self-report completion</Text>
            </TouchableOpacity>
          )}

          {challenge.verification === 'sensor' && (
            <TouchableOpacity style={styles.optionBtn} onPress={handleSensorData} disabled={isLoading}>
              <Text style={styles.optionIcon}>📱</Text>
              <Text style={styles.optionTitle}>Read from sensor</Text>
              <Text style={styles.optionSub}>Uses phone pedometer / health data</Text>
            </TouchableOpacity>
          )}

          {(challenge.verification === 'ai' || challenge.verification === 'video') && (
            <TouchableOpacity style={styles.optionBtn} onPress={handleVideoProof} disabled={isLoading}>
              <Text style={styles.optionIcon}>🎥</Text>
              <Text style={styles.optionTitle}>Record video proof</Text>
              <Text style={styles.optionSub}>AI will verify your form</Text>
            </TouchableOpacity>
          )}

          {challenge.verification === 'peer' && (
            <TouchableOpacity style={styles.optionBtn} onPress={handleVideoProof} disabled={isLoading}>
              <Text style={styles.optionIcon}>👥</Text>
              <Text style={styles.optionTitle}>Submit for peer review</Text>
              <Text style={styles.optionSub}>3 community members will verify</Text>
            </TouchableOpacity>
          )}
        </View>

        {isLoading && <ActivityIndicator color="#FF6B2B" size="large" style={{ marginTop: 20 }} />}

        <TouchableOpacity style={styles.closeBtn} onPress={onClose} disabled={isLoading}>
          <Text style={styles.closeBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111', padding: 24 },
  handle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  reward: { color: '#FF6B2B', fontSize: 20, fontWeight: '700', textAlign: 'center', marginVertical: 8 },
  desc: { color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  options: { gap: 12 },
  optionBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,107,43,0.3)' },
  optionIcon: { fontSize: 40, marginBottom: 8 },
  optionTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  optionSub: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 },
  closeBtn: { marginTop: 20, padding: 16, alignItems: 'center' },
  closeBtnText: { color: 'rgba(255,255,255,0.5)', fontSize: 15 },
});