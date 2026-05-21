import React from 'react';
import { Clock, Target, Zap, Shield, X, CheckCircle, ArrowRight, Activity, Timer } from 'lucide-react';
import { VolleyballMatch, VolleyballSet, Rally } from '../../utils/match-types';

interface MatchTimelineProps {
  match: VolleyballMatch;
  currentSet: VolleyballSet | null;
}

export function MatchTimeline({ match, currentSet }: MatchTimelineProps) {
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDuration = (duration: number): string => {
    const seconds = Math.floor(duration / 1000);
    return `${seconds}s`;
  };

  const getEventIcon = (eventKind: string) => {
    switch (eventKind) {
      case 'serve':   return <Target className="h-3 w-3" />;
      case 'receive': return <Activity className="h-3 w-3" />;
      case 'set':     return <ArrowRight className="h-3 w-3" />;
      case 'attack':  return <Zap className="h-3 w-3" />;
      case 'block':   return <Shield className="h-3 w-3" />;
      case 'error':   return <X className="h-3 w-3" />;
      default:        return <CheckCircle className="h-3 w-3" />;
    }
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'ace':
      case 'kill':    return '#91FFB0';
      case 'error':
      case 'out':
      case 'net':     return '#FF919F';
      case 'blocked': return '#FFD391';
      default:        return 'rgba(255,255,255,0.40)';
    }
  };

  const getPlayerName = (playerId: string): string => {
    const player = [...match.localPlayers, ...match.visitaPlayers].find(p => p.id === playerId);
    return player ? player.name.split(' ')[0] : 'N/A';
  };

  if (!currentSet) {
    return (
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2">
          <Clock size={13} className="text-[#91CAFF]" />
          <p className="text-[13px] font-semibold text-white">Timeline del Partido</p>
        </div>
        <div className="py-10 text-center text-[13px] text-white/20">
          <Clock className="h-7 w-7 mx-auto mb-2 opacity-30" />
          No hay datos del set actual
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2">
        <Clock size={13} className="text-[#91CAFF]" />
        <p className="text-[13px] font-semibold text-white">Timeline Set {currentSet.number}</p>
      </div>

      <div className="h-64 overflow-y-auto px-4 py-3 space-y-3">
        {currentSet.rallies.length > 0 ? (
          currentSet.rallies.slice().reverse().map((rally) => (
            <div key={rally.id} className="border-l-2 border-white/[0.08] pl-4 pb-3 relative">
              {/* Timeline marker */}
              <div className="absolute -left-1.5 top-1 w-3 h-3 bg-[#0d0d0d] border-2 border-white/[0.15] rounded-full" />

              {/* Rally header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-label px-2 py-0.5 rounded border border-white/[0.08] text-white/40">
                    Rally #{rally.number}
                  </span>
                  <span className="text-label px-2 py-0.5 rounded border"
                    style={rally.winnerTeam === 'local'
                      ? { color: '#91FFB0', backgroundColor: 'rgba(145,255,176,0.08)', borderColor: 'rgba(145,255,176,0.20)' }
                      : { color: '#FF919F', backgroundColor: 'rgba(255,145,159,0.08)', borderColor: 'rgba(255,145,159,0.20)' }}>
                    {rally.winnerTeam === 'local' ? match.localTeam : match.visitaTeam}
                  </span>
                </div>
                <span className="text-[11px] text-white/25 font-mono">
                  {formatTime(rally.startedAt)} · {formatDuration(rally.duration)}
                </span>
              </div>

              {/* Events */}
              <div className="space-y-1">
                {rally.events.map((event, eventIndex) => (
                  <div key={eventIndex} className="flex items-center gap-2 text-[11px]">
                    <span className="text-white/25">{getEventIcon(event.kind)}</span>
                    <span className="text-white/50">
                      {event.kind === 'serve' && (
                        <><strong className="text-white/70">{getPlayerName(event.playerId)}</strong> saca a zona {event.targetZone}
                          <span style={{ color: getResultColor(event.result) }}> → {event.result}</span></>
                      )}
                      {event.kind === 'receive' && (
                        <><strong className="text-white/70">{getPlayerName(event.playerId)}</strong> recibe
                          <span style={{ color: event.quality === 3 ? '#91FFB0' : event.quality === 2 ? '#FFD391' : event.quality === 1 ? '#FFD391' : '#FF919F' }}> (Q{event.quality})</span></>
                      )}
                      {event.kind === 'set' && (
                        <><strong className="text-white/70">{getPlayerName(event.playerId)}</strong> coloca {event.play}</>
                      )}
                      {event.kind === 'attack' && (
                        <><strong className="text-white/70">{getPlayerName(event.playerId)}</strong> ataca desde {event.fromZone}
                          <span style={{ color: getResultColor(event.result) }}> → {event.result}</span></>
                      )}
                      {event.kind === 'block' && (
                        <><strong className="text-white/70">{getPlayerName(event.playerId)}</strong> bloquea
                          <span style={{ color: getResultColor(event.result) }}> → {event.result}</span></>
                      )}
                      {event.kind === 'error' && (
                        <span style={{ color: '#FF919F' }}>Error: {event.code}{event.playerId && ` (${getPlayerName(event.playerId)})`}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {/* Result */}
              <div className="mt-2">
                <span className="text-label px-2 py-0.5 rounded"
                  style={rally.winnerTeam === 'local'
                    ? { color: '#91FFB0', backgroundColor: 'rgba(145,255,176,0.08)' }
                    : { color: '#FF919F', backgroundColor: 'rgba(255,145,159,0.08)' }}>
                  Punto {rally.winnerTeam === 'local' ? match.localTeam : match.visitaTeam} · {rally.cause}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-[13px] text-white/20">
            <Timer className="h-7 w-7 mx-auto mb-2 opacity-30" />
            No hay rallies registrados aún
          </div>
        )}
      </div>

      {currentSet.rallies.length > 0 && (
        <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between">
          <span className="text-[12px] text-white/30">{currentSet.rallies.length} rallies</span>
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-white/[0.08] text-label text-white/40 hover:text-white/70 hover:border-white/20 transition-colors">
              <Clock size={11} /> Exportar
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-white/[0.08] text-label text-white/40 hover:text-white/70 hover:border-white/20 transition-colors">
              <Activity size={11} /> Estadísticas
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
