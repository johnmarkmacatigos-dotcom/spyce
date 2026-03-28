import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { WS_URL, TokenStore } from '../services/api';
import { useAuthStore, usePiEarnStore, useUIStore } from '../store';
import * as Haptics from 'expo-haptics';

let globalSocket: Socket | null = null;

export function useRealtimeSocket() {
  const user = useAuthStore((s) => s.user);
  const updateBalance = useAuthStore((s) => s.updateBalance);
  const addEarn = usePiEarnStore((s) => s.addEarn);
  const triggerBurst = useUIStore((s) => s.triggerPiCoinBurst);

  useEffect(() => {
    if (!user?.id) return;

    const connectSocket = async () => {
      const jwt = await TokenStore.getJwt();
      if (!jwt) return;

      // Reuse existing socket or create new
      if (!globalSocket || globalSocket.disconnected) {
        globalSocket = io(`${WS_URL}/realtime`, {
          auth: { token: jwt },
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 2000,
        });
      }

      const socket = globalSocket;

      socket.on('connect', () => {
        console.log('🔌 Realtime connected');
        // Join personal room
        socket.emit('join', { userId: user.id });
      });

      // Pi earned — update balance and trigger animation
      socket.on('pi:earned', ({ amount, type, totalBalance }) => {
        updateBalance(totalBalance);
        addEarn(amount, type);
        triggerBurst(amount);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      });

      socket.on('disconnect', () => {
        console.log('🔌 Realtime disconnected');
      });

      socket.on('connect_error', (err) => {
        console.error('Realtime connection error:', err.message);
      });
    };

    connectSocket();

    return () => {
      // Don't disconnect on unmount — keep socket alive across navigation
      // globalSocket?.off() to remove specific listeners if needed
    };
  }, [user?.id]);

  return globalSocket;
}

export function useLiveStreamSocket(streamId: string | null) {
  const socketRef = useRef<Socket | null>(globalSocket);

  useEffect(() => {
    if (!streamId || !globalSocket) return;

    globalSocket.emit('join', { liveStreamId: streamId });

    return () => {
      globalSocket?.emit('leave', { liveStreamId: streamId });
    };
  }, [streamId]);

  const sendChat = (message: string) => {
    if (!streamId || !globalSocket) return;
    globalSocket.emit('live:chat', { streamId, message });
  };

  return { sendChat };
}

export function useVideoSocket(videoId: string | null) {
  useEffect(() => {
    if (!videoId || !globalSocket) return;
    globalSocket.emit('join', { videoId });

    return () => {
      globalSocket?.emit('leave', { videoId });
    };
  }, [videoId]);
}
