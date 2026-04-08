// ============================================================
// SPYCE - Listing Detail Page
// ============================================================
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { usePi } from '../hooks/usePi';
import { useAuthStore } from '../utils/store';
import toast from 'react-hot-toast';

export default function ListingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { purchaseItem } = usePi();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);

  useEffect(() => {
    api.get(`/marketplace/${id}`)
      .then(({ data }) => setListing(data.listing))
      .catch(() => toast.error('Listing not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleBuy = async () => {
    if (!listing) return;
    setBuying(true);
    try {
      const result = await purchaseItem(listing);
      if (result) {
        toast.success('Purchase complete! Check your profile for the item.');
      }
    } finally {
      setBuying(false);
    }
  };

  if (loading) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="animate-spin" style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--brand-red)', borderRadius: '50%' }} />
    </div>
  );

  if (!listing) return null;

  const isSeller = user?._id === listing.seller?._id;

  return (
    <div className="page">
      <div className="container">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          style={{ marginBottom: '16px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}
        >← Back</button>

        {/* Image Gallery */}
        {listing.images?.length > 0 && (
          <div style={{ borderRadius: '16px', overflow: 'hidden', marginBottom: '20px', aspectRatio: '1', background: 'var(--bg-card' }}>
            <img src={listing.images[imgIndex]} alt={listing.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {listing.images.length > 1 && (
              <div style={{ display: 'flex', gap: '8px', padding: '8px', justifyContent: 'center' }}>
                {listing.images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIndex(i)}
                    style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: i === imgIndex ? 'var(--brand-red)' : 'var(--border-strong)',
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Title + Price */}
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: '8px' }}>
          {listing.title}
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--pi-gold)' }}>
            {listing.price}π
          </span>
          {listing.averageRating > 0 && (
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <span style={{ color: '#f59e0b' }}>⭐</span>
              <span style={{ fontWeight: 700 }}>{listing.averageRating.toFixed(1)}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>({listing.reviews?.length})</span>
            </div>
          )}
        </div>

        {/* Seller */}
        <div
          onClick={() => navigate(`/profile/${listing.seller?.piUsername}`)}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            background: 'var(--bg-card)', borderRadius: '12px', padding: '12px',
            marginBottom: '20px', cursor: 'pointer',
          }}
        >
          <div className="avatar-placeholder" style={{ width: '40px', height: '40px', fontSize: '16px', flexShrink: 0 }}>
            {(listing.seller?.displayName || listing.seller?.piUsername || '?')[0].toUpperCase()}
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.88rem' }}>@{listing.seller?.piUsername}</p>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
              {listing.seller?.isVerified && <span style={{ fontSize: '0.72rem' }}>✅ Verified</span>}
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                ⭐ {listing.seller?.sellerRating?.toFixed(1) || 'New'} seller
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '10px' }}>Description</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6 }}>
            {listing.description}
          </p>
        </div>

        {/* Details */}
        <div className="card" style={{ marginBottom: '24px' }}>
          {[
            ['Category', listing.category],
            ['Type', listing.isDigital ? 'Digital Product' : 'Physical Item'],
            ['Stock', listing.stock === -1 ? 'Unlimited' : listing.stock],
            listing.shipsFrom && ['Ships from', listing.shipsFrom],
          ].filter(Boolean).map(([key, val]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>{key}</span>
              <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{val}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        {!isSeller ? (
          <button
            className="btn btn-pi btn-lg"
            onClick={handleBuy}
            disabled={buying || listing.status !== 'active'}
            style={{ width: '100%' }}
          >
            {buying ? 'Processing...' : `Buy for ${listing.price}π`}
          </button>
        ) : (
          <button className="btn btn-ghost btn-lg" style={{ width: '100%' }} disabled>
            This is your listing
          </button>
        )}
      </div>
    </div>
  );
}
