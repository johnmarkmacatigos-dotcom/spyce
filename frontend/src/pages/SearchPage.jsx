// ============================================================
// SPYCE - Search Page
// ============================================================
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const TRENDING_TAGS = ['dance', 'food', 'travel', 'gaming', 'craft', 'music', 'beauty', 'funny'];

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = React.useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const t = setTimeout(() => { if (query.trim()) search(); else setResults([]); }, 500);
    return () => clearTimeout(t);
  }, [query]);

  const search = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/feed/search', { params: { q: query } });
      setResults(data.videos || []);
    } catch {}
    finally { setLoading(false); }
  };

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: '16px' }}>
        {/* Search input */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px' }}>🔍</span>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search videos, hashtags..."
              style={{ paddingLeft: '42px', borderRadius: '50px' }}
            />
          </div>
          {query && (
            <button onClick={() => { setQuery(''); setResults([]); }} style={{ color: 'var(--text-muted)' }}>✕</button>
          )}
        </div>

        {/* Trending hashtags (when no query) */}
        {!query && (
          <>
            <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '12px', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              🔥 Trending
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '32px' }}>
              {TRENDING_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => setQuery('#' + tag)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '50px',
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    transition: 'all 0.15s',
                  }}
                >#{tag}</button>
              ))}
            </div>
          </>
        )}

        {/* Results */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton" style={{ aspectRatio: '9/16', height: '200px' }} />
            ))}
          </div>
        ) : results.length > 0 ? (
          <>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '12px' }}>
              {results.length} results for "{query}"
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
              {results.map(v => (
                <div key={v._id} style={{ aspectRatio: '9/16', background: 'var(--bg-card)', overflow: 'hidden', cursor: 'pointer', position: 'relative' }}>
                  {v.thumbnailUrl ? (
                    <img src={v.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', fontSize: '32px' }}>🎬</div>
                  )}
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                    padding: '20px 8px 8px',
                  }}>
                    <p style={{ fontSize: '0.72rem', fontWeight: 700 }}>@{v.creator?.piUsername}</p>
                    <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)' }}>❤️ {v.likesCount || 0}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : query && !loading ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
            <p>No results for "{query}"</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
