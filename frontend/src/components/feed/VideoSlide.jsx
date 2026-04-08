// ============================================================
// SPYCE - VideoSlide Component
// The core full-screen video experience
// ============================================================
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFeedStore, useAuthStore } from '../../utils/store';
import { usePi } from '../../hooks/usePi';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import TipModal from './TipModal';
import CommentsDrawer from './CommentsDrawer';

export default function VideoSlide({ video, isActive, index }) {
  const videoRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { toggleLike } = useFeedStore();
  const { tipCreator } = usePi();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isLiked, setIsLiked] = useState(video.isLiked);
  const [likesCount, setLikesCount] = useState(video.likesCount || 0);
  const [heartAnim, setHeartAnim] = useState(false);
  const lastTap = useRef(0);

  // Play/pause based on visibility
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (isActive) {
      v.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      v.pause();
      v.currentTime = 0;
      setIsPlaying(false);
    }
  }, [isActive]);

  // Tap to play/pause; double tap to like
  const handleTap = useCallback((e) => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTap.current;

    if (timeSinceLastTap < 300) {
      // Double tap — like
      handleDoubleTapLike();
    } else {
      // Single tap — play/pause
      setTimeout(() => {
        if (Date.now() - now >= 250) {
          handleTogglePlay();
        }
      }, 260);
    }

    lastTap.current = now;
  }, [isLiked]);

  const handleTogglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const handleDoubleTapLike = () => {
    if (!isLiked) {
      handleLike();
    }
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 800);
  };

  const handleLike = async () => {
    const newIsLiked = !isLiked;
    const newCount = newIsLiked ? likesCount + 1 : Math.max(0, likesCount - 1);
    setIsLiked(newIsLiked);
    setLikesCount(newCount);
    toggleLike(video.id, newIsLiked, newCount);

    try {
      await api.post(`/videos/${video.id}/like`);
    } catch {
      // Revert on error
      setIsLiked(!newIsLiked);
      setLikesCount(likesCount);
      toggleLike(video.id, !newIsLiked, likesCount);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `Watch @${video.creator?.piUsername} on SPYCE`,
      text: video.description || 'Check out this SPYCE video!',
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        await api.post(`/videos/${video.id}/share`).catch(() => {});
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied!');
      }
    } catch {}
  };

  const handleTip = async (amount) => {
    setShowTip(false);
    const result = await tipCreator(amount, video.creator._id, video.id);
    if (result) {
      toast.success(`Tipped ${amount}π to @${video.creator?.piUsername}! 🎉`);
    }
  };

  const goToProfile = () => navigate(`/profile/${video.creator?.piUsername}`);

  const formatCount = (n) => {
    if (!n) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  };

  return (
    <div style={{
      width: '100%',
      height: '100dvh',
      position: 'relative',
      background: '#000',
      overflow: 'hidden',
    }}>
      {/* Video Element */}
      <video
        ref={videoRef}
        src={video.videoUrl}
        poster={video.thumbnailUrl}
        loop
        playsInline
        muted={isMuted}
        onClick={handleTap}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          position: 'absolute',
          inset: 0,
        }}
      />

      {/* Double tap heart animation */}
      {heartAnim && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '80px',
          animation: 'heartPop 0.6s ease forwards',
          pointerEvents: 'none',
          zIndex: 20,
        }}>❤️</div>
      )}

      {/* Play/Pause indicator */}
      {!isPlaying && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.5)',
          borderRadius: '50%',
          width: '64px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          pointerEvents: 'none',
          zIndex: 10,
        }}>▶️</div>
      )}

      {/* Gradient overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 40%, transparent 70%, rgba(0,0,0,0.3) 100%)',
        pointerEvents: 'none',
      }} />

      {/* ── Right Action Bar ─────────────────────────── */}
      <div style={{
        position: 'absolute',
        right: '12px',
        bottom: '120px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        zIndex: 10,
      }}>

        {/* Creator Avatar */}
        <div onClick={goToProfile} style={{ position: 'relative', cursor: 'pointer' }}>
          {video.creator?.avatar ? (
            <img
              src={video.creator.avatar}
              alt="creator"
              className="avatar"
              style={{ width: '48px', height: '48px', border: '2px solid white' }}
            />
          ) : (
            <div className="avatar-placeholder" style={{ width: '48px', height: '48px', fontSize: '18px' }}>
              {(video.creator?.displayName || video.creator?.piUsername || '?')[0].toUpperCase()}
            </div>
          )}
          <div style={{
            position: 'absolute',
            bottom: '-8px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--brand-gradient)',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
          }}>+</div>
        </div>

        {/* Like */}
        <ActionBtn
          icon={isLiked ? '❤️' : '🤍'}
          count={formatCount(likesCount)}
          onClick={handleLike}
          active={isLiked}
        />

        {/* Comment */}
        <ActionBtn
          icon="💬"
          count={formatCount(video.commentsCount)}
          onClick={() => setShowComments(true)}
        />

        {/* Share */}
        <ActionBtn icon="↗️" count={formatCount(video.sharesCount)} onClick={handleShare} />

        {/* Tip */}
        <ActionBtn
          icon="🪙"
          count={video.tipsReceived > 0 ? `${video.tipsReceived.toFixed(2)}π` : 'Tip'}
          onClick={() => setShowTip(true)}
          color="var(--pi-gold)"
        />

        {/* Mute */}
        <button
          onClick={() => setIsMuted(m => !m)}
          style={{ fontSize: '20px', opacity: 0.8 }}
        >{isMuted ? '🔇' : '🔊'}</button>
      </div>

      {/* ── Bottom Info ────────────────────────────── */}
      <div style={{
        position: 'absolute',
        bottom: '80px',
        left: '12px',
        right: '80px',
        zIndex: 10,
      }}>
        {/* Creator name */}
        <div
          onClick={goToProfile}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', cursor: 'pointer' }}
        >
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem' }}>
            @{video.creator?.piUsername}
          </span>
          {video.creator?.isVerified && <span>✅</span>}
        </div>

        {/* Description */}
        {video.description && (
          <p style={{
            fontSize: '0.85rem',
            color: 'rgba(255,255,255,0.9)',
            lineHeight: 1.4,
            marginBottom: '8px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>{video.description}</p>
        )}

        {/* Hashtags */}
        {video.hashtags?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {video.hashtags.slice(0, 4).map(tag => (
              <span key={tag} style={{
                color: 'var(--brand-red)',
                fontSize: '0.82rem',
                fontWeight: 600,
              }}>#{tag}</span>
            ))}
          </div>
        )}

        {/* Challenge badge */}
        {video.challengeSubmission && video.challenge && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(255, 60, 95, 0.2)',
            border: '1px solid rgba(255,60,95,0.4)',
            borderRadius: '20px',
            padding: '4px 10px',
            fontSize: '0.75rem',
            marginTop: '8px',
            color: '#ff6b8a',
          }}>
            🏆 #{video.challenge.hashtag}
          </div>
        )}

        {/* Audio track */}
        {video.audioTrack && (
          <div style={{
            fontSize: '0.8rem',
            color: 'rgba(255,255,255,0.7)',
            marginTop: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            🎵 {video.audioTrack}
          </div>
        )}
      </div>

      {/* Modals */}
      {showTip && (
        <TipModal
          creator={video.creator}
          onTip={handleTip}
          onClose={() => setShowTip(false)}
        />
      )}

      {showComments && (
        <CommentsDrawer
          videoId={video.id}
          count={video.commentsCount}
          onClose={() => setShowComments(false)}
        />
      )}
    </div>
  );
}

// Small action button component
function ActionBtn({ icon, count, onClick, active, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2px',
        background: 'none',
        padding: '4px',
      }}
    >
      <span style={{
        fontSize: '28px',
        transition: 'transform 0.2s',
        display: 'block',
        lineHeight: 1,
      }}>{icon}</span>
      {count !== undefined && (
        <span style={{
          fontSize: '0.72rem',
          fontWeight: 700,
          color: color || (active ? 'var(--brand-red)' : 'white'),
          textShadow: '0 1px 4px rgba(0,0,0,0.5)',
        }}>{count}</span>
      )}
    </button>
  );
}
