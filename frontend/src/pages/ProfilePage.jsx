// ============================================================
// SPYCE - ProfilePage v3
// FIXED: Shows uploaded videos, delete option, avatar upload
// FILE: frontend/src/pages/ProfilePage.jsx
// ============================================================
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuthStore } from '../utils/store';
import toast from 'react-hot-toast';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export default function ProfilePage() {
  const { username } = useParams();
  const { user: currentUser, logout, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const avatarInputRef = useRef(null);

  const isOwnProfile = !username || username === currentUser?.piUsername;
  const targetUsername = username || currentUser?.piUsername;

  const [profile, setProfile] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [videosLoading, setVideosLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ displayName: '', bio: '' });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => { loadProfile(); }, [targetUsername]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      if (isOwnProfile) {
        setProfile({
          id: currentUser._id,
          piUsername: currentUser.piUsername,
          displayName: currentUser.displayName || currentUser.piUsername,
          bio: currentUser.bio || '',
          avatar: currentUser.avatar || '',
          followersCount: currentUser.followersCount || 0,
          followingCount: currentUser.followingCount || 0,
          videosCount: currentUser.videosCount || 0,
          isVerified: currentUser.isVerified || false,
        });
        setEditForm({
          displayName: currentUser.displayName || currentUser.piUsername,
          bio: currentUser.bio || '',
        });
        await loadVideos(currentUser._id);
      } else {
        const { data } = await api.get(`/users/${targetUsername}`);
        const p = data.user;
        setProfile(p);
        setIsFollowing(p.isFollowing);
        setEditForm({ displayName: p.displayName, bio: p.bio || '' });
        await loadVideos(p.id || p._id);
      }
    } catch {
      toast.error('Profile not found');
    } finally {
      setLoading(false);
    }
  };

  const loadVideos = async (userId) => {
    setVideosLoading(true);
    try {
      // Try user-specific endpoint first
      const { data } = await api.get(`/videos/user/${userId}`);
      setVideos(data.videos || []);
    } catch {
      try {
        // Fallback: get all videos and filter by creator
        const { data } = await api.get(`/feed?limit=50`);
        const userVideos = (data.videos || []).filter(v =>
          v.creator?._id === userId || v.creator?.id === userId
        );
        setVideos(userVideos);
      } catch {
        setVideos([]);
      }
    } finally {
      setVideosLoading(false);
    }
  };

  // Avatar upload directly to Cloudinary
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Select an image'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }

    setAvatarUploading(true);
    try {
      let avatarUrl = '';

      if (CLOUD_NAME && UPLOAD_PRESET) {
        // Upload to Cloudinary directly
        const fd = new FormData();
        fd.append('file', file);
        fd.append('upload_preset', UPLOAD_PRESET);
        fd.append('resource_type', 'image');
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
          method: 'POST', body: fd,
        });
        const cData = await res.json();
        avatarUrl = cData.secure_url;
      } else {
        // Fallback: send file to backend
        const fd = new FormData();
        fd.append('avatar', file);
        const { data } = await api.put('/users/profile', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        avatarUrl = data.user.avatar;
      }

      if (avatarUrl) {
        // Save URL to backend
        await api.put('/users/profile', { avatar: avatarUrl });
        setProfile(p => ({ ...p, avatar: avatarUrl }));
        updateUser({ avatar: avatarUrl });
        toast.success('Profile photo updated! 🎉');
      }
    } catch (err) {
      toast.error('Failed to update photo');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm('Delete this video?')) return;
    setDeletingId(videoId);
    try {
      await api.delete(`/videos/${videoId}`);
      setVideos(v => v.filter(x => (x._id || x.id) !== videoId));
      setProfile(p => ({ ...p, videosCount: Math.max(0, (p.videosCount || 1) - 1) }));
      updateUser({ videosCount: Math.max(0, (currentUser.videosCount || 1) - 1) });
      toast.success('Video deleted');
    } catch {
      toast.error('Failed to delete video');
    } finally {
      setDeletingId(null);
    }
  };

  const handleFollow = async () => {
    try {
      const { data } = await api.post(`/users/${profile.id}/follow`);
      setIsFollowing(data.isFollowing);
      setProfile(p => ({ ...p, followersCount: data.followersCount }));
    } catch { toast.error('Failed'); }
  };

  const handleSaveEdit = async () => {
    try {
      await api.put('/users/profile', editForm);
      setProfile(p => ({ ...p, ...editForm }));
      updateUser(editForm);
      setEditMode(false);
      toast.success('Profile updated!');
    } catch { toast.error('Failed to update'); }
  };

  const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n;

  if (loading) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="animate-spin" style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--brand-red)', borderRadius: '50%' }} />
    </div>
  );

  if (!profile) return null;

  return (
    <div className="page" style={{ paddingBottom: '100px' }}>
      <div className="container">

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingTop: '8px' }}>
          {!isOwnProfile && (
            <button onClick={() => navigate(-1)} style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', background: 'none', border: 'none', cursor: 'pointer' }}>←</button>
          )}
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', flex: 1, textAlign: isOwnProfile ? 'left' : 'center' }}>
            {isOwnProfile ? 'My Profile' : `@${profile.piUsername}`}
          </h1>
          {isOwnProfile && (
            <button onClick={() => { logout(); navigate('/login'); }} style={{ color: 'var(--text-muted)', fontSize: '0.82rem', background: 'none', border: 'none', cursor: 'pointer' }}>
              Sign out
            </button>
          )}
        </div>

        {/* Avatar + Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '16px' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              onClick={() => isOwnProfile && avatarInputRef.current?.click()}
              style={{ cursor: isOwnProfile ? 'pointer' : 'default', position: 'relative' }}
            >
              {profile.avatar ? (
                <img src={profile.avatar} alt="" style={{
                  width: '80px', height: '80px', borderRadius: '50%',
                  objectFit: 'cover', border: '3px solid var(--brand-red)',
                  filter: avatarUploading ? 'brightness(0.5)' : 'none',
                }} />
              ) : (
                <div style={{
                  width: '80px', height: '80px', borderRadius: '50%',
                  background: 'var(--brand-gradient)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '28px', fontWeight: 800, color: 'white',
                  border: '3px solid rgba(255,60,95,0.3)',
                }}>
                  {(profile.displayName || profile.piUsername)[0].toUpperCase()}
                </div>
              )}
              {avatarUploading && (
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
                  <div className="animate-spin" style={{ width: '24px', height: '24px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }} />
                </div>
              )}
              {isOwnProfile && !avatarUploading && (
                <div style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--brand-gradient)', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', border: '2px solid var(--bg-primary)' }}>📷</div>
              )}
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
          </div>

          <div style={{ flex: 1, display: 'flex', gap: '16px' }}>
            {[
              [profile.videosCount || videos.length || 0, 'Videos'],
              [profile.followersCount || 0, 'Followers'],
              [profile.followingCount || 0, 'Following'],
            ].map(([val, label]) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem' }}>{fmt(val)}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Name + Bio */}
        {editMode ? (
          <div style={{ marginBottom: '16px' }}>
            <input value={editForm.displayName} onChange={e => setEditForm(f => ({ ...f, displayName: e.target.value }))}
              placeholder="Display name" style={{ marginBottom: '8px' }} maxLength={50} />
            <textarea value={editForm.bio} onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="Bio..." rows={2} style={{ marginBottom: '12px', resize: 'none' }} maxLength={150} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleSaveEdit} style={{ flex: 2 }}>Save</button>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem' }}>{profile.displayName}</span>
              {profile.isVerified && <span>✅</span>}
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              @{profile.piUsername}{profile.bio ? ` · ${profile.bio}` : ''}
            </p>
            {isOwnProfile && (
              <button onClick={() => avatarInputRef.current?.click()} style={{ marginTop: '6px', fontSize: '0.75rem', color: 'var(--brand-red)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                📷 Change profile photo
              </button>
            )}
          </div>
        )}

        {/* Pi Earnings */}
        {isOwnProfile && (
          <div onClick={() => navigate('/earnings')} style={{
            background: 'rgba(240,165,0,0.08)', border: '1px solid rgba(240,165,0,0.2)',
            borderRadius: '12px', padding: '12px 16px', marginBottom: '16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
          }}>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Pi Earnings</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--pi-gold)', fontSize: '0.9rem' }}>View Dashboard →</span>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
          {isOwnProfile ? (
            <>
              <button className="btn btn-ghost" onClick={() => setEditMode(true)} style={{ flex: 1 }}>✏️ Edit Profile</button>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/marketplace/new')}>+ Sell</button>
            </>
          ) : (
            <button className={`btn ${isFollowing ? 'btn-ghost' : 'btn-primary'}`} onClick={handleFollow} style={{ flex: 1 }}>
              {isFollowing ? 'Following ✓' : 'Follow'}
            </button>
          )}
        </div>

        {/* Videos Grid */}
        <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '12px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Videos {videos.length > 0 && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({videos.length})</span>}</span>
          {isOwnProfile && (
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/upload')}>+ Upload</button>
          )}
        </h3>

        {videosLoading ? (
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <div className="animate-spin" style={{ width: 28, height: 28, margin: '0 auto', border: '2px solid var(--border)', borderTopColor: 'var(--brand-red)', borderRadius: '50%' }} />
          </div>
        ) : videos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎬</div>
            <p>{isOwnProfile ? 'No videos yet' : 'No videos yet'}</p>
            {isOwnProfile && (
              <button className="btn btn-primary btn-sm" style={{ marginTop: '12px' }} onClick={() => navigate('/upload')}>
                + Upload Now
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3px' }}>
            {videos.map(v => {
              const vid = v._id || v.id;
              return (
                <div key={vid} style={{ aspectRatio: '9/16', background: 'var(--bg-card)', overflow: 'hidden', position: 'relative', borderRadius: '6px' }}>
                  {v.thumbnailUrl ? (
                    <img src={v.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : v.videoUrl ? (
                    <video src={v.videoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', background: 'var(--bg-elevated)' }}>🎬</div>
                  )}

                  {/* Views */}
                  {v.viewsCount > 0 && (
                    <div style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'rgba(0,0,0,0.6)', borderRadius: '4px', padding: '2px 5px', fontSize: '0.6rem', color: 'white' }}>
                      ▶ {fmt(v.viewsCount)}
                    </div>
                  )}

                  {/* Likes */}
                  {v.likesCount > 0 && (
                    <div style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', borderRadius: '4px', padding: '2px 5px', fontSize: '0.6rem', color: 'white' }}>
                      ❤️ {fmt(v.likesCount)}
                    </div>
                  )}

                  {/* Delete button - own profile only */}
                  {isOwnProfile && (
                    <button
                      onClick={() => handleDeleteVideo(vid)}
                      disabled={deletingId === vid}
                      style={{
                        position: 'absolute', top: '4px', right: '4px',
                        background: 'rgba(220,0,0,0.75)', backdropFilter: 'blur(4px)',
                        border: 'none', borderRadius: '50%',
                        width: '24px', height: '24px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: '11px', cursor: 'pointer',
                        opacity: deletingId === vid ? 0.5 : 1,
                      }}
                    >{deletingId === vid ? '...' : '🗑'}</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
