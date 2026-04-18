// ============================================================
// SPYCE - TipModal v4
// REDESIGNED: Center modal instead of bottom sheet
// Buttons always visible on ALL devices including iOS Pi Browser
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
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',      // CENTER vertically — not bottom
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '380px',
          background: 'var(--bg-card)',
          borderRadius: '24px',
          padding: '28px 24px 24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          // No position:fixed, no bottom pinning needed
          // This div just sits in the center of the screen
        }}
      >
        {/* Creator info */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          {creator?.avatar ? (
            <img
              src={creator.avatar}
              alt=""
              style={{
                width: '64px', height: '64px',
                borderRadius: '50%', objectFit: 'cover',
                margin: '0 auto 12px', display: 'block',
                border: '3px solid var(--brand-red)',
              }}
            />
          ) : (
            <div style={{
              width: '64px', height: '64px',
              borderRadius: '50%',
              background: 'var(--brand-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px',
              fontSize: '24px', fontWeight: 800, color: 'white',
            }}>
              {(creator?.displayName || creator?.piUsername || '?')[0].toUpperCase()}
            </div>
          )}
          <h3 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.2rem',
            marginBottom: '4px',
            color: 'var(--text-primary)',
          }}>
            Tip @{creator?.piUsername}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Show appreciation with Pi
          </p>
        </div>

        {/* Amount buttons — 5 in a row */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '14px',
        }}>
          {TIP_AMOUNTS.map(a => (
            <button
              key={a}
              onClick={() => { setSelected(a); setCustom(''); }}
              style={{
                flex: 1,
                padding: '12px 4px',
                borderRadius: '12px',
                background: selected === a && !custom
                  ? 'var(--brand-gradient)'
                  : 'var(--bg-elevated)',
                border: `1.5px solid ${selected === a && !custom
                  ? 'transparent' : 'var(--border)'}`,
                color: selected === a && !custom
                  ? 'white' : 'var(--text-primary)',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '0.85rem',
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
            marginBottom: '20px',
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
            boxSizing: 'border-box',
          }}
        />

        {/* Action buttons — always fully visible */}
        <div style={{ display: 'flex', gap: '10px' }}>
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
          >Cancel</button>

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
                ? 'white' : 'var(--text-muted)',
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
              ? '⏳ Sending...'
              : `Send ${amount ? amount + 'π' : 'Tip'} 🪙`}
          </button>
        </div>
      </div>
    </div>
  );
}