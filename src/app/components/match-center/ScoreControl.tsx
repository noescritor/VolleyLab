import React, { useState } from 'react';
import { Plus, Play, Clock, Users, AlertTriangle, RotateCcw, Flag, Timer, Target, Zap } from 'lucide-react';
import { VolleyballMatch, VolleyballSet, Team, Player } from '../../utils/match-types';
import { toast } from 'sonner@2.0.3';

interface ScoreControlProps {
  match: VolleyballMatch;
  currentSet: VolleyballSet | null;
  isRallyActive: boolean;
  expectedServer: Player | null;
  onStartRally: () => void;
  onEndRally: (winnerTeam: Team, cause: string) => void;
}

export function ScoreControl({
  match,
  currentSet,
  isRallyActive,
  expectedServer,
  onStartRally,
  onEndRally
}: ScoreControlProps) {
  const [selectedWinnerTeam, setSelectedWinnerTeam] = useState<Team | null>(null);

  const handleQuickPoint = (team: Team, cause: string) => {
    if (isRallyActive) {
      onEndRally(team, cause);
    } else {
      onStartRally();
      setTimeout(() => onEndRally(team, cause), 100);
    }
    setSelectedWinnerTeam(null);
  };

  const handleTimeoutRequest = (team: Team) => {
    toast.info(`Time-out solicitado por ${team === 'local' ? match.localTeam : match.visitaTeam}`);
  };

  if (!currentSet) {
    return (
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-5 py-8 text-center">
        <p className="text-[13px] text-white/30">No hay set activo</p>
      </div>
    );
  }

  const targetScore = currentSet.number === 5 ? 15 : 25;
  const isDeuce = currentSet.scoreLocal >= targetScore - 1
    && currentSet.scoreVisita >= targetScore - 1
    && Math.abs(currentSet.scoreLocal - currentSet.scoreVisita) <= 1;

  const localSetPoint = currentSet.scoreLocal >= targetScore - 1
    && (currentSet.scoreLocal - currentSet.scoreVisita >= 1)
    && currentSet.scoreLocal >= targetScore;

  const visitaSetPoint = currentSet.scoreVisita >= targetScore - 1
    && (currentSet.scoreVisita - currentSet.scoreLocal >= 1)
    && currentSet.scoreVisita >= targetScore;

  const setFinished =
    (currentSet.scoreLocal >= targetScore && currentSet.scoreLocal - currentSet.scoreVisita >= 2) ||
    (currentSet.scoreVisita >= targetScore && currentSet.scoreVisita - currentSet.scoreLocal >= 2);

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">

      {/* Set label */}
      <div className="px-5 py-3.5 border-b border-white/[0.06] text-center">
        <span className="text-label px-3 py-1 rounded-full border border-white/[0.08] text-white/40">
          Set {currentSet.number} {currentSet.number === 5 ? '· Decisivo 15pts' : '· 25pts'}
        </span>
      </div>

      {/* Scoreboard */}
      <div className="px-5 py-5">
        <div className="grid grid-cols-5 items-center gap-2 mb-3">
          <div className="text-right col-span-1">
            <p className="text-[13px] font-semibold text-white truncate">{match.localTeam}</p>
            <p className="text-[11px] text-white/30">Local</p>
          </div>
          <div className="text-center">
            <p className="text-[40px] font-bold font-mono" style={{ color: '#A191FF' }}>{currentSet.scoreLocal}</p>
          </div>
          <div className="text-center">
            <p className="text-[20px] font-mono text-white/20">–</p>
            <p className="text-[11px] text-white/25 font-mono mt-0.5">
              {match.sets.filter(s => s.winner === 'local').length}–{match.sets.filter(s => s.winner === 'visita').length}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[40px] font-bold font-mono" style={{ color: '#A191FF' }}>{currentSet.scoreVisita}</p>
          </div>
          <div className="text-left col-span-1">
            <p className="text-[13px] font-semibold text-white truncate">{match.visitaTeam}</p>
            <p className="text-[11px] text-white/30">Visitante</p>
          </div>
        </div>

        {/* Set point badges */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="text-right">
            {localSetPoint && (
              <span className="text-label px-2 py-0.5 rounded"
                style={{ color: '#FFD391', backgroundColor: 'rgba(255,211,145,0.10)' }}>SET POINT</span>
            )}
          </div>
          <div className="text-left">
            {visitaSetPoint && (
              <span className="text-label px-2 py-0.5 rounded"
                style={{ color: '#FFD391', backgroundColor: 'rgba(255,211,145,0.10)' }}>SET POINT</span>
            )}
          </div>
        </div>

        {/* Game status */}
        {setFinished && (
          <div className="mb-4 p-3 rounded-lg border text-center"
            style={{ backgroundColor: 'rgba(145,255,176,0.06)', borderColor: 'rgba(145,255,176,0.20)' }}>
            <p className="text-label" style={{ color: '#91FFB0' }}>¡SET TERMINADO!</p>
            <p className="text-[13px] text-white/70 mt-1">
              {currentSet.scoreLocal > currentSet.scoreVisita ? match.localTeam : match.visitaTeam} gana {currentSet.scoreLocal}–{currentSet.scoreVisita}
            </p>
          </div>
        )}

        {!setFinished && (localSetPoint || visitaSetPoint) && (
          <div className="mb-4 p-3 rounded-lg border text-center"
            style={{ backgroundColor: 'rgba(255,211,145,0.06)', borderColor: 'rgba(255,211,145,0.20)' }}>
            <span className="text-label animate-pulse" style={{ color: '#FFD391' }}>
              <AlertTriangle size={11} className="inline mr-1" />
              SET POINT — {localSetPoint ? match.localTeam : match.visitaTeam}
            </span>
          </div>
        )}

        {!setFinished && isDeuce && (
          <div className="mb-4 p-3 rounded-lg border text-center"
            style={{ backgroundColor: 'rgba(255,211,145,0.06)', borderColor: 'rgba(255,211,145,0.20)' }}>
            <span className="text-label" style={{ color: '#FFD391' }}>
              <AlertTriangle size={11} className="inline mr-1" />
              DEUCE — Necesario 2 puntos de ventaja
            </span>
          </div>
        )}

        {/* Expected server */}
        {expectedServer && (
          <div className="mb-4 p-3 rounded-lg border text-center"
            style={{ backgroundColor: 'rgba(145,202,255,0.06)', borderColor: 'rgba(145,202,255,0.20)' }}>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Target size={12} style={{ color: '#91CAFF' }} />
              <span className="text-[13px] text-white/70">
                <strong className="text-white">{expectedServer.name}</strong> debe sacar
              </span>
              <span className="text-label px-2 py-0.5 rounded border border-white/[0.08] text-white/40">
                #{expectedServer.number}
              </span>
            </div>
          </div>
        )}

        {/* Rally control */}
        {!isRallyActive ? (
          <button onClick={onStartRally}
            className="w-full h-14 flex items-center justify-center gap-2 bg-[#A191FF] hover:bg-[#B8ADFF] text-black font-semibold rounded-lg transition-colors">
            <Play size={18} />
            <span className="text-[15px]">INICIAR RALLY</span>
          </button>
        ) : (
          <div className="space-y-4">
            <div className="p-2 rounded-lg border text-center"
              style={{ backgroundColor: 'rgba(145,255,176,0.06)', borderColor: 'rgba(145,255,176,0.20)' }}>
              <span className="text-label" style={{ color: '#91FFB0' }}>
                <Timer size={11} className="inline mr-1" />
                RALLY #{currentSet.rallies.length + 1} EN PROGRESO
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Local team actions */}
              <div className="space-y-2">
                <p className="text-[12px] font-medium text-center text-white/60 bg-white/[0.04] rounded px-2 py-1">{match.localTeam}</p>
                <button onClick={() => handleQuickPoint('local', 'Kill')}
                  className="w-full h-12 flex items-center justify-center gap-2 rounded-lg font-semibold text-[13px] transition-colors"
                  style={{ backgroundColor: 'rgba(145,255,176,0.12)', borderColor: 'rgba(145,255,176,0.25)', color: '#91FFB0' }}>
                  <Zap size={14} /> KILL
                </button>
                <button onClick={() => handleQuickPoint('local', 'Ace')}
                  className="w-full h-10 flex items-center justify-center gap-1.5 rounded border border-white/[0.08] text-label text-white/50 hover:text-white/80 hover:border-white/20 transition-colors">
                  <Target size={12} /> ACE
                </button>
                <button onClick={() => handleQuickPoint('local', 'Error Rival')}
                  className="w-full h-10 flex items-center justify-center gap-1.5 rounded border border-white/[0.08] text-label text-white/40 hover:text-white/70 hover:border-white/20 transition-colors">
                  Error Rival
                </button>
              </div>

              {/* Visita team actions */}
              <div className="space-y-2">
                <p className="text-[12px] font-medium text-center text-white/60 bg-white/[0.04] rounded px-2 py-1">{match.visitaTeam}</p>
                <button onClick={() => handleQuickPoint('visita', 'Kill')}
                  className="w-full h-12 flex items-center justify-center gap-2 rounded-lg font-semibold text-[13px] transition-colors"
                  style={{ backgroundColor: 'rgba(145,255,176,0.12)', borderColor: 'rgba(145,255,176,0.25)', color: '#91FFB0' }}>
                  <Zap size={14} /> KILL
                </button>
                <button onClick={() => handleQuickPoint('visita', 'Ace')}
                  className="w-full h-10 flex items-center justify-center gap-1.5 rounded border border-white/[0.08] text-label text-white/50 hover:text-white/80 hover:border-white/20 transition-colors">
                  <Target size={12} /> ACE
                </button>
                <button onClick={() => handleQuickPoint('visita', 'Error Rival')}
                  className="w-full h-10 flex items-center justify-center gap-1.5 rounded border border-white/[0.08] text-label text-white/40 hover:text-white/70 hover:border-white/20 transition-colors">
                  Error Rival
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="border-t border-white/[0.06] grid grid-cols-4 divide-x divide-white/[0.06]">
        {[
          { label: 'TO Local',    icon: Clock, onClick: () => handleTimeoutRequest('local')  },
          { label: 'TO Visita',   icon: Clock, onClick: () => handleTimeoutRequest('visita') },
          { label: 'Cambio',      icon: Users, onClick: () => {} },
          { label: 'Tarjeta',     icon: Flag,  onClick: () => {} },
        ].map(({ label, icon: Icon, onClick }) => (
          <button key={label} onClick={onClick}
            className="flex items-center justify-center gap-1.5 py-3 text-label text-white/35 hover:text-white/60 hover:bg-white/[0.03] transition-colors">
            <Icon size={11} />{label}
          </button>
        ))}
      </div>
    </div>
  );
}
