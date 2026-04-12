// ============================================================
// SPYCE - VideoEditor Component
// Inline video editor shown after video is selected
// Features: Text overlay, Stickers, Filters/Effects
// Add as a new file: frontend/src/components/feed/VideoEditor.jsx
// ============================================================
import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';

const STICKERS = ['🔥','💯','🌶️','❤️','😂','👑','✨','🎉','💪','🙌','👀','💀','🫶','⚡','🌟','🤩','😍','🥹','🫡','💥'];

const FILTERS = [
  { name:'None',    style:{} },
  { name:'Bright',  style:{filter:'brightness(1.3) contrast(1.1)'} },
  { name:'Warm',    style:{filter:'sepia(0.3) saturate(1.4) brightness(1.1)'} },
  { name:'Cool',    style:{filter:'hue-rotate(20deg) saturate(1.2)'} },
  { name:'Drama',   style:{filter:'contrast(1.4) saturate(1.3) brightness(0.9)'} },
  { name:'Fade',    style:{filter:'brightness(1.1) contrast(0.85) saturate(0.8)'} },
  { name:'Noir',    style:{filter:'grayscale(1) contrast(1.3)'} },
  { name:'Vivid',   style:{filter:'saturate(2) contrast(1.1)'} },
];

const TEXT_COLORS = ['#ffffff','#ff3c5f','#f0a500','#4ade80','#60a5fa','#f472b6','#000000'];
const TEXT_SIZES = [16, 20, 24, 32];

