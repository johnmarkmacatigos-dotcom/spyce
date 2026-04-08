import { create } from 'zustand';

interface Video {
  id: string;
  user: any;
  title?: string;
  hlsUrl: string;
  thumbnailUrl: string;
  durationSecs: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  hasLiked: boolean;
  hashtags: string[];
  sound?: any;
  isChallenge: boolean;
}

interface FeedState {
  videos: Video[];
  currentIndex: number;
  isLoading: boolean;
  setVideos: (videos: Video[]) => void;
  appendVideos: (videos: Video[]) => void;
  setCurrentIndex: (index: number) => void;
  updateVideoLike: (videoId: string, hasLiked: boolean, likeCount: number) => void;
  setLoading: (loading: boolean) => void;
}

export const useFeedStore = create<FeedState>((set) => ({
  videos: [],
  currentIndex: 0,
  isLoading: false,

  setVideos: (videos) => set({ videos }),
  appendVideos: (videos) => set((state) => ({ videos: [...state.videos, ...videos] })),
  setCurrentIndex: (index) => set({ currentIndex: index }),

  updateVideoLike: (videoId, hasLiked, likeCount) =>
    set((state) => ({
      videos: state.videos.map((v) =>
        v.id === videoId ? { ...v, hasLiked, likeCount } : v,
      ),
    })),

  setLoading: (isLoading) => set({ isLoading }),
}));
