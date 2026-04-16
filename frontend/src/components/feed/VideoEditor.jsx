// ============================================================
// SPYCE - VideoEditor v4
// FIXED: Trim preview shows video (not black)
// FIXED: Draggable text + stickers
// FILE: frontend/src/components/feed/VideoEditor.jsx
// ============================================================
import React, { useState, useRef, useEffect, useCallback } from 'react';
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

function DraggableItem({ item, containerRef, onMove, onRemove, children }) {
  const dragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startItem = useRef({ x: 0, y: 0 });

  const getPos = (e) => { const t = e.touches?.[0] || e; return { x: t.clientX, y: t.clientY }; };

  const onStart = useCallback((e) => {
    if (e.target.closest('[data-remove]')) return;
    e.preventDefault(); e.stopPropagation();
    dragging.current = true;
    startPos.current = getPos(e);
    startItem.current = { x: item.x, y: item.y };
  }, [item.x, item.y]);

  const onMove_ = useCallback((e) => {
    if (!dragging.current) return;
    e.preventDefault();
    const pos = getPos(e);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = ((pos.x - startPos.current.x) / rect.width) * 100;
    const dy = ((pos.y - startPos.current.y) / rect.height) * 100;
    onMove(item.id, Math.max(5, Math.min(95, startItem.current.x + dx)), Math.max(5, Math.min(95, startItem.current.y + dy)));
  }, [item.id, onMove, containerRef]);

  const onEnd = useCallback(() => { dragging.current = false; }, []);

  return (
    <div onMouseDown={onStart} onMouseMove={onMove_} onMouseUp={onEnd}
      onTouchStart={onStart} onTouchMove={onMove_} onTouchEnd={onEnd}
      style={{ position: 'absolute', top: `${item.y}%`, left: `${item.x}%`, transform: 'translate(-50%,-50%)', cursor: 'grab', userSelect: 'none', touchAction: 'none', zIndex: 10 }}>
      {children}
      <button data-remove="true" onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
        style={{ position: 'absolute', top: '-10px', right: '-10px', width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255,0,0,0.85)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11 }}>✕</button>
    </div>
  );
}

