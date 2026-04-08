// ============================================================
// SPYCE - FeedHeader Component
// ============================================================
import React from 'react';
import { useFeedStore } from '../../utils/store';

export default function FeedHeader() {
  const { feedType, setFeedType } = useFeedStore();

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      display: 'flex',
      justifyContent: 'center',
      padding: '16px 0 8px',
      background: 'linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)',
      pointerEvents: 'auto',
    }}>
      <div style={{ display: 'flex', gap: '24px' }}>
        {['following', 'foryou'].map(type => (
          <button
            key={type}
            onClick={() => setFeedType(type)}
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '0.95rem',
              color: feedType === type ? 'white' : 'rgba(255,255,255,0.5)',
              borderBottom: feedType === type ? '2px solid white' : '2px solid transparent',
              paddingBottom: '4px',
              transition: 'all 0.2s',
              background: 'none',
              letterSpacing: '0.02em',
            }}
          >
            {type === 'following' ? 'Following' : 'For You'}
          </button>
        ))}
      </div>
    </div>
  );
}
