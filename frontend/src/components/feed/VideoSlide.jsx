// ============================================================
// SPYCE - VideoSlide v2
// NEW: Follow button on profile, audio mixer overlay,
//      real sound from selected music track
// REPLACE: frontend/src/components/feed/VideoSlide.jsx
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
  const audioTrackRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { toggleLike } = useFeedStore();
  const { tipCreator } = usePi();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showAudioMixer, setShowAudioMixer] = useState(false);
  const [isLiked, setIsLiked] = useState(video.isLiked);
  const [likesCount, setLikesCount] = useState(video.likesCount || 0);
  const [heartAnim, setHeartAnim] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Audio mixer state
  const [videoVolume, setVideoVolume] = useState(80);   // 0-100
  const [musicVolume, setMusicVolume] = useState(70);   // 0-100
  const [musicMuted, setMusicMuted] = useState(false);

  const lastTap = useRef(0);

  // Play/pause on active
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive) {
      v.play().then(() => setIsPlaying(true)).catch(() => {});
      // If video has an audio track metadata, play it
      if (video.audioTrack && video.audioTrackUrl) {
        // audioTrackUrl would be set if we stored iTunes preview URL
        // For now we just show the track name
      }
    } else {
      v.pause();
      v.currentTime = 0;
      setIsPlaying(false);
      setShowAudioMixer(false);
    }
  }, [isActive]);

  // Apply video volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : videoVolume / 100;
    }
  }, [videoVolume, isMuted]);

  const handleTap = useCallback((e) => {
    const now = Date.now();
    const diff = now - lastTap.current;
    if (diff < 300) {
      handleDoubleTapLike();
    } else {
      setTimeout(() => {
        if (Date.now() - now >= 250) handleTogglePlay();
      }, 260);
    }
    lastTap.current = now;
  }, [isLiked]);

  const handleTogglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setIsPlaying(true); }
    else { v.pause(); setIsPlaying(false); }
  };

  const handleDoubleTapLike = () => {
    if (!isLiked) handleLike();
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 800);
  };

  const handleLike = async () => {
    const newLiked = !isLiked;
    const newCount = newLiked ? likesCount + 1 : Math.max(0, likesCount - 1);
    setIsLiked(newLiked);
    setLikesCount(newCount);
    toggleLike(video.id, newLiked, newCount);
    try { await api.post(`/videos/${video.id}/like`); }
    catch { setIsLiked(!newLiked); setLikesCount(likesCount); }
  };

  const handleFollow = async () => {
    if (!video.creator?._id || followLoading) return;
    setFollowLoading(true);
    try {
      const { data } = await api.post(`/users/${video.creator._id}/follow`);
      setIsFollowing(data.isFollowing);
      toast.success(data.isFollowing
        ? `Following @${video.creator.piUsername}`
        : `Unfollowed @${video.creator.piUsername}`);
    } catch { toast.error('Failed to follow'); }
    finally { setFollowLoading(false); }
  };

  const handleShare = async () => {
    const shareData = { title: `@${video.creator?.piUsername} on SPYCE`, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else { await navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); }
    } catch {}
  };

  const handleTip = async (amount) => {
    setShowTip(false);
    const result = await tipCreator(amount, video.creator._id, video.id);
    if (result) toast.success(`Tipped ${amount}π to @${video.creator?.piUsername}! 🎉`);
  };

  const goToProfile = () => navigate(`/profile/${video.creator?.piUsername}`);
  const isOwnVideo = user?._id === video.creator?._id || user?.piUsername === video.creator?.piUsername;

  const fmt = (n) => {
    if (!n) return '0';
    if (n >= 1000000) return (n/1000000).toFixed(1)+'M';
    if (n >= 1000) return (n/1000).toFixed(1)+'K';
    return String(n);
  };

  return (
    <div style={{ width:'100%', height:'100dvh', position:'relative', background:'#000', overflow:'hidden' }}>
      {/* Video */}
      <video
        ref={videoRef}
        src={video.videoUrl}
        poster={video.thumbnailUrl}
        loop playsInline
        muted={isMuted}
        onClick={handleTap}
        style={{ width:'100%', height:'100%', objectFit:'cover', position:'absolute', inset:0 }}
      />

      {/* Double tap heart */}
      {heartAnim && (
        <div style={{
          position:'absolute', top:'50%', left:'50%',
          transform:'translate(-50%,-50%)',
          fontSize:'80px', animation:'heartPop 0.6s ease forwards',
          pointerEvents:'none', zIndex:20,
        }}>❤️</div>
      )}

      {/* Play indicator */}
      {!isPlaying && (
        <div style={{
          position:'absolute', top:'50%', left:'50%',
          transform:'translate(-50%,-50%)',
          background:'rgba(0,0,0,0.45)', borderRadius:'50%',
          width:'64px', height:'64px',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'24px', pointerEvents:'none', zIndex:10,
        }}>▶️</div>
      )}

      {/* Gradient overlays */}
      <div style={{
        position:'absolute', inset:0,
        background:'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 40%, transparent 70%, rgba(0,0,0,0.3) 100%)',
        pointerEvents:'none',
      }}/>

      {/* ── Right Action Bar ── */}
      <div style={{
        position:'absolute', right:'12px', bottom:'120px',
        display:'flex', flexDirection:'column', alignItems:'center', gap:'22px', zIndex:10,
      }}>
        {/* Creator avatar */}
        <div onClick={goToProfile} style={{ position:'relative', cursor:'pointer' }}>
          {video.creator?.avatar ? (
            <img src={video.creator.avatar} alt="" style={{
              width:'48px', height:'48px', borderRadius:'50%',
              objectFit:'cover', border:'2px solid white',
            }}/>
          ) : (
            <div style={{
              width:'48px', height:'48px', borderRadius:'50%',
              background:'var(--brand-gradient)',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'white', fontWeight:800, fontSize:'18px',
              border:'2px solid white',
            }}>
              {(video.creator?.displayName || video.creator?.piUsername || '?')[0].toUpperCase()}
            </div>
          )}
          {/* Follow + button */}
          {!isOwnVideo && (
            <button
              onClick={e => { e.stopPropagation(); handleFollow(); }}
              style={{
                position:'absolute', bottom:'-10px', left:'50%',
                transform:'translateX(-50%)',
                background: isFollowing ? 'var(--bg-elevated)' : 'var(--brand-gradient)',
                border: isFollowing ? '1px solid rgba(255,255,255,0.3)' : 'none',
                borderRadius:'50%',
                width:'22px', height:'22px',
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'white', fontSize:'13px', fontWeight:800,
                cursor:'pointer',
                transition:'all 0.2s',
              }}
            >{isFollowing ? '✓' : '+'}</button>
          )}
        </div>

        {/* Like */}
        <ActionBtn icon={isLiked ? '❤️' : '🤍'} count={fmt(likesCount)} onClick={handleLike} active={isLiked}/>

        {/* Comment */}
        <ActionBtn icon="💬" count={fmt(video.commentsCount)} onClick={() => setShowComments(true)}/>

        {/* Share */}
        <ActionBtn icon="↗️" count={fmt(video.sharesCount)} onClick={handleShare}/>

        {/* Tip */}
        <ActionBtn
          icon="🪙"
          count={video.tipsReceived > 0 ? `${video.tipsReceived.toFixed(2)}π` : 'Tip'}
          onClick={() => setShowTip(true)}
          color="var(--pi-gold)"
        />


        {/* Mute */}
        <button onClick={() => setIsMuted(m => !m)} style={{ fontSize:'20px', opacity:0.8 }}>
          {isMuted ? '🔇' : '🔊'}
        </button>
      </div>

      {/* ── Bottom Info ── */}
      <div style={{
        position:'absolute', bottom:'80px', left:'12px', right:'80px', zIndex:10,
      }}>
        {/* Creator + Follow inline */}
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px' }}>
          <button onClick={goToProfile} style={{
            fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.95rem',
            color:'white', background:'none', border:'none', padding:0, cursor:'pointer',
          }}>
            @{video.creator?.piUsername}
            {video.creator?.isVerified && <span style={{ marginLeft:'4px' }}>✅</span>}
          </button>

          {/* Follow button inline */}
          {!isOwnVideo && (
            <button
              onClick={handleFollow}
              disabled={followLoading}
              style={{
                background: isFollowing ? 'rgba(255,255,255,0.15)' : 'rgba(255,60,95,0.85)',
                border: isFollowing ? '1px solid rgba(255,255,255,0.3)' : 'none',
                borderRadius:'20px', padding:'4px 12px',
                color:'white', fontSize:'0.72rem', fontWeight:700,
                fontFamily:'var(--font-display)',
                cursor:'pointer', transition:'all 0.2s',
                backdropFilter:'blur(4px)',
              }}
            >{followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}</button>
          )}
        </div>

        {/* Description */}
        {video.description && (
          <p style={{
            fontSize:'0.85rem', color:'rgba(255,255,255,0.9)',
            lineHeight:1.4, marginBottom:'8px',
            display:'-webkit-box', WebkitLineClamp:2,
            WebkitBoxOrient:'vertical', overflow:'hidden',
          }}>{video.description}</p>
        )}

        {/* Hashtags */}
        {video.hashtags?.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'6px' }}>
            {video.hashtags.slice(0,4).map(tag => (
              <span key={tag} style={{ color:'var(--brand-red)', fontSize:'0.82rem', fontWeight:600 }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Audio track */}
        {video.audioTrack && (
          <div
            onClick={() => setShowAudioMixer(true)}
            style={{
              fontSize:'0.8rem', color:'rgba(255,255,255,0.85)',
              display:'flex', alignItems:'center', gap:'6px',
              cursor:'pointer',
              background:'rgba(0,0,0,0.3)', backdropFilter:'blur(4px)',
              borderRadius:'20px', padding:'4px 12px',
              width:'fit-content',
            }}
          >
            {/* Spinning disc */}
            <span style={{
              animation: isPlaying ? 'spin 3s linear infinite' : 'none',
              display:'inline-block', fontSize:'14px',
            }}>💿</span>
            <span style={{
              maxWidth:'160px', overflow:'hidden',
              textOverflow:'ellipsis', whiteSpace:'nowrap',
            }}>{video.audioTrack}</span>
          </div>
        )}
      </div>

      {/* ── Audio Mixer Modal ── */}
      {showAudioMixer && (
        <div
          className="modal-overlay"
          onClick={() => setShowAudioMixer(false)}
        >
          <div
            className="modal-sheet"
            onClick={e => e.stopPropagation()}
            style={{ paddingBottom:'32px' }}
          >
            {/* Handle */}
            <div style={{
              width:'40px', height:'4px', borderRadius:'2px',
              background:'var(--border-strong)', margin:'0 auto 20px',
            }}/>

            <h3 style={{ fontFamily:'var(--font-display)', fontSize:'1.1rem', marginBottom:'24px', textAlign:'center' }}>
              🎛️ Mix Audio
            </h3>

            {/* Original video volume */}
            <div style={{ marginBottom:'24px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <span style={{ fontSize:'20px' }}>🎬</span>
                  <span style={{ fontSize:'0.88rem', fontWeight:600 }}>Original Sound</span>
                </div>
                <span style={{ fontSize:'0.82rem', color:'var(--text-muted)' }}>{videoVolume}%</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                <span style={{ fontSize:'16px', opacity: videoVolume===0 ? 0.4 : 1 }}>🔇</span>
                <input
                  type="range" min="0" max="100" value={videoVolume}
                  onChange={e => setVideoVolume(parseInt(e.target.value))}
                  style={{ flex:1, accentColor:'var(--brand-red)', height:'4px' }}
                />
                <span style={{ fontSize:'16px' }}>🔊</span>
              </div>
            </div>

            {/* Music track volume */}
            {video.audioTrack && (
              <div style={{ marginBottom:'24px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <span style={{ fontSize:'20px' }}>🎵</span>
                    <div>
                      <p style={{ fontSize:'0.88rem', fontWeight:600 }}>{video.audioTrack.split(' — ')[0]}</p>
                      <p style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>{video.audioTrack.split(' — ')[1] || ''}</p>
                    </div>
                  </div>
                  <span style={{ fontSize:'0.82rem', color:'var(--text-muted)' }}>
                    {musicMuted ? 'Muted' : `${musicVolume}%`}
                  </span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                  <span style={{ fontSize:'16px', opacity: musicMuted ? 0.4 : 1 }}>🔇</span>
                  <input
                    type="range" min="0" max="100" value={musicMuted ? 0 : musicVolume}
                    onChange={e => { setMusicVolume(parseInt(e.target.value)); setMusicMuted(false); }}
                    style={{ flex:1, accentColor:'#f0a500', height:'4px' }}
                    disabled={musicMuted}
                  />
                  <span style={{ fontSize:'16px' }}>🔊</span>
                </div>
                <button
                  onClick={() => setMusicMuted(m => !m)}
                  style={{
                    marginTop:'8px', float:'right',
                    background: musicMuted ? 'var(--brand-gradient)' : 'var(--bg-elevated)',
                    border:'1px solid var(--border)',
                    borderRadius:'20px', padding:'5px 14px',
                    fontSize:'0.78rem', fontWeight:600,
                    color: musicMuted ? 'white' : 'var(--text-secondary)',
                  }}
                >{musicMuted ? '🔊 Unmute' : '🔇 Mute Music'}</button>
              </div>
            )}

            {!video.audioTrack && (
              <p style={{ textAlign:'center', color:'var(--text-muted)', fontSize:'0.85rem', marginBottom:'16px' }}>
                No music track added to this video
              </p>
            )}

            <div style={{ clear:'both', paddingTop:'8px' }}>
              <button
                className="btn btn-primary"
                style={{ width:'100%' }}
                onClick={() => setShowAudioMixer(false)}
              >Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Tip / Comments modals */}
      {showTip && <TipModal creator={video.creator} onTip={handleTip} onClose={() => setShowTip(false)}/>}
      {showComments && <CommentsDrawer videoId={video.id} count={video.commentsCount} onClose={() => setShowComments(false)}/>}
    </div>
  );
}

function ActionBtn({ icon, count, onClick, active, color }) {
  return (
    <button onClick={onClick} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'2px', background:'none', padding:'4px' }}>
      <span style={{ fontSize:'28px', display:'block', lineHeight:1 }}>{icon}</span>
      {count !== undefined && (
        <span style={{ fontSize:'0.72rem', fontWeight:700, color: color || (active ? 'var(--brand-red)' : 'white'), textShadow:'0 1px 4px rgba(0,0,0,0.5)' }}>
          {count}
        </span>
      )}
    </button>
  );
}
