// ============================================================
// SPYCE - Marketplace Page v2
// FIXED: Working Buy/Sell with Pi payments
// FIXED: Create listing from profile "Sell" button
// FILE: frontend/src/pages/MarketplacePage.jsx
// ============================================================
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { usePi } from '../hooks/usePi';
import { useAuthStore } from '../utils/store';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { id: '', label: '🛍️ All' },
  { id: 'digital', label: '💾 Digital' },
  { id: 'handmade', label: '🎨 Handmade' },
  { id: 'fashion', label: '👗 Fashion' },
  { id: 'food', label: '🍱 Food' },
  { id: 'services', label: '🛠️ Services' },
  { id: 'gaming', label: '🎮 Gaming' },
  { id: 'music', label: '🎵 Music' },
  { id: 'other', label: '📦 Other' },
];

export default function MarketplacePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('browse'); // 'browse' | 'sell' | 'myListings'

  // If coming from profile "Sell" button, open sell tab
  useEffect(() => {
    if (searchParams.get('mode') === 'sell') setTab('sell');
  }, []);

  useEffect(() => {
    if (tab === 'browse') fetchListings();
    if (tab === 'myListings') fetchMyListings();
  }, [category, tab]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/marketplace', {
        params: { category: category || undefined, q: search || undefined }
      });
      setListings(data.listings || []);
    } catch { setListings([]); }
    finally { setLoading(false); }
  };

  const fetchMyListings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/marketplace', {
        params: { sellerId: user._id }
      });
      setListings(data.listings || []);
    } catch { setListings([]); }
    finally { setLoading(false); }
  };

  return (
    <div className="page" style={{ paddingBottom: '100px' }}>
      <div className="container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingTop: '8px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem' }}>🛍️ Marketplace</h1>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {[
            { id: 'browse', label: '🔍 Browse' },
            { id: 'sell', label: '+ Sell' },
            { id: 'myListings', label: '📦 My Listings' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '10px',
              background: tab === t.id ? 'var(--brand-gradient)' : 'var(--bg-card)',
              border: `1px solid ${tab === t.id ? 'transparent' : 'var(--border)'}`,
              borderRadius: '12px', color: tab === t.id ? 'white' : 'var(--text-secondary)',
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.82rem',
              cursor: 'pointer', transition: 'all 0.2s',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Browse Tab */}
        {tab === 'browse' && (
          <>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input placeholder="Search listings..." value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchListings()}
                style={{ flex: 1, borderRadius: '12px' }}
              />
              <button onClick={fetchListings} style={{ padding: '0 16px', background: 'var(--brand-gradient)', border: 'none', borderRadius: '12px', color: 'white', cursor: 'pointer', fontSize: '18px' }}>🔍</button>
            </div>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px' }}>
              {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => setCategory(cat.id)} style={{
                  padding: '7px 14px', borderRadius: '50px', whiteSpace: 'nowrap',
                  fontSize: '0.78rem', fontWeight: 600,
                  background: category === cat.id ? 'var(--brand-gradient)' : 'var(--bg-card)',
                  border: `1px solid ${category === cat.id ? 'transparent' : 'var(--border)'}`,
                  color: category === cat.id ? 'white' : 'var(--text-secondary)',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}>{cat.label}</button>
              ))}
            </div>
            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: '200px', borderRadius: '14px' }}/>)}
              </div>
            ) : listings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🛍️</div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: '8px' }}>No listings yet</p>
                <p style={{ fontSize: '0.85rem' }}>Be the first to sell something!</p>
                <button className="btn btn-primary btn-sm" style={{ marginTop: '16px' }} onClick={() => setTab('sell')}>+ Create Listing</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {listings.map(l => (
                  <ListingCard key={l._id} listing={l} onClick={() => navigate(`/marketplace/${l._id}`)}/>
                ))}
              </div>
            )}
          </>
        )}

        {/* Sell Tab */}
        {tab === 'sell' && <CreateListingForm onSuccess={() => setTab('myListings')}/>}

        {/* My Listings Tab */}
        {tab === 'myListings' && (
          <>
            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[...Array(2)].map((_, i) => <div key={i} className="skeleton" style={{ height: '200px', borderRadius: '14px' }}/>)}
              </div>
            ) : listings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📦</div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: '8px' }}>No listings yet</p>
                <button className="btn btn-primary btn-sm" style={{ marginTop: '8px' }} onClick={() => setTab('sell')}>+ Create Your First Listing</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {listings.map(l => (
                  <ListingCard key={l._id} listing={l} isOwner onClick={() => navigate(`/marketplace/${l._id}`)}
                    onDelete={async () => {
                      try {
                        await api.put(`/marketplace/${l._id}`, { status: 'removed' });
                        fetchMyListings();
                        toast.success('Listing removed');
                      } catch { toast.error('Failed to remove'); }
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Create Listing Form ───────────────────────────────────────
function CreateListingForm({ onSuccess }) {
  const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  const [form, setForm] = useState({
    title: '', description: '', category: 'other',
    price: '', stock: '1', isDigital: false, shipsFrom: '', tags: '',
  });
  const [images, setImages] = useState([]);
  const [imageUrls, setImageUrls] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files).slice(0, 5);
    if (!files.length) return;
    setUploading(true);
    const uploaded = [];
    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('upload_preset', UPLOAD_PRESET);
        fd.append('resource_type', 'image');
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: fd });
        const data = await res.json();
        if (data.secure_url) uploaded.push(data.secure_url);
      } catch {}
    }
    setImageUrls(prev => [...prev, ...uploaded].slice(0, 5));
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!form.title || !form.description || !form.price) {
      toast.error('Title, description, and price are required');
      return;
    }
    if (parseFloat(form.price) < 0.1) {
      toast.error('Minimum price is 0.1π');
      return;
    }
    setSaving(true);
    try {
      await api.post('/marketplace', {
        ...form,
        price: parseFloat(form.price),
        stock: parseInt(form.stock) || 1,
        images: imageUrls,
      });
      toast.success('Listing created! 🎉');
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create listing');
    } finally { setSaving(false); }
  };

  const f = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>Create a Listing</h2>

      {/* Images */}
      <div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Photos (up to 5)</p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {imageUrls.map((url, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <img src={url} alt="" style={{ width: '70px', height: '70px', borderRadius: '10px', objectFit: 'cover' }}/>
              <button onClick={() => setImageUrls(prev => prev.filter((_, j) => j !== i))}
                style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--brand-red)', border: 'none', borderRadius: '50%', width: '20px', height: '20px', color: 'white', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
          ))}
          {imageUrls.length < 5 && (
            <label style={{ width: '70px', height: '70px', borderRadius: '10px', border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '24px', color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}>
              {uploading ? '⏳' : '+'}
              <input type="file" accept="image/*" multiple onChange={handleImageChange} style={{ display: 'none' }}/>
            </label>
          )}
        </div>
      </div>

      <input placeholder="Title *" value={form.title} onChange={e => f('title', e.target.value)} maxLength={100} style={{ borderRadius: '12px' }}/>
      <textarea placeholder="Description * — what are you selling?" value={form.description} onChange={e => f('description', e.target.value)} rows={3} maxLength={1000} style={{ borderRadius: '12px', resize: 'none', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '12px', fontFamily: 'var(--font-body)', fontSize: '0.9rem', outline: 'none' }}/>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Price (π) *</p>
          <input type="number" placeholder="e.g. 1.5" value={form.price} onChange={e => f('price', e.target.value)} min="0.1" step="0.1" style={{ borderRadius: '12px', width: '100%' }}/>
        </div>
        <div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Stock</p>
          <input type="number" placeholder="1" value={form.stock} onChange={e => f('stock', e.target.value)} min="1" style={{ borderRadius: '12px', width: '100%' }}/>
        </div>
      </div>

      <div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Category *</p>
        <select value={form.category} onChange={e => f('category', e.target.value)}
          style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}>
          {CATEGORIES.filter(c => c.id).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>

      <div onClick={() => f('isDigital', !form.isDigital)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg-card)', border: `1px solid ${form.isDigital ? 'rgba(255,60,95,0.4)' : 'var(--border)'}`, borderRadius: '12px', cursor: 'pointer' }}>
        <div>
          <p style={{ fontWeight: 600, fontSize: '0.88rem' }}>💾 Digital Product</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>eBook, preset, template, file download</p>
        </div>
        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: form.isDigital ? 'var(--brand-gradient)' : 'var(--bg-elevated)', border: `1.5px solid ${form.isDigital ? 'transparent' : 'var(--border-strong)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '13px' }}>{form.isDigital ? '✓' : ''}</div>
      </div>

      {!form.isDigital && (
        <input placeholder="Ships from (city, country)" value={form.shipsFrom} onChange={e => f('shipsFrom', e.target.value)} style={{ borderRadius: '12px' }}/>
      )}

      <input placeholder="Tags (comma separated: art, handmade, gift)" value={form.tags} onChange={e => f('tags', e.target.value)} style={{ borderRadius: '12px' }}/>

      <button onClick={handleSubmit} disabled={saving} className="btn btn-primary" style={{ width: '100%', padding: '16px', fontSize: '1rem' }}>
        {saving ? 'Creating...' : '🛍️ Create Listing'}
      </button>
    </div>
  );
}

// ── Listing Card ──────────────────────────────────────────────
function ListingCard({ listing, onClick, isOwner, onDelete }) {
  return (
    <div onClick={onClick} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.15s', position: 'relative' }}
      onMouseDown={e => e.currentTarget.style.transform='scale(0.97)'}
      onMouseUp={e => e.currentTarget.style.transform='scale(1)'}
    >
      <div style={{ aspectRatio: '1', background: 'var(--bg-elevated)', position: 'relative' }}>
        {listing.images?.[0] ? (
          <img src={listing.images[0]} alt={listing.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
            {listing.isDigital ? '💾' : '📦'}
          </div>
        )}
        {listing.isDigital && (
          <span style={{ position: 'absolute', top: '6px', left: '6px', background: 'rgba(0,0,0,0.7)', color: 'white', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '8px', fontWeight: 700 }}>DIGITAL</span>
        )}
        {isOwner && onDelete && (
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(220,0,0,0.8)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', color: 'white', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🗑</button>
        )}
      </div>
      <div style={{ padding: '10px' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.82rem', lineHeight: 1.2, marginBottom: '6px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{listing.title}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--pi-gold)', fontWeight: 800, fontSize: '0.92rem' }}>{listing.price}π</span>
          {listing.salesCount > 0 && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{listing.salesCount} sold</span>}
        </div>
        <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '3px' }}>@{listing.seller?.piUsername}</p>
      </div>
    </div>
  );
}
