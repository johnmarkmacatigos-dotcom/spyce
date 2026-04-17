// ============================================================
// SPYCE - TipModal v2
// FIXED: Fully draggable sheet — drag up to reveal buttons on iOS
// FILE: frontend/src/components/feed/TipModal.jsx
// ============================================================
import React, { useState, useRef, useEffect } from 'react';

const TIP_AMOUNTS = [0.1, 0.5, 1, 2, 5];

export default function TipModal({ creator, onTip, onClose }) {
  const [selected, setSelected] = useState(null);
  const [custom, setCustom] = useState('');
  const [loading, setLoading] = useState(false);
  const [sheetY, setSheetY] = useState(0); // 0 = default, negative = dragged up
  const sheetRef = useRef(null);
  const dragStart = useRef(null);
  const currentY = useRef(0);

  const amount = custom ? parseFloat(custom) : selected;

  // On mount, auto-expand up so buttons are always visible
  useEffect(() => {
    // Small delay then slide up enough to show full content
    const timer = setTimeout(() => {
      if (sheetRef.current) {
        const h = sheetRef.current.scrollHeight;
        const vh = window.innerHeight;
        // If sheet is taller than 70% of screen, shift it up
        if (h > vh * 0.65) {
          setSheetY(-(h - vh * 0.65));
        }
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const onDragStart = (e) => {
    const touch = e.touches?.[0] || e;
    dragStart.current = touch.clientY;
    currentY.current = sheetY;
  };

  const onDragMove = (e) => {
    if (dragStart.current === null) return;
    const touch = e.touches?.[0] || e;
    const diff = touch.clientY - dragStart.current;
    const newY = Math.min(0, Math.max(-window.innerHeight * 0.7, currentY.current - diff / 1.5));
    setSheetY(newY);
  };

  const onDragEnd = (e) => {
    dragStart.current = null;
    // Snap: if dragged down past -50px from default, close
    if (sheetY > -20 && currentY.current < -50) {
      onClose();
    }
  };

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
      }}
    >
      <div
        ref={sheetRef}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          background: 'var(--bg-card)',
          borderRadius: '24px 24px 0 0',
          padding: '0 20px 20px',
          paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 20px))',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.5)',
          transform: `translateY(${sheetY}px)`,
          transition: dragStart.current ? 'none' : 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          touchAction: 'none',
          maxHeight: '92dvh',
          overflowY: 'auto',
        }}
      >
        {/* Drag handle — tap/drag to move sheet */}
        <div
          onMouseDown={onDragStart}
          onMouseMove={onDragMove}
          onMouseUp={onDragEnd}
          onTouchStart={onDragStart}
          onTouchMove={onDragMove}
          onTouchEnd={onDragEnd}
          style={{
            width: '100%', padding: '16px 0 8px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
            cursor: 'grab', userSelect: 'none', touchAction: 'none',
          }}
        >
          <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'var(--border-strong)' }} />
          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>drag up to see all options</p>
        </div>

        {/* Creator info */}
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
            <button key={a} onClick={() => { setSelected(a); setCustom(''); }} style={{
              flex: 1, padding: '12px 4px', borderRadius: '12px',
              background: selected === a && !custom ? 'var(--brand-gradient)' : 'var(--bg-elevated)',
              border: `1px solid ${selected === a && !custom ? 'transparent' : 'var(--border)'}`,
              color: selected === a && !custom ? 'white' : 'var(--text-primary)',
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>{a}π</button>
          ))}
        </div>

        {/* Custom */}
        <input
          type="number" placeholder="Custom amount (π)"
          value={custom} onChange={e => { setCustom(e.target.value); setSelected(null); }}
          min="0.01" step="0.01"
          style={{ width: '100%', marginBottom: '16px', textAlign: 'center', fontSize: '1rem', borderRadius: '12px' }}
        />

        {/* Action buttons — always rendered, never hidden */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '16px',
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: '14px', color: 'var(--text-secondary)',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem',
            cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={handleSend} disabled={!amount || amount <= 0 || loading} style={{
            flex: 2, padding: '16px',
            background: amount && amount > 0 && !loading ? 'var(--brand-gradient)' : 'var(--bg-elevated)',
            border: 'none', borderRadius: '14px',
            color: amount && amount > 0 && !loading ? 'white' : 'var(--text-muted)',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem',
            cursor: amount && amount > 0 ? 'pointer' : 'not-allowed',
            boxShadow: amount && amount > 0 && !loading ? 'var(--brand-glow)' : 'none',
            transition: 'all 0.2s',
          }}>{loading ? 'Sending...' : `Send ${amount ? amount + 'π' : 'Tip'}`}</button>
        </div>
      </div>
    </div>
  );
}
