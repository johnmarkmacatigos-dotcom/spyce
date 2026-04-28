// ============================================================
// SPYCE - CommentsDrawer v4
// FIXED: Input bar uses fixed position — always visible on iOS
// FIXED: No flex layout dependency — guaranteed to show
// FILE: frontend/src/components/feed/CommentsDrawer.jsx
// ============================================================
import React, { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import { useAuthStore } from '../../utils/store';
import toast from 'react-hot-toast';

const DRAWER_HEIGHT = 62; // % of viewport height

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
    // Small delay then focus — iOS needs this
    const t = setTimeout(() => inputRef.current?.focus(), 500);
    return () => clearTimeout(t);
  }, [videoId]);

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
    const draft = text.trim();
    setPosting(true);
    const optimistic = {
      _id: `opt_${Date.now()}`,
      text: draft,
      user: {
        piUsername: user?.piUsername || 'You',
        displayName: user?.displayName || 'You',
        avatar: user?.avatar || '',
      },
      createdAt: new Date().toISOString(),
      optimistic: true,
    };
    setComments(p => [...p, optimistic]);
    setText('');
    if (listRef.current)
      setTimeout(() => { listRef.current.scrollTop = listRef.current.scrollHeight; }, 80);
    try {
      const { data } = await api.post(`/videos/${videoId}/comments`, { text: draft });
      setComments(p =>
        p.map(c => c._id === optimistic._id ? (data.comment || { ...optimistic, optimistic: false }) : c)
      );
    } catch {
      setComments(p => p.filter(c => c._id !== optimistic._id));
      setText(draft);
      toast.error('Failed to post comment');
    } finally {
      setPosting(false);
    }
  };

  const timeAgo = (d) => {
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60) return 'now';
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
  };

  // Input bar height — accounts for iOS home indicator
  const INPUT_BAR_H = 64;

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          zIndex: 1000,
          background: 'rgba(0,0,0,0.55)',
        }}
      />

      {/* ── Drawer shell ── */}
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        height: `${DRAWER_HEIGHT}vh`,
        zIndex: 1001,
        background: 'var(--bg-card)',
        borderRadius: '20px 20px 0 0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-card)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem' }}>
              Comments
            </span>
            {comments.length > 0 && (
              <span style={{
                background: 'var(--bg-elevated)',
                color: 'var(--text-muted)',
                borderRadius: 20, padding: '1px 8px',
                fontSize: '0.75rem', fontWeight: 600,
              }}>{comments.length}</span>
            )}
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* ── Comment list — pad bottom so input bar doesn't cover last comment ── */}
        <div
          ref={listRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: INPUT_BAR_H + 16,
          }}
        >
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{
                width: 28, height: 28, margin: '0 auto',
                border: '3px solid var(--border)',
                borderTopColor: 'var(--brand-red)',
                borderRadius: '50%',
                animation: 'cSpin 0.7s linear infinite',
              }}/>
            </div>
          ) : comments.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>💬</div>
              <p style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700, fontSize: '0.95rem',
                marginBottom: 6, color: 'var(--text-primary)',
              }}>No comments yet</p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Be the first to comment!
              </p>
            </div>
          ) : (
            comments.map(c => (
              <div key={c._id} style={{
                display: 'flex', gap: 12,
                padding: '10px 20px',
                opacity: c.optimistic ? 0.55 : 1,
                transition: 'opacity 0.25s',
              }}>
                {c.user?.avatar ? (
                  <img src={c.user.avatar} alt="" style={{
                    width: 36, height: 36, borderRadius: '50%',
                    objectFit: 'cover', flexShrink: 0,
                  }}/>
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
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                      @{c.user?.piUsername}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {timeAgo(c.createdAt)}
                    </span>
                    {c.optimistic && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>sending…</span>
                    )}
                  </div>
                  <p style={{
                    fontSize: '0.88rem', color: 'var(--text-secondary)',
                    lineHeight: 1.45, wordBreak: 'break-word',
                  }}>{c.text}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Input bar ──
            KEY FIX: position absolute inside the drawer,
            pinned to the bottom. This works in ALL iOS webviews
            regardless of keyboard state. The list has paddingBottom
            equal to this bar's height so comments never hide behind it.
        ── */}
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: INPUT_BAR_H,
          background: 'var(--bg-card)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 14px',
          // iOS safe area for home indicator
          paddingBottom: 'max(0px, env(safe-area-inset-bottom))',
        }}>
          {/* Avatar */}
          {user?.avatar ? (
            <img src={user.avatar} alt="" style={{
              width: 32, height: 32, borderRadius: '50%',
              objectFit: 'cover', flexShrink: 0,
            }}/>
          ) : (
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--brand-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, color: 'white', flexShrink: 0,
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
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handlePost()}
            maxLength={300}
            disabled={posting}
            style={{
              flex: 1,
              height: 40,
              background: 'var(--bg-elevated)',
              border: '1.5px solid var(--border)',
              borderRadius: 20,
              padding: '0 16px',
              fontSize: '0.9rem',
              color: 'var(--text-primary)',
              outline: 'none',
              minWidth: 0,
              // iOS fix — prevent font size zoom on focus
              fontSize: '16px',
            }}
          />

          {/* Send button */}
          <button
            onClick={handlePost}
            disabled={!text.trim() || posting}
            style={{
              width: 40, height: 40, flexShrink: 0,
              borderRadius: '50%',
              background: text.trim() && !posting
                ? 'var(--brand-gradient)' : 'var(--bg-elevated)',
              border: 'none',
              color: text.trim() && !posting ? 'white' : 'var(--text-muted)',
              cursor: text.trim() ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15,
              transition: 'all 0.2s',
              boxShadow: text.trim() && !posting ? 'var(--brand-glow)' : 'none',
            }}
          >
            {posting ? (
              <span style={{
                width: 16, height: 16,
                border: '2px solid rgba(255,255,255,0.35)',
                borderTopColor: 'white',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'cSpin 0.7s linear infinite',
              }}/>
            ) : '➤'}
          </button>
        </div>

      </div>

      <style>{`
        @keyframes cSpin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
