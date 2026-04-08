import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, FlatList, Dimensions, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import { VideoCard } from '../components/video/VideoCard';
import { PiEarnToast } from '../components/earnings/PiEarnToast';
import { useAuthStore } from '../store/auth.store';
import { connectSocket, onPiEarned } from '../services/socket';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function FeedScreen({ navigation }: any) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [piToast, setPiToast] = useState<{ amount: number; type: string } | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const { user } = useAuthStore();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['fyp-feed'],
    queryFn: async ({ pageParam }) => {
      const res = await apiClient.get('/feed/fyp', { params: { cursor: pageParam, limit: 10 } });
      return res.data;
    },
    getNextPageParam: (lastPage) => lastPage[lastPage.length - 1]?.id,
    initialPageParam: undefined,
  });

  const videos = data?.pages.flatMap((p: any[]) => p) ?? [];

  useEffect(() => {
    connectSocket();
    const unsub = onPiEarned((data) => {
      setPiToast({ amount: data.amount, type: data.type });
      setTimeout(() => setPiToast(null), 3000);
    });
    return unsub;
  }, []);

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index ?? 0);
    }
  }, []);

  const onEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  if (isLoading) {
    return <View style={styles.loader}><ActivityIndicator size="large" color="#FF6B2B" /></View>;
  }

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <FlatList
        ref={flatListRef}
        data={videos}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item, index }) => (
          <VideoCard
            video={item}
            isActive={index === activeIndex}
            onOpenComments={() => navigation.push('Comments', { videoId: item.id })}
            onUserPress={() => navigation.push('UserProfile', { userId: item.user.id })}
          />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        getItemLayout={(_, index) => ({ length: SCREEN_HEIGHT, offset: SCREEN_HEIGHT * index, index })}
        removeClippedSubviews
        maxToRenderPerBatch={3}
        windowSize={5}
      />
      {piToast && <PiEarnToast amount={piToast.amount} type={piToast.type} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
});