// ============================================================
// SPYCE - ProfilePage v2
// NEW: Replaceable profile picture (shows in avatar + nav icon)
// REPLACE: frontend/src/pages/ProfilePage.jsx
// ============================================================
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuthStore } from '../utils/store';
import toast from 'react-hot-toast';

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
  const [isFollowing, setIsFollowing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ displayName: '', bio: '' });
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => { loadProfile(); }, [targetUsername]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      if (isOwnProfile) {
        const profileData = {
          id: currentUser._id,
          piUsername: currentUser.piUsername,
          displayName: currentUser.displayName || currentUser.piUsername,
          bio: currentUser.bio || '',
          avatar: currentUser.avatar || '',
          coverPhoto: currentUser.coverPhoto || '',
          followersCount: currentUser.followersCount || 0,
          followingCount: currentUser.followingCount || 0,
          videosCount: currentUser.videosCount || 0,
          totalLikes: currentUser.totalLikes || 0,
          isVerified: currentUser.isVerified || false,
          isCreator: currentUser.isCreator || false,
          isFollowing: false,
        };
        setProfile(profileData);
        setEditForm({ displayName: profileData.displayName, bio: profileData.bio });
        try {
          const vRes = await api.get(`/videos/user/${currentUser._id}`);
          setVideos(vRes.data.videos || []);
        } catch { setVideos([]); }
      } else {
        const [profileRes] = await Promise.all([
          api.get(`/users/${targetUsername}`),
        ]);
        const p = profileRes.data.user;
        setProfile(p);
        setIsFollowing(p.isFollowing);
        setEditForm({ displayName: p.displayName, bio: p.bio });
        try {
          const vRes = await api.get(`/videos/user/${p.id}`);
          setVideos(vRes.data.videos || []);
        } catch { setVideos([]); }
      }
    } catch {
      toast.error('Profile not found');
    } finally {
      setLoading(false);
    }
  };

  // ── Avatar upload ──────────────────────────────────────────
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Select an image'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }

    setAvatarUploading(true);
    const fd = new FormData();
    fd.append('avatar', file);

    try {
      const { data } = await api.put('/users/profile', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const newAvatar = data.user.avatar;

      // Update local profile display
      setProfile(p => ({ ...p, avatar: newAvatar }));

      // Update global auth store so BottomNav updates too
      updateUser({ avatar: newAvatar });

      toast.success('Profile picture updated! 🎉');
    } catch {
      toast.error('Failed to update profile picture');
    } finally {
      setAvatarUploading(false);
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
    } catch { toast.error('Failed to update'); }
  };

  if (loading) return (
    <div className="page" style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div className="animate-spin" style={{ width:36, height:36, border:'3px solid var(--border)', borderTopColor:'var(--brand-red)', borderRadius:'50%' }}/>
    </div>
  );

  if (!profile) return null;

  return (
    <div className="page">
      <div className="container">
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', paddingTop:'8px' }}>
          {!isOwnProfile && (
            <button onClick={() => navigate(-1)} style={{ color:'var(--text-secondary)', fontSize:'1.2rem' }}>←</button>
          )}
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:'1.1rem', flex:1, textAlign: isOwnProfile ? 'left' : 'center' }}>
            {isOwnProfile ? 'My Profile' : `@${profile.piUsername}`}
          </h1>
          {isOwnProfile && (
            <button onClick={() => { logout(); navigate('/login'); }} style={{ color:'var(--text-muted)', fontSize:'0.82rem' }}>
              Sign out
            </button>
          )}
        </div>

        {/* Avatar + Stats */}
        <div style={{ display:'flex', alignItems:'center', gap:'20px', marginBottom:'16px' }}>

          {/* Avatar — tappable on own profile */}
          <div style={{ position:'relative', flexShrink:0 }}>
            <div
              onClick={() => isOwnProfile && avatarInputRef.current?.click()}
              style={{ cursor: isOwnProfile ? 'pointer' : 'default', position:'relative' }}
            >
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt=""
                  style={{
                    width:'80px', height:'80px', borderRadius:'50%',
                    objectFit:'cover',
                    border:'3px solid var(--brand-red)',
                    filter: avatarUploading ? 'brightness(0.5)' : 'none',
                    transition:'filter 0.2s',
                  }}
                />
              ) : (
                <div style={{
                  width:'80px', height:'80px', borderRadius:'50%',
                  background:'var(--brand-gradient)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:'28px', fontWeight:800, color:'white',
                  border:'3px solid rgba(255,60,95,0.3)',
                }}>
                  {(profile.displayName || profile.piUsername)[0].toUpperCase()}
                </div>
              )}

              {/* Loading overlay */}
              {avatarUploading && (
                <div style={{
                  position:'absolute', inset:0, borderRadius:'50%',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  background:'rgba(0,0,0,0.5)',
                }}>
                  <div className="animate-spin" style={{
                    width:'24px', height:'24px',
                    border:'2px solid white', borderTopColor:'transparent', borderRadius:'50%',
                  }}/>
                </div>
              )}

              {/* Camera icon overlay on own profile */}
              {isOwnProfile && !avatarUploading && (
                <div style={{
                  position:'absolute', bottom:0, right:0,
                  background:'var(--brand-gradient)',
                  borderRadius:'50%', width:'26px', height:'26px',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:'13px', border:'2px solid var(--bg-primary)',
                }}>📷</div>
              )}
            </div>

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              style={{ display:'none' }}
            />
          </div>

          {/* Stats */}
          <div style={{ flex:1, display:'flex', gap:'16px' }}>
            {[
              [profile.videosCount || 0, 'Videos'],
              [profile.followersCount || 0, 'Followers'],
              [profile.followingCount || 0, 'Following'],
            ].map(([val, label]) => (
              <div key={label} style={{ textAlign:'center' }}>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'1.1rem' }}>
                  {val >= 1000 ? `${(val/1000).toFixed(1)}K` : val}
                </div>
                <div style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Name + Bio */}
        {editMode ? (
          <div style={{ marginBottom:'16px' }}>
            <input
              value={editForm.displayName}
              onChange={e => setEditForm(f => ({ ...f, displayName: e.target.value }))}
              placeholder="Display name" style={{ marginBottom:'8px' }} maxLength={50}
            />
            <textarea
              value={editForm.bio}
              onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="Bio (150 chars)" rows={2}
              style={{ marginBottom:'12px', resize:'none' }} maxLength={150}
            />
            <div style={{ display:'flex', gap:'8px' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(false)} style={{ flex:1 }}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleSaveEdit} style={{ flex:2 }}>Save</button>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom:'16px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'4px' }}>
              <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1rem' }}>
                {profile.displayName}
              </span>
              {profile.isVerified && <span>✅</span>}
              {profile.isCreator && (
                <span className="pi-badge" style={{ fontSize:'0.65rem', padding:'2px 8px' }}>Creator</span>
              )}
            </div>
            <p style={{ fontSize:'0.85rem', color:'var(--text-secondary)', lineHeight:1.4 }}>
              @{profile.piUsername}{profile.bio ? ` · ${profile.bio}` : ''}
            </p>
            {isOwnProfile && (
              <button
                onClick={() => avatarInputRef.current?.click()}
                style={{
                  marginTop:'8px', fontSize:'0.75rem',
                  color:'var(--brand-red)', fontWeight:600,
                  display:'flex', alignItems:'center', gap:'4px',
                }}
              >
                📷 Change profile photo
              </button>
            )}
          </div>
        )}

        {/* Earnings */}
        {isOwnProfile && (
          <div
            onClick={() => navigate('/earnings')}
            style={{
              background:'rgba(240,165,0,0.08)',
              border:'1px solid rgba(240,165,0,0.2)',
              borderRadius:'12px', padding:'12px 16px',
              marginBottom:'16px',
              display:'flex', justifyContent:'space-between', alignItems:'center',
              cursor:'pointer',
            }}
          >
            <span style={{ fontSize:'0.88rem', color:'var(--text-secondary)' }}>Pi Earnings</span>
            <span style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--pi-gold)', fontSize:'0.9rem' }}>
              View Dashboard →
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display:'flex', gap:'10px', marginBottom:'24px' }}>
          {isOwnProfile ? (
            <>
              <button className="btn btn-ghost" onClick={() => setEditMode(true)} style={{ flex:1 }}>
                ✏️ Edit Profile
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/marketplace/new')}>
                + Sell
              </button>
            </>
          ) : (
            <button
              className={`btn ${isFollowing ? 'btn-ghost' : 'btn-primary'}`}
              onClick={handleFollow}
              style={{ flex:1 }}
            >
              {isFollowing ? 'Following ✓' : 'Follow'}
            </button>
          )}
        </div>

        {/* Videos Grid */}
        <h3 style={{ fontFamily:'var(--font-display)', marginBottom:'12px', fontSize:'0.95rem' }}>Videos</h3>
        {videos.length === 0 ? (
          <div style={{ textAlign:'center', padding:'32px', color:'var(--text-muted)' }}>
            <div style={{ fontSize:'32px', marginBottom:'8px' }}>🎬</div>
            <p>{isOwnProfile ? 'Upload your first video!' : 'No videos yet'}</p>
            {isOwnProfile && (
              <button className="btn btn-primary btn-sm" style={{ marginTop:'12px' }} onClick={() => navigate('/upload')}>
                + Upload Now
              </button>
            )}
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'2px', marginBottom:'80px' }}>
            {videos.map(v => (
              <div key={v._id} style={{ aspectRatio:'9/16', background:'var(--bg-card)', overflow:'hidden', position:'relative' }}>
                {v.thumbnailUrl ? (
                  <img src={v.thumbnailUrl} alt={v.title} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                ) : (
                  <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', background:'var(--bg-elevated)' }}>🎬</div>
                )}
                {v.viewsCount > 0 && (
                  <div style={{
                    position:'absolute', bottom:'4px', left:'4px',
                    background:'rgba(0,0,0,0.6)', borderRadius:'4px',
                    padding:'2px 6px', fontSize:'0.65rem', color:'white',
                  }}>▶ {v.viewsCount >= 1000 ? `${(v.viewsCount/1000).toFixed(1)}K` : v.viewsCount}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
