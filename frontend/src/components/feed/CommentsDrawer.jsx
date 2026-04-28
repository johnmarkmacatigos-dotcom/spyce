// ============================================================
// SPYCE - CommentsDrawer v3
// FIXED: iOS input + send button always visible
// FIXED: Keyboard pushes content up properly on iOS
// FIXED: No bottom sheet — full modal with fixed input bar
// FILE: frontend/src/components/feed/CommentsDrawer.jsx
// ============================================================
import React, { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import { useAuthStore } from '../../utils/store';
import toast from 'react-hot-toast';

export default function CommentsDrawer({ videoId, onClose }) {
  const { user } = useAuthStore();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    fetchComments();
    // Focus input after a short delay so keyboard opens
    setTimeout(() => inputRef.current?.focus(), 400);
  }, [videoId]);

  // When keyboard opens on iOS, scroll list up
  useEffect(() => {
    const onResize = () => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/videos/${videoId}/comments`);
      setComments(data.comments || []);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!text.trim() || posting) return;
    setPosting(true);
    const optimistic = {
      _id: Date.now(),
      text: text.trim(),
      user: {
        piUsername: user?.piUsername || 'You',
        displayName: user?.displayName || user?.piUsername || 'You',
        avatar: user?.avatar || '',
      },
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };
    setComments(prev => [...prev, optimistic]);
    setText('');
    try {
      const { data } = await api.post(`/videos/${videoId}/comments`, {
        text: optimistic.text,
      });
      setComments(prev =>
        prev.map(c => c._id === optimistic._id ? (data.comment || optimistic) : c)
      );
      if (listRef.current)
        listRef.current.scrollTop = listRef.current.scrollHeight;
    } catch {
      setComments(prev => prev.filter(c => c._id !== optimistic._id));
      toast.error('Failed to post comment');
      setText(optimistic.text);
    } finally {
      setPosting(false);
    }
  };

  const timeAgo = (date) => {
    const s = Math.floor((Date.now() - new Date(date)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s/60)}m`;
    if (s < 86400) return `${Math.floor(s/3600)}h`;
    return `${Math.floor(s/86400)}d`;
  };

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.5)',
        }}
      />

      {/* ── Drawer — sits above backdrop ── */}
      <div style={{
        position: 'fixed',
        // Take up bottom 65% of screen
        bottom: 0, left: 0, right: 0,
        height: '65dvh',
        zIndex: 1001,
        background: 'var(--bg-card)',
        borderRadius: '20px 20px 0 0',
        display: 'flex',
        flexDirection: 'column',
        // Key: let iOS keyboard push this whole drawer up
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>

        {/* ── Header ── */}
        <div style={{
          flexShrink: 0,
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px 12px',
          borderBottom: '1px solid var(--border)',
        }}>
          <h3 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1rem', fontWeight: 700,
            color: 'var(--text-primary)',
          }}>
            Comments {comments.length > 0 && (
              <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.85rem' }}>
                ({comments.length})
              </span>
            )}
          </h3>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
        </div>

        {/* ── Comment list ── */}
        <div
          ref={listRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '8px 0',
          }}
        >
          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center' }}>
              <div style={{
                width: 24, height: 24, margin: '0 auto',
                border: '2px solid var(--border)',
                borderTopColor: 'var(--brand-red)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}/>
            </div>
          ) : comments.length === 0 ? (
            <div style={{
              padding: '40px 20px', textAlign: 'center',
              color: 'var(--text-muted)',
            }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>💬</div>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 4 }}>
                No comments yet
              </p>
              <p style={{ fontSize: '0.82rem' }}>Be the first to comment!</p>
            </div>
          ) : (
            comments.map(c => (
              <div
                key={c._id}
                style={{
                  display: 'flex', gap: 12,
                  padding: '10px 20px',
                  opacity: c.isOptimistic ? 0.6 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {c.user?.avatar ? (
                  <img
                    src={c.user.avatar} alt=""
                    style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                ) : (
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'var(--brand-gradient)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 800, color: 'white', flexShrink: 0,
                  }}>
                    {(c.user?.displayName || c.user?.piUsername || '?')[0].toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      @{c.user?.piUsername}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {timeAgo(c.createdAt)}
                    </span>
                  </div>
                  <p style={{
                    fontSize: '0.88rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.4,
                    wordBreak: 'break-word',
                  }}>
                    {c.text}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Input bar — ALWAYS visible, never behind keyboard ──
            This is OUTSIDE the scroll area so it sticks to the
            bottom of the drawer. On iOS when keyboard opens,
            the browser viewport shrinks and this naturally
            moves up with the bottom of the drawer. */}
        <div style={{
          flexShrink: 0,
          padding: '10px 16px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-card)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          {/* User avatar */}
          {user?.avatar ? (
            <img src={user.avatar} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}/>
          ) : (
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'var(--brand-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 800, color: 'white', flexShrink: 0,
            }}>
              {(user?.displayName || user?.piUsername || '?')[0]?.toUpperCase()}
            </div>
          )}

          {/* Text input */}
          <input
            ref={inputRef}
            type="text"
            placeholder="Add a comment..."
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handlePost()}
            maxLength={300}
            disabled={posting}
            style={{
              flex: 1,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 22,
              padding: '10px 16px',
              fontSize: '0.9rem',
              color: 'var(--text-primary)',
              outline: 'none',
              minWidth: 0,
            }}
          />

          {/* Send button */}
          <button
            onClick={handlePost}
            disabled={!text.trim() || posting}
            style={{
              width: 40, height: 40,
              flexShrink: 0,
              borderRadius: '50%',
              background: text.trim() && !posting
                ? 'var(--brand-gradient)'
                : 'var(--bg-elevated)',
              border: 'none',
              color: text.trim() && !posting ? 'white' : 'var(--text-muted)',
              fontSize: 16,
              cursor: text.trim() ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
              boxShadow: text.trim() && !posting ? 'var(--brand-glow)' : 'none',
            }}
          >
            {posting ? (
              <span style={{
                width: 16, height: 16,
                border: '2px solid rgba(255,255,255,0.4)',
                borderTopColor: 'white',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 0.8s linear infinite',
              }}/>
            ) : '➤'}
          </button>
        </div>

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
