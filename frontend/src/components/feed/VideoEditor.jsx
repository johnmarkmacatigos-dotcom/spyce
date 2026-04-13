// ============================================================
// SPYCE - VideoEditor v2 — COMPLETE FILE
// Trim, Audio Mixer, Text, Stickers, Filters
// FILE: frontend/src/components/feed/VideoEditor.jsx
// ============================================================
import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';

const STICKERS = ['🔥','💯','🌶️','❤️','😂','👑','✨','🎉','💪','🙌','👀','💀','🫶','⚡','🌟','🤩','😍','🥹','🫡','💥'];

const FILTERS = [
  { name:'None',   style:{} },
  { name:'Bright', style:{filter:'brightness(1.3) contrast(1.1)'} },
  { name:'Warm',   style:{filter:'sepia(0.3) saturate(1.4) brightness(1.1)'} },
  { name:'Cool',   style:{filter:'hue-rotate(20deg) saturate(1.2)'} },
  { name:'Drama',  style:{filter:'contrast(1.4) saturate(1.3) brightness(0.9)'} },
  { name:'Fade',   style:{filter:'brightness(1.1) contrast(0.85) saturate(0.8)'} },
  { name:'Noir',   style:{filter:'grayscale(1) contrast(1.3)'} },
  { name:'Vivid',  style:{filter:'saturate(2) contrast(1.1)'} },
];

const TEXT_COLORS = ['#ffffff','#ff3c5f','#f0a500','#4ade80','#60a5fa','#f472b6','#000000'];
const TEXT_SIZES = [16, 20, 24, 32];

