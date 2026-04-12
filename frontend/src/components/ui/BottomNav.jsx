// ============================================================
// SPYCE - BottomNav v2
// NEW: Profile tab shows user's actual avatar photo
// REPLACE: frontend/src/components/ui/BottomNav.jsx
// ============================================================
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../utils/store';

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <nav style={{
      position:'fixed', bottom:0, left:0, right:0, zIndex:100,
      background:'rgba(10,10,15,0.95)',
      backdropFilter:'blur(20px)',
      borderTop:'1px solid var(--border)',
      display:'flex', justifyContent:'space-around', alignItems:'center',
      height:'var(--bottom-nav-height)',
      paddingBottom:'env(safe-area-inset-bottom, 0px)',
    }}>

      {/* Home */}
      <NavBtn
        icon="🏠" label="Home" path="/"
        active={isActive('/')}
        onClick={() => navigate('/')}
      />

      {/* Search */}
      <NavBtn
        icon="🔍" label="Search" path="/search"
        active={isActive('/search')}
        onClick={() => navigate('/search')}
      />

      {/* Upload — special */}
      <button
        onClick={() => navigate('/upload')}
        style={{
          width:'48px', height:'48px',
          background:'var(--brand-gradient)',
          borderRadius:'14px',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'24px',
          boxShadow:'var(--brand-glow)',
          transition:'transform var(--transition-bounce)',
          border:'none', cursor:'pointer',
        }}
        onMouseDown={e => e.currentTarget.style.transform='scale(0.93)'}
        onMouseUp={e => e.currentTarget.style.transform='scale(1)'}
      >➕</button>

      {/* Challenge */}
      <NavBtn
        icon="🏆" label="Challenge" path="/challenge"
        active={isActive('/challenge')}
        onClick={() => navigate('/challenge')}
      />

      {/* Profile — shows user avatar */}
      <button
        onClick={() => navigate('/profile')}
        style={{
          display:'flex', flexDirection:'column',
          alignItems:'center', gap:'3px',
          flex:1, padding:'8px 0',
          opacity: isActive('/profile') ? 1 : 0.5,
          transition:'opacity var(--transition)',
          background:'none', border:'none', cursor:'pointer',
        }}
      >
        {/* Avatar or fallback icon */}
        <div style={{ position:'relative' }}>
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt=""
              style={{
                width:'26px', height:'26px',
                borderRadius:'50%', objectFit:'cover',
                border: isActive('/profile')
                  ? '2px solid var(--brand-red)'
                  : '1.5px solid rgba(255,255,255,0.3)',
                transition:'border-color 0.2s',
              }}
            />
          ) : (
            <div style={{
              width:'26px', height:'26px', borderRadius:'50%',
              background: isActive('/profile')
                ? 'var(--brand-gradient)'
                : 'var(--bg-elevated)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'13px', fontWeight:800, color:'white',
              border: isActive('/profile')
                ? '2px solid var(--brand-red)'
                : '1.5px solid rgba(255,255,255,0.2)',
              transition:'all 0.2s',
            }}>
              {user?.piUsername?.[0]?.toUpperCase() || '👤'}
            </div>
          )}
        </div>
        <span style={{
          fontSize:'0.65rem',
          fontFamily:'var(--font-display)',
          fontWeight: isActive('/profile') ? 700 : 400,
          color: isActive('/profile') ? 'var(--brand-red)' : 'var(--text-muted)',
        }}>Profile</span>
      </button>
    </nav>
  );
}

function NavBtn({ icon, label, path, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display:'flex', flexDirection:'column',
        alignItems:'center', gap:'3px',
        flex:1, padding:'8px 0',
        opacity: active ? 1 : 0.5,
        transition:'opacity var(--transition)',
        background:'none', border:'none', cursor:'pointer',
      }}
    >
      <span style={{ fontSize:'22px', lineHeight:1 }}>{icon}</span>
      <span style={{
        fontSize:'0.65rem',
        fontFamily:'var(--font-display)',
        fontWeight: active ? 700 : 400,
        color: active ? 'var(--brand-red)' : 'var(--text-muted)',
      }}>{label}</span>
    </button>
  );
}
