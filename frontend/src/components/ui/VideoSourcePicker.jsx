// ============================================================
// SPYCE - VideoSourcePicker Component
// Shows Photo Library / Take Video / Choose File
// Works identically on iOS and Android
// FILE: frontend/src/components/ui/VideoSourcePicker.jsx
// ============================================================
import React from 'react';

export default function VideoSourcePicker({ onClose, onSelect }) {
  // Each option opens a different file input with different attributes
  const openPhotoLibrary = () => {
    onClose();
    onSelect('library');
  };

  const openCamera = () => {
    onClose();
    onSelect('camera');
  };

  const openFiles = () => {
    onClose();
    onSelect('files');
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          background: 'var(--bg-card)',
          borderRadius: '24px 24px 0 0',
          paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
          overflow: 'hidden',
        }}
      >
        {/* Handle */}
        <div style={{ padding: '14px 0 4px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.2)' }}/>
        </div>

        <p style={{
          textAlign: 'center', padding: '8px 20px 16px',
          fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: '1rem', color: 'var(--text-primary)',
        }}>Add Video</p>

        {/* Options */}
        {[
          { icon: '🖼️', label: 'Photo Library', sublabel: 'Choose from your gallery', action: openPhotoLibrary },
          { icon: '📹', label: 'Take Video', sublabel: 'Record using your camera', action: openCamera },
          { icon: '📁', label: 'Choose File', sublabel: 'Browse files on your device', action: openFiles },
        ].map((opt, i) => (
          <button
            key={opt.label}
            onClick={opt.action}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', gap: '16px',
              padding: '16px 24px',
              background: 'none', border: 'none',
              borderTop: i > 0 ? '1px solid var(--border)' : 'none',
              cursor: 'pointer',
              transition: 'background 0.15s',
              textAlign: 'left',
            }}
            onMouseDown={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
            onMouseUp={e => e.currentTarget.style.background = 'none'}
            onTouchStart={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
            onTouchEnd={e => e.currentTarget.style.background = 'none'}
          >
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: 'var(--bg-elevated)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', flexShrink: 0,
            }}>{opt.icon}</div>
            <div>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '2px' }}>{opt.label}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{opt.sublabel}</p>
            </div>
            <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '18px' }}>›</span>
          </button>
        ))}

        {/* Cancel */}
        <button
          onClick={onClose}
          style={{
            width: 'calc(100% - 40px)', margin: '12px 20px 0',
            padding: '15px', background: 'var(--bg-elevated)',
            border: '1px solid var(--border)', borderRadius: '14px',
            color: 'var(--text-secondary)', fontFamily: 'var(--font-display)',
            fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
          }}
        >Cancel</button>
      </div>
    </div>
  );
}
