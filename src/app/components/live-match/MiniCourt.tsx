import React, { useState, useCallback } from 'react';
import { cn } from '../ui/utils';

export interface CourtZone {
  zone: string; // '1F', '1B', '2F', '2B', etc. or 'fuera_izq', 'fuera_der', 'fondo'
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
}

interface MiniCourtProps {
  side?: 'us' | 'opp';
  onTap?: (zone: CourtZone) => void;
  onDoubleTap?: (outSide: 'izq' | 'der' | 'fondo') => void;
  showOutLanes?: boolean;
  highlightZone?: string;
  className?: string;
}

export function MiniCourt({ 
  side = 'us', 
  onTap, 
  onDoubleTap, 
  showOutLanes = true,
  highlightZone,
  className 
}: MiniCourtProps) {
  const [lastTap, setLastTap] = useState<{ time: number; zone: string } | null>(null);

  // Court zones mapping (6x6 grid with front/back rows)
  const courtZones = [
    // Front row (closer to net)
    { id: '4F', x: 0, y: 0, label: '4' },
    { id: '3F', x: 1, y: 0, label: '3' },
    { id: '2F', x: 2, y: 0, label: '2' },
    // Back row
    { id: '5B', x: 0, y: 1, label: '5' },
    { id: '6B', x: 1, y: 1, label: '6' },
    { id: '1B', x: 2, y: 1, label: '1' },
  ];

  const handleZoneTap = useCallback((zone: string, x: number, y: number) => {
    const now = Date.now();
    const isDoubleTap = lastTap && 
      lastTap.zone === zone && 
      now - lastTap.time < 300;

    if (isDoubleTap) {
      // Double tap triggers "out" selection
      if (onDoubleTap) {
        if (x < 0.33) onDoubleTap('izq');
        else if (x > 0.66) onDoubleTap('der');
        else onDoubleTap('fondo');
      }
      setLastTap(null);
    } else {
      // Single tap
      const normalizedX = x / 3; // Normalize to 0-1
      const normalizedY = y / 2; // Normalize to 0-1
      
      onTap?.({
        zone,
        x: normalizedX,
        y: normalizedY
      });
      
      setLastTap({ time: now, zone });
    }
  }, [lastTap, onTap, onDoubleTap]);

  const handleOutAreaTap = useCallback((outSide: 'izq' | 'der' | 'fondo') => {
    onDoubleTap?.(outSide);
  }, [onDoubleTap]);

  return (
    <div className={cn("relative w-full max-w-80 mx-auto", className)}>
      {/* Court container */}
      <div className="relative aspect-[3/2] bg-green-100 border-2 border-green-600 rounded-lg overflow-hidden">
        
        {/* Net line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white z-10" />
        
        {/* Court zones grid */}
        <div className="grid grid-cols-3 grid-rows-2 h-full">
          {courtZones.map((zone) => (
            <button
              key={zone.id}
              className={cn(
                "relative border border-white/50 transition-colors duration-150",
                "hover:bg-primary/20 active:bg-primary/40",
                "flex items-center justify-center",
                highlightZone === zone.id && "bg-primary/30 ring-2 ring-primary"
              )}
              onClick={() => handleZoneTap(zone.id, zone.x, zone.y)}
            >
              <span className="text-lg font-bold text-green-800">
                {zone.label}
              </span>
              
              {/* Zone indicator */}
              <div className="absolute top-1 left-1 text-xs text-green-600 opacity-60">
                {zone.id.includes('F') ? 'F' : 'B'}
              </div>
            </button>
          ))}
        </div>

        {/* Front/Back row divider */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-green-400 opacity-60 pointer-events-none" />
      </div>

      {/* Out of bounds areas */}
      {showOutLanes && (
        <div className="mt-2 flex gap-2">
          {/* Left out */}
          <button
            className="flex-1 h-8 bg-red-100 border border-red-300 rounded text-xs font-medium text-red-700 hover:bg-red-200 transition-colors"
            onClick={() => handleOutAreaTap('izq')}
          >
            Fuera Izq
          </button>
          
          {/* Back out */}
          <button
            className="flex-1 h-8 bg-red-100 border border-red-300 rounded text-xs font-medium text-red-700 hover:bg-red-200 transition-colors"
            onClick={() => handleOutAreaTap('fondo')}
          >
            Fuera Fondo
          </button>
          
          {/* Right out */}
          <button
            className="flex-1 h-8 bg-red-100 border border-red-300 rounded text-xs font-medium text-red-700 hover:bg-red-200 transition-colors"
            onClick={() => handleOutAreaTap('der')}
          >
            Fuera Der
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-2 text-xs text-muted-foreground text-center">
        Tap: zona • Doble tap: fuera
      </div>
    </div>
  );
}

export default MiniCourt;