export default function VideoEditor({ videoSrc, selectedTrack, onEditsChange, edits }) {
  const previewRef = useRef(null);
  const mainVideoRef = useRef(null);
  // KEY FIX: Use a blob URL for trim video to avoid CORS/autoplay issues
  const [trimVideoSrc, setTrimVideoSrc] = useState('');
  const trimVideoRef = useRef(null);

  const [activeTab, setActiveTab] = useState(null);
  const [texts, setTexts] = useState(edits?.texts || []);
  const [stickers, setStickers] = useState(edits?.stickers || []);
  const [filter, setFilter] = useState(edits?.filter || FILTERS[0]);
  const [textInput, setTextInput] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textSize, setTextSize] = useState(20);

  const [videoVolume, setVideoVolume] = useState(edits?.videoVolume ?? 80);
  const [musicVolume, setMusicVolume] = useState(edits?.musicVolume ?? 70);
  const [musicMuted, setMusicMuted] = useState(false);

  const [duration, setDuration] = useState(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimPlaying, setTrimPlaying] = useState(false);
  const [trimApplied, setTrimApplied] = useState(false);
  const [loadingDuration, setLoadingDuration] = useState(false);

  // Set trim video src from blob URL (fixes black preview)
  useEffect(() => {
    if (videoSrc && videoSrc.startsWith('blob:')) {
      setTrimVideoSrc(videoSrc);
    }
  }, [videoSrc]);

  // Load duration when trim tab opens
  useEffect(() => {
    if (activeTab !== 'trim') return;
    const v = trimVideoRef.current;
    if (!v) return;
    setLoadingDuration(true);

    const load = () => {
      if (v.duration && isFinite(v.duration) && v.duration > 0) {
        setDuration(v.duration);
        setTrimEnd(prev => prev || v.duration);
        setLoadingDuration(false);
      }
    };

    if (v.readyState >= 1 && v.duration > 0) { load(); return; }
    v.load();
    v.addEventListener('loadedmetadata', load);
    v.addEventListener('durationchange', load);
    v.addEventListener('canplay', load);
    return () => {
      v.removeEventListener('loadedmetadata', load);
      v.removeEventListener('durationchange', load);
      v.removeEventListener('canplay', load);
    };
  }, [activeTab]);

  useEffect(() => {
    const v = trimVideoRef.current;
    if (!v || !trimPlaying) return;
    const onTime = () => {
      setCurrentTime(v.currentTime);
      if (trimEnd && v.currentTime >= trimEnd) { v.currentTime = trimStart; }
    };
    v.addEventListener('timeupdate', onTime);
    return () => v.removeEventListener('timeupdate', onTime);
  }, [trimStart, trimEnd, trimPlaying]);

  useEffect(() => {
    if (mainVideoRef.current) mainVideoRef.current.volume = videoVolume / 100;
  }, [videoVolume]);

  const notify = useCallback((extra = {}) => {
    onEditsChange?.({ texts, stickers, filter, videoVolume, musicVolume, musicMuted, trimStart, trimEnd: trimEnd || duration || 0, ...extra });
  }, [texts, stickers, filter, videoVolume, musicVolume, musicMuted, trimStart, trimEnd, duration]);

  const addText = () => {
    if (!textInput.trim()) return;
    const t = [...texts, { id: Date.now(), text: textInput, color: textColor, size: textSize, x: 50, y: 50 }];
    setTexts(t); setTextInput(''); notify({ texts: t }); setActiveTab(null);
    toast.success('Text added! Drag to move.');
  };

  const removeText = useCallback((id) => { const t = texts.filter(x => x.id !== id); setTexts(t); notify({ texts: t }); }, [texts, notify]);
  const moveText = useCallback((id, x, y) => { setTexts(prev => prev.map(t => t.id === id ? { ...t, x, y } : t)); }, []);

  const addSticker = (emoji) => {
    const s = [...stickers, { id: Date.now(), emoji, x: 50, y: 50 }];
    setStickers(s); notify({ stickers: s });
    toast.success(`${emoji} added! Drag to move.`);
  };

  const removeSticker = useCallback((id) => { const s = stickers.filter(x => x.id !== id); setStickers(s); notify({ stickers: s }); }, [stickers, notify]);
  const moveSticker = useCallback((id, x, y) => { setStickers(prev => prev.map(s => s.id === id ? { ...s, x, y } : s)); }, []);
  const selectFilter = (f) => { setFilter(f); notify({ filter: f }); };

  const applyTrim = () => {
    if (!duration) { toast.error('Video still loading'); return; }
    const d = (trimEnd || duration) - trimStart;
    if (d < 1) { toast.error('Trim must be at least 1 second'); return; }
    setTrimApplied(true);
    notify({ trimStart, trimEnd: trimEnd || duration });
    toast.success(`✂️ Trimmed to ${d.toFixed(1)}s`);
    setActiveTab(null);
  };

  const toggleTrimPlay = () => {
    const v = trimVideoRef.current;
    if (!v) return;
    if (v.paused) { v.currentTime = trimStart; v.play().catch(() => {}); setTrimPlaying(true); }
    else { v.pause(); setTrimPlaying(false); }
  };

  const fmt = (s) => { if (!s && s !== 0) return '0:00'; return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`; };
  const effectiveTrimEnd = trimEnd || duration || 0;
  const effectiveDuration = duration || 1;

  const TABS = [
    { id:'trim', icon:'✂️', label:'Trim' },
    { id:'audio', icon:'🎛️', label:'Audio' },
    { id:'text', icon:'Aa', label:'Text' },
    { id:'stickers', icon:'😊', label:'Stickers' },
    { id:'filters', icon:'✨', label:'Effects' },
  ];

  return (
    <div style={{ width: '100%' }}>
      {/* Preview */}
      <div ref={previewRef} style={{ position: 'relative', width: '100%', height: '200px', borderRadius: '16px', overflow: 'hidden', background: '#000' }}>
        <video ref={mainVideoRef} src={videoSrc} muted={videoVolume === 0} playsInline autoPlay loop
          style={{ width: '100%', height: '100%', objectFit: 'cover', ...filter.style }}
        />
        {texts.map(t => (
          <DraggableItem key={t.id} item={t} containerRef={previewRef} onMove={moveText} onRemove={removeText}>
            <div style={{ color: t.color, fontSize: `${t.size}px`, fontFamily: 'var(--font-display)', fontWeight: 800, textShadow: '1px 2px 8px rgba(0,0,0,0.8)', padding: '4px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', backdropFilter: 'blur(2px)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>{t.text}</div>
          </DraggableItem>
        ))}
        {stickers.map(s => (
          <DraggableItem key={s.id} item={s} containerRef={previewRef} onMove={moveSticker} onRemove={removeSticker}>
            <div style={{ fontSize: '32px', filter: 'drop-shadow(1px 2px 4px rgba(0,0,0,0.5))', pointerEvents: 'none', lineHeight: 1 }}>{s.emoji}</div>
          </DraggableItem>
        ))}
        {trimApplied && (
          <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(255,60,95,0.85)', borderRadius: '8px', padding: '3px 10px', fontSize: '0.7rem', color: 'white', fontWeight: 700, pointerEvents: 'none' }}>✂️ {fmt(trimStart)}–{fmt(effectiveTrimEnd)}</div>
        )}
        {(texts.length > 0 || stickers.length > 0) && (
          <div style={{ position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', borderRadius: '10px', padding: '3px 10px', fontSize: '0.65rem', color: 'rgba(255,255,255,0.8)', pointerEvents: 'none', whiteSpace: 'nowrap' }}>Drag to move · tap ✕ to remove</div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '10px', overflowX: 'auto', paddingBottom: '2px' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(activeTab === tab.id ? null : tab.id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', flexShrink: 0,
            padding: '8px 14px', borderRadius: '12px', cursor: 'pointer',
            background: activeTab === tab.id ? 'rgba(255,60,95,0.15)' : 'var(--bg-card)',
            border: `1px solid ${activeTab === tab.id ? 'rgba(255,60,95,0.4)' : 'var(--border)'}`,
            color: activeTab === tab.id ? 'var(--brand-red)' : 'var(--text-secondary)',
            fontSize: '0.72rem', fontWeight: 700, transition: 'all 0.2s',
          }}>
            <span style={{ fontSize: '16px' }}>{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      {/* ── TRIM ── */}
      {activeTab === 'trim' && (
        <div style={{ marginTop: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px' }}>
          {/* Trim preview video — VISIBLE, shows actual video */}
          <div style={{ position: 'relative', width: '100%', height: '120px', borderRadius: '10px', overflow: 'hidden', background: '#000', marginBottom: '12px' }}>
            <video
              ref={trimVideoRef}
              src={trimVideoSrc || videoSrc}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              playsInline preload="auto"
              muted
            />
            {loadingDuration && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', gap: '8px' }}>
                <div className="animate-spin" style={{ width: '24px', height: '24px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'var(--brand-red)', borderRadius: '50%' }} />
                <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)' }}>Loading video...</p>
              </div>
            )}
            {!loadingDuration && duration && (
              <div style={{ position: 'absolute', bottom: '6px', right: '8px', background: 'rgba(0,0,0,0.6)', borderRadius: '6px', padding: '2px 8px', fontSize: '0.7rem', color: 'white' }}>
                {fmt(currentTime)} / {fmt(duration)}
              </div>
            )}
          </div>

          {!loadingDuration && duration ? (
            <>
              {/* Timeline bar */}
              <div style={{ position: 'relative', height: '36px', background: 'var(--bg-elevated)', borderRadius: '8px', overflow: 'hidden', marginBottom: '14px' }}>
                <div style={{
                  position: 'absolute', top: 0, bottom: 0,
                  left: `${(trimStart / effectiveDuration) * 100}%`,
                  width: `${((effectiveTrimEnd - trimStart) / effectiveDuration) * 100}%`,
                  background: 'rgba(255,60,95,0.35)', border: '2px solid var(--brand-red)', borderRadius: '4px',
                }} />
                {duration > 0 && (
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${(currentTime / duration) * 100}%`, width: '2px', background: 'white' }} />
                )}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)' }}>{fmt(trimStart)} → {fmt(effectiveTrimEnd)} · clip: {fmt(effectiveTrimEnd - trimStart)}</span>
                </div>
              </div>

              {/* Start */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>▶ Start: <strong style={{ color: 'var(--brand-red)' }}>{fmt(trimStart)}</strong></span>
                </div>
                <input type="range" min={0} max={Math.max(0, effectiveTrimEnd - 1)} step={0.1} value={trimStart}
                  onChange={e => { const v = parseFloat(e.target.value); setTrimStart(v); if (trimVideoRef.current) trimVideoRef.current.currentTime = v; notify({ trimStart: v }); }}
                  style={{ width: '100%', accentColor: 'var(--brand-red)', height: '6px', cursor: 'pointer' }}
                />
              </div>

              {/* End */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>⏹ End: <strong style={{ color: 'var(--brand-red)' }}>{fmt(effectiveTrimEnd)}</strong></span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total: {fmt(duration)}</span>
                </div>
                <input type="range" min={trimStart + 1} max={duration} step={0.1} value={effectiveTrimEnd}
                  onChange={e => { const v = parseFloat(e.target.value); setTrimEnd(v); notify({ trimEnd: v }); }}
                  style={{ width: '100%', accentColor: 'var(--brand-red)', height: '6px', cursor: 'pointer' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-ghost btn-sm" onClick={toggleTrimPlay} style={{ flex: 1 }}>{trimPlaying ? '⏸ Pause' : '▶ Preview'}</button>
                <button className="btn btn-primary btn-sm" onClick={applyTrim} style={{ flex: 1 }}>✂️ Apply Trim</button>
              </div>
              {trimApplied && (
                <div style={{ marginTop: '10px', padding: '8px 12px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '10px', fontSize: '0.78rem', color: '#4ade80', textAlign: 'center' }}>
                  ✓ Trimmed to {fmt(effectiveTrimEnd - trimStart)}
                </div>
              )}
            </>
          ) : loadingDuration ? null : (
            <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '0.82rem' }}>Could not load video duration.</p>
              <button className="btn btn-ghost btn-sm" style={{ marginTop: '8px' }} onClick={() => { setLoadingDuration(true); trimVideoRef.current?.load(); }}>Retry</button>
            </div>
          )}
        </div>
      )}

      {/* ── AUDIO ── */}
      {activeTab === 'audio' && (
        <div style={{ marginTop: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px' }}>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '16px', textAlign: 'center' }}>Mix original sound with added music</p>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '18px' }}>🎬</span><span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Original Sound</span></div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{videoVolume === 0 ? 'Off' : `${videoVolume}%`}</span>
            </div>
            <input type="range" min="0" max="100" value={videoVolume}
              onChange={e => { const v = parseInt(e.target.value); setVideoVolume(v); if (mainVideoRef.current) mainVideoRef.current.volume = v / 100; notify({ videoVolume: v }); }}
              style={{ width: '100%', accentColor: 'var(--brand-red)', height: '6px', cursor: 'pointer', marginBottom: '8px' }}
            />
            <div style={{ display: 'flex', gap: '6px' }}>
              {[0, 50, 80, 100].map(v => (
                <button key={v} onClick={() => { setVideoVolume(v); if (mainVideoRef.current) mainVideoRef.current.volume = v / 100; notify({ videoVolume: v }); }}
                  style={{ flex: 1, padding: '5px', borderRadius: '8px', fontSize: '0.7rem', cursor: 'pointer', background: videoVolume === v ? 'var(--brand-gradient)' : 'var(--bg-elevated)', border: `1px solid ${videoVolume === v ? 'transparent' : 'var(--border)'}`, color: videoVolume === v ? 'white' : 'var(--text-muted)' }}>{v === 0 ? 'Off' : `${v}%`}</button>
              ))}
            </div>
          </div>
          {selectedTrack ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <img src={selectedTrack.artworkUrl60} alt="" style={{ width: '32px', height: '32px', borderRadius: '6px' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedTrack.trackName}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{selectedTrack.artistName}</p>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{musicMuted ? 'Off' : `${musicVolume}%`}</span>
              </div>
              <input type="range" min="0" max="100" value={musicMuted ? 0 : musicVolume} disabled={musicMuted}
                onChange={e => { const v = parseInt(e.target.value); setMusicVolume(v); setMusicMuted(false); notify({ musicVolume: v, musicMuted: false }); }}
                style={{ width: '100%', accentColor: 'var(--pi-gold)', height: '6px', cursor: 'pointer', opacity: musicMuted ? 0.4 : 1, marginBottom: '8px' }}
              />
              <div style={{ display: 'flex', gap: '6px' }}>
                {[0, 50, 70, 100].map(v => (
                  <button key={v} onClick={() => { if (v === 0) { setMusicMuted(true); notify({ musicMuted: true }); } else { setMusicVolume(v); setMusicMuted(false); notify({ musicVolume: v, musicMuted: false }); } }}
                    style={{ flex: 1, padding: '5px', borderRadius: '8px', fontSize: '0.7rem', cursor: 'pointer', background: (v === 0 ? musicMuted : !musicMuted && musicVolume === v) ? 'linear-gradient(135deg,#f0a500,#ffd166)' : 'var(--bg-elevated)', border: '1px solid var(--border)', color: (v === 0 ? musicMuted : !musicMuted && musicVolume === v) ? '#0a0a0f' : 'var(--text-muted)' }}>{v === 0 ? 'Off' : `${v}%`}</button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding: '14px', textAlign: 'center', background: 'var(--bg-elevated)', borderRadius: '12px' }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No music added yet</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', opacity: 0.7, marginTop: '4px' }}>Use 🎵 section below to add a track</p>
            </div>
          )}
        </div>
      )}

      {/* ── TEXT ── */}
      {activeTab === 'text' && (
        <div style={{ marginTop: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px' }}>
          <input placeholder="Type your text..." value={textInput} onChange={e => setTextInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addText()} style={{ marginBottom: '10px' }} autoFocus />
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Color:</span>
            {TEXT_COLORS.map(c => (<button key={c} onClick={() => setTextColor(c)} style={{ width: '26px', height: '26px', borderRadius: '50%', background: c, cursor: 'pointer', border: textColor === c ? '3px solid white' : '2px solid rgba(255,255,255,0.2)', boxShadow: c === '#ffffff' ? '0 0 0 1px rgba(0,0,0,0.3)' : 'none' }} />))}
          </div>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Size:</span>
            {TEXT_SIZES.map(s => (<button key={s} onClick={() => setTextSize(s)} style={{ padding: '5px 12px', borderRadius: '8px', cursor: 'pointer', background: textSize === s ? 'var(--brand-gradient)' : 'var(--bg-elevated)', border: textSize === s ? 'none' : '1px solid var(--border)', color: textSize === s ? 'white' : 'var(--text-secondary)', fontSize: `${s * 0.5}px`, fontWeight: 700 }}>A</button>))}
          </div>
          <button className="btn btn-primary btn-sm" onClick={addText} style={{ width: '100%' }}>Add Text (drag to position)</button>
        </div>
      )}

      {/* ── STICKERS ── */}
      {activeTab === 'stickers' && (
        <div style={{ marginTop: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '10px' }}>Tap to add · drag to reposition</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {STICKERS.map(emoji => (<button key={emoji} onClick={() => addSticker(emoji)} style={{ fontSize: '28px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', padding: '6px', cursor: 'pointer', lineHeight: 1, transition: 'transform 0.15s' }} onMouseDown={e => e.currentTarget.style.transform = 'scale(0.85)'} onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>{emoji}</button>))}
          </div>
        </div>
      )}

      {/* ── FILTERS ── */}
      {activeTab === 'filters' && (
        <div style={{ marginTop: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px' }}>
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
            {FILTERS.map(f => (
              <div key={f.name} onClick={() => selectFilter(f)} style={{ flexShrink: 0, cursor: 'pointer', textAlign: 'center', border: filter.name === f.name ? '2px solid var(--brand-red)' : '2px solid transparent', borderRadius: '10px', overflow: 'hidden', transition: 'border-color 0.2s' }}>
                <video src={videoSrc} muted playsInline autoPlay loop style={{ width: '64px', height: '80px', objectFit: 'cover', display: 'block', ...f.style }} />
                <p style={{ fontSize: '0.65rem', fontWeight: 600, marginTop: '4px', paddingBottom: '4px', color: filter.name === f.name ? 'var(--brand-red)' : 'var(--text-muted)' }}>{f.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
