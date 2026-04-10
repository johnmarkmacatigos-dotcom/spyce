// ============================================================
// SPYCE - Profile Page
// ============================================================
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuthStore } from '../utils/store';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { username } = useParams();
  const { user: currentUser, logout, updateUser } = useAuthStore();
  const navigate = useNavigate();

  const isOwnProfile = !username || username === currentUser?.piUsername;
  const targetUsername = username || currentUser?.piUsername;

  const [profile, setProfile] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ displayName: '', bio: '' });

  useEffect(() => {
    loadProfile();
  }, [targetUsername]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const [profileRes, videosRes] = await Promise.all([
        api.get(`/users/${targetUsername}`),
        api.get(`/videos/user/${profile?.id}`),
      ]);
      setProfile(profileRes.data.user);
      setVideos(videosRes.data.videos || []);
      setIsFollowing(profileRes.data.user.isFollowing);
      setEditForm({ displayName: profileRes.data.user.displayName, bio: profileRes.data.user.bio });
    } catch (err) {
      toast.error('Profile not found');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      const { data } = await api.post(`/users/${profile.id}/follow`);
      setIsFollowing(data.isFollowing);
      setProfile(p => ({ ...p, followersCount: data.followersCount }));
    } catch { toast.error('Failed to update follow'); }
  };

  const handleSaveEdit = async () => {
    try {
      const { data } = await api.put('/users/profile', editForm);
      setProfile(p => ({ ...p, ...editForm }));
      updateUser(editForm);
      setEditMode(false);
      toast.success('Profile updated!');
    } catch { toast.error('Failed to update profile'); }
  };

  if (loading) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="animate-spin" style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--brand-red)', borderRadius: '50%' }} />
    </div>
  );

  if (!profile) return null;

  return (
    <div className="page">
      <div className="container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingTop: '8px' }}>
          {!isOwnProfile && (
            <button onClick={() => navigate(-1)} style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>←</button>
          )}
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', flex: 1, textAlign: isOwnProfile ? 'left' : 'center' }}>
            {isOwnProfile ? 'My Profile' : `@${profile.piUsername}`}
          </h1>
          {isOwnProfile && (
            <button
              onClick={() => { logout(); navigate('/login'); }}
              style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}
            >Sign out</button>
          )}
        </div>

        {/* Avatar + Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '16px' }}>
          {profile.avatar ? (
            <img src={profile.avatar} alt="" className="avatar" style={{ width: '80px', height: '80px' }} />
          ) : (
            <div className="avatar-placeholder" style={{ width: '80px', height: '80px', fontSize: '28px' }}>
              {(profile.displayName || profile.piUsername)[0].toUpperCase()}
            </div>
          )}

          <div style={{ flex: 1, display: 'flex', gap: '16px' }}>
            {[
              [profile.videosCount || 0, 'Videos'],
              [profile.followersCount || 0, 'Followers'],
              [profile.followingCount || 0, 'Following'],
            ].map(([val, label]) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem' }}>
                  {val >= 1000 ? `${(val / 1000).toFixed(1)}K` : val}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Name + Bio */}
        {editMode ? (
          <div style={{ marginBottom: '16px' }}>
            <input
              value={editForm.displayName}
              onChange={e => setEditForm(f => ({ ...f, displayName: e.target.value }))}
              placeholder="Display name"
              style={{ marginBottom: '8px' }}
              maxLength={50}
            />
            <textarea
              value={editForm.bio}
              onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="Bio (150 chars)"
              rows={2}
              style={{ marginBottom: '12px', resize: 'none' }}
              maxLength={150}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleSaveEdit} style={{ flex: 2 }}>Save</button>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem' }}>
                {profile.displayName}
              </span>
              {profile.isVerified && <span>✅</span>}
              {profile.isCreator && <span className="pi-badge" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>Creator</span>}
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              @{profile.piUsername} {profile.bio ? `· ${profile.bio}` : ''}
            </p>
          </div>
        )}

        {/* Pi earnings badge (own profile only) */}
        {isOwnProfile && (
          <div
            onClick={() => navigate('/earnings')}
            style={{
              background: 'rgba(240,165,0,0.08)',
              border: '1px solid rgba(240,165,0,0.2)',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Pi Earnings</span>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--pi-gold)' }}>
                View Dashboard →
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
          {isOwnProfile ? (
            <>
              <button className="btn btn-ghost" onClick={() => setEditMode(true)} style={{ flex: 1 }}>
                Edit Profile
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/marketplace/new')}>
                + Sell
              </button>
            </>
          ) : (
            <>
              <button
                className={`btn ${isFollowing ? 'btn-ghost' : 'btn-primary'}`}
                onClick={handleFollow}
                style={{ flex: 2 }}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            </>
          )}
        </div>

        {/* Videos Grid */}
        <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '12px', fontSize: '0.95rem' }}>
          Videos
        </h3>
        {videos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎬</div>
            <p>{isOwnProfile ? 'Upload your first video!' : 'No videos yet'}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px' }}>
            {videos.map(v => (
              <div
                key={v._id}
                style={{ aspectRatio: '9/16', background: 'var(--bg-card)', overflow: 'hidden', cursor: 'pointer' }}
              >
                <img
                  src={v.thumbnailUrl || ''}
                  alt={v.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
