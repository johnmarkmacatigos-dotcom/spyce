import React, { useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
  Dimensions, Platform,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { apiPost } from '../../services/api';

const { width, height } = Dimensions.get('window');
const MAX_DURATION = 60; // 60 seconds

export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [uploading, setUploading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const startRecording = async () => {
    if (!cameraRef.current) return;
    setIsRecording(true);
    setRecordDuration(0);

    timerRef.current = setInterval(() => {
      setRecordDuration((d) => {
        if (d >= MAX_DURATION) { stopRecording(); return d; }
        return d + 1;
      });
    }, 1000);

    try {
      const video = await cameraRef.current.recordAsync({ maxDuration: MAX_DURATION });
      if (video) await uploadVideo(video.uri);
    } catch (err: any) {
      Alert.alert('Recording Error', err.message);
    }
  };

  const stopRecording = () => {
    cameraRef.current?.stopRecording();
    clearInterval(timerRef.current);
    setIsRecording(false);
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      videoMaxDuration: MAX_DURATION,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      await uploadVideo(result.assets[0].uri);
    }
  };

  const uploadVideo = async (uri: string) => {
    setUploading(true);
    try {
      // 1. Get presigned S3 URL
      const filename = `video_${Date.now()}.mp4`;
      const { videoId, uploadUrl } = await apiPost('/videos/upload-url', {
        filename,
        contentType: 'video/mp4',
      });

      // 2. Upload directly to S3
      const fileRes = await fetch(uri);
      const blob = await fileRes.blob();
      await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': 'video/mp4' },
      });

      // 3. Navigate to publish screen
      router.push(`/video/publish?videoId=${videoId}`);
    } catch (err: any) {
      Alert.alert('Upload Failed', 'Could not upload video. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permText}>Camera access needed to record videos</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const progress = (recordDuration / MAX_DURATION) * width;

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        mode="video"
      />

      {/* Progress bar */}
      {isRecording && (
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: progress }]} />
        </View>
      )}

      {/* Top controls */}
      <View style={[styles.topControls, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Text style={styles.iconBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.recordTimer}>
          {isRecording ? `${recordDuration}s / ${MAX_DURATION}s` : 'Record'}
        </Text>
        <TouchableOpacity onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')} style={styles.iconBtn}>
          <Text style={styles.iconBtnText}>⇄</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom controls */}
      <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 20 }]}>
        {/* Gallery picker */}
        <TouchableOpacity style={styles.galleryBtn} onPress={pickFromGallery}>
          <Text style={styles.galleryIcon}>🖼️</Text>
          <Text style={styles.galleryText}>Gallery</Text>
        </TouchableOpacity>

        {/* Record button */}
        <TouchableOpacity
          style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={[styles.recordInner, isRecording && styles.recordInnerActive]} />
          )}
        </TouchableOpacity>

        {/* Speed selector */}
        <View style={styles.speedWrap}>
          {['0.5x', '1x', '2x'].map((s) => (
            <TouchableOpacity key={s} style={styles.speedBtn}>
              <Text style={styles.speedText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {uploading && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator color="#FF6B2B" size="large" />
          <Text style={styles.uploadingText}>Uploading video...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permissionContainer: { flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center', padding: 40 },
  permText: { color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 24 },
  permBtn: { backgroundColor: '#FF6B2B', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 },
  permBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  progressBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: '#FFFFFF22' },
  progressFill: { height: 3, backgroundColor: '#FF6B2B' },
  topControls: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  iconBtn: { backgroundColor: '#00000066', borderRadius: 20, padding: 10 },
  iconBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  recordTimer: { color: '#fff', fontWeight: '700', fontSize: 15 },
  bottomControls: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 24 },
  galleryBtn: { alignItems: 'center', gap: 4 },
  galleryIcon: { fontSize: 28 },
  galleryText: { color: '#fff', fontSize: 11 },
  recordBtn: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  recordBtnActive: { borderColor: '#FF6B2B' },
  recordInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FF6B2B' },
  recordInnerActive: { borderRadius: 8, width: 40, height: 40, backgroundColor: '#E84040' },
  speedWrap: { alignItems: 'center', gap: 4 },
  speedBtn: { padding: 4 },
  speedText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  uploadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000CC', alignItems: 'center', justifyContent: 'center', gap: 16 },
  uploadingText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
