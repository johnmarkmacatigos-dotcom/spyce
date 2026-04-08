// ============================================================
// SPYCE - Upload Page
// ============================================================
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function UploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [form, setForm] = useState({ description: '', hashtags: '', audioTrack: '' });
  const [challenge, setChallenge] = useState(null);
  const [linkToChallenge, setLinkToChallenge] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Fetch active challenge to offer linking
    api.get('/challenges/active').then(({ data }) => {
      if (data.challenge) setChallenge(data.challenge);
    }).catch(() => {});
  }, []);

  const handleFileSelect = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }
    if (f.size > 100 * 1024 * 1024) {
      toast.error('Video must be under 100MB');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!file) { toast.error('Please select a video'); return; }
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('video', file);
    formData.append('description', form.description);
    formData.append('hashtags', form.hashtags);
    formData.append('audioTrack', form.audioTrack);
    if (linkToChallenge && challenge) {
      formData.append('challengeId', challenge._id);
    }

    try {
      await api.post('/videos/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });

      toast.success('Video uploaded! 🌶️');
      if (linkToChallenge && challenge) {
        toast.success(`+${challenge.rewardPerParticipant}π earned for challenge entry!`, { icon: '🪙' });
      }
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed. Try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page" style={{ background: 'var(--bg-primary)' }}>
      <div className="container" style={{ paddingTop: '24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button onClick={() => navigate(-1)} style={{ fontSize: '20px', color: 'var(--text-secondary)' }}>←</button>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>Upload Video</h1>
        </div>

        {/* Video picker */}
        <div
          onClick={() => !file && fileInputRef.current?.click()}
          style={{
            width: '100%',
            aspectRatio: '9/16',
            maxHeight: '360px',
            background: 'var(--bg-card)',
            borderRadius: '16px',
            border: `2px dashed ${file ? 'var(--brand-red)' : 'var(--border-strong)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            cursor: file ? 'default' : 'pointer',
            marginBottom: '20px',
            position: 'relative',
          }}
        >
          {preview ? (
            <>
              <video src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline />
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(''); }}
                style={{
                  position: 'absolute', top: '12px', right: '12px',
                  background: 'rgba(0,0,0,0.6)', borderRadius: '50%',
                  width: '32px', height: '32px', color: 'white', fontSize: '16px',
                }}
              >✕</button>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎬</div>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Tap to select video</p>
              <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>MP4, MOV, up to 100MB, 60 sec</p>
            </div>
          )}
        </div>

        <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileSelect} style={{ display: 'none' }} />

        {/* Challenge link */}
        {challenge && (
          <div
            style={{
              background: linkToChallenge ? 'rgba(255,60,95,0.08)' : 'var(--bg-card)',
              border: `1px solid ${linkToChallenge ? 'rgba(255,60,95,0.4)' : 'var(--border)'}`,
              borderRadius: '14px',
              padding: '14px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onClick={() => setLinkToChallenge(l => !l)}
          >
            <div>
              <p style={{ fontWeight: 700, fontSize: '0.88rem', fontFamily: 'var(--font-display)' }}>
                🏆 Today's Challenge: #{challenge.hashtag}
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--pi-gold)', marginTop: '2px' }}>
                +{challenge.rewardPerParticipant}π for submitting
              </p>
            </div>
            <div style={{
              width: '24px', height: '24px',
              borderRadius: '50%',
              background: linkToChallenge ? 'var(--brand-gradient)' : 'var(--bg-elevated)',
              border: `2px solid ${linkToChallenge ? 'transparent' : 'var(--border-strong)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '14px',
            }}>
              {linkToChallenge ? '✓' : ''}
            </div>
          </div>
        )}

        {/* Description */}
        <textarea
          placeholder="Describe your video... add some spyce 🌶️"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          rows={3}
          style={{ marginBottom: '12px', resize: 'none' }}
          maxLength={500}
        />

        {/* Hashtags */}
        <input
          placeholder="#hashtags (comma separated)"
          value={form.hashtags}
          onChange={e => setForm(f => ({ ...f, hashtags: e.target.value }))}
          style={{ marginBottom: '12px' }}
        />

        {/* Audio */}
        <input
          placeholder="🎵 Song/audio name (optional)"
          value={form.audioTrack}
          onChange={e => setForm(f => ({ ...f, audioTrack: e.target.value }))}
          style={{ marginBottom: '24px' }}
        />

        {/* Progress bar */}
        {uploading && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
              <span>Uploading...</span>
              <span>{progress}%</span>
            </div>
            <div style={{ height: '6px', background: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: 'var(--brand-gradient)',
                borderRadius: '3px',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        )}

        {/* Upload button */}
        <button
          className="btn btn-primary btn-lg"
          onClick={handleUpload}
          disabled={!file || uploading}
          style={{ width: '100%', opacity: (!file || uploading) ? 0.6 : 1 }}
        >
          {uploading ? `Uploading ${progress}%...` : '🌶️ Post Video'}
        </button>
      </div>
    </div>
  );
}
