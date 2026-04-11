// ============================================================
// SPYCE - Upload Page v4
// - Direct Cloudinary upload (no timeout)
// - 3D animated video picker
// - Music search with ALWAYS-VISIBLE play buttons
// - Preview progress ring + equalizer animation
// - "Use This" button highlights when track is playing
// ============================================================
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const searchMusic = async (query) => {
  if (!query.trim()) return [];
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=15&entity=song`
    );
    const data = await res.json();
    return data.results || [];
  } catch { return []; }
};

// ── Music Track Row ───────────────────────────────────────────
function MusicTrackRow({ track, isPlaying, previewProgress, onPlay, onSelect }) {
  const fmt = (ms) => {
    if (!ms) return '';
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      background: isPlaying ? 'rgba(255,60,95,0.05)' : 'transparent',
      transition: 'background 0.25s',
    }}>
      {/* Play button + album art */}
      <button
        onClick={() => onPlay(track)}
        style={{
          position: 'relative', width: '64px', height: '64px',
          flexShrink: 0, background: 'none', border: 'none',
          padding: '10px', cursor: 'pointer',
        }}
      >
        <img
          src={track.artworkUrl100 || track.artworkUrl60}
          alt=""
          style={{
            width: '44px', height: '44px', borderRadius: '8px', display: 'block',
            filter: isPlaying ? 'brightness(0.55)' : 'brightness(1)',
            transition: 'filter 0.2s',
          }}
        />

        {/* Always-visible play/pause overlay */}
        <div style={{
          position: 'absolute', top: '10px', left: '10px',
          width: '44px', height: '44px', borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isPlaying ? 'rgba(255,60,95,0.25)' : 'rgba(0,0,0,0.4)',
          transition: 'background 0.2s',
        }}>
          {isPlaying ? (
            <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '18px' }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{
                  width: '3px', borderRadius: '2px', background: '#ff3c5f',
                  animation: `eq${i} ${0.28 + i * 0.09}s ease-in-out infinite alternate`,
                  minHeight: '4px',
                }} />
              ))}
            </div>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="white">
              <path d="M3 1.5L12.5 7L3 12.5V1.5Z"/>
            </svg>
          )}
        </div>

        {/* Progress ring */}
        {isPlaying && (
          <svg style={{ position: 'absolute', top: '10px', left: '10px', width: '44px', height: '44px', pointerEvents: 'none' }} viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="20" fill="none" stroke="rgba(255,60,95,0.2)" strokeWidth="2"/>
            <circle
              cx="22" cy="22" r="20" fill="none"
              stroke="#ff3c5f" strokeWidth="2.5" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 20}`}
              strokeDashoffset={`${2 * Math.PI * 20 * (1 - previewProgress / 100)}`}
              transform="rotate(-90 22 22)"
              style={{ transition: 'stroke-dashoffset 0.2s linear' }}
            />
          </svg>
        )}
      </button>

      {/* Track info */}
      <div style={{ flex: 1, minWidth: 0, padding: '12px 6px 12px 0' }}>
        <p style={{
          fontWeight: 600, fontSize: '0.84rem',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          color: isPlaying ? 'var(--brand-red)' : 'var(--text-primary)',
          marginBottom: '3px', transition: 'color 0.2s',
        }}>{track.trackName}</p>
        <p style={{
          fontSize: '0.71rem', color: 'var(--text-muted)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {track.artistName}
          {track.trackTimeMillis && (
            <span style={{ opacity: 0.6 }}> · {fmt(track.trackTimeMillis)}</span>
          )}
        </p>
        {isPlaying && (
          <p style={{ fontSize: '0.62rem', color: 'var(--brand-red)', marginTop: '3px', fontWeight: 700, letterSpacing: '0.06em' }}>
            ♪ PREVIEW PLAYING
          </p>
        )}
      </div>

      {/* Use button */}
      <div style={{ padding: '0 12px', flexShrink: 0 }}>
        <button
          onClick={() => onSelect(track)}
          style={{
            background: isPlaying ? 'var(--brand-gradient)' : 'var(--bg-elevated)',
            color: isPlaying ? 'white' : 'var(--text-secondary)',
            border: isPlaying ? 'none' : '1px solid var(--border-strong)',
            borderRadius: '20px', padding: '7px 16px',
            fontSize: '0.78rem', fontWeight: 700,
            fontFamily: 'var(--font-display)',
            transition: 'all 0.25s',
            boxShadow: isPlaying ? '0 0 16px rgba(255,60,95,0.35)' : 'none',
            whiteSpace: 'nowrap',
          }}
        >{isPlaying ? '✓ Use This' : 'Use'}</button>
      </div>
    </div>
  );
}

