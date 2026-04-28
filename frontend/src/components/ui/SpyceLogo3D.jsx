// ============================================================
// SPYCE - 3D Logo Component
// Auto-cycling Fire → Gold → Purple → Ice themes
// Simulated video texture on icon face
// Draggable — touch and mouse
// FILE: frontend/src/components/ui/SpyceLogo3D.jsx
// ============================================================
import React, { useRef, useEffect } from 'react';

const THEMES = [
  { name:'Fire',   c1:'#ff6a35', c2:'#ff3c5f', c3:'#cc1a3a', rim:'#ff9060', bg:'#1a0508' },
  { name:'Gold',   c1:'#ffd166', c2:'#f0a500', c3:'#b87800', rim:'#ffe090', bg:'#0f0c00' },
  { name:'Purple', c1:'#c084fc', c2:'#7c3aed', c3:'#4c1d95', rim:'#d8b4fe', bg:'#0a0514' },
  { name:'Ice',    c1:'#7dd3fc', c2:'#0ea5e9', c3:'#0369a1', rim:'#bae6fd', bg:'#00080f' },
];

const VIDEO_COLORS = [
  ['#1a0a30','#3d1a5c','#6b2d8b'],
  ['#0a1a10','#1a4020','#2d7a3a'],
  ['#1a0a00','#3d2000','#7a4000'],
  ['#00101a','#00283d','#004d6b'],
  ['#1a001a','#3d003d','#7a0066'],
  ['#0a0a00','#252500','#4a4a00'],
  ['#00001a','#00003d','#00007a'],
  ['#1a0000','#3d0000','#7a0000'],
];