export default function VideoEditor({ videoSrc, selectedTrack, onEditsChange, edits }) {
  const videoRef = useRef(null);
  const trimVideoRef = useRef(null);

  const [activeTab, setActiveTab] = useState(null);
  const [texts, setTexts] = useState(edits?.texts || []);
  const [stickers, setStickers] = useState(edits?.stickers || []);
  const [filter, setFilter] = useState(edits?.filter || FILTERS[0]);
  const [textInput, setTextInput] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textSize, setTextSize] = useState(20);

  // Audio
  const [videoVolume, setVideoVolume] = useState(edits?.videoVolume ?? 80);
  const [musicVolume, setMusicVolume] = useState(edits?.musicVolume ?? 70);
  const [musicMuted, setMusicMuted] = useState(false);

  // Trim
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(edits?.trimStart || 0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimPlaying, setTrimPlaying] = useState(false);
  const [trimApplied, setTrimApplied] = useState(false);

  useEffect(() => {
    const v = trimVideoRef.current;
    if (!v) return;
    const onLoad = () => {
      setDuration(v.duration);
      setTrimEnd(v.duration);
    };
    v.addEventListener('loadedmetadata', onLoad);
    return () => v.removeEventListener('loadedmetadata', onLoad);
  }, [videoSrc]);

  useEffect(() => {
    const v = trimVideoRef.current;
    if (!v || !trimPlaying) return;
    const onTime = () => {
      setCurrentTime(v.currentTime);
      if (v.currentTime >= trimEnd) { v.currentTime = trimStart; }
    };
    v.addEventListener('timeupdate', onTime);
    return () => v.removeEventListener('timeupdate', onTime);
  }, [trimStart, trimEnd, trimPlaying]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = videoVolume / 100;
  }, [videoVolume]);

  const notify = (extra = {}) => {
    onEditsChange?.({ texts, stickers, filter, videoVolume, musicVolume, musicMuted, trimStart, trimEnd: trimEnd || duration, ...extra });
  };

  const addText = () => {
    if (!textInput.trim()) return;
    const t = [...texts, { id: Date.now(), text: textInput, color: textColor, size: textSize, x: 20, y: 40 }];
    setTexts(t); setTextInput(''); notify({ texts: t }); setActiveTab(null);
    toast.success('Text added!');
  };

  const removeText = (id) => { const t = texts.filter(x => x.id !== id); setTexts(t); notify({ texts: t }); };

  const addSticker = (emoji) => {
    const s = [...stickers, { id: Date.now(), emoji, x: 20 + Math.random() * 60, y: 20 + Math.random() * 60 }];
    setStickers(s); notify({ stickers: s }); toast.success(`${emoji} added!`);
  };

  const removeSticker = (id) => { const s = stickers.filter(x => x.id !== id); setStickers(s); notify({ stickers: s }); };

  const selectFilter = (f) => { setFilter(f); notify({ filter: f }); };

  const applyTrim = () => {
    const d = trimEnd - trimStart;
    if (d < 1) { toast.error('Trim must be at least 1 second'); return; }
    setTrimApplied(true);
    notify({ trimStart, trimEnd });
    toast.success(`✂️ Trimmed to ${d.toFixed(1)}s`);
    setActiveTab(null);
  };

  const toggleTrimPlay = () => {
    const v = trimVideoRef.current;
    if (!v) return;
    if (v.paused) { v.currentTime = trimStart; v.play(); setTrimPlaying(true); }
    else { v.pause(); setTrimPlaying(false); }
  };

  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  const TABS = [
    { id:'trim',     icon:'✂️', label:'Trim' },
    { id:'audio',    icon:'🎛️', label:'Audio' },
    { id:'text',     icon:'Aa', label:'Text' },
    { id:'stickers', icon:'😊', label:'Stickers' },
    { id:'filters',  icon:'✨', label:'Effects' },
  ];

  return (
    <div style={{ width: '100%' }}>

      {/* Preview */}
      <div style={{
        position: 'relative', width: '100%', height: '200px',
        borderRadius: '16px', overflow: 'hidden', background: '#000',
      }}>
        <video ref={videoRef} src={videoSrc} muted={videoVolume === 0} playsInline autoPlay loop
          style={{ width: '100%', height: '100%', objectFit: 'cover', ...filter.style }}
        />
        {texts.map(t => (
          <div key={t.id} onClick={() => removeText(t.id)} style={{
            position: 'absolute', top: `${t.y}%`, left: `${t.x}%`,
            transform: 'translate(-50%,-50%)',
            color: t.color, fontSize: `${t.size}px`,
            fontFamily: 'var(--font-display)', fontWeight: 800,
            textShadow: '1px 2px 8px rgba(0,0,0,0.8)',
            cursor: 'pointer', userSelect: 'none',
            padding: '4px 8px', background: 'rgba(0,0,0,0.2)',
            borderRadius: '6px', backdropFilter: 'blur(2px)', whiteSpace: 'nowrap',
          }}>{t.text}</div>
        ))}
        {stickers.map(s => (
          <div key={s.id} onClick={() => removeSticker(s.id)} style={{
            position: 'absolute', top: `${s.y}%`, left: `${s.x}%`,
            transform: 'translate(-50%,-50%)',
            fontSize: '32px', cursor: 'pointer', userSelect: 'none',
            filter: 'drop-shadow(1px 2px 4px rgba(0,0,0,0.5))',
          }}>{s.emoji}</div>
        ))}
        {trimApplied && (
          <div style={{
            position: 'absolute', top: '10px', left: '10px',
            background: 'rgba(255,60,95,0.85)', borderRadius: '8px',
            padding: '3px 10px', fontSize: '0.7rem', color: 'white', fontWeight: 700,
          }}>✂️ {fmt(trimStart)} – {fmt(trimEnd)}</div>
        )}
        {(texts.length > 0 || stickers.length > 0) && (
          <div style={{
            position: 'absolute', bottom: '8px', left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.5)', borderRadius: '10px',
            padding: '3px 10px', fontSize: '0.65rem',
            color: 'rgba(255,255,255,0.7)', pointerEvents: 'none',
          }}>Tap to remove</div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '10px', overflowX: 'auto', paddingBottom: '2px' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(activeTab === tab.id ? null : tab.id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
            flexShrink: 0, padding: '8px 14px', borderRadius: '12px', cursor: 'pointer',
            background: activeTab === tab.id ? 'rgba(255,60,95,0.15)' : 'var(--bg-card)',
            border: `1px solid ${activeTab === tab.id ? 'rgba(255,60,95,0.4)' : 'var(--border)'}`,
            color: activeTab === tab.id ? 'var(--brand-red)' : 'var(--text-secondary)',
            fontSize: '0.72rem', fontWeight: 700, transition: 'all 0.2s',
          }}>
            <span style={{ fontSize: '16px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TRIM ── */}
      {activeTab === 'trim' && (
        <div style={{ marginTop: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px' }}>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '12px', textAlign: 'center' }}>
            Drag sliders to set start and end points
          </p>
          <video ref={trimVideoRef} src={videoSrc} style={{ display: 'none' }} preload="metadata" />

          {/* Timeline */}
          <div style={{ position: 'relative', height: '40px', background: 'var(--bg-elevated)', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px' }}>
            <div style={{
              position: 'absolute', top: 0, bottom: 0,
              left: `${(trimStart / Math.max(duration, 1)) * 100}%`,
              width: `${((trimEnd - trimStart) / Math.max(duration, 1)) * 100}%`,
              background: 'rgba(255,60,95,0.3)', border: '2px solid var(--brand-red)', borderRadius: '4px',
            }} />
            {duration > 0 && (
              <div style={{
                position: 'absolute', top: 0, bottom: 0,
                left: `${(currentTime / duration) * 100}%`,
                width: '2px', background: 'white',
              }} />
            )}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>
                {duration > 0 ? `Total: ${fmt(duration)}` : 'Loading...'}
              </span>
            </div>
          </div>

          {/* Start slider */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                ▶ Start: <strong style={{ color: 'var(--brand-red)' }}>{fmt(trimStart)}</strong>
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Clip: {fmt(trimEnd - trimStart)}
              </span>
            </div>
            <input type="range" min="0" max={Math.max(0, trimEnd - 1)} step="0.1" value={trimStart}
              onChange={e => {
                const v = parseFloat(e.target.value);
                setTrimStart(v);
                if (trimVideoRef.current) trimVideoRef.current.currentTime = v;
                notify({ trimStart: v });
              }}
              style={{ width: '100%', accentColor: 'var(--brand-red)', height: '4px' }}
            />
          </div>

          {/* End slider */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                ⏹ End: <strong style={{ color: 'var(--brand-red)' }}>{fmt(trimEnd)}</strong>
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total: {fmt(duration)}</span>
            </div>
            <input type="range" min={trimStart + 1} max={duration} step="0.1" value={trimEnd}
              onChange={e => {
                const v = parseFloat(e.target.value);
                setTrimEnd(v);
                notify({ trimEnd: v });
              }}
              style={{ width: '100%', accentColor: 'var(--brand-red)', height: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost btn-sm" onClick={toggleTrimPlay} style={{ flex: 1 }}>
              {trimPlaying ? '⏸ Pause' : '▶ Preview'}
            </button>
            <button className="btn btn-primary btn-sm" onClick={applyTrim} style={{ flex: 1 }}>
              ✂️ Apply Trim
            </button>
          </div>

          {trimApplied && (
            <div style={{
              marginTop: '10px', padding: '8px 12px',
              background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)',
              borderRadius: '10px', fontSize: '0.78rem', color: '#4ade80', textAlign: 'center',
            }}>✓ Trimmed to {fmt(trimEnd - trimStart)} — applied on upload</div>
          )}
        </div>
      )}

      {/* ── AUDIO ── */}
      {activeTab === 'audio' && (
        <div style={{ marginTop: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px' }}>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '16px', textAlign: 'center' }}>
            Mix original sound with added music
          </p>

          {/* Video volume */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>🎬</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Original Sound</span>
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{videoVolume === 0 ? 'Off' : `${videoVolume}%`}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', opacity: videoVolume === 0 ? 0.3 : 1 }}>🔇</span>
              <input type="range" min="0" max="100" value={videoVolume}
                onChange={e => { const v = parseInt(e.target.value); setVideoVolume(v); if (videoRef.current) videoRef.current.volume = v / 100; notify({ videoVolume: v }); }}
                style={{ flex: 1, accentColor: 'var(--brand-red)', height: '4px' }}
              />
              <span style={{ fontSize: '14px' }}>🔊</span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[0, 50, 80, 100].map(v => (
                <button key={v} onClick={() => { setVideoVolume(v); if (videoRef.current) videoRef.current.volume = v / 100; notify({ videoVolume: v }); }} style={{
                  flex: 1, padding: '4px', borderRadius: '8px', fontSize: '0.7rem', cursor: 'pointer',
                  background: videoVolume === v ? 'var(--brand-gradient)' : 'var(--bg-elevated)',
                  border: `1px solid ${videoVolume === v ? 'transparent' : 'var(--border)'}`,
                  color: videoVolume === v ? 'white' : 'var(--text-muted)',
                }}>{v === 0 ? 'Off' : `${v}%`}</button>
              ))}
            </div>
          </div>

          {/* Music volume */}
          {selectedTrack ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img src={selectedTrack.artworkUrl60} alt="" style={{ width: '28px', height: '28px', borderRadius: '6px' }} />
                  <div>
                    <p style={{ fontSize: '0.82rem', fontWeight: 600, lineHeight: 1.2 }}>{selectedTrack.trackName}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{selectedTrack.artistName}</p>
                  </div>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{musicMuted ? 'Off' : `${musicVolume}%`}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', opacity: musicMuted ? 0.3 : 1 }}>🔇</span>
                <input type="range" min="0" max="100" value={musicMuted ? 0 : musicVolume} disabled={musicMuted}
                  onChange={e => { const v = parseInt(e.target.value); setMusicVolume(v); setMusicMuted(false); notify({ musicVolume: v, musicMuted: false }); }}
                  style={{ flex: 1, accentColor: 'var(--pi-gold)', height: '4px', opacity: musicMuted ? 0.4 : 1 }}
                />
                <span style={{ fontSize: '14px' }}>🔊</span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[0, 50, 70, 100].map(v => (
                  <button key={v} onClick={() => {
                    if (v === 0) { setMusicMuted(true); notify({ musicMuted: true }); }
                    else { setMusicVolume(v); setMusicMuted(false); notify({ musicVolume: v, musicMuted: false }); }
                  }} style={{
                    flex: 1, padding: '4px', borderRadius: '8px', fontSize: '0.7rem', cursor: 'pointer',
                    background: (v === 0 ? musicMuted : !musicMuted && musicVolume === v)
                      ? 'linear-gradient(135deg,#f0a500,#ffd166)' : 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    color: (v === 0 ? musicMuted : !musicMuted && musicVolume === v) ? '#0a0a0f' : 'var(--text-muted)',
                  }}>{v === 0 ? 'Off' : `${v}%`}</button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding: '16px', textAlign: 'center', background: 'var(--bg-elevated)', borderRadius: '12px' }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '4px' }}>No music added yet</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', opacity: 0.7 }}>Use 🎵 music section below to add a track</p>
            </div>
          )}
        </div>
      )}

      {/* ── TEXT ── */}
      {activeTab === 'text' && (
        <div style={{ marginTop: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px' }}>
          <input placeholder="Add text to your video..." value={textInput}
            onChange={e => setTextInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addText()}
            style={{ marginBottom: '10px' }} autoFocus
          />
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Color:</span>
            {TEXT_COLORS.map(c => (
              <button key={c} onClick={() => setTextColor(c)} style={{
                width: '24px', height: '24px', borderRadius: '50%', background: c, cursor: 'pointer',
                border: textColor === c ? '3px solid white' : '2px solid rgba(255,255,255,0.2)',
                boxShadow: c === '#ffffff' ? '0 0 0 1px rgba(0,0,0,0.3)' : 'none',
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Size:</span>
            {TEXT_SIZES.map(s => (
              <button key={s} onClick={() => setTextSize(s)} style={{
                padding: '4px 10px', borderRadius: '8px', cursor: 'pointer',
                background: textSize === s ? 'var(--brand-gradient)' : 'var(--bg-elevated)',
                border: textSize === s ? 'none' : '1px solid var(--border)',
                color: textSize === s ? 'white' : 'var(--text-secondary)',
                fontSize: `${s * 0.5}px`, fontWeight: 700,
              }}>A</button>
            ))}
          </div>
          <button className="btn btn-primary btn-sm" onClick={addText} style={{ width: '100%' }}>Add Text</button>
        </div>
      )}

      {/* ── STICKERS ── */}
      {activeTab === 'stickers' && (
        <div style={{ marginTop: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '10px' }}>Tap to add</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {STICKERS.map(emoji => (
              <button key={emoji} onClick={() => addSticker(emoji)} style={{
                fontSize: '28px', background: 'var(--bg-elevated)',
                border: '1px solid var(--border)', borderRadius: '10px',
                padding: '6px', cursor: 'pointer', lineHeight: 1,
                transition: 'transform 0.15s',
              }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.85)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              >{emoji}</button>
            ))}
          </div>
        </div>
      )}

      {/* ── FILTERS ── */}
      {activeTab === 'filters' && (
        <div style={{ marginTop: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px' }}>
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
            {FILTERS.map(f => (
              <div key={f.name} onClick={() => selectFilter(f)} style={{
                flexShrink: 0, cursor: 'pointer', textAlign: 'center',
                border: filter.name === f.name ? '2px solid var(--brand-red)' : '2px solid transparent',
                borderRadius: '10px', overflow: 'hidden', transition: 'border-color 0.2s',
              }}>
                <video src={videoSrc} muted playsInline autoPlay loop
                  style={{ width: '64px', height: '80px', objectFit: 'cover', display: 'block', ...f.style }}
                />
                <p style={{
                  fontSize: '0.65rem', fontWeight: 600, marginTop: '4px', paddingBottom: '4px',
                  color: filter.name === f.name ? 'var(--brand-red)' : 'var(--text-muted)',
                }}>{f.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
