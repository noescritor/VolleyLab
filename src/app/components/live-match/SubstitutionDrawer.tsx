import React, { useState } from 'react';
import { X, RotateCcw, Users, AlertCircle } from 'lucide-react';
import { cn } from '../ui/utils';

interface Player {
  id: string;
  name: string;
  number: number;
  position: string;
  isLibero?: boolean;
}

interface Substitution {
  id: string;
  fromPlayer: Player;
  toPlayer: Player;
  minute: number;
  point: number;
  isLibero: boolean;
}

interface SubstitutionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  courtPlayers: (Player | null)[];
  benchPlayers: Player[];
  substitutionHistory: Substitution[];
  substitutionsLeft: number;
  onSubstitution: (fromPlayerId: string, toPlayerId: string, position: number, isLibero?: boolean) => void;
  onLiberoToggle: (isEntering: boolean, playerId?: string) => void;
  onRevertLastSubstitution: () => void;
  className?: string;
}

export function SubstitutionDrawer({
  isOpen,
  onClose,
  courtPlayers,
  benchPlayers,
  substitutionHistory,
  substitutionsLeft,
  onSubstitution,
  onLiberoToggle,
  onRevertLastSubstitution,
  className
}: SubstitutionDrawerProps) {
  const [draggedPlayer, setDraggedPlayer] = useState<Player | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<number | null>(null);

  const handleDragStart = (player: Player) => setDraggedPlayer(player);

  const handleDragOver = (e: React.DragEvent, position: number) => {
    e.preventDefault();
    setDragOverPosition(position);
  };

  const handleDragLeave = () => setDragOverPosition(null);

  const handleDrop = (e: React.DragEvent, position: number) => {
    e.preventDefault();
    setDragOverPosition(null);
    if (!draggedPlayer) return;
    const currentPlayer = courtPlayers[position];
    if (currentPlayer) onSubstitution(currentPlayer.id, draggedPlayer.id, position);
    setDraggedPlayer(null);
  };

  const liberoPlayer = courtPlayers.find(p => p?.isLibero);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />

      <div className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-[#0d0d0d] border-t border-white/[0.08] rounded-t-xl flex flex-col",
        className
      )} style={{ height: '70vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-[#A191FF]" />
            <p className="text-[15px] font-semibold text-white">Sustituciones</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-label px-2.5 py-0.5 rounded-full border"
              style={substitutionsLeft > 0
                ? { color: '#91FFB0', backgroundColor: 'rgba(145,255,176,0.08)', borderColor: 'rgba(145,255,176,0.20)' }
                : { color: '#FF919F', backgroundColor: 'rgba(255,145,159,0.08)', borderColor: 'rgba(255,145,159,0.20)' }}>
              {substitutionsLeft} restantes
            </span>
            <button onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded border border-white/[0.08] text-white/40 hover:text-white/70 transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 min-h-0">

          {/* Court positions */}
          <div>
            <p className="text-label text-white/40 mb-3">CANCHA (P1–P6)</p>
            <div className="grid grid-cols-3 gap-2">
              {[3, 2, 1, 4, 5, 6].map((position) => {
                const player = courtPlayers[position - 1];
                const isOver = dragOverPosition === position - 1;
                return (
                  <div
                    key={position}
                    className={cn(
                      "relative p-3 border-2 border-dashed rounded-lg min-h-16 flex flex-col items-center justify-center transition-colors",
                    )}
                    style={{
                      borderColor: isOver ? '#A191FF' : 'rgba(255,255,255,0.10)',
                      backgroundColor: isOver ? 'rgba(161,145,255,0.08)' : 'rgba(255,255,255,0.02)',
                    }}
                    onDragOver={(e) => handleDragOver(e, position - 1)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, position - 1)}
                  >
                    <div className="absolute top-1 left-1.5 text-[10px] font-mono text-white/25">P{position}</div>
                    {player ? (
                      <div className="text-center">
                        <p className="text-[13px] text-white font-medium">{player.name}</p>
                        <p className="text-[11px] text-white/40">#{player.number}</p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-white/20">Vacío</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Libero */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-label text-white/40">LÍBERO</p>
              <div className="flex gap-2">
                <button
                  onClick={() => onLiberoToggle(true)}
                  disabled={!!liberoPlayer}
                  className="px-3 py-1 rounded border text-label text-white/40 hover:text-white/70 border-white/[0.08] hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                  Líbero In
                </button>
                <button
                  onClick={() => onLiberoToggle(false)}
                  disabled={!liberoPlayer}
                  className="px-3 py-1 rounded border text-label text-white/40 hover:text-white/70 border-white/[0.08] hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                  Líbero Out
                </button>
              </div>
            </div>
            <div className="p-3 border rounded-lg flex items-center justify-center min-h-14"
              style={{ borderColor: 'rgba(255,211,145,0.25)', backgroundColor: 'rgba(255,211,145,0.06)' }}>
              {liberoPlayer ? (
                <div className="text-center">
                  <p className="text-[13px] text-white font-medium">{liberoPlayer.name}</p>
                  <p className="text-[11px]" style={{ color: '#FFD391' }}>#{liberoPlayer.number} (L)</p>
                </div>
              ) : (
                <p className="text-[12px] text-white/30">Sin líbero en cancha</p>
              )}
            </div>
          </div>

          {/* Bench */}
          <div>
            <p className="text-label text-white/40 mb-3">BANCA</p>
            <div className="grid grid-cols-2 gap-2">
              {benchPlayers.map((player) => (
                <div
                  key={player.id}
                  draggable
                  onDragStart={() => handleDragStart(player)}
                  className={cn(
                    "p-3 bg-white/[0.03] border border-white/[0.08] rounded-lg cursor-move",
                    "hover:bg-white/[0.05] hover:border-white/20 transition-colors",
                    "flex items-center justify-between"
                  )}
                >
                  <div>
                    <p className="text-[13px] text-white font-medium">{player.name}</p>
                    <p className="text-[11px] text-white/40">#{player.number} {player.position}</p>
                  </div>
                  {player.isLibero && (
                    <span className="text-label px-1.5 py-0.5 rounded"
                      style={{ color: '#FFD391', backgroundColor: 'rgba(255,211,145,0.10)' }}>L</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* History */}
          {substitutionHistory.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-label text-white/40">HISTORIAL</p>
                <button onClick={onRevertLastSubstitution}
                  className="flex items-center gap-1.5 px-3 py-1 rounded border border-white/[0.08] text-label text-white/40 hover:text-white/70 hover:border-white/20 transition-colors">
                  <RotateCcw size={11} /> Revertir
                </button>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {substitutionHistory.slice(-5).reverse().map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between px-3 py-2 bg-white/[0.02] border border-white/[0.06] rounded">
                    <p className="text-[12px] text-white/70">
                      <span className="text-white">{sub.toPlayer.name}</span>
                      <span className="text-white/30"> → </span>
                      <span className="text-white">{sub.fromPlayer.name}</span>
                      {sub.isLibero && <span className="ml-1 text-label" style={{ color: '#FFD391' }}>L</span>}
                    </p>
                    <p className="text-[11px] text-white/25 font-mono">{sub.minute}' · {sub.point}pts</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {substitutionsLeft === 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg border"
              style={{ backgroundColor: 'rgba(255,211,145,0.06)', borderColor: 'rgba(255,211,145,0.20)' }}>
              <AlertCircle size={14} style={{ color: '#FFD391' }} />
              <span className="text-[12px]" style={{ color: '#FFD391' }}>No quedan sustituciones disponibles</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[0.06] shrink-0">
          <button onClick={onClose}
            className="w-full px-4 py-2.5 text-label text-white/40 hover:text-white border border-white/[0.08] hover:border-white/20 rounded-lg transition-colors">
            Cerrar
          </button>
          <p className="text-[11px] text-white/20 text-center mt-2 font-mono uppercase tracking-wide">
            Arrastra jugadores de la banca a las posiciones
          </p>
        </div>
      </div>
    </>
  );
}

export default SubstitutionDrawer;
