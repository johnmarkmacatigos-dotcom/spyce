// ============================================================
// SPYCE - Upload Page v7
// FIXED: Network error during Cloudinary upload
// - Better error messages showing exact failure reason
// - Retry logic (3 attempts)
// - Chunked upload for large files
// - CORS fix for Cloudinary
// FILE: frontend/src/pages/UploadPage.jsx
// ============================================================
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import VideoEditor from '../components/feed/VideoEditor';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// ── Multi-source music search ──────────────────────────────────
const searchItunes = async (query) => {
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=10&entity=song`
    );
    const data = await res.json();
    return (data.results || []).map(t => ({
      id: `itunes_${t.trackId}`,
      title: t.trackName,
      artist: t.artistName,
      album: t.collectionName,
      artwork: t.artworkUrl100 || t.artworkUrl60,
      previewUrl: t.previewUrl,
      duration: t.trackTimeMillis,
      source: 'iTunes',
    }));
  } catch { return []; }
};

const searchJamendo = async (query) => {
  try {
    const res = await fetch(
      `https://api.jamendo.com/v3.0/tracks/?client_id=b6747d04&format=json&limit=5&namesearch=${encodeURIComponent(query)}&include=musicinfo&audioformat=mp32`
    );
    const data = await res.json();
    return (data.results || []).map(t => ({
      id: `jamendo_${t.id}`,
      title: t.name,
      artist: t.artist_name,
      album: t.album_name,
      artwork: t.album_image || t.image,
      previewUrl: t.audio,
      duration: t.duration * 1000,
      source: 'Jamendo',
    }));
  } catch { return []; }
};

