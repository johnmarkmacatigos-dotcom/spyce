// ============================================================
// SPYCE - Loading Screen
// ============================================================
import React from 'react';

export default function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      gap: '20px',
    }}>
      <div style={{
        fontSize: '48px',
        animation: 'pulse 1.5s ease infinite',
        filter: 'drop-shadow(0 0 20px rgba(255,60,95,0.5))',
      }}>🌶️</div>
      <div style={{
        width: '40px', height: '40px',
        border: '3px solid var(--border)',
        borderTopColor: 'var(--brand-red)',
        borderRadius: '50%',
      }} className="animate-spin" />
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontFamily: 'var(--font-display)' }}>
        {message}
      </p>
    </div>
  );
}
