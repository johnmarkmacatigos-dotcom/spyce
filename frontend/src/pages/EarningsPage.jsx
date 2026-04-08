// ============================================================
// SPYCE - Earnings Dashboard Page
// ============================================================
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuthStore } from '../utils/store';

export default function EarningsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/earnings')
      .then(res => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="animate-spin" style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--pi-gold)', borderRadius: '50%' }} />
    </div>
  );

  if (!data) return null;

  const earningsTypes = {
    tip: { label: 'Tips Received', icon: '🪙' },
    marketplace: { label: 'Marketplace Sales', icon: '🛍️' },
    challenge_reward: { label: 'Challenge Rewards', icon: '🏆' },
    referral: { label: 'Referrals', icon: '👥' },
  };

  return (
    <div className="page">
      <div className="container">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', paddingTop: '8px' }}>
          <button onClick={() => navigate(-1)} style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>←</button>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem' }}>💰 Earnings</h1>
        </div>

        {/* Balance Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(240,165,0,0.2), rgba(255,209,102,0.1))',
          border: '1px solid rgba(240,165,0,0.3)',
          borderRadius: '20px',
          padding: '24px',
          marginBottom: '20px',
          textAlign: 'center',
        }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>Available Balance</p>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '3rem',
            fontWeight: 800,
            color: 'var(--pi-gold)',
            lineHeight: 1,
            marginBottom: '4px',
          }}>{(data.balance || 0).toFixed(4)}π</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
            Total earned lifetime: {(data.totalEarned || 0).toFixed(4)}π
          </p>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Challenges', value: data.challengesCompleted, icon: '🏆' },
            { label: 'Referrals', value: data.referralCount, icon: '👥' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '6px' }}>{icon}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem' }}>{value || 0}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* 7-Day Chart */}
        {data.dailyEarnings?.length > 0 && (
          <div className="card" style={{ marginBottom: '20px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '16px' }}>
              Last 7 Days
            </h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '80px' }}>
              {data.dailyEarnings.map((day, i) => {
                const max = Math.max(...data.dailyEarnings.map(d => d.amount), 0.001);
                const height = day.amount > 0 ? Math.max((day.amount / max) * 70, 4) : 4;
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: '100%',
                      height: `${height}px`,
                      background: day.amount > 0 ? 'var(--pi-gradient)' : 'var(--bg-elevated)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.4s ease',
                    }} />
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{day.date}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Earnings Breakdown */}
        {Object.keys(data.breakdown || {}).length > 0 && (
          <div className="card" style={{ marginBottom: '20px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '16px' }}>
              Earnings Breakdown
            </h3>
            {Object.entries(data.breakdown).map(([type, amount]) => (
              <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>{earningsTypes[type]?.icon || '💰'}</span>
                  <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                    {earningsTypes[type]?.label || type}
                  </span>
                </div>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--pi-gold)' }}>
                  +{amount.toFixed(4)}π
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Top Videos */}
        {data.topVideos?.length > 0 && (
          <div className="card" style={{ marginBottom: '20px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '16px' }}>
              Top Earning Videos
            </h3>
            {data.topVideos.map((v, i) => (
              <div key={v._id} style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 700, width: '16px' }}>#{i + 1}</span>
                {v.thumbnailUrl && (
                  <div style={{ width: '44px', height: '44px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                    <img src={v.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, lineHeight: 1.2 }}>
                    {v.title || 'Untitled video'}
                  </p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {v.viewsCount?.toLocaleString()} views · ❤️ {v.likesCount}
                  </p>
                </div>
                <span style={{ color: 'var(--pi-gold)', fontWeight: 700, fontSize: '0.88rem' }}>
                  {(v.tipsReceived || 0).toFixed(3)}π
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Referral Section */}
        <div className="card" style={{ marginBottom: '80px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '8px' }}>
            👥 Refer Friends
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '12px', lineHeight: 1.5 }}>
            Share your referral code and earn 0.5π when they complete their first challenge.
          </p>
          <div style={{
            background: 'var(--bg-elevated)',
            borderRadius: '10px',
            padding: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: '1.1rem',
              letterSpacing: '0.1em',
              color: 'var(--brand-red)',
            }}>{user?.referralCode}</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                navigator.clipboard.writeText(user?.referralCode);
                import('react-hot-toast').then(m => m.default.success('Referral code copied!'));
              }}
            >Copy</button>
          </div>
        </div>
      </div>
    </div>
  );
}
