import React from 'react';
import { MoreVertical, Wifi, WifiOff } from 'lucide-react';
import { cn } from '../ui/utils';

interface LiveMatchHeaderProps {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  currentSet: number;
  totalSets: number;
  rotation: number;
  server: string;
  isOnline?: boolean;
  onMenuClick?: () => void;
  onScoreSwipe?: (direction: 'left' | 'right') => void;
  onScoreLongPress?: () => void;
  className?: string;
}

export function LiveMatchHeader({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  currentSet,
  totalSets,
  rotation,
  server,
  isOnline = true,
  onMenuClick,
  onScoreSwipe,
  onScoreLongPress,
  className
}: LiveMatchHeaderProps) {
  const handleScoreGesture = React.useCallback((event: React.TouchEvent | React.MouseEvent) => {
    if ('touches' in event) {
      const startX = event.touches[0].clientX;

      const handleTouchEnd = (endEvent: TouchEvent) => {
        const endX = endEvent.changedTouches[0].clientX;
        const diff = endX - startX;

        if (Math.abs(diff) > 50) {
          onScoreSwipe?.(diff > 0 ? 'right' : 'left');
        }

        document.removeEventListener('touchend', handleTouchEnd);
      };

      document.addEventListener('touchend', handleTouchEnd);
    }
  }, [onScoreSwipe]);

  const handleScoreLongPress = React.useCallback(() => {
    const timeout = setTimeout(() => {
      onScoreLongPress?.();
    }, 800);

    const handleEnd = () => {
      clearTimeout(timeout);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchend', handleEnd);
    };

    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchend', handleEnd);
  }, [onScoreLongPress]);

  return (
    <div className={cn(
      "bg-[#0d0d0d] border-b border-white/[0.06] p-4",
      className
    )}>
      {/* Top row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-white">{homeTeam}</span>
          <span className="text-white/25 text-[12px]">vs</span>
          <span className="text-[14px] font-semibold text-white">{awayTeam}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {isOnline ? (
              <Wifi className="h-3.5 w-3.5" style={{ color: '#91FFB0' }} />
            ) : (
              <WifiOff className="h-3.5 w-3.5" style={{ color: '#FF919F' }} />
            )}
            <span className="text-[11px] font-mono uppercase tracking-wide" style={{ color: isOnline ? '#91FFB0' : '#FF919F' }}>
              {isOnline ? 'En línea' : 'Sin conexión'}
            </span>
          </div>

          <button
            onClick={onMenuClick}
            className="h-8 w-8 flex items-center justify-center rounded border border-white/[0.08] text-white/40 hover:text-white/70 hover:border-white/20 transition-colors"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Score and set info */}
      <div className="flex items-center justify-between">
        <div
          className="flex items-center gap-4 cursor-pointer select-none"
          onTouchStart={handleScoreGesture}
          onMouseDown={handleScoreLongPress}
        >
          <div className="text-center">
            <div className="text-3xl font-bold font-mono" style={{ color: '#A191FF' }}>{homeScore}</div>
            <div className="text-[11px] text-white/40 mt-0.5">{homeTeam}</div>
          </div>

          <div className="text-xl text-white/20 font-mono">—</div>

          <div className="text-center">
            <div className="text-3xl font-bold font-mono" style={{ color: '#FF919F' }}>{awayScore}</div>
            <div className="text-[11px] text-white/40 mt-0.5">{awayTeam}</div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 items-end">
          <span className="text-label px-2.5 py-0.5 rounded-full border"
            style={{ color: '#91CAFF', backgroundColor: 'rgba(145,202,255,0.08)', borderColor: 'rgba(145,202,255,0.20)' }}>
            SET {currentSet}/{totalSets}
          </span>
          <span className="text-label px-2.5 py-0.5 rounded-full border border-white/[0.08] text-white/40">
            ROT {rotation}
          </span>
          <span className="text-label px-2.5 py-0.5 rounded-full border"
            style={{ color: '#A191FF', backgroundColor: 'rgba(161,145,255,0.08)', borderColor: 'rgba(161,145,255,0.20)' }}>
            SACA: {server}
          </span>
        </div>
      </div>

      <div className="mt-2 text-[10px] text-white/20 text-center font-mono uppercase tracking-wide">
        Swipe marcador: ← Punto rival | Punto nuestro → • Mantener: Tiempo fuera
      </div>
    </div>
  );
}

export default LiveMatchHeader;
