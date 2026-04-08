// ============================================================
// SPYCE - Feed Page (TikTok-style vertical scroll)
// ============================================================
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useFeedStore, useAuthStore } from '../utils/store';
import VideoSlide from '../components/feed/VideoSlide';
import FeedHeader from '../components/feed/FeedHeader';
import LoadingScreen from '../components/ui/LoadingScreen';

export default function FeedPage() {
  const { videos, currentIndex, isLoading, hasMore, loadMore, setCurrentIndex, feedType } = useFeedStore();
  const containerRef = useRef(null);
  const observerRef = useRef(null);

  // Initial load
  useEffect(() => {
    if (videos.length === 0) {
      loadMore();
    }
  }, [feedType]);

  // Reload when feed type changes
  useEffect(() => {
    loadMore();
  }, [feedType]);

  // Intersection observer for infinite scroll + current video tracking
  useEffect(() => {
    if (!containerRef.current) return;

    const slides = containerRef.current.querySelectorAll('.video-slide');
    
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          const index = parseInt(entry.target.dataset.index);
          setCurrentIndex(index);

          // Load more when near end
          if (index >= videos.length - 3 && hasMore && !isLoading) {
            loadMore();
          }
        }
      });
    }, { threshold: 0.5 });

    slides.forEach(slide => observerRef.current.observe(slide));

    return () => observerRef.current?.disconnect();
  }, [videos.length, hasMore, isLoading]);

  if (isLoading && videos.length === 0) {
    return <LoadingScreen />;
  }

  if (!isLoading && videos.length === 0) {
    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '24px',
        textAlign: 'center',
      }}>
        <span style={{ fontSize: '48px' }}>🌶️</span>
        <h2 style={{ fontFamily: 'var(--font-display)' }}>No videos yet</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {feedType === 'following'
            ? 'Follow some creators to see their videos here!'
            : 'Be the first to post a SPYCE video!'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height: '100dvh', overflow: 'hidden' }}>
      <FeedHeader />

      <div
        ref={containerRef}
        className="feed-container"
        style={{ height: '100dvh' }}
      >
        {videos.map((video, index) => (
          <div
            key={video.id}
            className="video-slide"
            data-index={index}
          >
            <VideoSlide
              video={video}
              isActive={index === currentIndex}
              index={index}
            />
          </div>
        ))}

        {/* Loading indicator at bottom */}
        {isLoading && (
          <div style={{
            height: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            scrollSnapAlign: 'start',
          }}>
            <div style={{
              width: '40px', height: '40px',
              border: '3px solid var(--border)',
              borderTopColor: 'var(--brand-red)',
              borderRadius: '50%',
            }} className="animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
