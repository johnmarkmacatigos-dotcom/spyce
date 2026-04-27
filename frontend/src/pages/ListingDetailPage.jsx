// ============================================================
// SPYCE - Listing Detail Page v2
// FIXED: Full Pi payment flow for buying
// FILE: frontend/src/pages/ListingDetailPage.jsx
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
  const [showReview, setShowReview] = useState(false);
  const [review, setReview] = useState({ rating: 5, comment: '' });

  useEffect(() => {
    api.get(`/marketplace/${id}`)
      .then(({ data }) => setListing(data.listing))
      .catch(() => toast.error('Listing not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleBuy = async () => {
    if (!listing) return;
    if (!window.Pi) {
      toast.error('Please open SPYCE in Pi Browser to make purchases');
      return;
    }
    setBuying(true);
    try {
      const result = await purchaseItem(listing);
      if (result) {
        toast.success(`✅ Purchase complete! You bought "${listing.title}"`, { duration: 5000 });
        // Refresh listing to update stock
        const { data } = await api.get(`/marketplace/${id}`);
        setListing(data.listing);
      }
    } catch (err) {
      toast.error(err.message || 'Purchase failed');
    } finally {
      setBuying(false);
    }
  };

  const handleReview = async () => {
    try {
      await api.post(`/marketplace/${id}/review`, review);
      toast.success('Review submitted! ⭐');
      setShowReview(false);
      const { data } = await api.get(`/marketplace/${id}`);
      setListing(data.listing);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit review');
    }
  };

  if (loading) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="animate-spin" style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--brand-red)', borderRadius: '50%' }}/>
    </div>
  );

  if (!listing) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '48px' }}>😕</div>
      <p style={{ color: 'var(--text-muted)' }}>Listing not found</p>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/marketplace')}>← Back to Marketplace</button>
    </div>
  );

  const isSeller = user?._id === listing.seller?._id || user?._id === listing.seller;
  const isOutOfStock = listing.stock === 0;
  const totalRating = listing.reviews?.reduce((s, r) => s + r.rating, 0) || 0;
  const avgRating = listing.reviews?.length ? (totalRating / listing.reviews.length).toFixed(1) : null;

  return (
    <div className="page" style={{ paddingBottom: '100px' }}>
      <div className="container">
        {/* Back */}
        <button onClick={() => navigate(-1)} style={{ marginBottom: '16px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', background: 'none', border: 'none', cursor: 'pointer' }}>
          ← Back
        </button>

        {/* Images */}
        {listing.images?.length > 0 ? (
          <div style={{ borderRadius: '16px', overflow: 'hidden', marginBottom: '20px', aspectRatio: '1', background: 'var(--bg-card)' }}>
            <img src={listing.images[imgIndex]} alt={listing.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
            {listing.images.length > 1 && (
              <div style={{ display: 'flex', gap: '8px', padding: '10px', justifyContent: 'center' }}>
                {listing.images.map((_, i) => (
                  <button key={i} onClick={() => setImgIndex(i)} style={{ width: '8px', height: '8px', borderRadius: '50%', border: 'none', background: i === imgIndex ? 'var(--brand-red)' : 'var(--border-strong)', cursor: 'pointer', padding: 0 }}/>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ height: '160px', background: 'var(--bg-card)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', marginBottom: '20px' }}>
            {listing.isDigital ? '💾' : '📦'}
          </div>
        )}

        {/* Title + Price */}
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: '10px' }}>{listing.title}</h1>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--pi-gold)' }}>{listing.price}π</span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
            {avgRating && (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>⭐ {avgRating} ({listing.reviews.length})</span>
            )}
            <span style={{ fontSize: '0.78rem', color: isOutOfStock ? 'var(--brand-red)' : '#4ade80' }}>
              {isOutOfStock ? '❌ Out of stock' : listing.stock === -1 ? '✅ Unlimited' : `✅ ${listing.stock} left`}
            </span>
          </div>
        </div>

        {/* Seller */}
        <div onClick={() => navigate(`/profile/${listing.seller?.piUsername}`)}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-card)', borderRadius: '14px', padding: '12px 14px', marginBottom: '20px', cursor: 'pointer' }}>
          {listing.seller?.avatar ? (
            <img src={listing.seller.avatar} alt="" style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }}/>
          ) : (
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--brand-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '18px' }}>
              {(listing.seller?.displayName || listing.seller?.piUsername || '?')[0].toUpperCase()}
            </div>
          )}
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>@{listing.seller?.piUsername}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {listing.seller?.isVerified && '✅ Verified · '}
              ⭐ {listing.seller?.sellerRating?.toFixed(1) || '0'} seller · {listing.salesCount || 0} sales
            </p>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--brand-red)' }}>View →</span>
        </div>

        {/* Description */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '14px', padding: '14px', marginBottom: '16px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '10px' }}>Description</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6 }}>{listing.description}</p>
        </div>

        {/* Details */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '14px', padding: '14px', marginBottom: '20px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '12px' }}>Details</h3>
          {[
            ['Category', listing.category],
            ['Type', listing.isDigital ? '💾 Digital Download' : '📦 Physical Item'],
            ['Stock', listing.stock === -1 ? '∞ Unlimited' : listing.stock],
            listing.shipsFrom && ['Ships from', listing.shipsFrom],
            listing.tags?.length && ['Tags', listing.tags.join(', ')],
          ].filter(Boolean).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>{k}</span>
              <span style={{ fontWeight: 600, textTransform: 'capitalize', textAlign: 'right', maxWidth: '60%' }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Reviews */}
        {listing.reviews?.length > 0 && (
          <div style={{ background: 'var(--bg-card)', borderRadius: '14px', padding: '14px', marginBottom: '20px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '12px' }}>Reviews ({listing.reviews.length})</h3>
            {listing.reviews.slice(0, 5).map((r, i) => (
              <div key={i} style={{ borderBottom: i < listing.reviews.length - 1 ? '1px solid var(--border)' : 'none', paddingBottom: '10px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>⭐ {r.rating}/5</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                {r.comment && <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{r.comment}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Review form (for buyers) */}
        {!isSeller && showReview && (
          <div style={{ background: 'var(--bg-card)', borderRadius: '14px', padding: '14px', marginBottom: '16px', border: '1px solid rgba(255,60,95,0.2)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '12px' }}>Leave a Review</h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setReview(r => ({...r, rating: n}))}
                  style={{ fontSize: '22px', background: 'none', border: 'none', cursor: 'pointer', opacity: review.rating >= n ? 1 : 0.3, transition: 'opacity 0.15s' }}>⭐</button>
              ))}
            </div>
            <textarea placeholder="Your review (optional)" value={review.comment}
              onChange={e => setReview(r => ({...r, comment: e.target.value}))}
              rows={2} maxLength={300}
              style={{ width: '100%', marginBottom: '10px', resize: 'none', borderRadius: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '10px', fontSize: '0.88rem', outline: 'none' }}/>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowReview(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleReview} style={{ flex: 2 }}>Submit Review</button>
            </div>
          </div>
        )}

        {/* CTA Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {!isSeller ? (
            <>
              <button onClick={handleBuy} disabled={buying || isOutOfStock || listing.status !== 'active'}
                style={{
                  width: '100%', padding: '18px',
                  background: !buying && !isOutOfStock && listing.status === 'active' ? 'linear-gradient(135deg, #f0a500, #ffd166)' : 'var(--bg-elevated)',
                  border: 'none', borderRadius: '16px',
                  color: !buying && !isOutOfStock && listing.status === 'active' ? '#0a0a0f' : 'var(--text-muted)',
                  fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem',
                  cursor: !buying && !isOutOfStock ? 'pointer' : 'not-allowed',
                  boxShadow: !buying && !isOutOfStock ? '0 4px 20px rgba(240,165,0,0.35)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {buying ? '⏳ Processing...' : isOutOfStock ? '❌ Out of Stock' : `🪙 Buy for ${listing.price}π`}
              </button>
              {!showReview && (
                <button className="btn btn-ghost btn-sm" onClick={() => setShowReview(true)} style={{ width: '100%' }}>
                  ⭐ Leave a Review
                </button>
              )}
            </>
          ) : (
            <div style={{ background: 'var(--bg-card)', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '10px' }}>This is your listing</p>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/marketplace?mode=sell')} style={{ width: '100%' }}>
                + Create Another Listing
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
