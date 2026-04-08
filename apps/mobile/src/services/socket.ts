import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../store/auth.store';

// ⚠️  UPDATE: Set EXPO_PUBLIC_WS_BASE in .env  e.g. wss://api.spyce.app
const WS_BASE = process.env.EXPO_PUBLIC_WS_BASE || 'ws://localhost:4000';

let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket> {
  if (socket?.connected) return socket;
  const jwt = await SecureStore.getItemAsync('spyce_jwt');
  socket = io(WS_BASE, {
    auth: { token: jwt },
    transports: ['websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => console.log('Socket connected'));
  socket.on('disconnect', (reason) => console.log('Socket disconnected', reason));
  socket.on('pi:earned', ({ amount, type, total_balance }) => {
    useAuthStore.getState().updateUser({ piBalance: total_balance / 1_000_000 });
  });

  return socket;
}

export function getSocket() { return socket; }

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function joinVideoRoom(videoId: string) {
  socket?.emit('join', { videoId });
}

export function joinLiveRoom(liveStreamId: string) {
  socket?.emit('join', { liveStreamId });
}

export function onPiEarned(cb: (data: any) => void) {
  socket?.on('pi:earned', cb);
  return () => socket?.off('pi:earned', cb);
}

export function onChallengeVerified(cb: (data: any) => void) {
  socket?.on('challenge:verified', cb);
  return () => socket?.off('challenge:verified', cb);
}

export function onLiveChatMessage(cb: (data: any) => void) {
  socket?.on('live:chat_message', cb);
  return () => socket?.off('live:chat_message', cb);
}

export function onLiveGift(cb: (data: any) => void) {
  socket?.on('live:gift', cb);
  return () => socket?.off('live:gift', cb);
}