import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Video from 'react-native-video';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import FastImage from 'react-native-fast-image';
import { io, Socket } from 'socket.io-client';
import { apiGet, apiPost, API_BASE, getAuthToken } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { payWithPi } from '../../services/piAuth';

const { width, height } = Dimensions.get('window');

const GIFT_AMOUNTS = [
  { label: '🎁 0.01 π', amount: 0.01, animation: 'gift_small' },
  { label: '💎 0.1 π',  amount: 0.1,  animation: 'gift_diamond' },
  { label: '🚀 1 π',    amount: 1,    animation: 'gift_rocket' },
  { label: '🔥 10 π',   amount: 10,   animation: 'gift_fire' },
];

interface ChatMessage {
  user: { id: string; piUsername: string; avatarUrl?: string };
  message: string;
  timestamp: string;
}

export default function LiveScreen() {
  const { id: streamId } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user: me } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [viewerCount, setViewerCount] = useState(0);
  const [lastGift, setLastGift] = useState<any>(null);
  const socketRef = useRef<Socket>();
  const chatListRef = useRef<FlatList>(null);

  const { data: stream } = useQuery({
    queryKey: ['stream', streamId],
    queryFn: () => apiGet(`/live/${streamId}`),
    enabled: !!streamId,
  });

  useEffect(() => {
    if (!streamId) return;

    const connectSocket = async () => {
      const token = await getAuthToken();
      const socket = io(`${API_BASE}/ws`, {
        auth: { token },
        transports: ['websocket'],
      });

      socket.emit('join', { userId: me?.id, liveStreamId: streamId });

      socket.on('live:chat_message', (msg: ChatMessage) => {
        setMessages((prev) => [...prev.slice(-99), msg]);
        chatListRef.current?.scrollToEnd({ animated: true });
      });

      socket.on('live:viewer_count', ({ count }: { count: number }) => {
        setViewerCount(count);
      });

      socket.on('live:gift', (gift: any) => {
        setLastGift(gift);
        setTimeout(() => setLastGift(null), 4000);
      });

      socketRef.current = socket;
    };

    connectSocket();
    return () => socketRef.current?.disconnect();
  }, [streamId, me?.id]);

  const sendMessage = async () => {
    if (!chatInput.trim() || !streamId) return;
    try {
      await apiPost(`/live/${streamId}/chat`, { message: chatInput });
      setChatInput('');
    } catch { /* silent */ }
  };

  const sendGift = async (amount: number, animation: string) => {
    if (!streamId) return;
    try {
      const result = await payWithPi({
        amount,
        memo: `🎁 SPYCE Live Gift to ${stream?.user?.piUsername}`,
        metadata: { type: 'live_gift', streamId, animation },
      });
      if (result.success) {
        await apiPost(`/live/${streamId}/gift`, { amountPi: amount, animation });
      }
    } catch (err) {
      console.error('Gift failed:', err);
    }
  };

  if (!stream) return null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Live Video Player */}
      <Video
        source={{ uri: stream.playbackUrl }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        paused={false}
        muted={false}
      />

      {/* Overlay */}
      <View style={[styles.overlay, { paddingTop: insets.top + 8 }]}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <View style={styles.viewerCount}>
            <Text style={styles.viewerIcon}>👁️</Text>
            <Text style={styles.viewerText}>{viewerCount}</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Streamer info */}
        <View style={styles.streamerRow}>
          <FastImage
            source={{ uri: stream.user?.avatarUrl || `https://ui-avatars.com/api/?name=${stream.user?.displayName}&background=FF6B2B&color=fff` }}
            style={styles.streamerAvatar}
          />
          <View>
            <Text style={styles.streamerName}>{stream.user?.displayName}</Text>
            <Text style={styles.streamTitle} numberOfLines={1}>{stream.title}</Text>
          </View>
        </View>

        {/* Gift animation */}
        {lastGift && (
          <View style={styles.giftOverlay}>
            <Text style={styles.giftAnim}>🎁</Text>
            <Text style={styles.giftFrom}>@{lastGift.fromUser?.piUsername}</Text>
            <Text style={styles.giftAmt}>sent π{lastGift.amount}</Text>
          </View>
        )}

        {/* Chat messages */}
        <FlatList
          ref={chatListRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          style={styles.chatList}
          renderItem={({ item }) => (
            <View style={styles.chatMsg}>
              <Text style={styles.chatUser}>@{item.user.piUsername}</Text>
              <Text style={styles.chatText}> {item.message}</Text>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />

        {/* Gift buttons */}
        <View style={styles.giftRow}>
          {GIFT_AMOUNTS.map((g) => (
            <TouchableOpacity key={g.label} style={styles.giftBtn} onPress={() => sendGift(g.amount, g.animation)}>
              <Text style={styles.giftBtnText}>{g.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Chat input */}
        <View style={[styles.chatInputRow, { paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            style={styles.chatInput}
            value={chatInput}
            onChangeText={setChatInput}
            placeholder="Say something..."
            placeholderTextColor="#FFFFFF44"
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
            <Text style={styles.sendIcon}>↗️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, backgroundColor: 'transparent' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E84040', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  liveText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  viewerCount: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#00000066', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  viewerIcon: { fontSize: 12 },
  viewerText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  closeBtn: { marginLeft: 'auto', backgroundColor: '#00000066', borderRadius: 16, padding: 8 },
  closeIcon: { color: '#fff', fontSize: 16 },
  streamerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 12 },
  streamerAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#FF6B2B' },
  streamerName: { color: '#fff', fontWeight: '700', fontSize: 14 },
  streamTitle: { color: '#FFFFFF88', fontSize: 12 },
  giftOverlay: { position: 'absolute', left: 16, top: height * 0.35, backgroundColor: '#FF6B2B', borderRadius: 14, padding: 12, alignItems: 'center' },
  giftAnim: { fontSize: 36 },
  giftFrom: { color: '#fff', fontWeight: '700', fontSize: 12 },
  giftAmt: { color: '#ffffffcc', fontSize: 11 },
  chatList: { flex: 1, paddingHorizontal: 12, marginTop: 8 },
  chatMsg: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4, backgroundColor: '#00000066', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  chatUser: { color: '#FF6B2B', fontWeight: '700', fontSize: 13 },
  chatText: { color: '#fff', fontSize: 13 },
  giftRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 8 },
  giftBtn: { flex: 1, backgroundColor: '#FF6B2B22', borderWidth: 1, borderColor: '#FF6B2B44', borderRadius: 10, paddingVertical: 7, alignItems: 'center' },
  giftBtnText: { color: '#FF6B2B', fontWeight: '700', fontSize: 10 },
  chatInputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 },
  chatInput: { flex: 1, backgroundColor: '#00000088', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#FFFFFF22' },
  sendBtn: { backgroundColor: '#FF6B2B', borderRadius: 20, width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  sendIcon: { fontSize: 18 },
});
