// ============================================================
// SPYCE - TipModal Component
// ============================================================
import React, { useState } from 'react';

const TIP_PRESETS = [0.1, 0.5, 1, 2, 5];

export default function TipModal({ creator, onTip, onClose }) {
  const [custom, setCustom] = useState('');
  const [selected, setSelected] = useState(null);

  const handleTip = () => {
    const amount = selected || parseFloat(custom);
    if (!amount || amount <= 0) return;
    onTip(amount);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🪙</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>
            Tip @{creator?.piUsername}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
            Show appreciation with Pi
          </p>
        </div>

        {/* Preset amounts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '16px' }}>
          {TIP_PRESETS.map(amount => (
            <button
              key={amount}
              onClick={() => { setSelected(amount); setCustom(''); }}
              style={{
                padding: '12px 4px',
                borderRadius: '12px',
                background: selected === amount ? 'var(--pi-gradient)' : 'var(--bg-elevated)',
                border: selected === amount ? 'none' : '1px solid var(--border)',
                color: selected === amount ? '#0a0a0f' : 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '0.85rem',
                transition: 'all 0.2s',
              }}
            >
              {amount}π
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <input
          type="number"
          placeholder="Custom amount (π)"
          value={custom}
          onChange={e => { setCustom(e.target.value); setSelected(null); }}
          style={{ marginBottom: '16px', textAlign: 'center' }}
          min="0.001"
          step="0.1"
        />

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>
            Cancel
          </button>
          <button
            className="btn btn-pi"
            onClick={handleTip}
            disabled={!selected && !custom}
            style={{ flex: 2 }}
          >
            Send {(selected || parseFloat(custom) || 0).toFixed(2)}π
          </button>
        </div>
      </div>
    </div>
  );
}
