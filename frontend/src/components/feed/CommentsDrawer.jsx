// ============================================================
// SPYCE - CommentsDrawer Component
// ============================================================
import React, { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import { useAuthStore } from '../../utils/store';
import toast from 'react-hot-toast';

export default function CommentsDrawer({ videoId, onClose }) {
  const { user } = useAuthStore();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchComments();
    setTimeout(() => inputRef.current?.focus(), 400);
  }, []);

  const fetchComments = async () => {
    try {
      const { data } = await api.get(`/videos/${videoId}/comments`);
      setComments(data.comments || []);
    } catch { toast.error('Failed to load comments'); }
    finally { setLoading(false); }
  };

  const postComment = async () => {
    if (!text.trim() || posting) return;
    setPosting(true);
    try {
      const { data } = await api.post(`/videos/${videoId}/comment`, { text });
      setComments(prev => [data.comment, ...prev]);
      setText('');
    } catch { toast.error('Failed to post comment'); }
    finally { setPosting(false); }
  };

  const timeAgo = (date) => {
    const diff = (Date.now() - new Date(date)) / 1000;
    if (diff < 60) return 'now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  return (
    /*
     * iOS FIX: The modal-overlay div was capturing ALL touch events across the
     * full screen including over the sheet. On iOS, when the keyboard opens the
     * visual viewport shrinks but the overlay's hit-test area stays full-screen,
     * making the input and send button completely untouchable.
     *
     * Solution: Split the overlay into two layers:
     *   1. A backdrop div (pointer-events only outside the sheet)
     *   2. The sheet itself with its own positioning
     * The sheet uses pointer-events:all explicitly, and the backdrop sits behind.
     */
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      {/* Backdrop — only captures taps outside the sheet */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 0,
        }}
      />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '480px',
          maxHeight: '75dvh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          background: 'var(--bg-secondary)',
          borderRadius: '24px 24px 0 0',
          animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          // iOS fix: allow sheet to shrink when keyboard appears
          // without this the sheet clips and input goes offscreen
          WebkitOverflowScrolling: 'touch',
          pointerEvents: 'all',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem' }}>Comments</h3>
          <button onClick={onClose} style={{ fontSize: '20px', color: 'var(--text-muted)' }}>✕</button>
        </div>

        {/* Comments list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Loading...</div>
          ) : comments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
              No comments yet. Be first! 💬
            </div>
          ) : (
            comments.map((c, i) => (
              <div key={c._id || i} style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <div className="avatar-placeholder" style={{ width: '36px', height: '36px', fontSize: '14px', flexShrink: 0 }}>
                  {(c.user?.displayName || c.user?.piUsername || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>@{c.user?.piUsername}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{timeAgo(c.createdAt)}</span>
                  </div>
                  <p style={{ fontSize: '0.88rem', lineHeight: 1.4, color: 'var(--text-primary)' }}>{c.text}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div style={{
          padding: '12px 16px',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))',
          borderTop: '1px solid var(--border)',
          display: 'flex', gap: '10px', alignItems: 'center',
          // ✅ FIX: Stick to bottom even when keyboard appears on Pi Browser
          position: 'sticky',
          bottom: 0,
          background: 'var(--bg-secondary)',
          zIndex: 10,
        }}>
          <input
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Add a comment..."
            onKeyDown={e => e.key === 'Enter' && postComment()}
            // ✅ FIX: Explicit styles ensure input is visible & tappable in Pi Browser
            style={{
              flex: 1,
              borderRadius: '50px',
              padding: '10px 16px',
              fontSize: '0.88rem',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-primary)',
              outline: 'none',
              WebkitAppearance: 'none',  // Prevents iOS default styling override
            }}
            maxLength={200}
          />
          <button
            onClick={postComment}
            disabled={!text.trim() || posting}
            style={{
              background: 'var(--brand-gradient)',
              color: 'white',
              borderRadius: '50%',
              width: '40px', height: '40px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px',
              opacity: (!text.trim() || posting) ? 0.5 : 1,
              transition: 'opacity 0.2s',
            }}
          >↑</button>
        </div>
      </div>
    </div>
  );
}