export default function SpyceLogo3D({ size = 120 }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    rotX: 0.28, rotY: 0, frame: 0,
    dragging: false, lastMX: 0, lastMY: 0,
    themeIdx: 0, themeBlend: 0,
  });
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = size * 2, H = size * 2; // 2x for retina
    canvas.width = W; canvas.height = H;
    canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
    const CX = W / 2, CY = H / 2;
    const S = 80;

    function lerp(a, b, t) { return a + (b - a) * t; }
    function lerpHex(h1, h2, t) {
      const p = n => parseInt(n.slice(1,3),16), q = n => parseInt(n.slice(3,5),16), r = n => parseInt(n.slice(5,7),16);
      return `rgb(${Math.round(lerp(p(h1),p(h2),t))},${Math.round(lerp(q(h1),q(h2),t))},${Math.round(lerp(r(h1),r(h2),t))})`;
    }
    function getTheme() {
      const { themeIdx, themeBlend } = stateRef.current;
      const cur = THEMES[themeIdx % 4], nxt = THEMES[(themeIdx + 1) % 4];
      const t = themeBlend;
      return {
        c1: lerpHex(cur.c1, nxt.c1, t), c2: lerpHex(cur.c2, nxt.c2, t),
        c3: lerpHex(cur.c3, nxt.c3, t), rim: lerpHex(cur.rim, nxt.rim, t),
        bg: lerpHex(cur.bg, nxt.bg, t),
      };
    }
    function project(x, y, z) {
      const { rotX, rotY } = stateRef.current;
      const cx = Math.cos(rotX), sx = Math.sin(rotX);
      const cy = Math.cos(rotY), sy = Math.sin(rotY);
      let y2 = y*cx - z*sx, z2 = y*sx + z*cx;
      let x2 = x*cy + z2*sy, z3 = -x*sy + z2*cy;
      const fov = 260, sc = fov / (fov + z3 + 60);
      return { x: CX + x2*sc, y: CY + y2*sc, s: sc, z: z3 };
    }
    function drawFakeVideo(x, y, w, h, seed, alpha) {
      const ci = seed % VIDEO_COLORS.length;
      const vc = VIDEO_COLORS[ci];
      const t = stateRef.current.frame * 0.008 + seed;
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.fillStyle = vc[0]; ctx.fillRect(x, y, w, h);
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = vc[Math.min(i+1, vc.length-1)];
        ctx.globalAlpha = alpha * (0.3 + 0.1*i);
        const bx = x + (Math.sin(t+i*1.1)*0.4+0.1)*w;
        const by = y + (Math.cos(t*0.7+i)*0.4+0.1)*h;
        const bw = w*(0.3+Math.sin(t*0.5+i)*0.15);
        const bh = h*(0.2+Math.cos(t*0.6+i)*0.1);
        ctx.fillRect(bx, by, bw, bh);
      }
      ctx.restore();
    }

    function render() {
      const st = stateRef.current;
      const th = getTheme();
      ctx.clearRect(0, 0, W, H);

      const bgGrad = ctx.createRadialGradient(CX, CY, 15, CX, CY, 105);
      bgGrad.addColorStop(0, th.bg + 'cc');
      bgGrad.addColorStop(1, '#08080f');
      ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, W, H);

      // Particles
      for (let i = 0; i < 5; i++) {
        const a = st.frame*0.009 + i*1.257;
        const pr = 95 + Math.sin(st.frame*0.017+i)*10;
        const px = CX + Math.cos(a)*pr, py = CY + Math.sin(a)*pr*0.38;
        const ps = 1.5 + Math.sin(st.frame*0.025+i)*0.8;
        ctx.beginPath(); ctx.arc(px, py, ps, 0, Math.PI*2);
        ctx.fillStyle = th.rim;
        ctx.globalAlpha = 0.2 + Math.sin(st.frame*0.03+i)*0.1;
        ctx.fill(); ctx.globalAlpha = 1;
      }

      // Build icon corners
      const corners = [[-S,-S,0],[S,-S,0],[S,S,0],[-S,S,0]];
      const pts = corners.map(([x,y,z]) => project(x, y, z));
      const r = 18, f = r/160;
      const faceVisible = Math.cos(st.rotX) * Math.cos(st.rotY);

      function lerp2(a, b, t) { return { x: lerp(a.x,b.x,t), y: lerp(a.y,b.y,t) }; }
      const iconPath = new Path2D();
      let first = true;
      for (let i = 0; i < 4; i++) {
        const p0=pts[i], p1=pts[(i+1)%4], p2=pts[(i+2)%4];
        const enter = lerp2(p0, p1, f), exit2 = lerp2(p1, p2, f);
        if (first) { iconPath.moveTo(enter.x, enter.y); first=false; }
        else iconPath.lineTo(enter.x, enter.y);
        iconPath.lineTo(lerp2(p1,p0,f).x, lerp2(p1,p0,f).y);
        iconPath.quadraticCurveTo(p1.x, p1.y, exit2.x, exit2.y);
      }
      iconPath.closePath();

      ctx.save(); ctx.clip(iconPath);
      if (faceVisible > -0.1) {
        const bb = pts.reduce((a,p) => ({
          minX: Math.min(a.minX,p.x), minY: Math.min(a.minY,p.y),
          maxX: Math.max(a.maxX,p.x), maxY: Math.max(a.maxY,p.y),
        }), { minX:Infinity, minY:Infinity, maxX:-Infinity, maxY:-Infinity });
        const vidSeed = Math.floor(st.frame / 220) % 8;
        drawFakeVideo(bb.minX, bb.minY, bb.maxX-bb.minX, bb.maxY-bb.minY, vidSeed, Math.max(0, faceVisible*0.9));
      }
      const shimGrad = ctx.createLinearGradient(CX-65,CY-65,CX+65,CY+65);
      shimGrad.addColorStop(0, th.c1 + '2a');
      shimGrad.addColorStop(1, th.c3 + '3a');
      ctx.fillStyle = shimGrad; ctx.fill(iconPath);
      ctx.restore();

      ctx.save(); ctx.strokeStyle = th.rim; ctx.lineWidth = 2.2; ctx.globalAlpha = 0.75;
      ctx.stroke(iconPath); ctx.restore();

      // Side extrusion
      const rSide = Math.sin(st.rotY);
      if (Math.abs(rSide) > 0.05) {
        const edgeA = rSide > 0 ? [pts[1],pts[2]] : [pts[3],pts[0]];
        ctx.save(); ctx.beginPath();
        ctx.moveTo(edgeA[0].x, edgeA[0].y);
        ctx.lineTo(edgeA[1].x, edgeA[1].y);
        ctx.lineTo(edgeA[1].x - rSide*12, edgeA[1].y+2);
        ctx.lineTo(edgeA[0].x - rSide*12, edgeA[0].y+2);
        ctx.closePath();
        ctx.fillStyle = th.c3; ctx.globalAlpha = 0.5*Math.abs(rSide); ctx.fill();
        ctx.restore();
      }

      // Pi symbol
      ctx.save();
      ctx.transform(1, Math.sin(st.rotX)*0.1, Math.sin(st.rotY)*0.22, 1, 0, 0);
      ctx.font = `bold ${74}px Georgia,serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 6.5; ctx.strokeText('π', CX, CY+2);
      const tg = ctx.createLinearGradient(CX, CY-37, CX, CY+37);
      tg.addColorStop(0,'rgba(255,255,255,1)'); tg.addColorStop(1,'rgba(255,255,255,0.7)');
      ctx.fillStyle = tg; ctx.fillText('π', CX, CY+2);
      ctx.font = `bold 15px sans-serif`; ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText('▶', CX+22, CY+22);
      ctx.restore();

      // Advance state
      st.rotY += 0.012;
      st.rotX = 0.28 + Math.sin(st.frame*0.006)*0.11;
      const cycleLen = 300;
      const cp = st.frame % (cycleLen * 4);
      const wt = Math.floor(cp / cycleLen);
      const pos = cp % cycleLen;
      const bStart = cycleLen * 0.7;
      st.themeIdx = wt;
      st.themeBlend = pos > bStart ? (pos - bStart) / (cycleLen - bStart) : 0;
      st.frame++;
      rafRef.current = requestAnimationFrame(render);
    }

    render();

    // Events
    const onMouseDown = e => { const st = stateRef.current; st.dragging=true; st.lastMX=e.clientX; st.lastMY=e.clientY; };
    const onMouseMove = e => {
      const st = stateRef.current; if (!st.dragging) return;
      st.rotY += (e.clientX-st.lastMX)*0.012; st.rotX += (e.clientY-st.lastMY)*0.012;
      st.lastMX=e.clientX; st.lastMY=e.clientY;
    };
    const onMouseUp = () => { stateRef.current.dragging=false; };
    const onTouchStart = e => { const st=stateRef.current; st.dragging=true; st.lastMX=e.touches[0].clientX; st.lastMY=e.touches[0].clientY; e.preventDefault(); };
    const onTouchMove = e => {
      const st=stateRef.current; if (!st.dragging) return;
      st.rotY+=(e.touches[0].clientX-st.lastMX)*0.012; st.rotX+=(e.touches[0].clientY-st.lastMY)*0.012;
      st.lastMX=e.touches[0].clientX; st.lastMY=e.touches[0].clientY; e.preventDefault();
    };
    const onTouchEnd = () => { stateRef.current.dragging=false; };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);

    return () => {
      cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        borderRadius: '20px',
        display: 'block',
        cursor: 'grab',
        width: size + 'px',
        height: size + 'px',
      }}
    />
  );
}
