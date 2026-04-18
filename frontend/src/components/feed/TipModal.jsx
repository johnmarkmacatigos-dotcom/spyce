// ============================================================
// SPYCE - TipModal v3
// FIXED: iOS buttons always visible - no drag needed
// Uses scrollable content + sticky bottom buttons
// FILE: frontend/src/components/feed/TipModal.jsx
// ============================================================
import React, { useState } from 'react';
 
const TIP_AMOUNTS = [0.1, 0.5, 1, 2, 5];
 
export default function TipModal({ creator, onTip, onClose }) {
  const [selected, setSelected] = useState(null);
  const [custom, setCustom] = useState('');
  const [loading, setLoading] = useState(false);
 
  const amount = custom ? parseFloat(custom) : selected;
 
  const handleSend = async () => {
    if (!amount || amount <= 0) return;
    setLoading(true);
    await onTip(amount);
    setLoading(false);
  };
 
  return (
    // Full screen overlay
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      {/*
        Sheet container:
        - flexbox column so header+content+buttons stack
        - max height leaves room at top
        - NO overflow on container itself
      */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '500px',
          background: 'var(--bg-card)',
          borderRadius: '24px 24px 0 0',
          display: 'flex',
          flexDirection: 'column',
          // Key: max height keeps it from going full screen
          // bottom padding accounts for iOS home indicator
          maxHeight: '80dvh',
          // Safe area padding at bottom handled by buttons area
        }}
      >
        {/* ── Handle bar ── */}
        <div style={{
          flexShrink: 0,
          padding: '14px 20px 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
        }}>
          <div style={{
            width: '40px', height: '4px',
            borderRadius: '2px',
            background: 'rgba(255,255,255,0.2)',
          }} />
        </div>
 
        {/* ── Scrollable content ── */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          WebkitOverflowScrolling: 'touch',
        }}>
          {/* Creator info */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            {creator?.avatar ? (
              <img
                src={creator.avatar}
                alt=""
                style={{
                  width: '60px', height: '60px',
                  borderRadius: '50%', objectFit: 'cover',
                  margin: '0 auto 10px', display: 'block',
                  border: '2.5px solid var(--brand-red)',
                }}
              />
            ) : (
              <div style={{
                width: '60px', height: '60px', borderRadius: '50%',
                background: 'var(--brand-gradient)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 10px',
                fontSize: '22px', fontWeight: 800, color: 'white',
              }}>
                {(creator?.displayName || creator?.piUsername || '?')[0].toUpperCase()}
              </div>
            )}
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.15rem',
              marginBottom: '4px',
              color: 'var(--text-primary)',
            }}>
              Tip @{creator?.piUsername}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Show appreciation with Pi
            </p>
          </div>
 
          {/* Amount grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '8px',
            marginBottom: '14px',
          }}>
            {TIP_AMOUNTS.map(a => (
              <button
                key={a}
                onClick={() => { setSelected(a); setCustom(''); }}
                style={{
                  padding: '14px 4px',
                  borderRadius: '12px',
                  background: selected === a && !custom
                    ? 'var(--brand-gradient)'
                    : 'var(--bg-elevated)',
                  border: `1.5px solid ${selected === a && !custom
                    ? 'transparent'
                    : 'var(--border)'}`,
                  color: selected === a && !custom
                    ? 'white'
                    : 'var(--text-primary)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: selected === a && !custom
                    ? 'var(--brand-glow)' : 'none',
                }}
              >{a}π</button>
            ))}
          </div>
 
          {/* Custom amount */}
          <input
            type="number"
            placeholder="Custom amount (π)"
            value={custom}
            onChange={e => { setCustom(e.target.value); setSelected(null); }}
            min="0.01"
            step="0.01"
            inputMode="decimal"
            style={{
              width: '100%',
              textAlign: 'center',
              fontSize: '1rem',
              borderRadius: '12px',
              padding: '14px',
              background: 'var(--bg-elevated)',
              border: custom
                ? '1.5px solid var(--brand-red)'
                : '1.5px solid var(--border)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>
 
        {/* ── Sticky action buttons — ALWAYS VISIBLE ── */}
        {/*
          This div is OUTSIDE the scroll area so it never scrolls away.
          paddingBottom uses safe-area-inset-bottom so it clears
          the iOS home indicator on notched phones.
        */}
        <div style={{
          flexShrink: 0,
          padding: '12px 20px',
          paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-card)',
          display: 'flex',
          gap: '10px',
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '16px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
 
          <button
            onClick={handleSend}
            disabled={!amount || amount <= 0 || loading}
            style={{
              flex: 2,
              padding: '16px',
              background: amount && amount > 0 && !loading
                ? 'var(--brand-gradient)'
                : 'var(--bg-elevated)',
              border: 'none',
              borderRadius: '14px',
              color: amount && amount > 0 && !loading
                ? 'white'
                : 'var(--text-muted)',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: amount && amount > 0 ? 'pointer' : 'not-allowed',
              boxShadow: amount && amount > 0 && !loading
                ? 'var(--brand-glow)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {loading
              ? 'Sending...'
              : `Send ${amount ? amount + 'π' : 'Tip'}`}
          </button>
        </div>
 
      </div>
    </div>
  );
}