export default function VideoEditor({ videoSrc, onEditsChange, edits }) {
  const [activeTab, setActiveTab] = useState(null); // 'text'|'stickers'|'filters'|'effects'
  const [texts, setTexts] = useState(edits?.texts || []);
  const [stickers, setStickers] = useState(edits?.stickers || []);
  const [filter, setFilter] = useState(edits?.filter || FILTERS[0]);
  const [textInput, setTextInput] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textSize, setTextSize] = useState(20);
  const overlayRef = useRef(null);

  const notify = (newEdits) => {
    onEditsChange?.({ texts, stickers, filter, ...newEdits });
  };

  const addText = () => {
    if (!textInput.trim()) return;
    const newTexts = [...texts, {
      id: Date.now(),
      text: textInput,
      color: textColor,
      size: textSize,
      x: 20, y: 40,
    }];
    setTexts(newTexts);
    setTextInput('');
    notify({ texts: newTexts });
    setActiveTab(null);
    toast.success('Text added!');
  };

  const removeText = (id) => {
    const newTexts = texts.filter(t => t.id !== id);
    setTexts(newTexts);
    notify({ texts: newTexts });
  };

  const addSticker = (emoji) => {
    const newStickers = [...stickers, { id: Date.now(), emoji, x: 30 + Math.random()*40, y: 30 + Math.random()*40 }];
    setStickers(newStickers);
    notify({ stickers: newStickers });
    toast.success(`${emoji} added!`);
  };

  const removeSticker = (id) => {
    const newStickers = stickers.filter(s => s.id !== id);
    setStickers(newStickers);
    notify({ stickers: newStickers });
  };

  const selectFilter = (f) => {
    setFilter(f);
    notify({ filter: f });
  };

  const TABS = [
    { id:'text',    icon:'Aa',  label:'Text' },
    { id:'stickers',icon:'😊', label:'Stickers' },
    { id:'filters', icon:'✨',  label:'Effects' },
  ];

  return (
    <div style={{ width:'100%' }}>
      {/* Video preview with overlays */}
      <div
        ref={overlayRef}
        style={{ position:'relative', width:'100%', height:'240px', borderRadius:'16px', overflow:'hidden', background:'#000' }}
      >
        <video
          src={videoSrc} muted playsInline autoPlay loop
          style={{ width:'100%', height:'100%', objectFit:'cover', ...filter.style }}
        />

        {/* Text overlays */}
        {texts.map(t => (
          <div
            key={t.id}
            style={{
              position:'absolute',
              top:`${t.y}%`, left:`${t.x}%`,
              transform:'translate(-50%,-50%)',
              color: t.color,
              fontSize: `${t.size}px`,
              fontFamily:'var(--font-display)',
              fontWeight:800,
              textShadow:'1px 2px 8px rgba(0,0,0,0.8)',
              cursor:'pointer',
              userSelect:'none',
              padding:'4px 8px',
              background:'rgba(0,0,0,0.2)',
              borderRadius:'6px',
              backdropFilter:'blur(2px)',
              whiteSpace:'nowrap',
            }}
            onClick={() => removeText(t.id)}
          >{t.text}</div>
        ))}

        {/* Sticker overlays */}
        {stickers.map(s => (
          <div
            key={s.id}
            onClick={() => removeSticker(s.id)}
            style={{
              position:'absolute',
              top:`${s.y}%`, left:`${s.x}%`,
              transform:'translate(-50%,-50%)',
              fontSize:'36px', cursor:'pointer', userSelect:'none',
              filter:'drop-shadow(1px 2px 4px rgba(0,0,0,0.5))',
            }}
          >{s.emoji}</div>
        ))}

        {/* Tap to remove hint */}
        {(texts.length > 0 || stickers.length > 0) && (
          <div style={{
            position:'absolute', bottom:'8px', left:'50%', transform:'translateX(-50%)',
            background:'rgba(0,0,0,0.5)', borderRadius:'10px', padding:'3px 10px',
            fontSize:'0.65rem', color:'rgba(255,255,255,0.7)', pointerEvents:'none',
          }}>Tap to remove</div>
        )}
      </div>

      {/* Tool tabs */}
      <div style={{ display:'flex', gap:'8px', marginTop:'10px', justifyContent:'center' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(activeTab === tab.id ? null : tab.id)}
            style={{
              display:'flex', flexDirection:'column', alignItems:'center', gap:'3px',
              padding:'8px 16px', borderRadius:'12px',
              background: activeTab === tab.id ? 'rgba(255,60,95,0.15)' : 'var(--bg-card)',
              border: `1px solid ${activeTab === tab.id ? 'rgba(255,60,95,0.4)' : 'var(--border)'}`,
              color: activeTab === tab.id ? 'var(--brand-red)' : 'var(--text-secondary)',
              fontSize:'0.75rem', fontWeight:700, transition:'all 0.2s',
              cursor:'pointer',
            }}
          >
            <span style={{ fontSize:'18px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active panel */}
      {activeTab === 'text' && (
        <div style={{
          marginTop:'10px', background:'var(--bg-card)',
          border:'1px solid var(--border)', borderRadius:'14px', padding:'14px',
        }}>
          <input
            placeholder="Add text to your video..."
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addText()}
            style={{ marginBottom:'10px' }}
            autoFocus
          />
          {/* Color picker */}
          <div style={{ display:'flex', gap:'8px', marginBottom:'10px', alignItems:'center' }}>
            <span style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginRight:'4px' }}>Color:</span>
            {TEXT_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setTextColor(c)}
                style={{
                  width:'24px', height:'24px', borderRadius:'50%', background:c,
                  border: textColor===c ? '3px solid white' : '2px solid rgba(255,255,255,0.2)',
                  cursor:'pointer', transition:'border 0.15s',
                  boxShadow: c==='#ffffff' ? '0 0 0 1px rgba(0,0,0,0.3)' : 'none',
                }}
              />
            ))}
          </div>
          {/* Size picker */}
          <div style={{ display:'flex', gap:'6px', marginBottom:'12px', alignItems:'center' }}>
            <span style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginRight:'4px' }}>Size:</span>
            {TEXT_SIZES.map(s => (
              <button
                key={s}
                onClick={() => setTextSize(s)}
                style={{
                  padding:'4px 10px', borderRadius:'8px',
                  background: textSize===s ? 'var(--brand-gradient)' : 'var(--bg-elevated)',
                  border: textSize===s ? 'none' : '1px solid var(--border)',
                  color: textSize===s ? 'white' : 'var(--text-secondary)',
                  fontSize:`${s * 0.5}px`, fontWeight:700, cursor:'pointer',
                }}
              >A</button>
            ))}
          </div>
          <button className="btn btn-primary btn-sm" onClick={addText} style={{ width:'100%' }}>
            Add Text
          </button>
        </div>
      )}

      {activeTab === 'stickers' && (
        <div style={{
          marginTop:'10px', background:'var(--bg-card)',
          border:'1px solid var(--border)', borderRadius:'14px', padding:'14px',
        }}>
          <p style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'10px' }}>
            Tap a sticker to add it
          </p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
            {STICKERS.map(emoji => (
              <button
                key={emoji}
                onClick={() => addSticker(emoji)}
                style={{
                  fontSize:'28px', background:'var(--bg-elevated)',
                  border:'1px solid var(--border)', borderRadius:'10px',
                  padding:'6px', cursor:'pointer', transition:'transform 0.15s',
                  lineHeight:1,
                }}
                onMouseDown={e => e.currentTarget.style.transform='scale(0.85)'}
                onMouseUp={e => e.currentTarget.style.transform='scale(1)'}
              >{emoji}</button>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'filters' && (
        <div style={{
          marginTop:'10px', background:'var(--bg-card)',
          border:'1px solid var(--border)', borderRadius:'14px', padding:'14px',
        }}>
          <div style={{ display:'flex', gap:'10px', overflowX:'auto', paddingBottom:'4px' }}>
            {FILTERS.map(f => (
              <div
                key={f.name}
                onClick={() => selectFilter(f)}
                style={{
                  flexShrink:0, cursor:'pointer', textAlign:'center',
                  border: filter.name===f.name ? '2px solid var(--brand-red)' : '2px solid transparent',
                  borderRadius:'10px', overflow:'hidden',
                  transition:'border-color 0.2s',
                }}
              >
                <video
                  src={videoSrc} muted playsInline autoPlay loop
                  style={{ width:'64px', height:'80px', objectFit:'cover', ...f.style, display:'block' }}
                />
                <p style={{
                  fontSize:'0.65rem', fontWeight:600,
                  color: filter.name===f.name ? 'var(--brand-red)' : 'var(--text-muted)',
                  marginTop:'4px', paddingBottom:'4px',
                }}>{f.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
