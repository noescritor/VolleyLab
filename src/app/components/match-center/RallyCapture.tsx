import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Target, Zap, Shield, X, Activity, User, Users2, HandMetal } from 'lucide-react';
import { Rally, RallyEvent, VolleyballMatch, Position, Player } from '../../utils/match-types';

interface RallyCaptureProps {
  currentRally: Rally | null;
  isRallyActive: boolean;
  match: VolleyballMatch;
  onAddEvent: (event: RallyEvent) => void;
}

const TAB_PLAYER = 'player';
const TAB_ACTION = 'action';

export function RallyCapture({ currentRally, isRallyActive, match, onAddEvent }: RallyCaptureProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>(TAB_PLAYER);

  const resetCapture = () => {
    setSelectedPlayer('');
    setActiveTab(TAB_PLAYER);
  };

  const getCurrentPlayers = (team: 'local' | 'visita'): Player[] => {
    const currentSetData = match.sets[match.currentSet - 1];
    if (!currentSetData) return [];
    const rotation = team === 'local'
      ? currentSetData.currentRotationLocal
      : currentSetData.currentRotationVisita;
    const allPlayers = team === 'local' ? match.localPlayers : match.visitaPlayers;
    return rotation.map(playerId => allPlayers.find(p => p.id === playerId)!).filter(Boolean);
  };

  const handlePlayerAction = (
    actionType: string,
    details: { result?: string; quality?: number; fromZone?: Position; toZone?: Position; targetZone?: Position; play?: string; toPlayerId?: string } = {}
  ) => {
    if (!currentRally || !selectedPlayer) return;
    const event: RallyEvent = { kind: actionType as any, playerId: selectedPlayer, ...details };
    onAddEvent(event);
    if (['kill', 'error', 'ace', 'blocked'].includes(details.result || '')) resetCapture();
  };

  const handleSelectPlayer = (id: string) => {
    setSelectedPlayer(id);
    setActiveTab(TAB_ACTION);
  };

  if (!isRallyActive || !currentRally) {
    return (
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2">
          <Activity size={13} className="text-[#A191FF]" />
          <p className="text-[13px] font-semibold text-white">Captura por Jugador</p>
        </div>
        <div className="py-10 text-center">
          <User className="h-7 w-7 mx-auto mb-2 text-white/20" />
          <p className="text-[13px] text-white/30">Rally inactivo</p>
          <p className="text-[11px] text-white/20 mt-0.5">Selecciona jugadores y captura acciones durante el rally</p>
        </div>
      </div>
    );
  }

  const localPlayers = getCurrentPlayers('local');
  const visitaPlayers = getCurrentPlayers('visita');
  const selectedPlayerData = [...localPlayers, ...visitaPlayers].find(p => p.id === selectedPlayer);

  const tabs = [
    { key: TAB_PLAYER, label: 'Jugador',  icon: Users2    },
    { key: TAB_ACTION, label: 'Acción',   icon: HandMetal, disabled: !selectedPlayer },
  ];

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2">
        <Activity size={13} className="text-[#A191FF]" />
        <p className="text-[13px] font-semibold text-white">Rally #{currentRally.number} — Captura</p>
      </div>

      {/* Events log */}
      {currentRally.events.length > 0 && (
        <div className="px-5 py-3 border-b border-white/[0.06] bg-white/[0.01]">
          <p className="text-label text-white/30 mb-2">EVENTOS</p>
          <div className="space-y-1">
            {currentRally.events.map((event, index) => {
              const player = [...localPlayers, ...visitaPlayers].find(p => p.id === event.playerId);
              return (
                <div key={index} className="flex items-center gap-2 text-[11px] text-white/50">
                  <span className="text-label px-1.5 py-0.5 rounded border border-white/[0.08] text-white/35">
                    #{player?.number} {player?.name.split(' ')[0]}
                  </span>
                  <span>
                    {event.kind === 'serve'   && `Saque → ${event.result}`}
                    {event.kind === 'receive' && `Recepción (${event.quality}/3)`}
                    {event.kind === 'set'     && `Colocación ${event.play}`}
                    {event.kind === 'attack'  && `Ataque → ${event.result}`}
                    {event.kind === 'block'   && `Bloqueo → ${event.result}`}
                    {event.kind === 'dig'     && `Defensa → ${event.result}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-white/[0.06] flex gap-0">
        {tabs.map(({ key, label, icon: Icon, disabled }) => (
          <button key={key}
            onClick={() => !disabled && setActiveTab(key)}
            disabled={disabled}
            className={`flex items-center gap-1.5 px-4 py-3 text-label border-b-2 transition-colors ${
              activeTab === key
                ? 'border-[#A191FF] text-[#A191FF]'
                : 'border-transparent text-white/30 hover:text-white/60 disabled:opacity-30 disabled:cursor-not-allowed'
            }`}>
            <Icon size={11} />{label}
          </button>
        ))}
      </div>

      {/* Player selection */}
      {activeTab === TAB_PLAYER && (
        <div className="px-5 py-4 space-y-4">
          {[
            { teamLabel: match.localTeam,  players: localPlayers,  accent: '#A191FF', bg: 'rgba(161,145,255,0.08)', border: 'rgba(161,145,255,0.20)' },
            { teamLabel: match.visitaTeam, players: visitaPlayers, accent: '#91CAFF', bg: 'rgba(145,202,255,0.08)', border: 'rgba(145,202,255,0.20)' },
          ].map(({ teamLabel, players, accent, bg, border }) => (
            <div key={teamLabel}>
              <span className="text-label px-2 py-0.5 rounded"
                style={{ color: accent, backgroundColor: bg }}>
                {teamLabel}
              </span>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {players.map((player) => (
                  <button key={player.id}
                    onClick={() => handleSelectPlayer(player.id)}
                    className="flex items-center gap-2 px-3 py-2 rounded border text-left transition-colors"
                    style={selectedPlayer === player.id
                      ? { backgroundColor: bg, borderColor: border, color: accent }
                      : { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.60)' }
                    }>
                    <span className="text-label px-1.5 py-0.5 rounded bg-white/[0.06]">#{player.number}</span>
                    <div>
                      <p className="text-[12px] font-medium">{player.name.split(' ')[0]}</p>
                      <p className="text-[10px] opacity-60">{player.position}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action capture */}
      {activeTab === TAB_ACTION && selectedPlayerData && (
        <div className="px-5 py-4 space-y-4">
          {/* Selected player */}
          <div className="flex items-center justify-between p-3 rounded-lg border"
            style={{ backgroundColor: 'rgba(161,145,255,0.08)', borderColor: 'rgba(161,145,255,0.20)' }}>
            <div className="flex items-center gap-2">
              <span className="text-label px-1.5 py-0.5 rounded bg-[#A191FF]/20 text-[#A191FF]">
                #{selectedPlayerData.number}
              </span>
              <div>
                <p className="text-[13px] text-white font-medium">{selectedPlayerData.name}</p>
                <p className="text-[11px] text-white/40">{selectedPlayerData.position}</p>
              </div>
            </div>
            <button onClick={resetCapture}
              className="h-7 w-7 flex items-center justify-center rounded border border-white/[0.08] text-white/40 hover:text-white/70 transition-colors">
              <X size={12} />
            </button>
          </div>

          {/* Saques */}
          <div>
            <p className="text-label text-white/40 mb-2">SAQUES</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Ace',        onClick: () => handlePlayerAction('serve', { targetZone: 1, result: 'ace' }),   color: '#91FFB0' },
                { label: 'Error',      onClick: () => handlePlayerAction('serve', { targetZone: 1, result: 'error' }), color: '#FF919F' },
                { label: 'Saque Z5',   onClick: () => handlePlayerAction('serve', { targetZone: 5, result: 'in' }),    color: 'rgba(255,255,255,0.50)' },
                { label: 'Saque Z6',   onClick: () => handlePlayerAction('serve', { targetZone: 6, result: 'in' }),    color: 'rgba(255,255,255,0.50)' },
              ].map(({ label, onClick, color }) => (
                <button key={label} onClick={onClick}
                  className="px-3 py-2 rounded border border-white/[0.08] text-[12px] hover:border-white/20 hover:bg-white/[0.04] transition-colors text-left"
                  style={{ color }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Recepciones */}
          <div>
            <p className="text-label text-white/40 mb-2">RECEPCIONES</p>
            <div className="grid grid-cols-4 gap-2">
              {[3, 2, 1, 0].map((q) => (
                <button key={q} onClick={() => handlePlayerAction('receive', { quality: q })}
                  className="py-2 rounded border text-[12px] text-center transition-colors"
                  style={{
                    color: q === 3 ? '#91FFB0' : q === 2 ? '#FFD391' : q === 1 ? '#FFD391' : '#FF919F',
                    borderColor: q === 3 ? 'rgba(145,255,176,0.20)' : q === 2 ? 'rgba(255,211,145,0.20)' : q === 1 ? 'rgba(255,211,145,0.20)' : 'rgba(255,145,159,0.20)',
                    backgroundColor: q === 3 ? 'rgba(145,255,176,0.06)' : q === 2 ? 'rgba(255,211,145,0.06)' : q === 1 ? 'rgba(255,211,145,0.06)' : 'rgba(255,145,159,0.06)',
                  }}>
                  {q}/3
                </button>
              ))}
            </div>
          </div>

          {/* Colocaciones */}
          <div>
            <p className="text-label text-white/40 mb-2">COLOCACIONES</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Rápida A', onClick: () => handlePlayerAction('set', { play: 'A', toPlayerId: 'central' }) },
                { label: 'Alto 4',  onClick: () => handlePlayerAction('set', { play: 'high', toPlayerId: 'banda' }) },
                { label: 'Pipe',    onClick: () => handlePlayerAction('set', { play: 'pipe', toPlayerId: 'zaguero' }) },
              ].map(({ label, onClick }) => (
                <button key={label} onClick={onClick}
                  className="py-2 rounded border border-white/[0.08] text-[12px] text-white/50 hover:text-white/80 hover:border-white/20 hover:bg-white/[0.04] transition-colors">
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Ataques */}
          <div>
            <p className="text-label text-white/40 mb-2">ATAQUES</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Kill Z4',    onClick: () => handlePlayerAction('attack', { fromZone: 4, result: 'kill' }),    color: '#91FFB0' },
                { label: 'Kill Z3',    onClick: () => handlePlayerAction('attack', { fromZone: 3, result: 'kill' }),    color: '#91FFB0' },
                { label: 'Bloqueado',  onClick: () => handlePlayerAction('attack', { fromZone: 4, result: 'blocked' }), color: '#FF919F' },
                { label: 'Error',      onClick: () => handlePlayerAction('attack', { fromZone: 4, result: 'error' }),   color: '#FF919F' },
              ].map(({ label, onClick, color }) => (
                <button key={label} onClick={onClick}
                  className="px-3 py-2 rounded border border-white/[0.08] text-[12px] hover:border-white/20 hover:bg-white/[0.04] transition-colors"
                  style={{ color }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Defensas */}
          <div>
            <p className="text-label text-white/40 mb-2">DEFENSAS</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Bloqueo Punto', onClick: () => handlePlayerAction('block', { result: 'point' }), color: '#91FFB0' },
                { label: 'Defensa',       onClick: () => handlePlayerAction('dig', { result: 'good' }),    color: '#91CAFF' },
                { label: 'Error Def.',    onClick: () => handlePlayerAction('dig', { result: 'error' }),   color: '#FF919F' },
              ].map(({ label, onClick, color }) => (
                <button key={label} onClick={onClick}
                  className="py-2 rounded border border-white/[0.08] text-[12px] hover:border-white/20 hover:bg-white/[0.04] transition-colors"
                  style={{ color }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reset */}
      <div className="px-5 py-3 border-t border-white/[0.06]">
        <button onClick={resetCapture}
          className="w-full py-2 text-label text-white/30 hover:text-white/60 border border-white/[0.06] hover:border-white/[0.12] rounded transition-colors">
          Limpiar Selección
        </button>
      </div>
    </div>
  );
}
