// ============================================================
// SPYCE - Challenge Page
// ============================================================
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function ChallengePage() {
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState(null);
  const [allChallenges, setAllChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/challenges/active'),
      api.get('/challenges'),
    ]).then(([active, all]) => {
      setChallenge(active.data.challenge);
      setAllChallenges(all.data.challenges || []);
    }).finally(() => setLoading(false));
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!challenge) return;
    const update = () => {
      const diff = new Date(challenge.endDate) - Date.now();
      if (diff <= 0) { setTimeLeft('Ended'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [challenge]);

  if (loading) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="animate-spin" style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--brand-red)', borderRadius: '50%' }} />
    </div>
  );

  return (
    <div className="page">
      <div className="container">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: '24px', paddingTop: '8px' }}>
          🏆 Daily Challenges
        </h1>

        {/* Active Challenge Hero */}
        {challenge ? (
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,60,95,0.15), rgba(255,124,53,0.1))',
            border: '1px solid rgba(255,60,95,0.3)',
            borderRadius: '20px',
            padding: '24px',
            marginBottom: '24px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {challenge.bannerImage && (
              <img src={challenge.bannerImage} alt="" style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover', opacity: 0.1,
              }} />
            )}

            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span style={{
                  background: 'var(--brand-gradient)',
                  color: 'white',
                  borderRadius: '20px',
                  padding: '4px 12px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-display)',
                }}>🔴 LIVE NOW</span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontFeatureSettings: '"tnum"' }}>
                  ⏱ {timeLeft}
                </span>
              </div>

              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: '8px' }}>
                {challenge.title}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '16px', lineHeight: 1.5 }}>
                {challenge.description}
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
                <div className="pi-badge">
                  🪙 {challenge.rewardPerParticipant}π per entry
                </div>
                <div className="pi-badge">
                  🏅 {challenge.winnerReward}π top prize
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  👥 {challenge.participantsCount} participants
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={() => navigate('/upload')}
                style={{ width: '100%' }}
              >
                🎬 Submit Your Video
              </button>
            </div>
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>⏳</div>
            <h3 style={{ fontFamily: 'var(--font-display)' }}>No active challenge right now</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '8px' }}>Check back soon!</p>
          </div>
        )}

        {/* How it works */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '16px', fontSize: '1rem' }}>
            How Challenges Work
          </h3>
          {[
            ['🎬', 'Upload a video matching the challenge theme'],
            ['🪙', 'Earn Pi just for participating'],
            ['❤️', 'Get votes — top creators win bonus Pi'],
            ['🏆', 'Winners announced when challenge ends'],
          ].map(([icon, text]) => (
            <div key={text} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
              <span style={{ fontSize: '20px' }}>{icon}</span>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{text}</p>
            </div>
          ))}
        </div>

        {/* Past Challenges */}
        <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '16px' }}>Past Challenges</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {allChallenges.filter(c => !c.isActive).slice(0, 5).map(c => (
            <div key={c._id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.9rem', fontFamily: 'var(--font-display)' }}>{c.title}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '2px' }}>
                  #{c.hashtag} · {c.participantsCount} entries
                </p>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Ended</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
