// ============================================================
// SPYCE - TipModal - Fixed iOS safe area / button visibility
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
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'flex-end',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          background: 'var(--bg-card)',
          borderRadius: '24px 24px 0 0',
          padding: '20px 20px',
          paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 16px))',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.4)',
        }}
      >
        {/* Handle */}
        <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'var(--border-strong)', margin: '0 auto 20px' }} />

        {/* Creator */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          {creator?.avatar ? (
            <img src={creator.avatar} alt="" style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 8px', display: 'block', border: '2px solid var(--brand-red)' }} />
          ) : (
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--brand-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: '20px', fontWeight: 800, color: 'white' }}>
              {(creator?.displayName || creator?.piUsername || '?')[0].toUpperCase()}
            </div>
          )}
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: '4px' }}>
            Tip @{creator?.piUsername}
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Show appreciation with Pi</p>
        </div>

        {/* Amount buttons */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          {TIP_AMOUNTS.map(a => (
            <button
              key={a}
              onClick={() => { setSelected(a); setCustom(''); }}
              style={{
                flex: 1, padding: '12px 4px',
                borderRadius: '12px',
                background: selected === a && !custom ? 'var(--brand-gradient)' : 'var(--bg-elevated)',
                border: `1px solid ${selected === a && !custom ? 'transparent' : 'var(--border)'}`,
                color: selected === a && !custom ? 'white' : 'var(--text-primary)',
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem',
                cursor: 'pointer', transition: 'all 0.15s',
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
          min="0.01" step="0.01"
          style={{
            width: '100%', marginBottom: '16px',
            textAlign: 'center', fontSize: '1rem',
            borderRadius: '12px',
          }}
        />

        {/* Buttons - always visible, above safe area */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '14px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem',
              cursor: 'pointer',
            }}
          >Cancel</button>
          <button
            onClick={handleSend}
            disabled={!amount || amount <= 0 || loading}
            style={{
              flex: 2, padding: '14px',
              background: amount && amount > 0 && !loading ? 'var(--brand-gradient)' : 'var(--bg-elevated)',
              border: 'none', borderRadius: '14px',
              color: amount && amount > 0 && !loading ? 'white' : 'var(--text-muted)',
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem',
              cursor: amount && amount > 0 ? 'pointer' : 'not-allowed',
              boxShadow: amount && amount > 0 && !loading ? 'var(--brand-glow)' : 'none',
              transition: 'all 0.2s',
            }}
          >{loading ? 'Sending...' : `Send ${amount ? amount + 'π' : 'Tip'}`}</button>
        </div>
      </div>
    </div>
  );
}
