// ============================================================
// SPYCE - Bottom Navigation
// ============================================================
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const NAV_ITEMS = [
  { icon: '🏠', label: 'Home',      path: '/' },
  { icon: '🔍', label: 'Search',    path: '/search' },
  { icon: '➕', label: 'Upload',    path: '/upload',    special: true },
  { icon: '🏆', label: 'Challenge', path: '/challenge' },
  { icon: '👤', label: 'Profile',   path: '/profile' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide nav on feed (full-screen) but keep it accessible
  const isHidden = false;

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      background: 'rgba(10,10,15,0.95)',
      backdropFilter: 'blur(20px)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      height: 'var(--bottom-nav-height)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {NAV_ITEMS.map(item => {
        const isActive = item.path === '/'
          ? location.pathname === '/'
          : location.pathname.startsWith(item.path);

        if (item.special) {
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                width: '48px', height: '48px',
                background: 'var(--brand-gradient)',
                borderRadius: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px',
                boxShadow: 'var(--brand-glow)',
                transition: 'transform var(--transition-bounce)',
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.93)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {item.icon}
            </button>
          );
        }

        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '3px',
              flex: 1, padding: '8px 0',
              opacity: isActive ? 1 : 0.5,
              transition: 'opacity var(--transition)',
            }}
          >
            <span style={{ fontSize: '22px', lineHeight: 1 }}>{item.icon}</span>
            <span style={{
              fontSize: '0.65rem',
              fontFamily: 'var(--font-display)',
              fontWeight: isActive ? 700 : 400,
              color: isActive ? 'var(--brand-red)' : 'var(--text-muted)',
            }}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
