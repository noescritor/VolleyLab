import React, { useState, useEffect } from 'react';
import { Clock, Pause, Play, Square, Timer, Trophy, Flag, AlertTriangle } from 'lucide-react';
import { VolleyballMatch, VolleyballSet } from '../../utils/match-types';

interface MatchHeaderProps {
  match: VolleyballMatch;
  currentSet: VolleyballSet | null;
}

const stateLabel: Record<string, string> = {
  playing: 'En Juego',
  timeout: 'Time-out',
  'technical-timeout': 'Tiempo Técnico',
  challenge: 'Challenge',
  substitution: 'Cambio',
  finished: 'Finalizado',
};

const stateColor: Record<string, { color: string; bg: string; border: string }> = {
  playing:             { color: '#91FFB0', bg: 'rgba(145,255,176,0.08)',  border: 'rgba(145,255,176,0.20)' },
  timeout:             { color: '#FFD391', bg: 'rgba(255,211,145,0.08)',  border: 'rgba(255,211,145,0.20)' },
  'technical-timeout': { color: '#FFD391', bg: 'rgba(255,211,145,0.08)',  border: 'rgba(255,211,145,0.20)' },
  challenge:           { color: '#DC91FF', bg: 'rgba(220,145,255,0.08)',  border: 'rgba(220,145,255,0.20)' },
  substitution:        { color: '#91CAFF', bg: 'rgba(145,202,255,0.08)',  border: 'rgba(145,202,255,0.20)' },
  finished:            { color: 'rgba(255,255,255,0.40)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.10)' },
};

export function MatchHeader({ match, currentSet }: MatchHeaderProps) {
  const [matchTime, setMatchTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (match.state === 'playing' && isTimerRunning) {
      interval = setInterval(() => {
        const elapsed = Date.now() - (currentSet?.startedAt || Date.now());
        setMatchTime(Math.floor(elapsed / 1000));
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [match.state, isTimerRunning, currentSet?.startedAt]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const sc = stateColor[match.state] || stateColor.finished;

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-5 py-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

        {/* Match info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1.5 flex-wrap">
            <h2 className="text-[15px] font-semibold text-white">
              {match.localTeam} vs {match.visitaTeam}
            </h2>
            <span className="text-label px-2.5 py-0.5 rounded-full border"
              style={{ color: sc.color, backgroundColor: sc.bg, borderColor: sc.border }}>
              {stateLabel[match.state] || 'Preparando'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-[12px] text-white/40 flex-wrap">
            {match.tournament && (
              <span className="flex items-center gap-1">
                <Trophy size={11} />{match.tournament}
              </span>
            )}
            {match.venue && (
              <span className="flex items-center gap-1">
                <Flag size={11} />{match.venue}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Timer size={11} />Set {match.currentSet}
            </span>
          </div>
        </div>

        {/* Set scores */}
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-label text-white/25 mb-0.5">SETS</p>
            <p className="text-[22px] font-bold font-mono text-white">
              {match.sets.filter(s => s.winner === 'local').length}–{match.sets.filter(s => s.winner === 'visita').length}
            </p>
          </div>

          {currentSet && (
            <div className="text-center">
              <p className="text-label text-white/25 mb-0.5">SET ACTUAL</p>
              <p className="text-[22px] font-bold font-mono text-white">
                {currentSet.scoreLocal}–{currentSet.scoreVisita}
              </p>
            </div>
          )}
        </div>

        {/* Timer */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-label text-white/25 mb-0.5">TIEMPO</p>
            <p className="text-[18px] font-mono text-white">{formatTime(matchTime)}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="h-8 w-8 flex items-center justify-center rounded border transition-colors"
              style={isTimerRunning
                ? { backgroundColor: 'rgba(255,145,159,0.10)', borderColor: 'rgba(255,145,159,0.25)', color: '#FF919F' }
                : { backgroundColor: 'rgba(145,255,176,0.08)', borderColor: 'rgba(145,255,176,0.20)', color: '#91FFB0' }
              }
            >
              {isTimerRunning ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button
              onClick={() => { setMatchTime(0); setIsTimerRunning(false); }}
              className="h-8 w-8 flex items-center justify-center rounded border border-white/[0.08] text-white/40 hover:text-white/70 hover:border-white/20 transition-colors">
              <Square size={14} />
            </button>
          </div>
        </div>
      </div>

      {match.state === 'playing' && currentSet && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[12px]">
          <div className="flex items-center gap-4 text-white/50">
            <span>Servidor: <strong className="text-white/70">{currentSet.serverTeam === 'local' ? match.localTeam : match.visitaTeam}</strong></span>
            {(currentSet.scoreLocal >= 20 || currentSet.scoreVisita >= 20) && (
              <span className="flex items-center gap-1 text-label"
                style={{ color: '#FFD391' }}>
                <AlertTriangle size={11} /> Set Point
              </span>
            )}
          </div>
          <span className="text-white/25 font-mono">Rally #{currentSet.rallies.length + 1}</span>
        </div>
      )}
    </div>
  );
}
