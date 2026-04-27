// ============================================================
// SPYCE - Login Page v2
// FIXED: No auto-login on mount
// FIXED: Better error messages shown on screen
// FIXED: Timeout so it never hangs forever
// FIXED: Works outside Pi Browser with clear message
// FILE: frontend/src/pages/LoginPage.jsx
// ============================================================
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuthStore } from '../utils/store';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [inPiBrowser, setInPiBrowser] = useState(true);

  // Check if we're in Pi Browser — but DO NOT auto-login
  useEffect(() => {
    const isPiBrowser = !!(window.Pi);
    setInPiBrowser(isPiBrowser);
    // ⚠️ NO auto-login here — user must tap the button
  }, []);

  const handleLogin = async () => {
    if (loading) return;
    setError('');

    // Must be in Pi Browser
    if (!window.Pi) {
      setError('Please open SPYCE in the Pi Browser app to sign in.');
      return;
    }

    setLoading(true);

    // Timeout safety — if Pi SDK never responds, unlock after 20s
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError('Connection timed out. Please try again.');
      toast.error('Login timed out — please try again');
    }, 20000);

    try {
      const scopes = ['username', 'payments'];

      // Handle incomplete payments found during auth
      const onIncompletePaymentFound = async (payment) => {
        try {
          await api.post('/payments/approve', { paymentId: payment.identifier });
          await api.post('/payments/complete', {
            paymentId: payment.identifier,
            txid: payment.transaction?.txid,
          });
        } catch (err) {
          console.warn('Incomplete payment handling error:', err);
        }
      };

      // ── This is the ONLY place Pi.authenticate() is called ──
      const authResult = await window.Pi.authenticate(scopes, onIncompletePaymentFound);

      clearTimeout(timeoutId);

      if (!authResult || !authResult.accessToken) {
        throw new Error('Authentication cancelled or failed.');
      }

      // Verify with our backend
      const { data } = await api.post('/auth/pi', {
        accessToken: authResult.accessToken,
        username: authResult.user.username,
        referralCode: referralCode || undefined,
      });

      setAuth(data.user, data.token);

      toast.success(
        data.isNewUser
          ? `Welcome to SPYCE, @${data.user.piUsername}! 🌶️`
          : `Welcome back, @${data.user.piUsername}!`
      );

      navigate('/');

    } catch (err) {
      clearTimeout(timeoutId);
      setLoading(false);

      const msg = err.response?.data?.error
        || err.message
        || 'Login failed. Please try again.';

      // User-friendly error messages
      if (msg.includes('cancelled') || msg.includes('cancel')) {
        setError('Login was cancelled. Tap the button to try again.');
      } else if (msg.includes('network') || msg.includes('Network')) {
        setError('Network error — check your connection and try again.');
      } else if (msg.includes('verification')) {
        setError('Pi Network verification failed. Make sure you\'re using the Pi Browser.');
      } else {
        setError(msg);
      }

      console.error('Pi auth error:', err);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(255,60,95,0.18) 0%, var(--bg-primary) 65%)',
      padding: '24px',
      textAlign: 'center',
    }}>

      {/* Logo */}
      <div style={{ marginBottom: '44px' }}>
        <div style={{
          fontSize: '72px', marginBottom: '16px',
          filter: 'drop-shadow(0 0 30px rgba(255,60,95,0.5))',
          lineHeight: 1,
        }}>🌶️</div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2.5rem, 10vw, 3.5rem)',
          fontWeight: 800,
          background: 'var(--brand-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.02em',
          lineHeight: 1,
          marginBottom: '12px',
        }}>SPYCE</h1>
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '0.95rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          fontWeight: 500,
        }}>Create • Challenge • Earn Pi</p>
      </div>

      {/* Feature pills */}
      <div style={{
        display: 'flex', flexWrap: 'wrap',
        gap: '8px', justifyContent: 'center',
        marginBottom: '44px',
      }}>
        {['🎬 Short Videos', '🏆 Daily Challenges', '🪙 Earn Pi', '🛍️ Marketplace'].map(f => (
          <span key={f} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '20px', padding: '6px 14px',
            fontSize: '0.82rem', color: 'var(--text-secondary)',
          }}>{f}</span>
        ))}
      </div>

      {/* Referral code */}
      <div style={{ width: '100%', maxWidth: '340px', marginBottom: '14px' }}>
        <input
          type="text"
          placeholder="Referral code (optional)"
          value={referralCode}
          onChange={e => setReferralCode(e.target.value.toUpperCase())}
          disabled={loading}
          style={{ textAlign: 'center', letterSpacing: '0.1em', width: '100%' }}
        />
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          width: '100%', maxWidth: '340px',
          marginBottom: '14px',
          padding: '12px 16px',
          background: 'rgba(255,60,60,0.1)',
          border: '1px solid rgba(255,80,80,0.3)',
          borderRadius: '12px',
          fontSize: '0.82rem',
          color: '#ff8080',
          lineHeight: 1.4,
          textAlign: 'left',
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Login button */}
      <button
        onClick={handleLogin}
        disabled={loading}
        style={{
          width: '100%', maxWidth: '340px',
          minHeight: '58px', padding: '0 24px',
          background: loading ? 'var(--bg-elevated)' : 'var(--brand-gradient)',
          border: 'none', borderRadius: '16px',
          color: loading ? 'var(--text-muted)' : 'white',
          fontFamily: 'var(--font-display)',
          fontWeight: 700, fontSize: '1.05rem',
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: '10px',
          transition: 'all 0.2s',
          boxShadow: loading ? 'none' : '0 4px 24px rgba(255,60,95,0.35)',
        }}
      >
        {loading ? (
          <>
            <span style={{
              width: '20px', height: '20px',
              border: '2.5px solid rgba(255,255,255,0.3)',
              borderTopColor: 'white',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'spin 0.8s linear infinite',
              flexShrink: 0,
            }}/>
            Connecting to Pi...
          </>
        ) : (
          <>
            <span style={{ fontSize: '1.3rem', fontFamily: 'Georgia, serif' }}>π</span>
            Sign in with Pi Network
          </>
        )}
      </button>

      {/* Not in Pi Browser warning */}
      {!inPiBrowser && !loading && (
        <div style={{
          marginTop: '16px',
          padding: '10px 16px',
          background: 'rgba(240,165,0,0.1)',
          border: '1px solid rgba(240,165,0,0.3)',
          borderRadius: '12px',
          fontSize: '0.78rem',
          color: 'var(--pi-gold)',
          maxWidth: '340px',
        }}>
          ⚠️ Pi Browser not detected. Please open this app in Pi Browser to sign in.
        </div>
      )}

      <p style={{
        color: 'var(--text-muted)',
        fontSize: '0.78rem',
        marginTop: '20px',
        maxWidth: '280px',
        lineHeight: 1.6,
      }}>
        Requires Pi Browser. Your Pi wallet is your account — no password needed.
      </p>

      <div style={{
        marginTop: '40px',
        borderTop: '1px solid var(--border)',
        paddingTop: '20px',
        width: '100%', maxWidth: '340px',
      }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          SPYCE is a verified Pi Network app. Transactions use real Pi on Mainnet.
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
