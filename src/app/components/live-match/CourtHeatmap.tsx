import React, { useEffect, useRef, useState } from 'react';

// Design tokens
const C = {
  bg: '#070709',
  surface: '#11141a',
  courtBg: '#1a2235',
  courtLine: '#2e4a72',
  accent: '#A191FF',
  accent2: '#ff6b35',
  text: '#e8eaf0',
  muted: '#5a6070',
};

export interface Impact {
  x: number;
  y: number;
  weight: number;
  type?: string;
  out?: boolean; 
}

interface CourtHeatmapProps {
  impacts?: Impact[];
  mode?: 'view' | 'capture';
  viewHalf?: 'top' | 'bottom' | 'full';
  onCapture?: (impact: Impact) => void;
  width?: number;
  height?: number;
  withOutZone?: boolean; // If true, adds a border zone for OUT
}

const ZONE_NAMES = [
  ['Z1','Z6','Z5'],
  ['Z2','Z3','Z4'],
  ['Net','Net','Net'],
  ['Net','Net','Net'],
  ['Z4','Z3','Z2'],
  ['Z5','Z6','Z1'],
];

export function CourtHeatmap({ 
  impacts = [], mode = 'view', viewHalf = 'full', onCapture, 
  width = 300, height = 540, withOutZone = false 
}: CourtHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ripples, setRipples] = useState<{id: number, x: number, y: number}[]>([]);

  const OUT_PAD = withOutZone ? 30 : 0;
  
  // Real drawing dimensions of the court
  const courtW = width;
  const courtH = height;

  // Total container dimensions
  const totalW = width + (OUT_PAD * 2);
  const totalH = viewHalf === 'full' ? height + (OUT_PAD * 2) : (height / 2) + (OUT_PAD * 2);

  // Render heatmap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (impacts.length === 0) {
      ctx.clearRect(0, 0, totalW, totalH);
      return;
    }

    const RES = 2; 
    const w = totalW / RES;
    const h = totalH / RES;
    const grid = new Float32Array(Math.floor(w * h));

    const sigma = 38 / RES;
    const sigma2 = 2 * sigma * sigma;

    impacts.forEach(({ x, y, weight, out }) => {
      // Adjust x, y if we are in half mode to match the visual canvas
      let adjY = y;
      if (viewHalf === 'bottom') {
        adjY = y - (height / 2); // Shift up
      }

      // We add padding offset
      const drawX = x + OUT_PAD;
      const drawY = adjY + OUT_PAD;

      const cx = drawX / RES;
      const cy = drawY / RES;
      const r = Math.ceil(sigma * 3);
      
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = Math.round(cx + dx);
          const ny = Math.round(cy + dy);
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const dist2 = dx * dx + dy * dy;
          grid[ny * Math.floor(w) + nx] += weight * Math.exp(-dist2 / sigma2);
        }
      }
    });

    let maxVal = 0;
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] > maxVal) maxVal = grid[i];
    }

    if (maxVal === 0) {
      ctx.clearRect(0, 0, totalW, totalH);
      return;
    }

    const imgData = ctx.createImageData(Math.floor(w), Math.floor(h));
    const data = imgData.data;

    const heatColor = (t: number) => {
      const stops = [
        [0.00, [10, 20, 60]],
        [0.15, [0, 40, 140]],
        [0.35, [0, 100, 210]],
        [0.55, [0, 210, 255]],
        [0.70, [80, 255, 100]],
        [0.82, [255, 220, 0]],
        [0.92, [255, 100, 20]],
        [1.00, [255, 20, 20]],
      ];
      for (let i = 0; i < stops.length - 1; i++) {
        const [t0, c0] = stops[i] as any;
        const [t1, c1] = stops[i + 1] as any;
        if (t >= t0 && t <= t1) {
          const f = (t - t0) / (t1 - t0);
          return c0.map((v: number, j: number) => Math.round(v + f * (c1[j] - v)));
        }
      }
      return [255, 20, 20];
    };

    for (let i = 0; i < grid.length; i++) {
      const t = grid[i] / maxVal;
      if (t < 0.02) {
        data[i * 4 + 3] = 0;
        continue;
      }
      const [r, g, b] = heatColor(t);
      data[i * 4] = r;
      data[i * 4 + 1] = g;
      data[i * 4 + 2] = b;
      data[i * 4 + 3] = Math.min(255, Math.round(t * 210 + 20));
    }

    const tmp = document.createElement('canvas');
    tmp.width = Math.floor(w);
    tmp.height = Math.floor(h);
    tmp.getContext('2d')?.putImageData(imgData, 0, 0);

    ctx.clearRect(0, 0, totalW, totalH);
    ctx.save();
    ctx.scale(RES, RES);
    ctx.drawImage(tmp, 0, 0);
    ctx.restore();

  }, [impacts, width, height, viewHalf, withOutZone]);

  const handleClick = (e: React.MouseEvent) => {
    if (mode !== 'capture') return;
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = totalW / rect.width;
    const scaleY = totalH / rect.height;

    const tapX = (e.clientX - rect.left) * scaleX;
    const tapY = (e.clientY - rect.top) * scaleY;

    // Trigger ripple
    const id = Date.now();
    setRipples(prev => [...prev, { id, x: tapX, y: tapY }]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 700);

    if (onCapture) {
      // Convert back to absolute court coordinates (without out_pad and half-offset)
      let courtX = tapX - OUT_PAD;
      let courtY = tapY - OUT_PAD;
      let isOut = false;

      if (courtX < 0 || courtX > courtW || courtY < 0 || courtY > (viewHalf === 'full' ? courtH : courtH/2)) {
        isOut = true;
      }

      // Constrain within full virtual canvas to avoid extreme coords
      courtX = Math.max(0, Math.min(courtX, courtW));
      courtY = Math.max(0, Math.min(courtY, viewHalf === 'full' ? courtH : courtH/2));

      // Re-add bottom offset if needed so the saved coordinate is absolute to the full court!
      if (viewHalf === 'bottom') {
        courtY += (courtH / 2);
      }

      onCapture({ x: courtX, y: courtY, weight: 1, out: isOut });
    }
  };

  return (
    <div 
      ref={containerRef}
      onClick={handleClick}
      style={{
        position: 'relative',
        width: totalW,
        height: totalH,
        background: withOutZone ? '#0a0a0e' : C.courtBg,
        border: withOutZone ? `2px dashed ${C.muted}` : `1.5px solid ${C.courtLine}`,
        borderRadius: 8,
        overflow: 'hidden',
        cursor: mode === 'capture' ? 'crosshair' : 'default',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      }}
    >
      {withOutZone && (
        <div style={{ position: 'absolute', top: 5, left: 5, fontSize: 10, color: C.muted, fontWeight: 'bold', letterSpacing: '0.1em' }}>OUT ZONE</div>
      )}

      {/* The actual Court wrapper */}
      <div style={{
        position: 'absolute',
        top: OUT_PAD, left: OUT_PAD,
        width: courtW,
        height: viewHalf === 'full' ? courtH : courtH / 2,
        background: C.courtBg,
        border: `1.5px solid ${C.courtLine}`,
        overflow: 'hidden',
        boxShadow: withOutZone ? '0 0 15px rgba(0,0,0,0.8)' : 'none',
      }}>
        
        {/* Background grain */}
        <div 
          style={{
            position: 'absolute', inset: 0, opacity: 0.05, pointerEvents: 'none', zIndex: 1,
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")"
          }}
        />

        {/* Grid Lines - ONLY IN CAPTURE MODE (user feedback incorporated) */}
        {mode === 'capture' && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: `repeat(${viewHalf === 'full' ? 6 : 3}, 1fr)`, zIndex: 3, pointerEvents: 'none' }}>
            {Array.from({ length: viewHalf === 'full' ? 18 : 9 }).map((_, i) => (
              <div key={i} style={{ border: `1px solid rgba(46, 74, 114, 0.2)` }} />
            ))}
          </div>
        )}

        {/* Attack Lines */}
        { (viewHalf === 'full' || viewHalf === 'top') && <div style={{ position: 'absolute', left: 0, right: 0, top: viewHalf === 'top' ? '66.6%' : '33.3%', height: 1, background: 'rgba(0, 229, 255, 0.25)', zIndex: 4 }} /> }
        { (viewHalf === 'full' || viewHalf === 'bottom') && <div style={{ position: 'absolute', left: 0, right: 0, top: viewHalf === 'bottom' ? '33.3%' : '66.6%', height: 1, background: 'rgba(0, 229, 255, 0.25)', zIndex: 4 }} /> }

        {/* Net & Center Line */}
        {viewHalf === 'full' && (
          <>
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2.5, background: C.accent, opacity: 0.9, transform: 'translateY(-50%)', zIndex: 5, boxShadow: `0 0 10px ${C.accent}` }} />
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, transform: 'translateY(-50%)', height: 16, zIndex: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ width: '100%', height: 4, opacity: 0.8, boxShadow: `0 0 12px ${C.accent}`, background: `repeating-linear-gradient(90deg, ${C.accent} 0px, ${C.accent} 4px, transparent 4px, transparent 10px)` }} />
            </div>
          </>
        )}
        {viewHalf === 'top' && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: `repeating-linear-gradient(90deg, ${C.accent} 0px, ${C.accent} 4px, transparent 4px, transparent 10px)`, zIndex: 5, opacity: 0.8 }} />
        )}
        {viewHalf === 'bottom' && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: `repeating-linear-gradient(90deg, ${C.accent} 0px, ${C.accent} 4px, transparent 4px, transparent 10px)`, zIndex: 5, opacity: 0.8 }} />
        )}
      </div>

      {/* Heatmap Layer */}
      <canvas 
        ref={canvasRef} 
        width={totalW} 
        height={totalH} 
        style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none', opacity: 0.9 }}
      />

      {/* Ripples */}
      {ripples.map(r => (
        <div 
          key={r.id} 
          style={{
            position: 'absolute',
            left: r.x, top: r.y,
            width: 24, height: 24,
            background: 'rgba(255, 107, 53, 0.7)',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 15,
            animation: 'rippleAnim 0.6s ease-out forwards'
          }}
        />
      ))}

      <style>{`
        @keyframes rippleAnim {
          from { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          to { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// Helper to calculate zones
export function getZoneFromXY(x: number, y: number, width = 300, height = 540) {
  const col = Math.min(Math.floor(x / (width / 3)), 2);
  const row = Math.min(Math.floor(y / (height / 6)), 5);
  const key = ZONE_NAMES[row][col];
  return key === 'Net' ? 'Z3' : key; // Fallback
}