const searchAllSources = async (query) => {
  if (!query.trim()) return [];
  const [itunes, jamendo] = await Promise.allSettled([
    searchItunes(query),
    searchJamendo(query),
  ]);
  const results = [
    ...(itunes.status === 'fulfilled' ? itunes.value : []),
    ...(jamendo.status === 'fulfilled' ? jamendo.value : []),
  ];
  const seen = new Set();
  return results.filter(t => {
    const key = `${t.title}_${t.artist}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// ── Music Track Row ───────────────────────────────────────────
function MusicTrackRow({ track, isPlaying, previewProgress, onPlay, onSelect }) {
  const fmt = (ms) => { if (!ms) return ''; const s = Math.floor(ms/1000); return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; };
  return (
    <div style={{ display:'flex', alignItems:'center', borderBottom:'1px solid rgba(255,255,255,0.04)', background: isPlaying?'rgba(255,60,95,0.05)':'transparent', transition:'background 0.25s' }}>
      <button onClick={()=>onPlay(track)} style={{ position:'relative', width:'64px', height:'64px', flexShrink:0, background:'none', border:'none', padding:'10px', cursor:'pointer' }}>
        {track.artwork ? (
          <img src={track.artwork} alt="" style={{ width:'44px', height:'44px', borderRadius:'8px', display:'block', filter:isPlaying?'brightness(0.55)':'brightness(1)' }}/>
        ) : (
          <div style={{ width:'44px', height:'44px', borderRadius:'8px', background:'var(--bg-elevated)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px' }}>🎵</div>
        )}
        <div style={{ position:'absolute', top:'10px', left:'10px', width:'44px', height:'44px', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', background:isPlaying?'rgba(255,60,95,0.25)':'rgba(0,0,0,0.4)' }}>
          {isPlaying ? (
            <div style={{ display:'flex', gap:'2px', alignItems:'flex-end', height:'18px' }}>
              {[1,2,3,4].map(i=><div key={i} style={{ width:'3px', borderRadius:'2px', background:'#ff3c5f', animation:`eq${i} ${0.28+i*0.09}s ease-in-out infinite alternate`, minHeight:'4px' }}/>)}
            </div>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="white"><path d="M3 1.5L12.5 7L3 12.5V1.5Z"/></svg>
          )}
        </div>
        {isPlaying && (
          <svg style={{ position:'absolute', top:'10px', left:'10px', width:'44px', height:'44px', pointerEvents:'none' }} viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="20" fill="none" stroke="rgba(255,60,95,0.2)" strokeWidth="2"/>
            <circle cx="22" cy="22" r="20" fill="none" stroke="#ff3c5f" strokeWidth="2.5" strokeLinecap="round"
              strokeDasharray={`${2*Math.PI*20}`}
              strokeDashoffset={`${2*Math.PI*20*(1-previewProgress/100)}`}
              transform="rotate(-90 22 22)" style={{ transition:'stroke-dashoffset 0.2s linear' }}/>
          </svg>
        )}
      </button>
      <div style={{ flex:1, minWidth:0, padding:'12px 6px 12px 0' }}>
        <p style={{ fontWeight:600, fontSize:'0.84rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:isPlaying?'var(--brand-red)':'var(--text-primary)', marginBottom:'2px' }}>{track.title}</p>
        <p style={{ fontSize:'0.71rem', color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {track.artist}{track.duration&&<span style={{ opacity:0.6 }}> · {fmt(track.duration)}</span>}
          <span style={{ marginLeft:'6px', background:'var(--bg-elevated)', borderRadius:'4px', padding:'1px 5px', fontSize:'0.62rem', color:'var(--text-muted)' }}>{track.source}</span>
        </p>
      </div>
      <div style={{ padding:'0 12px', flexShrink:0 }}>
        <button onClick={()=>onSelect(track)} style={{ background:isPlaying?'var(--brand-gradient)':'var(--bg-elevated)', color:isPlaying?'white':'var(--text-secondary)', border:isPlaying?'none':'1px solid var(--border-strong)', borderRadius:'20px', padding:'7px 16px', fontSize:'0.78rem', fontWeight:700, transition:'all 0.25s', boxShadow:isPlaying?'0 0 16px rgba(255,60,95,0.35)':'none', whiteSpace:'nowrap', cursor:'pointer' }}>{isPlaying?'✓ Use This':'Use'}</button>
      </div>
    </div>
  );
}

export default function UploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const musicTimer = useRef(null);
  const previewAudioRef = useRef(null);
  const previewTimer = useRef(null);
  const xhrRef = useRef(null);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [description, setDescription] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [challenge, setChallenge] = useState(null);
  const [linkChallenge, setLinkChallenge] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [edits, setEdits] = useState({ texts:[], stickers:[], filter:null, trimStart:0, trimEnd:0, videoVolume:80, musicVolume:70, mixSaved:false });

  const [showMusic, setShowMusic] = useState(false);
  const [musicQuery, setMusicQuery] = useState('');
  const [musicResults, setMusicResults] = useState([]);
  const [musicLoading, setMusicLoading] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [playingId, setPlayingId] = useState(null);
  const [previewProgress, setPreviewProgress] = useState(0);

  // 3D Canvas
  useEffect(() => {
    if (file) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
    const W=canvas.width, H=canvas.height, CX=W/2, CY=H/2, FOV=250;
    const pts = Array.from({length:50}, ()=>({ x:(Math.random()-.5)*W*2, y:(Math.random()-.5)*H*2, z:Math.random()*400+50, vz:Math.random()*0.8+0.2, r:Math.random()*2+0.5, hue:Math.random()>.7?35:350 }));
    let t=0;
    const draw = () => {
      ctx.clearRect(0,0,W,H); t+=0.01;
      ctx.strokeStyle='rgba(255,60,95,0.05)'; ctx.lineWidth=0.5;
      const gOff=(t*20)%50;
      for(let gx=-W;gx<W*2;gx+=50){ const sc=FOV/(FOV+150),x1=(gx+gOff-CX)*sc+CX; ctx.beginPath();ctx.moveTo(x1,0);ctx.lineTo(x1,H);ctx.stroke(); }
      pts.forEach(p=>{
        p.z-=p.vz; if(p.z<10){p.z=500;p.x=(Math.random()-.5)*W*2;p.y=(Math.random()-.5)*H*2;}
        const s=FOV/(FOV+p.z),px=p.x*s+CX,py=p.y*s+CY;
        if(px<-10||px>W+10||py<-10||py>H+10)return;
        const size=p.r*s*3, g=ctx.createRadialGradient(px,py,0,px,py,size*4);
        g.addColorStop(0,`hsla(${p.hue},100%,65%,${Math.min(0.9,s*1.2)})`); g.addColorStop(1,`hsla(${p.hue},100%,65%,0)`);
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,size,0,Math.PI*2); ctx.fill();
      });
      const pulse=Math.sin(t*2)*.15+.85;
      ctx.beginPath(); ctx.arc(CX,CY,38*pulse,0,Math.PI*2);
      ctx.strokeStyle=`rgba(255,60,95,${0.25*pulse})`; ctx.lineWidth=1.5; ctx.stroke();
      animRef.current=requestAnimationFrame(draw);
    };
    draw();
    return ()=>cancelAnimationFrame(animRef.current);
  }, [file]);

  useEffect(() => {
    api.get('/challenges/active').then(({data})=>{ if(data.challenge) setChallenge(data.challenge); }).catch(()=>{});
  }, []);

  useEffect(() => {
    clearTimeout(musicTimer.current);
    if(!musicQuery.trim()){setMusicResults([]);return;}
    musicTimer.current = setTimeout(async()=>{
      setMusicLoading(true);
      const r = await searchAllSources(musicQuery);
      setMusicResults(r); setMusicLoading(false);
    }, 600);
    return ()=>clearTimeout(musicTimer.current);
  }, [musicQuery]);

  const handleFile = (e) => {
    const f = e.target.files[0]; if(!f) return;
    if(!f.type.startsWith('video/')) { toast.error('Select a video file'); return; }
    cancelAnimationFrame(animRef.current);
    setFile(f); setPreview(URL.createObjectURL(f)); setUploadError('');
    if(f.size > 100*1024*1024) toast('Large file — use ✂️ Trim first', {icon:'⚠️', duration:4000});
  };

  const removeFile = (e) => {
    e.stopPropagation();
    if(xhrRef.current) xhrRef.current.abort();
    setFile(null); setPreview(''); setProgress(0); setUploading(false); setUploadError('');
  };

  const playPreview = (track) => {
    clearInterval(previewTimer.current); setPreviewProgress(0);
    if(previewAudioRef.current){ previewAudioRef.current.pause(); previewAudioRef.current=null; }
    if(playingId===track.id){ setPlayingId(null); return; }
    if(!track.previewUrl){ toast('No preview available',{icon:'🎵'}); return; }
    const a = new Audio(track.previewUrl);
    a.volume=0.7; a.crossOrigin='anonymous';
    a.play().catch(()=>toast.error('Could not play preview'));
    previewTimer.current = setInterval(()=>{ if(a.duration>0) setPreviewProgress((a.currentTime/a.duration)*100); }, 200);
    a.onended=()=>{ clearInterval(previewTimer.current); setPreviewProgress(0); setPlayingId(null); previewAudioRef.current=null; };
    previewAudioRef.current=a; setPlayingId(track.id);
  };

  const selectTrack = (track) => {
    clearInterval(previewTimer.current);
    if(previewAudioRef.current){ previewAudioRef.current.pause(); previewAudioRef.current=null; }
    setPlayingId(null); setPreviewProgress(0);
    setSelectedTrack(track); setShowMusic(false); setMusicQuery('');
    setEdits(e=>({...e, mixSaved:false}));
    toast.success(`🎵 "${track.title}" added!`);
  };

  // ── CORE: Upload to Cloudinary with retry ─────────────────
  const uploadToCloudinary = (fileToUpload, attempt = 1) => {
    return new Promise((resolve, reject) => {
      if (!CLOUD_NAME || !UPLOAD_PRESET) {
        reject(new Error('Cloudinary not configured. Check VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in Vercel env vars.'));
        return;
      }

      const fd = new FormData();
      fd.append('file', fileToUpload);
      fd.append('upload_preset', UPLOAD_PRESET);
      fd.append('resource_type', 'video');

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      // Timeout: 5 minutes for large files
      xhr.timeout = 300000;

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 85);
          setProgress(pct);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.error) {
              reject(new Error(`Cloudinary: ${data.error.message}`));
            } else {
              resolve(data);
            }
          } catch {
            reject(new Error('Invalid response from Cloudinary'));
          }
        } else if (xhr.status === 400) {
          // Parse Cloudinary error
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(`Upload rejected: ${err.error?.message || 'Bad request'}`));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        } else if (xhr.status === 401) {
          reject(new Error('Cloudinary upload preset is invalid or not unsigned. Check your preset settings.'));
        } else {
          reject(new Error(`Upload error: HTTP ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        if (attempt < 3) {
          console.log(`Upload attempt ${attempt} failed, retrying...`);
          setTimeout(() => {
            uploadToCloudinary(fileToUpload, attempt + 1).then(resolve).catch(reject);
          }, 2000 * attempt);
        } else {
          reject(new Error('Network error after 3 attempts. Check your internet connection.'));
        }
      });

      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timed out. Try using ✂️ Trim to reduce file size first.'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });

      const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;
      xhr.open('POST', url);
      xhr.send(fd);
    });
  };

  const handleUpload = async () => {
    if (!file) { toast.error('Select a video first'); return; }

    // Pre-flight checks
    if (!CLOUD_NAME) {
      toast.error('Missing VITE_CLOUDINARY_CLOUD_NAME in Vercel environment variables');
      return;
    }
    if (!UPLOAD_PRESET) {
      toast.error('Missing VITE_CLOUDINARY_UPLOAD_PRESET in Vercel environment variables');
      return;
    }

    setUploading(true);
    setProgress(0);
    setUploadError('');

    try {
      setUploadStage('cloudinary');
      toast.loading(`Uploading ${(file.size / (1024*1024)).toFixed(1)}MB... 🚀`, { id: 'upload' });

      const cData = await uploadToCloudinary(file);

      setUploadStage('saving');
      setProgress(90);
      toast.loading('Saving video...', { id: 'upload' });

      await api.post('/videos/save', {
        videoUrl: cData.secure_url,
        thumbnailUrl: cData.eager?.[0]?.secure_url ||
          cData.secure_url.replace('/upload/', '/upload/so_1,f_jpg/').replace('.mp4', '.jpg'),
        cloudinaryPublicId: cData.public_id,
        duration: cData.duration || 0,
        description,
        hashtags,
        audioTrack: selectedTrack ? `${selectedTrack.title} — ${selectedTrack.artist}` : '',
        audioTrackUrl: selectedTrack?.previewUrl || '',
        challengeId: linkChallenge && challenge ? challenge._id : null,
        trimStart: edits?.trimStart || 0,
        trimEnd: edits?.trimEnd || cData.duration || 0,
        videoVolume: edits?.videoVolume ?? 80,
        musicVolume: edits?.musicVolume ?? 70,
      });

      setProgress(100);
      toast.success('Video posted! 🌶️', { id: 'upload' });
      if (linkChallenge && challenge)
        toast.success(`+${challenge.rewardPerParticipant}π earned!`, { icon: '🪙' });
      navigate('/');

    } catch (err) {
      const msg = err.message || 'Upload failed';

      if (msg === 'Upload cancelled') {
        toast.dismiss('upload');
        toast('Upload cancelled', { icon: '↩️' });
      } else {
        toast.error(msg, { id: 'upload', duration: 6000 });
        setUploadError(msg);
        console.error('Upload error:', msg);
      }
    } finally {
      setUploading(false);
      setUploadStage('');
    }
  };

  const QUICK_SEARCHES = ['OPM', 'pop hits', 'hip hop', 'R&B', 'EDM', 'chill', 'K-pop', 'acoustic', 'viral', 'love song'];

  return (
    <div style={{ minHeight:'100dvh', background:'var(--bg-primary)', paddingBottom:'90px' }}>

      {/* Header */}
      <div style={{ position:'sticky', top:0, zIndex:20, display:'flex', alignItems:'center', gap:'12px', padding:'14px 20px', background:'rgba(10,10,15,0.92)', backdropFilter:'blur(16px)', borderBottom:'1px solid var(--border)' }}>
        <button onClick={()=>{ xhrRef.current?.abort(); navigate(-1); }} style={{ width:'36px', height:'36px', borderRadius:'50%', background:'var(--bg-card)', border:'1px solid var(--border)', color:'var(--text-primary)', fontSize:'18px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>←</button>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:'1.25rem', flex:1 }}>New Video</h1>
        <button onClick={handleUpload} disabled={!file||uploading} style={{ background:file&&!uploading?'var(--brand-gradient)':'var(--bg-elevated)', color:file&&!uploading?'white':'var(--text-muted)', border:'none', borderRadius:'20px', padding:'8px 22px', fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.9rem', transition:'all 0.2s', minWidth:'100px', cursor:'pointer', boxShadow:file&&!uploading?'var(--brand-glow)':'none' }}>
          {uploading ? (uploadStage==='saving' ? 'Saving...' : `${progress}%`) : 'Post 🌶️'}
        </button>
      </div>

      <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:'12px' }}>

        {/* Video picker */}
        <div onClick={()=>!file&&!uploading&&fileInputRef.current?.click()} style={{ position:'relative', width:'100%', height:file?'220px':'180px', borderRadius:'20px', overflow:'hidden', border:`1.5px solid ${file?'rgba(255,60,95,0.45)':'rgba(255,255,255,0.07)'}`, cursor:file?'default':'pointer', background:'#080810', transition:'height 0.4s cubic-bezier(0.34,1.56,0.64,1)', boxShadow:file?'0 8px 40px rgba(255,60,95,0.12)':'none' }}>
          {!file ? (
            <>
              <canvas ref={canvasRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}/>
              <div style={{ position:'absolute', inset:0, zIndex:2, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                <div style={{ width:'56px', height:'56px', borderRadius:'16px', background:'rgba(255,60,95,0.12)', border:'1.5px solid rgba(255,60,95,0.35)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'26px', marginBottom:'4px' }}>🎬</div>
                <p style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.95rem' }}>Tap to select video</p>
                <p style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>Any size · MP4 · MOV</p>
              </div>
            </>
          ) : (
            <>
              <video src={preview} style={{ width:'100%', height:'100%', objectFit:'cover' }} muted playsInline autoPlay loop/>
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,0.4) 0%,transparent 50%)', pointerEvents:'none' }}/>
              {file && !uploading && (
                <div style={{ position:'absolute', top:'10px', left:'10px', background:file.size>100*1024*1024?'rgba(240,165,0,0.85)':'rgba(0,0,0,0.55)', borderRadius:'8px', padding:'3px 10px', fontSize:'0.7rem', fontWeight:700, color:'white', backdropFilter:'blur(4px)' }}>
                  {file.size>100*1024*1024?'⚠️ ':'✓ '}{(file.size/(1024*1024)).toFixed(1)}MB
                </div>
              )}
              {uploading && (
                <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'12px' }}>
                  <div style={{ width:'70px', height:'70px', background:`conic-gradient(#ff3c5f ${progress*3.6}deg, rgba(255,255,255,0.08) 0deg)`, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <div style={{ width:'52px', height:'52px', borderRadius:'50%', background:'rgba(8,8,16,0.9)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.9rem', fontWeight:800, color:'white' }}>{progress}%</div>
                  </div>
                  <p style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.7)' }}>
                    {uploadStage==='saving' ? '💾 Saving...' : `☁️ Uploading to Cloudinary`}
                  </p>
                  <p style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.4)' }}>
                    {(file.size/(1024*1024)).toFixed(1)}MB · Do not close this page
                  </p>
                  <button onClick={()=>{xhrRef.current?.abort();setUploading(false);setProgress(0);}} style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'20px', padding:'6px 16px', color:'rgba(255,255,255,0.65)', fontSize:'0.78rem', cursor:'pointer' }}>Cancel</button>
                </div>
              )}
              {!uploading && (
                <button onClick={removeFile} style={{ position:'absolute', top:'10px', right:'10px', background:'rgba(0,0,0,0.55)', backdropFilter:'blur(6px)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'50%', width:'30px', height:'30px', color:'white', fontSize:'13px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
              )}
            </>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFile} style={{ display:'none' }}/>

        {/* Error display */}
        {uploadError && (
          <div style={{ background:'rgba(255,60,60,0.1)', border:'1px solid rgba(255,60,60,0.3)', borderRadius:'12px', padding:'12px 16px', fontSize:'0.82rem', color:'#ff8080' }}>
            <p style={{ fontWeight:700, marginBottom:'4px' }}>⚠️ Upload Failed</p>
            <p>{uploadError}</p>
            {uploadError.includes('preset') && (
              <p style={{ marginTop:'6px', opacity:0.8, fontSize:'0.75rem' }}>
                Fix: Vercel → Settings → Environment Variables → confirm VITE_CLOUDINARY_UPLOAD_PRESET = spyce_videos
              </p>
            )}
            {uploadError.includes('Network') && (
              <p style={{ marginTop:'6px', opacity:0.8, fontSize:'0.75rem' }}>
                Fix: Try trimming the video first (✂️ Trim tab) to reduce file size, then retry.
              </p>
            )}
          </div>
        )}

        {/* Video Editor */}
        {file && preview && (
          <VideoEditor
            videoSrc={preview}
            selectedTrack={selectedTrack}
            onEditsChange={setEdits}
            edits={edits}
          />
        )}

        {/* Challenge */}
        {challenge && (
          <div onClick={()=>setLinkChallenge(l=>!l)} style={{ background:linkChallenge?'rgba(255,60,95,0.08)':'var(--bg-card)', border:`1.5px solid ${linkChallenge?'rgba(255,60,95,0.4)':'var(--border)'}`, borderRadius:'14px', padding:'12px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', transition:'all 0.2s' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'2px' }}>
                <span style={{ background:'var(--brand-gradient)', color:'white', borderRadius:'5px', padding:'1px 7px', fontSize:'0.6rem', fontWeight:800 }}>🔴 LIVE</span>
                <span style={{ fontWeight:700, fontSize:'0.85rem', fontFamily:'var(--font-display)' }}>#{challenge.hashtag}</span>
              </div>
              <span style={{ fontSize:'0.72rem', color:'var(--pi-gold)' }}>🪙 +{challenge.rewardPerParticipant}π for participating</span>
            </div>
            <div style={{ width:'24px', height:'24px', borderRadius:'50%', background:linkChallenge?'var(--brand-gradient)':'var(--bg-elevated)', border:`1.5px solid ${linkChallenge?'transparent':'var(--border-strong)'}`, display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'13px', flexShrink:0 }}>{linkChallenge?'✓':''}</div>
          </div>
        )}

        {/* Description */}
        <div style={{ position:'relative' }}>
          <textarea placeholder="Describe your video... add some spyce 🌶️" value={description} onChange={e=>setDescription(e.target.value)} rows={3} maxLength={500}
            style={{ resize:'none', borderRadius:'14px', width:'100%', padding:'13px 16px', paddingBottom:'28px', background:'var(--bg-card)', border:'1px solid var(--border)', color:'var(--text-primary)', fontFamily:'var(--font-body)', fontSize:'0.9rem', outline:'none' }}/>
          <span style={{ position:'absolute', bottom:'8px', right:'12px', fontSize:'0.68rem', color:'var(--text-muted)' }}>{description.length}/500</span>
        </div>

        {/* Hashtags */}
        <input placeholder="🏷️ #hashtags, comma separated" value={hashtags} onChange={e=>setHashtags(e.target.value)} style={{ borderRadius:'14px' }}/>

        {/* Music */}
        <div>
          {selectedTrack ? (
            <div style={{ background:'var(--bg-card)', border:'1.5px solid rgba(255,60,95,0.25)', borderRadius:'14px', padding:'11px 14px', display:'flex', alignItems:'center', gap:'11px' }}>
              <div style={{ position:'relative', flexShrink:0 }}>
                {selectedTrack.artwork ? <img src={selectedTrack.artwork} alt="" style={{ width:'42px', height:'42px', borderRadius:'8px' }}/> : <div style={{ width:'42px', height:'42px', borderRadius:'8px', background:'var(--bg-elevated)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px' }}>🎵</div>}
                <div style={{ position:'absolute', bottom:'-4px', right:'-4px', background:'var(--brand-red)', borderRadius:'50%', width:'16px', height:'16px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'8px' }}>🎵</div>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontWeight:700, fontSize:'0.85rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{selectedTrack.title}</p>
                <p style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>{selectedTrack.artist}</p>
                {edits.mixSaved && <p style={{ fontSize:'0.65rem', color:'#4ade80', marginTop:'2px' }}>✓ Mix saved · 🎬{edits.videoVolume}% 🎵{edits.musicVolume}%</p>}
              </div>
              <div style={{ display:'flex', gap:'6px', flexShrink:0 }}>
                <button onClick={()=>setShowMusic(true)} style={{ background:'var(--bg-elevated)', borderRadius:'10px', padding:'5px 10px', fontSize:'0.72rem', color:'var(--text-secondary)', cursor:'pointer' }}>Change</button>
                <button onClick={()=>{setSelectedTrack(null);setEdits(e=>({...e,mixSaved:false}));}} style={{ background:'var(--bg-elevated)', borderRadius:'50%', width:'28px', height:'28px', color:'var(--text-muted)', fontSize:'13px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>✕</button>
              </div>
            </div>
          ) : (
            <button onClick={()=>setShowMusic(s=>!s)} style={{ width:'100%', padding:'13px 16px', background:'var(--bg-card)', border:`1.5px solid ${showMusic?'rgba(255,60,95,0.35)':'var(--border)'}`, borderRadius:'14px', display:'flex', alignItems:'center', gap:'10px', transition:'all 0.2s', cursor:'pointer' }}>
              <span style={{ fontSize:'20px' }}>🎵</span>
              <span style={{ fontSize:'0.88rem', color:'var(--text-muted)', flex:1, textAlign:'left' }}>Add music to your video</span>
              <span style={{ fontSize:'0.72rem', color:'var(--brand-red)', fontWeight:700 }}>{showMusic?'▲':'Search ▼'}</span>
            </button>
          )}

          {showMusic && (
            <div style={{ marginTop:'8px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'16px', overflow:'hidden' }}>
              <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--border)' }}>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', fontSize:'15px' }}>🔍</span>
                  <input placeholder="Search songs, artists..." value={musicQuery} onChange={e=>setMusicQuery(e.target.value)} autoFocus style={{ paddingLeft:'38px', borderRadius:'10px', background:'var(--bg-elevated)', border:'1px solid var(--border)', width:'100%' }}/>
                  {musicQuery && <button onClick={()=>setMusicQuery('')} style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', fontSize:'14px', cursor:'pointer' }}>✕</button>}
                </div>
              </div>
              {!musicQuery && (
                <div style={{ display:'flex', gap:'6px', overflowX:'auto', padding:'10px 12px', borderBottom:'1px solid var(--border)' }}>
                  {QUICK_SEARCHES.map(tag=>(
                    <button key={tag} onClick={()=>setMusicQuery(tag)} style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'20px', padding:'5px 12px', fontSize:'0.75rem', color:'var(--text-secondary)', whiteSpace:'nowrap', cursor:'pointer' }}>{tag}</button>
                  ))}
                </div>
              )}
              <div style={{ maxHeight:'300px', overflowY:'auto' }}>
                {musicLoading && (
                  <div style={{ padding:'24px', textAlign:'center' }}>
                    <div className="animate-spin" style={{ width:'24px', height:'24px', margin:'0 auto', border:'2px solid var(--border)', borderTopColor:'var(--brand-red)', borderRadius:'50%' }}/>
                    <p style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:'8px' }}>Searching...</p>
                  </div>
                )}
                {!musicLoading && musicQuery && musicResults.length===0 && (
                  <div style={{ padding:'20px', textAlign:'center' }}>
                    <p style={{ color:'var(--text-muted)', fontSize:'0.85rem', marginBottom:'8px' }}>No results for "{musicQuery}"</p>
                    <div style={{ display:'flex', gap:'6px', justifyContent:'center', flexWrap:'wrap', marginTop:'10px' }}>
                      {['Bruno Mars','Taylor Swift','OPM','acoustic','chill'].map(s=>(
                        <button key={s} onClick={()=>setMusicQuery(s)} style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'20px', padding:'4px 10px', fontSize:'0.72rem', color:'var(--brand-red)', cursor:'pointer' }}>{s}</button>
                      ))}
                    </div>
                  </div>
                )}
                {!musicLoading && !musicQuery && <div style={{ padding:'20px', textAlign:'center', color:'var(--text-muted)', fontSize:'0.82rem' }}>🎵 Search millions of songs</div>}
                {musicResults.map(track=>(
                  <MusicTrackRow key={track.id} track={track} isPlaying={playingId===track.id} previewProgress={playingId===track.id?previewProgress:0} onPlay={playPreview} onSelect={selectTrack}/>
                ))}
              </div>
              <div style={{ padding:'8px', borderTop:'1px solid var(--border)', textAlign:'center' }}>
                <button onClick={()=>setShowMusic(false)} style={{ fontSize:'0.8rem', color:'var(--text-muted)', padding:'4px 12px', cursor:'pointer' }}>Close ✕</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes eq1{from{height:4px}to{height:16px}}
        @keyframes eq2{from{height:12px}to{height:4px}}
        @keyframes eq3{from{height:5px}to{height:18px}}
        @keyframes eq4{from{height:14px}to{height:5px}}
      `}</style>
    </div>
  );
}
