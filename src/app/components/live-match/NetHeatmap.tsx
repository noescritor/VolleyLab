import React, { useEffect, useRef, useState } from 'react';

// Design tokens
const C = {
  bg: '#070709',
  surface: '#11141a',
  netBg: '#1a2235',
  netLine: '#2e4a72',
  accent: '#00e5ff', // Cyan for our team
  accent2: '#ff6b35', // Orange for rival penetrations
  text: '#e8eaf0',
  muted: '#5a6070',
};

export interface Impact {
  x: number;
  y: number;
  weight: number;
  type?: string; 
}

interface NetHeatmapProps {
  impacts?: Impact[];
  mode?: 'view' | 'capture';
  onCapture?: (impact: Impact) => void;
  width?: number;
  height?: number;
}

export function NetHeatmap({ impacts = [], mode = 'view', onCapture, width = 300, height = 200 }: NetHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ripples, setRipples] = useState<{id: number, x: number, y: number}[]>([]);

  // Render heatmap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (impacts.length === 0) {
      ctx.clearRect(0, 0, width, height);
      return;
    }

    const RES = 2; 
    const w = width / RES;
    const h = height / RES;
    const grid = new Float32Array(w * h);

    const sigma = 30 / RES; // Slightly tighter for net
    const sigma2 = 2 * sigma * sigma;

    impacts.forEach(({ x, y, weight }) => {
      const cx = x / RES;
      const cy = y / RES;
      const r = Math.ceil(sigma * 3);
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = Math.round(cx + dx);
          const ny = Math.round(cy + dy);
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const dist2 = dx * dx + dy * dy;
          grid[ny * w + nx] += weight * Math.exp(-dist2 / sigma2);
        }
      }
    });

    let maxVal = 0;
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] > maxVal) maxVal = grid[i];
    }

    if (maxVal === 0) {
      ctx.clearRect(0, 0, width, height);
      return;
    }

    const imgData = ctx.createImageData(w, h);
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

    for (let i = 0; i < w * h; i++) {
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
    tmp.width = w;
    tmp.height = h;
    tmp.getContext('2d')?.putImageData(imgData, 0, 0);

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.scale(RES, RES);
    ctx.drawImage(tmp, 0, 0);
    ctx.restore();

  }, [impacts, width, height]);

  const handleClick = (e: React.MouseEvent) => {
    if (mode !== 'capture') return;
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Trigger ripple
    const id = Date.now();
    setRipples(prev => [...prev, { id, x, y }]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 700);

    if (onCapture) {
      onCapture({ x, y, weight: 1 });
    }
  };

  return (
    <div 
      ref={containerRef}
      onClick={handleClick}
      style={{
        position: 'relative',
        width: width,
        height: height,
        background: C.netBg,
        border: `1.5px solid ${C.netLine}`,
        borderRadius: 4,
        overflow: 'hidden',
        cursor: mode === 'capture' ? 'crosshair' : 'default',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      }}
    >
      {/* Background grain */}
      <div 
        style={{
          position: 'absolute', inset: 0, opacity: 0.05, pointerEvents: 'none', zIndex: 1,
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")"
        }}
      />

      {/* Heatmap Layer */}
      <canvas 
        ref={canvasRef} 
        width={width} 
        height={height} 
        style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', opacity: 0.9 }}
      />

      {/* Net Visualization Grid (Squares) */}
      <div style={{ position: 'absolute', left: 20, right: 20, top: 40, bottom: 0, zIndex: 3, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      
      {/* Top Band of Net */}
      <div style={{ position: 'absolute', left: 20, right: 20, top: 40, height: 10, background: 'rgba(255,255,255,0.8)', zIndex: 4, borderTop: '2px solid white', borderBottom: '1px solid rgba(0,0,0,0.2)' }} />

      {/* Left Antenna */}
      <div style={{ position: 'absolute', left: 20, top: 0, bottom: 0, width: 6, background: 'repeating-linear-gradient(to bottom, #ff1100, #ff1100 20px, white 20px, white 40px)', zIndex: 5, boxShadow: '2px 0 5px rgba(0,0,0,0.5)', borderRadius: 3 }} />
      
      {/* Right Antenna */}
      <div style={{ position: 'absolute', right: 20, top: 0, bottom: 0, width: 6, background: 'repeating-linear-gradient(to bottom, #ff1100, #ff1100 20px, white 20px, white 40px)', zIndex: 5, boxShadow: '-2px 0 5px rgba(0,0,0,0.5)', borderRadius: 3 }} />

      {/* Zones indicators (P4, P3, P2 in mirror) */}
      <div style={{ position: 'absolute', left: 26, right: 26, bottom: 10, display: 'flex', justifyContent: 'space-around', zIndex: 6, opacity: 0.3, pointerEvents: 'none' }}>
        <div style={{ fontFamily: 'monospace', color: 'white', fontSize: 16, fontWeight: 'bold' }}>Z4</div>
        <div style={{ fontFamily: 'monospace', color: 'white', fontSize: 16, fontWeight: 'bold' }}>Z3</div>
        <div style={{ fontFamily: 'monospace', color: 'white', fontSize: 16, fontWeight: 'bold' }}>Z2</div>
      </div>

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

export function getNetZoneFromXY(x: number, width = 300) {
  const third = width / 3;
  if (x < third) return 'Z4';
  if (x < third * 2) return 'Z3';
  return 'Z2';
}
