// ============================================================
// SPYCE - Login Page
// ============================================================
import React, { useState } from 'react';
import { usePi } from '../hooks/usePi';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { authenticateWithPi } = usePi();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [referralCode, setReferralCode] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    const user = await authenticateWithPi(referralCode || null);
    setLoading(false);
    if (user) navigate('/');
  };

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(255,60,95,0.15) 0%, var(--bg-primary) 60%)',
      padding: '24px',
      textAlign: 'center',
    }}>

      {/* Logo */}
      <div style={{ marginBottom: '48px' }}>
        <div style={{
          fontSize: '64px',
          marginBottom: '16px',
          filter: 'drop-shadow(0 0 30px rgba(255,60,95,0.5))',
        }}>🌶️</div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '3.5rem',
          fontWeight: 800,
          background: 'var(--brand-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}>SPYCE</h1>
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '1rem',
          marginTop: '12px',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          fontWeight: 500,
        }}>Create • Challenge • Earn Pi</p>
      </div>

      {/* Feature Pills */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        justifyContent: 'center',
        marginBottom: '48px',
      }}>
        {['🎬 Short Videos', '🏆 Daily Challenges', '🪙 Earn Pi', '🛍️ Marketplace'].map(f => (
          <span key={f} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            padding: '6px 14px',
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
          }}>{f}</span>
        ))}
      </div>

      {/* Referral Code */}
      <div style={{ width: '100%', maxWidth: '320px', marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Referral code (optional)"
          value={referralCode}
          onChange={e => setReferralCode(e.target.value.toUpperCase())}
          style={{ textAlign: 'center', letterSpacing: '0.1em' }}
        />
      </div>

      {/* Pi Login Button */}
      <button
        className="btn btn-primary btn-lg"
        onClick={handleLogin}
        disabled={loading}
        style={{ width: '100%', maxWidth: '320px', minHeight: '56px' }}
      >
        {loading ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="animate-spin" style={{
              width: '18px', height: '18px', border: '2px solid white',
              borderTopColor: 'transparent', borderRadius: '50%', display: 'block'
            }} />
            Connecting to Pi...
          </span>
        ) : (
          <>
            <span style={{ fontSize: '1.2rem' }}>π</span>
            Sign in with Pi Network
          </>
        )}
      </button>

      <p style={{
        color: 'var(--text-muted)',
        fontSize: '0.78rem',
        marginTop: '24px',
        maxWidth: '280px',
        lineHeight: 1.5,
      }}>
        Requires Pi Browser. Your Pi wallet is your account — no password needed.
      </p>

      {/* Divider */}
      <div style={{
        marginTop: '48px',
        borderTop: '1px solid var(--border)',
        paddingTop: '24px',
        width: '100%',
        maxWidth: '320px',
      }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
          SPYCE is a verified Pi Network app. Transactions use real Pi on Mainnet.
        </p>
      </div>
    </div>
  );
}
