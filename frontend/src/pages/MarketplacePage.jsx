// ============================================================
// SPYCE - Marketplace Page
// ============================================================
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const CATEGORIES = [
  { id: '', label: 'All' },
  { id: 'digital', label: '💾 Digital' },
  { id: 'handmade', label: '🎨 Handmade' },
  { id: 'fashion', label: '👗 Fashion' },
  { id: 'food', label: '🍱 Food' },
  { id: 'services', label: '🛠️ Services' },
  { id: 'gaming', label: '🎮 Gaming' },
  { id: 'music', label: '🎵 Music' },
];

export default function MarketplacePage() {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchListings();
  }, [category]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/marketplace', { params: { category, q: search || undefined } });
      setListings(data.listings || []);
    } catch {}
    finally { setLoading(false); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchListings();
  };

  return (
    <div className="page">
      <div className="container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingTop: '8px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem' }}>🛍️ Marketplace</h1>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/marketplace/new')}
          >+ Sell</button>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} style={{ marginBottom: '16px' }}>
          <input
            placeholder="Search listings..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </form>

        {/* Category pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '20px' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              style={{
                padding: '8px 14px',
                borderRadius: '50px',
                whiteSpace: 'nowrap',
                fontSize: '0.82rem',
                fontWeight: 600,
                background: category === cat.id ? 'var(--brand-gradient)' : 'var(--bg-card)',
                border: `1px solid ${category === cat.id ? 'transparent' : 'var(--border)'}`,
                color: category === cat.id ? 'white' : 'var(--text-secondary)',
                transition: 'all 0.2s',
              }}
            >{cat.label}</button>
          ))}
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '200px', borderRadius: '14px' }} />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🛍️</div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1rem' }}>No listings found</p>
            <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>Be the first to sell something!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {listings.map(listing => (
              <ListingCard key={listing._id} listing={listing} onClick={() => navigate(`/marketplace/${listing._id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ListingCard({ listing, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.2s, border-color 0.2s',
      }}
      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      {/* Image */}
      <div style={{ aspectRatio: '1', background: 'var(--bg-elevated)', position: 'relative' }}>
        {listing.images?.[0] ? (
          <img src={listing.images[0]} alt={listing.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
            {listing.isDigital ? '💾' : '📦'}
          </div>
        )}
        {listing.isDigital && (
          <span style={{
            position: 'absolute', top: '8px', left: '8px',
            background: 'rgba(0,0,0,0.7)',
            color: 'white', fontSize: '0.65rem',
            padding: '2px 8px', borderRadius: '10px', fontWeight: 700,
          }}>DIGITAL</span>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '10px' }}>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '0.85rem',
          lineHeight: 1.2,
          marginBottom: '6px',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>{listing.title}</p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--pi-gold)', fontWeight: 700, fontSize: '0.9rem' }}>
            {listing.price}π
          </span>
          {listing.averageRating > 0 && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              ⭐ {listing.averageRating.toFixed(1)}
            </span>
          )}
        </div>

        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          by @{listing.seller?.piUsername}
        </p>
      </div>
    </div>
  );
}
