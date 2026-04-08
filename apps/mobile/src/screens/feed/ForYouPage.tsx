import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { VideoCard } from '../../components/video/VideoCard';
import { FeedHeader } from '../../components/ui/FeedHeader';
import { PiCoinBurstOverlay } from '../../components/3d/PiCoinBurstOverlay';
import { useRealtimeSocket } from '../../hooks/useRealtimeSocket';
import { useUIStore } from '../../store';
import { getAuthenticatedClient } from '../../services/api';
import { gql } from 'graphql-request';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const FOR_YOU_FEED_QUERY = gql`
  query ForYouFeed($cursor: String, $limit: Int) {
    forYouFeed(cursor: $cursor, limit: $limit) {
      id
      title
      description
      hlsUrl
      thumbnailUrl
      durationSecs
      viewCount
      likeCount
      commentCount
      shareCount
      hasLiked
      hashtags
      publishedAt
      user {
        id
        piUsername
        displayName
        avatarUrl
        isVerified
        spyceScore
      }
      sound {
        id
        title
        artist
      }
    }
  }
`;

export default function ForYouPage() {
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlashList<any>>(null);
  const piCoinBurst = useUIStore((s) => s.piCoinBurstTrigger);

  // Connect realtime socket
  useRealtimeSocket();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ['fyp-feed'],
      queryFn: async ({ pageParam }) => {
        const client = await getAuthenticatedClient();
        return client.request(FOR_YOU_FEED_QUERY, {
          cursor: pageParam,
          limit: 10,
        });
      },
      getNextPageParam: (lastPage: any) => {
        const videos = lastPage.forYouFeed;
        return videos.length > 0 ? videos[videos.length - 1].id : undefined;
      },
      initialPageParam: undefined,
    });

  const videos = data?.pages.flatMap((p: any) => p.forYouFeed) || [];

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: any) => {
      if (viewableItems.length > 0) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const renderVideo = useCallback(
    ({ item, index }: { item: any; index: number }) => (
      <VideoCard
        video={item}
        isActive={index === activeIndex}
        height={SCREEN_HEIGHT}
      />
    ),
    [activeIndex],
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B2B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Feed Header - For You / Following tabs */}
      <FeedHeader style={{ paddingTop: insets.top + 8 }} />

      {/* Main video feed */}
      <FlashList
        ref={listRef}
        data={videos}
        renderItem={renderVideo}
        estimatedItemSize={SCREEN_HEIGHT}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        keyExtractor={(item) => item.id}
      />

      {/* Pi coin burst animation overlay */}
      {piCoinBurst && (
        <PiCoinBurstOverlay
          key={piCoinBurst.key}
          amount={piCoinBurst.amount}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
