import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  View, StyleSheet, Dimensions, FlatList, ViewToken,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useFeedStore } from '../../store/feedStore';
import { useAuthStore } from '../../store/authStore';
import { apiGet, apiPost } from '../../services/api';
import VideoCard from '../../components/video/VideoCard';
import FeedSidebar from '../../components/video/FeedSidebar';

const { height, width } = Dimensions.get('window');

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const [cursor, setCursor] = useState<string | undefined>();
  const flatListRef = useRef<FlatList>(null);
  const { videos, setVideos, appendVideos, updateVideoLike, setLoading, isLoading } = useFeedStore();
  const { user } = useAuthStore();

  const { refetch } = useQuery({
    queryKey: ['fyp', cursor],
    queryFn: async () => {
      const data = await apiGet(`/feed/fyp${cursor ? `?cursor=${cursor}` : ''}`);
      if (!cursor) setVideos(data);
      else appendVideos(data);
      return data;
    },
    enabled: !!user,
  });

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        const idx = viewableItems[0].index ?? 0;
        setActiveIndex(idx);
        // Load more when near end
        if (idx >= videos.length - 3) {
          const last = videos[videos.length - 1];
          if (last) setCursor(last.id);
        }
        // Watch-to-earn: track when user watches a video
        const video = videos[idx];
        if (video) trackWatchSession(video.id);
      }
    },
    [videos],
  );

  const trackWatchSession = async (videoId: string) => {
    try {
      await apiPost('/videos/watch', { videoId });
    } catch { /* silent */ }
  };

  const handleLike = useCallback(
    async (videoId: string, currentlyLiked: boolean) => {
      try {
        const { reacted, likeCount } = await apiPost(`/videos/${videoId}/react`, { type: 'like' });
        updateVideoLike(videoId, reacted, likeCount);
      } catch { /* silent */ }
    },
    [updateVideoLike],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => (
      <View style={{ width, height }}>
        <VideoCard
          video={item}
          isActive={index === activeIndex}
          onLike={() => handleLike(item.id, item.hasLiked)}
        />
        <FeedSidebar video={item} onLike={() => handleLike(item.id, item.hasLiked)} />
      </View>
    ),
    [activeIndex, handleLike, width, height],
  );

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <FlatList
        ref={flatListRef}
        data={videos}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        ListFooterComponent={isLoading ? <ActivityIndicator color="#FF6B2B" style={{ padding: 20 }} /> : null}
        removeClippedSubviews
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={2}
        getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
});
