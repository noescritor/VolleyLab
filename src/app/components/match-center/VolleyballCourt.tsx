import React, { useState, useRef, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { RotateCcw, Target, Users, ArrowRight, CheckCircle, RefreshCcw, ArrowRightLeft } from 'lucide-react';
import { VolleyballMatch, VolleyballSet, Rotation, Team_Legacy as Team, Position } from '../../utils/match-types';
import { toast } from 'sonner@2.0.3';

interface VolleyballCourtProps {
  match: VolleyballMatch;
  currentSet: VolleyballSet | null;
  onRotationChange: (localRotation: Rotation, visitaRotation: Rotation, servingTeam: Team) => void;
  onSubstitutionRequest?: (team: Team, position: Position) => void;
  isRallyActive?: boolean;
}

export function VolleyballCourt({
  match,
  currentSet,
  onRotationChange,
  onSubstitutionRequest,
  isRallyActive = false
}: VolleyballCourtProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPlayer, setDraggedPlayer] = useState<string | null>(null);
  const [tempLocalRotation, setTempLocalRotation] = useState<Rotation | null>(null);
  const [tempVisitaRotation, setTempVisitaRotation] = useState<Rotation | null>(null);
  const [servingTeam, setServingTeam] = useState<Team>('local');
  const [isSetupMode, setIsSetupMode] = useState(true);
  const [rotationAnimating, setRotationAnimating] = useState<Team | null>(null);
  const [hoveredPosition, setHoveredPosition] = useState<{team: Team, position: Position} | null>(null);

  useEffect(() => {
    if (currentSet) {
      setTempLocalRotation(currentSet.currentRotationLocal);
      setTempVisitaRotation(currentSet.currentRotationVisita);
      setServingTeam(currentSet.serverTeam);
      setIsSetupMode(false);
    } else {
      setIsSetupMode(true);
      setTempLocalRotation(null);
      setTempVisitaRotation(null);
    }
  }, [currentSet]);

  const prevScoreRef = useRef<{local: number, visita: number} | null>(null);
  const prevServingTeamRef = useRef<Team | null>(null);

  useEffect(() => {
    if (currentSet && prevScoreRef.current && prevServingTeamRef.current) {
      const scoreChanged =
        currentSet.scoreLocal !== prevScoreRef.current.local ||
        currentSet.scoreVisita !== prevScoreRef.current.visita;
      const servingTeamChanged = currentSet.serverTeam !== prevServingTeamRef.current;
      if (scoreChanged && servingTeamChanged) {
        setRotationAnimating(currentSet.serverTeam);
        toast.success(`¡Rotación! ${currentSet.serverTeam === 'local' ? match.localTeam : match.visitaTeam} recupera el saque`);
        setTimeout(() => setRotationAnimating(null), 2000);
      }
    }
    if (currentSet) {
      prevScoreRef.current = { local: currentSet.scoreLocal, visita: currentSet.scoreVisita };
      prevServingTeamRef.current = currentSet.serverTeam;
    }
  }, [currentSet?.scoreLocal, currentSet?.scoreVisita, currentSet?.serverTeam, match.localTeam, match.visitaTeam]);

  const handleDragStart = (playerId: string) => { setIsDragging(true); setDraggedPlayer(playerId); };
  const handleDragEnd = () => { setIsDragging(false); setDraggedPlayer(null); };

  const handlePositionClick = (position: Position, team: Team) => {
    if (!draggedPlayer) return;
    const isLocalPlayer = match.localPlayers.some(p => p.id === draggedPlayer);
    if ((team === 'local' && !isLocalPlayer) || (team === 'visita' && isLocalPlayer)) {
      toast.error('No puedes colocar jugadores en el equipo contrario');
      return;
    }
    if (team === 'local' && tempLocalRotation) {
      const newRotation = [...tempLocalRotation] as Rotation;
      newRotation[position - 1] = draggedPlayer;
      setTempLocalRotation(newRotation);
    } else if (team === 'visita' && tempVisitaRotation) {
      const newRotation = [...tempVisitaRotation] as Rotation;
      newRotation[position - 1] = draggedPlayer;
      setTempVisitaRotation(newRotation);
    }
    handleDragEnd();
  };

  const handleSubstitutionClick = (team: Team, position: Position, event: React.MouseEvent) => {
    event.stopPropagation();
    if (isRallyActive) { toast.error('No se pueden hacer cambios durante un rally'); return; }
    if (onSubstitutionRequest) onSubstitutionRequest(team, position);
  };

  const handleApplyRotations = () => {
    if (!tempLocalRotation || !tempVisitaRotation) {
      toast.error('Configura las rotaciones de ambos equipos');
      return;
    }
    onRotationChange(tempLocalRotation, tempVisitaRotation, servingTeam);
    setIsSetupMode(false);
    toast.success('¡Rotaciones configuradas! El partido puede comenzar.');
  };

  const getPlayerById = (playerId: string) =>
    [...match.localPlayers, ...match.visitaPlayers].find(p => p.id === playerId);

  const getGridArea = (position: Position, team: Team): string => {
    if (team === 'local') {
      switch (position) {
        case 1: return 'local-back-right';
        case 2: return 'local-back-center';
        case 3: return 'local-back-left';
        case 4: return 'local-front-left';
        case 5: return 'local-front-center';
        case 6: return 'local-front-right';
        default: return 'local-back-right';
      }
    } else {
      switch (position) {
        case 1: return 'visita-back-right';
        case 2: return 'visita-back-center';
        case 3: return 'visita-back-left';
        case 4: return 'visita-front-left';
        case 5: return 'visita-front-center';
        case 6: return 'visita-front-right';
        default: return 'visita-back-right';
      }
    }
  };

  const renderCourtPosition = (position: Position, team: Team, rotation: Rotation | null) => {
    const playerId = rotation?.[position - 1];
    const player = playerId ? getPlayerById(playerId) : null;
    const isServer = currentSet && currentSet.serverTeam === team && position === 1;
    const isRotatingTeam = rotationAnimating === team;
    const isHovered = hoveredPosition?.team === team && hoveredPosition?.position === position;
    const canSubstitute = !isSetupMode && !isRallyActive && player && onSubstitutionRequest;
    const canSelectForCapture = !isSetupMode && isRallyActive && player;

    let borderColor = 'rgba(255,255,255,0.10)';
    let bgColor = 'rgba(255,255,255,0.02)';
    if (draggedPlayer) { borderColor = 'rgba(161,145,255,0.30)'; bgColor = 'rgba(161,145,255,0.06)'; }
    if (player) { borderColor = 'rgba(255,255,255,0.12)'; bgColor = 'rgba(255,255,255,0.04)'; }
    if (isServer) { borderColor = 'rgba(255,211,145,0.40)'; bgColor = 'rgba(255,211,145,0.08)'; }
    if (isRotatingTeam) { borderColor = 'rgba(145,255,176,0.40)'; bgColor = 'rgba(145,255,176,0.08)'; }
    if (isHovered && canSubstitute) { borderColor = 'rgba(161,145,255,0.40)'; bgColor = 'rgba(161,145,255,0.08)'; }

    return (
      <div
        key={`${team}-${position}`}
        className="relative flex flex-col items-center justify-center cursor-pointer transition-all duration-300 rounded border m-0.5 h-14 group"
        style={{ gridArea: getGridArea(position, team), zIndex: isServer ? 20 : 10, borderColor, backgroundColor: bgColor }}
        onClick={() => canSelectForCapture ? null : handlePositionClick(position, team)}
        onMouseEnter={() => setHoveredPosition({team, position})}
        onMouseLeave={() => setHoveredPosition(null)}
      >
        {player ? (
          <>
            <p className="text-[11px] text-white/80 font-medium text-center leading-none">
              {player.name.split(' ')[0].substring(0, 5)}
            </p>
            <p className="text-[10px] text-white/35 leading-none mt-0.5 font-mono">#{player.number}</p>

            {isServer && (
              <div className="absolute -top-1 -left-1 z-20">
                <Target className="h-3 w-3 animate-bounce" style={{ color: '#FFD391' }} />
              </div>
            )}
            {isRotatingTeam && (
              <div className="absolute -bottom-1 -left-1 z-20">
                <RefreshCcw className="h-3 w-3 animate-spin" style={{ color: '#91FFB0' }} />
              </div>
            )}
            {canSelectForCapture && (
              <div className="absolute -top-1 -right-1 z-20">
                <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: '#A191FF' }} />
              </div>
            )}
            {canSubstitute && isHovered && (
              <div className="absolute -top-2 -right-2 opacity-100 z-30">
                <button
                  className="w-5 h-5 rounded-full flex items-center justify-center text-black transition-colors"
                  style={{ backgroundColor: '#91CAFF' }}
                  onClick={(e) => handleSubstitutionClick(team, position, e)}
                  title="Hacer substitución"
                >
                  <ArrowRightLeft className="h-2.5 w-2.5" />
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-[12px] text-white/20">{position}</p>
            <p className="text-[9px] text-white/15">{team}</p>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {/* Setup controls */}
      {isSetupMode && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-5 py-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Users size={13} className="text-[#A191FF]" />
            <p className="text-[13px] font-semibold text-white">Configurar Rotaciones</p>
          </div>

          <div>
            <p className="text-label text-white/40 mb-1.5">Equipo que saca:</p>
            <Select value={servingTeam} onValueChange={(value: Team) => setServingTeam(value)}>
              <SelectTrigger className="h-9 text-[13px] bg-white/[0.04] border-white/[0.08] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/[0.08]">
                <SelectItem value="local" className="text-[13px] text-white/70">{match.localTeam}</SelectItem>
                <SelectItem value="visita" className="text-[13px] text-white/70">{match.visitaTeam}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <button onClick={handleApplyRotations}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#A191FF] hover:bg-[#B8ADFF] text-black text-label font-semibold rounded-lg transition-colors">
            <CheckCircle size={13} /> Iniciar Partido
          </button>

          <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded text-[11px] text-white/40 space-y-0.5">
            <p>• Arrastra jugadores a las posiciones 1–6</p>
            <p>• El jugador en posición 1 será el servidor</p>
            <p>• Las rotaciones serán automáticas</p>
          </div>
        </div>
      )}

      {/* Court */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2">
        <div className="relative w-full aspect-[4/5] mx-auto rounded-lg overflow-hidden"
          style={{ backgroundColor: '#0a0a12', border: '1px solid rgba(255,255,255,0.06)' }}>

          {/* Net */}
          <div className="absolute w-full h-0.5 top-1/2 -translate-y-px z-40"
            style={{ backgroundColor: 'rgba(255,255,255,0.30)' }} />

          {/* Team labels */}
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-50">
            <span className="text-label px-2 py-0.5 rounded"
              style={{ color: '#FF919F', backgroundColor: 'rgba(255,145,159,0.10)' }}>
              {match.visitaTeam}
            </span>
          </div>
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-50">
            <span className="text-label px-2 py-0.5 rounded"
              style={{ color: '#A191FF', backgroundColor: 'rgba(161,145,255,0.10)' }}>
              {match.localTeam}
            </span>
          </div>

          {/* Grid */}
          <div className="absolute inset-4 grid grid-cols-3 grid-rows-4 gap-0.5"
            style={{
              gridTemplateAreas: `
                "visita-back-left visita-back-center visita-back-right"
                "visita-front-left visita-front-center visita-front-right"
                "local-front-left local-front-center local-front-right"
                "local-back-left local-back-center local-back-right"
              `
            }}>
            {[1, 2, 3, 4, 5, 6].map(pos => renderCourtPosition(pos as Position, 'visita', tempVisitaRotation))}
            {[1, 2, 3, 4, 5, 6].map(pos => renderCourtPosition(pos as Position, 'local', tempLocalRotation))}
          </div>

          {/* Score overlay */}
          {currentSet && (
            <div className="absolute top-3 right-3 z-50">
              <div className="px-2 py-1 rounded text-[12px] font-mono font-bold text-white"
                style={{ backgroundColor: 'rgba(0,0,0,0.70)' }}>
                {currentSet.scoreLocal}–{currentSet.scoreVisita}
              </div>
            </div>
          )}

          {/* Rally indicator */}
          {isRallyActive && (
            <div className="absolute bottom-3 right-3 z-50">
              <span className="text-label px-2 py-1 rounded animate-pulse"
                style={{ color: '#FF919F', backgroundColor: 'rgba(255,145,159,0.15)' }}>
                Rally Activo
              </span>
            </div>
          )}

          {/* Rotation animation */}
          {rotationAnimating && (
            <div className="absolute inset-0 pointer-events-none z-60 flex items-center justify-center">
              <div className="px-3 py-2 rounded-lg text-[13px] font-medium animate-bounce"
                style={{ backgroundColor: 'rgba(145,255,176,0.20)', color: '#91FFB0', border: '1px solid rgba(145,255,176,0.30)' }}>
                ¡Rotación {rotationAnimating === 'local' ? match.localTeam : match.visitaTeam}!
              </div>
            </div>
          )}

          {/* Substitution hint */}
          {!isSetupMode && !isRallyActive && onSubstitutionRequest && (
            <div className="absolute bottom-3 left-3 z-50">
              <span className="text-[10px] font-mono text-white/25">Hover para cambios</span>
            </div>
          )}
        </div>
      </div>

      {/* Player lists */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: match.localTeam,  players: match.localPlayers,  rotation: tempLocalRotation  },
          { label: match.visitaTeam, players: match.visitaPlayers, rotation: tempVisitaRotation },
        ].map(({ label, players, rotation }) => (
          <div key={label} className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2">
            <p className="text-label text-white/40 text-center mb-2">{label}</p>
            <div className="space-y-1 max-h-28 overflow-y-auto">
              {players.slice(0, 6).map((player) => {
                const rotPos = rotation?.indexOf(player.id);
                const inRotation = rotPos !== undefined && rotPos >= 0;
                return (
                  <div key={player.id}
                    className={`p-1.5 rounded border cursor-move transition-all ${draggedPlayer === player.id ? 'opacity-40' : ''}`}
                    style={{
                      borderColor: inRotation ? 'rgba(145,255,176,0.20)' : 'rgba(255,255,255,0.06)',
                      backgroundColor: inRotation ? 'rgba(145,255,176,0.05)' : 'rgba(255,255,255,0.02)',
                    }}
                    draggable
                    onDragStart={() => handleDragStart(player.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="flex items-center justify-between">
                      <div className="truncate">
                        <p className="text-[11px] text-white/70 font-medium">{player.name.split(' ')[0]}</p>
                        <p className="text-[10px] text-white/30 font-mono">#{player.number} · {player.position}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {inRotation && (
                          <span className="text-[10px] font-mono px-1 rounded"
                            style={{ color: '#91FFB0', backgroundColor: 'rgba(145,255,176,0.10)' }}>
                            {rotPos + 1}
                          </span>
                        )}
                        <div className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: player.isActive ? '#91FFB0' : 'rgba(255,255,255,0.15)' }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Match status */}
      {!isSetupMode && currentSet && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-3 text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <p className="text-[12px] text-white/60">
              Sirve: <strong className="text-white/80">{currentSet.serverTeam === 'local' ? match.localTeam : match.visitaTeam}</strong>
            </p>
            {rotationAnimating && <RefreshCcw size={12} className="animate-spin" style={{ color: '#91FFB0' }} />}
          </div>
          <p className="text-[11px] text-white/30 font-mono">Set {currentSet.number} · Rally #{currentSet.rallies.length + 1}</p>
          {currentSet.substitutions.length > 0 && (
            <p className="text-[11px]" style={{ color: '#91CAFF' }}>{currentSet.substitutions.length} substituciones</p>
          )}
        </div>
      )}
    </div>
  );
}