// ── Main Upload Page ──────────────────────────────────────────
export default function UploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const musicTimer = useRef(null);
  const audioRef = useRef(null);
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

  // Music state
  const [showMusic, setShowMusic] = useState(false);
  const [musicQuery, setMusicQuery] = useState('');
  const [musicResults, setMusicResults] = useState([]);
  const [musicLoading, setMusicLoading] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [playingId, setPlayingId] = useState(null);
  const [previewProgress, setPreviewProgress] = useState(0);

  // 3D canvas animation
  useEffect(() => {
    if (file) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const W = canvas.width, H = canvas.height, CX = W/2, CY = H/2, FOV = 250;
    const pts = Array.from({length:50}, () => ({
      x:(Math.random()-.5)*W*2, y:(Math.random()-.5)*H*2,
      z:Math.random()*400+50, vz:Math.random()*0.8+0.2,
      r:Math.random()*2+0.5, hue:Math.random()>.7?35:350,
    }));
    let t=0;
    const draw = () => {
      ctx.clearRect(0,0,W,H); t+=0.01;
      ctx.strokeStyle='rgba(255,60,95,0.05)'; ctx.lineWidth=0.5;
      const gOff=(t*20)%50;
      for(let gx=-W;gx<W*2;gx+=50){
        const sc=FOV/(FOV+150), x1=(gx+gOff-CX)*sc+CX;
        ctx.beginPath(); ctx.moveTo(x1,0); ctx.lineTo(x1,H); ctx.stroke();
      }
      pts.forEach(p=>{
        p.z-=p.vz;
        if(p.z<10){p.z=500;p.x=(Math.random()-.5)*W*2;p.y=(Math.random()-.5)*H*2;}
        const s=FOV/(FOV+p.z), px=p.x*s+CX, py=p.y*s+CY;
        if(px<-10||px>W+10||py<-10||py>H+10)return;
        const size=p.r*s*3;
        const g=ctx.createRadialGradient(px,py,0,px,py,size*4);
        g.addColorStop(0,`hsla(${p.hue},100%,65%,${Math.min(0.9,s*1.2)})`);
        g.addColorStop(1,`hsla(${p.hue},100%,65%,0)`);
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
    api.get('/challenges/active').then(({data})=>{
      if(data.challenge) setChallenge(data.challenge);
    }).catch(()=>{});
  }, []);

  // Music search
  useEffect(() => {
    clearTimeout(musicTimer.current);
    if(!musicQuery.trim()){setMusicResults([]); return;}
    musicTimer.current = setTimeout(async()=>{
      setMusicLoading(true);
      const r = await searchMusic(musicQuery);
      setMusicResults(r);
      setMusicLoading(false);
    }, 500);
    return ()=>clearTimeout(musicTimer.current);
  }, [musicQuery]);

  // File handling
  const handleFile = (e) => {
    const f = e.target.files[0];
    if(!f) return;
    if(!f.type.startsWith('video/')) { toast.error('Select a video file'); return; }
    if(f.size > 100*1024*1024) { toast.error('Max 100MB'); return; }
    cancelAnimationFrame(animRef.current);
    setFile(f); setPreview(URL.createObjectURL(f));
  };

  const removeFile = (e) => {
    e.stopPropagation();
    if(xhrRef.current) xhrRef.current.abort();
    setFile(null); setPreview(''); setProgress(0); setUploading(false);
  };

  // ── Music preview with progress tracking ──────────────────
  const playPreview = (track) => {
    clearInterval(previewTimer.current);
    setPreviewProgress(0);
    if(audioRef.current){ audioRef.current.pause(); audioRef.current = null; }

    // Toggle off if same track
    if(playingId === track.trackId){ setPlayingId(null); return; }

    if(!track.previewUrl){
      toast('No preview for this track', {icon:'🎵'});
      return;
    }

    const a = new Audio(track.previewUrl);
    a.volume = 0.7;
    a.play().catch(()=> toast.error('Could not play preview'));

    // Update progress every 200ms
    previewTimer.current = setInterval(()=>{
      if(a.duration > 0){
        setPreviewProgress((a.currentTime / a.duration) * 100);
      }
    }, 200);

    a.onended = ()=>{
      clearInterval(previewTimer.current);
      setPreviewProgress(0);
      setPlayingId(null);
      audioRef.current = null;
    };

    audioRef.current = a;
    setPlayingId(track.trackId);
  };

  const selectTrack = (track) => {
    clearInterval(previewTimer.current);
    if(audioRef.current){ audioRef.current.pause(); audioRef.current = null; }
    setPlayingId(null); setPreviewProgress(0);
    setSelectedTrack(track);
    setShowMusic(false); setMusicQuery('');
    toast.success(`🎵 "${track.trackName}" added!`);
  };

  // ── Direct Cloudinary upload ───────────────────────────────
  const uploadToCloudinary = (file) => {
    return new Promise((resolve, reject) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', UPLOAD_PRESET);
      fd.append('resource_type', 'video');
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      xhr.upload.addEventListener('progress', (e) => {
        if(e.lengthComputable) setProgress(Math.round((e.loaded/e.total)*85));
      });
      xhr.addEventListener('load', () => {
        if(xhr.status===200) resolve(JSON.parse(xhr.responseText));
        else reject(new Error(`Upload error ${xhr.status}`));
      });
      xhr.addEventListener('error', ()=>reject(new Error('Network error')));
      xhr.addEventListener('abort', ()=>reject(new Error('Upload cancelled')));
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`);
      xhr.send(fd);
    });
  };

  const handleUpload = async () => {
    if(!file){ toast.error('Select a video first'); return; }
    if(!CLOUD_NAME || !UPLOAD_PRESET){
      toast.error('Cloudinary not configured'); return;
    }
    setUploading(true); setProgress(0);
    try {
      setUploadStage('cloudinary');
      toast('Uploading... 🚀', {icon:'📤', id:'upload'});
      const cData = await uploadToCloudinary(file);
      setUploadStage('saving'); setProgress(90);
      toast.loading('Saving...', {id:'upload'});
      await api.post('/videos/save', {
        videoUrl: cData.secure_url,
        thumbnailUrl: cData.eager?.[0]?.secure_url ||
          cData.secure_url.replace('/upload/','/upload/so_1,f_jpg/').replace('.mp4','.jpg'),
        cloudinaryPublicId: cData.public_id,
        duration: cData.duration || 0,
        description, hashtags,
        audioTrack: selectedTrack
          ? `${selectedTrack.trackName} — ${selectedTrack.artistName}` : '',
        challengeId: linkChallenge && challenge ? challenge._id : null,
      });
      setProgress(100);
      toast.success('Video posted! 🌶️', {id:'upload'});
      if(linkChallenge && challenge)
        toast.success(`+${challenge.rewardPerParticipant}π earned!`, {icon:'🪙'});
      navigate('/');
    } catch(err) {
      if(err.message==='Upload cancelled') toast('Cancelled', {icon:'↩️', id:'upload'});
      else toast.error(err.response?.data?.error || err.message || 'Upload failed', {id:'upload'});
    } finally { setUploading(false); setUploadStage(''); }
  };

  const QUICK = ['trending','OPM','hip hop','pop 2025','R&B','EDM','love song','BPM'];

  return (
    <div style={{ minHeight:'100dvh', background:'var(--bg-primary)', paddingBottom:'90px' }}>

      {/* Header */}
      <div style={{
        position:'sticky', top:0, zIndex:20,
        display:'flex', alignItems:'center', gap:'12px',
        padding:'14px 20px',
        background:'rgba(10,10,15,0.92)', backdropFilter:'blur(16px)',
        borderBottom:'1px solid var(--border)',
      }}>
        <button onClick={()=>{ xhrRef.current?.abort(); navigate(-1); }} style={{
          width:'36px', height:'36px', borderRadius:'50%',
          background:'var(--bg-card)', border:'1px solid var(--border)',
          color:'var(--text-primary)', fontSize:'18px',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>←</button>
        <h1 style={{fontFamily:'var(--font-display)', fontSize:'1.25rem', flex:1}}>New Video</h1>
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          style={{
            background: file&&!uploading ? 'var(--brand-gradient)' : 'var(--bg-elevated)',
            color: file&&!uploading ? 'white' : 'var(--text-muted)',
            border:'none', borderRadius:'20px', padding:'8px 22px',
            fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.9rem',
            transition:'all 0.2s', minWidth:'100px',
            boxShadow: file&&!uploading ? 'var(--brand-glow)' : 'none',
          }}
        >
          {uploading
            ? uploadStage==='saving' ? 'Saving...' : `${progress}%`
            : 'Post 🌶️'}
        </button>
      </div>

      <div style={{padding:'16px 20px', display:'flex', flexDirection:'column', gap:'12px'}}>

        {/* 3D Video Picker */}
        <div
          onClick={()=> !file && !uploading && fileInputRef.current?.click()}
          style={{
            position:'relative', width:'100%',
            height: file ? '240px' : '180px',
            borderRadius:'20px', overflow:'hidden',
            border:`1.5px solid ${file ? 'rgba(255,60,95,0.45)' : 'rgba(255,255,255,0.07)'}`,
            cursor: file ? 'default' : 'pointer',
            background:'#080810',
            transition:'height 0.4s cubic-bezier(0.34,1.56,0.64,1)',
            boxShadow: file ? '0 8px 40px rgba(255,60,95,0.12)' : 'none',
          }}
        >
          {!file ? (
            <>
              <canvas ref={canvasRef} style={{position:'absolute',inset:0,width:'100%',height:'100%'}}/>
              <div style={{
                position:'absolute',inset:0,zIndex:2,
                display:'flex',flexDirection:'column',
                alignItems:'center',justifyContent:'center',gap:'8px',
              }}>
                <div style={{
                  width:'56px',height:'56px',borderRadius:'16px',
                  background:'rgba(255,60,95,0.12)',
                  border:'1.5px solid rgba(255,60,95,0.35)',
                  backdropFilter:'blur(10px)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:'26px', marginBottom:'4px',
                }}>🎬</div>
                <p style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:'0.95rem'}}>
                  Tap to select video
                </p>
                <p style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>
                  MP4 · MOV · up to 100MB · 60 sec
                </p>
              </div>
            </>
          ) : (
            <>
              <video src={preview} style={{width:'100%',height:'100%',objectFit:'cover'}} muted playsInline autoPlay loop/>
              <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(0,0,0,0.4) 0%,transparent 50%)',pointerEvents:'none'}}/>
              {uploading && (
                <div style={{
                  position:'absolute',inset:0,
                  background:'rgba(0,0,0,0.65)',
                  display:'flex',flexDirection:'column',
                  alignItems:'center',justifyContent:'center',gap:'12px',
                }}>
                  <div style={{
                    width:'70px',height:'70px',position:'relative',
                    background:`conic-gradient(#ff3c5f ${progress*3.6}deg, rgba(255,255,255,0.08) 0deg)`,
                    borderRadius:'50%',
                    display:'flex',alignItems:'center',justifyContent:'center',
                  }}>
                    <div style={{
                      width:'52px',height:'52px',borderRadius:'50%',
                      background:'rgba(8,8,16,0.9)',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:'0.9rem',fontWeight:800,color:'white',
                    }}>{progress}%</div>
                  </div>
                  <p style={{fontSize:'0.78rem',color:'rgba(255,255,255,0.6)'}}>
                    {uploadStage==='saving' ? 'Almost done...' : 'Uploading to cloud ☁️'}
                  </p>
                  <button onClick={()=>{ xhrRef.current?.abort(); setUploading(false); setProgress(0); }} style={{
                    background:'rgba(255,255,255,0.08)',
                    border:'1px solid rgba(255,255,255,0.15)',
                    borderRadius:'20px',padding:'6px 16px',
                    color:'rgba(255,255,255,0.65)',fontSize:'0.78rem',
                  }}>Cancel</button>
                </div>
              )}
              {!uploading && (
                <button onClick={removeFile} style={{
                  position:'absolute',top:'10px',right:'10px',
                  background:'rgba(0,0,0,0.55)',backdropFilter:'blur(6px)',
                  border:'1px solid rgba(255,255,255,0.15)',
                  borderRadius:'50%',width:'30px',height:'30px',
                  color:'white',fontSize:'13px',
                  display:'flex',alignItems:'center',justifyContent:'center',
                }}>✕</button>
              )}
            </>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFile} style={{display:'none'}}/>

        {/* Challenge */}
        {challenge && (
          <div onClick={()=>setLinkChallenge(l=>!l)} style={{
            background: linkChallenge ? 'rgba(255,60,95,0.08)' : 'var(--bg-card)',
            border:`1.5px solid ${linkChallenge ? 'rgba(255,60,95,0.4)' : 'var(--border)'}`,
            borderRadius:'14px',padding:'12px 14px',
            display:'flex',alignItems:'center',justifyContent:'space-between',
            cursor:'pointer',transition:'all 0.2s',
          }}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:'7px',marginBottom:'2px'}}>
                <span style={{background:'var(--brand-gradient)',color:'white',borderRadius:'5px',padding:'1px 7px',fontSize:'0.6rem',fontWeight:800}}>🔴 LIVE</span>
                <span style={{fontWeight:700,fontSize:'0.85rem',fontFamily:'var(--font-display)'}}>#{challenge.hashtag}</span>
              </div>
              <span style={{fontSize:'0.72rem',color:'var(--pi-gold)'}}>🪙 +{challenge.rewardPerParticipant}π for participating</span>
            </div>
            <div style={{
              width:'24px',height:'24px',borderRadius:'50%',
              background: linkChallenge ? 'var(--brand-gradient)' : 'var(--bg-elevated)',
              border:`1.5px solid ${linkChallenge ? 'transparent' : 'var(--border-strong)'}`,
              display:'flex',alignItems:'center',justifyContent:'center',
              color:'white',fontSize:'13px',transition:'all 0.2s',flexShrink:0,
            }}>{linkChallenge ? '✓' : ''}</div>
          </div>
        )}

        {/* Description */}
        <div style={{position:'relative'}}>
          <textarea
            placeholder="Describe your video... add some spyce 🌶️"
            value={description} onChange={e=>setDescription(e.target.value)}
            rows={3} maxLength={500}
            style={{
              resize:'none',borderRadius:'14px',width:'100%',
              padding:'13px 16px',paddingBottom:'28px',
              background:'var(--bg-card)',border:'1px solid var(--border)',
              color:'var(--text-primary)',fontFamily:'var(--font-body)',fontSize:'0.9rem',outline:'none',
            }}
          />
          <span style={{position:'absolute',bottom:'8px',right:'12px',fontSize:'0.68rem',color:'var(--text-muted)'}}>
            {description.length}/500
          </span>
        </div>

        {/* Hashtags */}
        <input
          placeholder="🏷️ #hashtags, comma separated"
          value={hashtags} onChange={e=>setHashtags(e.target.value)}
          style={{borderRadius:'14px'}}
        />

        {/* ── Music Section ── */}
        <div>
          {selectedTrack ? (
            <div style={{
              background:'var(--bg-card)',border:'1.5px solid rgba(255,60,95,0.25)',
              borderRadius:'14px',padding:'11px 14px',
              display:'flex',alignItems:'center',gap:'11px',
            }}>
              <div style={{position:'relative',flexShrink:0}}>
                <img src={selectedTrack.artworkUrl60} alt="" style={{width:'42px',height:'42px',borderRadius:'8px'}}/>
                <div style={{
                  position:'absolute',bottom:'-4px',right:'-4px',
                  background:'var(--brand-red)',borderRadius:'50%',
                  width:'16px',height:'16px',
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:'8px',
                }}>🎵</div>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontWeight:700,fontSize:'0.85rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {selectedTrack.trackName}
                </p>
                <p style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>{selectedTrack.artistName}</p>
              </div>
              <div style={{display:'flex',gap:'6px',flexShrink:0}}>
                <button onClick={()=>setShowMusic(true)} style={{
                  background:'var(--bg-elevated)',borderRadius:'10px',
                  padding:'5px 10px',fontSize:'0.72rem',color:'var(--text-secondary)',
                }}>Change</button>
                <button onClick={()=>setSelectedTrack(null)} style={{
                  background:'var(--bg-elevated)',borderRadius:'50%',
                  width:'28px',height:'28px',color:'var(--text-muted)',fontSize:'13px',
                  display:'flex',alignItems:'center',justifyContent:'center',
                }}>✕</button>
              </div>
            </div>
          ) : (
            <button onClick={()=>setShowMusic(s=>!s)} style={{
              width:'100%',padding:'13px 16px',background:'var(--bg-card)',
              border:`1.5px solid ${showMusic ? 'rgba(255,60,95,0.35)' : 'var(--border)'}`,
              borderRadius:'14px',display:'flex',alignItems:'center',gap:'10px',transition:'all 0.2s',
            }}>
              <span style={{fontSize:'20px'}}>🎵</span>
              <span style={{fontSize:'0.88rem',color:'var(--text-muted)',flex:1,textAlign:'left'}}>Add music to your video</span>
              <span style={{fontSize:'0.72rem',color:'var(--brand-red)',fontWeight:700}}>{showMusic?'▲':'Search ▼'}</span>
            </button>
          )}

          {showMusic && (
            <div style={{
              marginTop:'8px',background:'var(--bg-card)',
              border:'1px solid var(--border)',borderRadius:'16px',overflow:'hidden',
            }}>
              {/* Search input */}
              <div style={{padding:'10px 12px',borderBottom:'1px solid var(--border)'}}>
                <div style={{position:'relative'}}>
                  <span style={{position:'absolute',left:'12px',top:'50%',transform:'translateY(-50%)',fontSize:'15px'}}>🔍</span>
                  <input
                    placeholder="Search songs, artists..."
                    value={musicQuery} onChange={e=>setMusicQuery(e.target.value)}
                    autoFocus
                    style={{paddingLeft:'38px',borderRadius:'10px',background:'var(--bg-elevated)',border:'1px solid var(--border)',width:'100%'}}
                  />
                  {musicQuery && (
                    <button onClick={()=>setMusicQuery('')} style={{position:'absolute',right:'10px',top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)',fontSize:'14px'}}>✕</button>
                  )}
                </div>
              </div>

              {/* Quick search pills */}
              {!musicQuery && (
                <div style={{display:'flex',gap:'6px',overflowX:'auto',padding:'10px 12px',borderBottom:'1px solid var(--border)'}}>
                  {QUICK.map(tag=>(
                    <button key={tag} onClick={()=>setMusicQuery(tag)} style={{
                      background:'var(--bg-elevated)',border:'1px solid var(--border)',
                      borderRadius:'20px',padding:'5px 12px',
                      fontSize:'0.75rem',color:'var(--text-secondary)',whiteSpace:'nowrap',
                    }}>{tag}</button>
                  ))}
                </div>
              )}

              {/* Instruction banner */}
              {musicResults.length > 0 && (
                <div style={{
                  padding:'8px 14px',
                  background:'rgba(255,60,95,0.05)',
                  borderBottom:'1px solid var(--border)',
                  display:'flex',alignItems:'center',gap:'8px',
                }}>
                  <span style={{fontSize:'14px'}}>👆</span>
                  <p style={{fontSize:'0.72rem',color:'var(--text-secondary)'}}>
                    Tap album art to preview · tap <strong>Use</strong> to add to your video
                  </p>
                </div>
              )}

              {/* Results */}
              <div style={{maxHeight:'320px',overflowY:'auto'}}>
                {musicLoading && (
                  <div style={{padding:'24px',textAlign:'center'}}>
                    <div className="animate-spin" style={{
                      width:'24px',height:'24px',margin:'0 auto',
                      border:'2px solid var(--border)',borderTopColor:'var(--brand-red)',borderRadius:'50%',
                    }}/>
                  </div>
                )}

                {!musicLoading && musicQuery && musicResults.length===0 && (
                  <div style={{padding:'20px',textAlign:'center',color:'var(--text-muted)',fontSize:'0.85rem'}}>
                    No results for "{musicQuery}"
                  </div>
                )}

                {!musicLoading && !musicQuery && (
                  <div style={{padding:'20px',textAlign:'center',color:'var(--text-muted)',fontSize:'0.82rem'}}>
                    🎵 Search millions of songs above
                  </div>
                )}

                {musicResults.map(track => (
                  <MusicTrackRow
                    key={track.trackId}
                    track={track}
                    isPlaying={playingId === track.trackId}
                    previewProgress={playingId === track.trackId ? previewProgress : 0}
                    onPlay={playPreview}
                    onSelect={selectTrack}
                  />
                ))}
              </div>

              <div style={{padding:'8px',borderTop:'1px solid var(--border)',textAlign:'center'}}>
                <button onClick={()=>setShowMusic(false)} style={{fontSize:'0.8rem',color:'var(--text-muted)',padding:'4px 12px'}}>
                  Close ✕
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes eq1 { from{height:4px} to{height:16px} }
        @keyframes eq2 { from{height:12px} to{height:4px} }
        @keyframes eq3 { from{height:5px} to{height:18px} }
        @keyframes eq4 { from{height:14px} to{height:5px} }
      `}</style>
    </div>
  );
}
