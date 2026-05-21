import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Users, UserPlus, Settings, Play, Trash2, Star, Crown, Database, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Player, VolleyballMatch } from '../../utils/match-types';
import { useApp } from '../../utils/AppContext';

interface TeamSetupProps {
  onMatchConfigured: (match: VolleyballMatch) => void;
  initialMatch?: VolleyballMatch | null;
}

interface TeamData {
  name: string;
  players: Player[];
  startingLineup: string[];
}

const POSITIONS = [
  { value: 'Punta',     label: 'Punta (OH)'     },
  { value: 'Central',   label: 'Central (MB)'   },
  { value: 'Colocador', label: 'Colocador (S)'  },
  { value: 'Opuesto',   label: 'Opuesto (OP)'   },
  { value: 'Líbero',    label: 'Líbero (L)'     }
];

const INPUT_CLS = 'w-full bg-white/[0.04] border border-white/[0.08] rounded px-3 py-2.5 text-[13px] text-white placeholder:text-white/20 focus:outline-none focus:border-[#A191FF]/50 transition-colors';
const LABEL_CLS = 'block text-[11px] font-mono uppercase tracking-wide text-white/40 mb-1';

export function TeamSetup({ onMatchConfigured, initialMatch }: TeamSetupProps) {
  const { state } = useApp();

  const [isOpen, setIsOpen] = useState(!initialMatch);
  const [localTeam, setLocalTeam] = useState<TeamData>({
    name: initialMatch?.localTeam || 'Nuestro Equipo',
    players: initialMatch?.localPlayers || [],
    startingLineup: initialMatch?.sets[0]?.startRotationLocal || []
  });
  const [visitaTeam, setVisitaTeam] = useState<TeamData>({
    name: initialMatch?.visitaTeam || 'Equipo Rival',
    players: initialMatch?.visitaPlayers || [],
    startingLineup: initialMatch?.sets[0]?.startRotationVisita || []
  });

  const [currentTeam, setCurrentTeam] = useState<'local' | 'visita'>('local');
  const [newPlayer, setNewPlayer] = useState({ name: '', number: '', position: '' });
  const [isPlayerSelectOpen, setIsPlayerSelectOpen] = useState(false);
  const [selectedDbPlayers, setSelectedDbPlayers] = useState<string[]>([]);

  const getCurrentTeamData = () => currentTeam === 'local' ? localTeam : visitaTeam;
  const setCurrentTeamData = (data: TeamData) =>
    currentTeam === 'local' ? setLocalTeam(data) : setVisitaTeam(data);

  const loadPlayersFromDatabase = () => {
    if (!state.players || state.players.length === 0) {
      toast.error('No hay jugadores registrados en la base de datos.');
      return;
    }
    const existingNumbers = getCurrentTeamData().players.map(p => p.number);
    const available = state.players.filter(p => !existingNumbers.includes(p.number));
    if (available.length === 0) {
      toast.error('Todos los jugadores de la base de datos ya están en este equipo.');
      return;
    }
    setSelectedDbPlayers([]);
    setIsPlayerSelectOpen(true);
  };

  const addSelectedPlayersFromDB = () => {
    if (selectedDbPlayers.length === 0) { toast.error('Selecciona al menos un jugador'); return; }
    const currentData = getCurrentTeamData();
    const playersToAdd = state.players
      .filter(p => selectedDbPlayers.includes(p.id))
      .map(p => ({ ...p, id: `${currentTeam}-${p.id}-${Date.now()}`, isActive: true }));
    setCurrentTeamData({ ...currentData, players: [...currentData.players, ...playersToAdd] });
    setIsPlayerSelectOpen(false);
    setSelectedDbPlayers([]);
    toast.success(`${playersToAdd.length} jugador(es) agregado(s)`);
  };

  const toggleDbPlayerSelection = (playerId: string) =>
    setSelectedDbPlayers(prev => prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]);

  const addPlayer = () => {
    if (!newPlayer.name || !newPlayer.number || !newPlayer.position) {
      toast.error('Completa todos los campos del jugador');
      return;
    }
    const currentData = getCurrentTeamData();
    if (currentData.players.some(p => p.number === parseInt(newPlayer.number))) {
      toast.error('Ya existe un jugador con ese número');
      return;
    }
    const player: Player = {
      id: `${currentTeam}-${Date.now()}`,
      name: newPlayer.name,
      number: parseInt(newPlayer.number),
      position: newPlayer.position as any,
      isLibero: newPlayer.position === 'Líbero',
      isActive: true
    };
    setCurrentTeamData({ ...currentData, players: [...currentData.players, player] });
    setNewPlayer({ name: '', number: '', position: '' });
    toast.success(`${player.name} #${player.number} agregado`);
  };

  const removePlayer = (playerId: string) => {
    const currentData = getCurrentTeamData();
    setCurrentTeamData({
      ...currentData,
      players: currentData.players.filter(p => p.id !== playerId),
      startingLineup: currentData.startingLineup.filter(id => id !== playerId)
    });
  };

  const toggleStartingLineup = (playerId: string) => {
    const currentData = getCurrentTeamData();
    const player = currentData.players.find(p => p.id === playerId);
    if (!player) return;

    if (currentData.startingLineup.includes(playerId)) {
      setCurrentTeamData({ ...currentData, startingLineup: currentData.startingLineup.filter(id => id !== playerId) });
    } else {
      if (currentData.startingLineup.length >= 6) { toast.error('El cuadro inicial solo puede tener 6 jugadores'); return; }
      if (player.isLibero && currentData.startingLineup.some(id => currentData.players.find(pl => pl.id === id)?.isLibero)) {
        toast.error('Solo puede haber un líbero en el cuadro inicial');
        return;
      }
      setCurrentTeamData({ ...currentData, startingLineup: [...currentData.startingLineup, playerId] });
    }
  };

  const validateTeams = (): string | null => {
    if (!localTeam.name.trim() || !visitaTeam.name.trim()) return 'Ambos equipos deben tener nombre';
    if (localTeam.players.length < 6 || visitaTeam.players.length < 6) return 'Cada equipo debe tener al menos 6 jugadores';
    if (localTeam.startingLineup.length !== 6 || visitaTeam.startingLineup.length !== 6) return 'Cada equipo debe tener exactamente 6 jugadores en el cuadro inicial';
    const localHasLibero = localTeam.startingLineup.some(id => localTeam.players.find(p => p.id === id)?.isLibero);
    const visitaHasLibero = visitaTeam.startingLineup.some(id => visitaTeam.players.find(p => p.id === id)?.isLibero);
    if (!localHasLibero || !visitaHasLibero) return 'Cada equipo debe tener un líbero en el cuadro inicial';
    return null;
  };

  const createMatch = () => {
    const validation = validateTeams();
    if (validation) { toast.error(validation); return; }

    const match: VolleyballMatch = {
      id: `match-${Date.now()}`,
      date: new Date().toISOString(),
      localTeam: localTeam.name.trim(),
      visitaTeam: visitaTeam.name.trim(),
      setsToWin: 3,
      currentSet: 1,
      state: 'playing',
      localPlayers: localTeam.players,
      visitaPlayers: visitaTeam.players,
      sets: [{
        id: 'set-1',
        matchId: `match-${Date.now()}`,
        number: 1,
        startRotationLocal: localTeam.startingLineup,
        startRotationVisita: visitaTeam.startingLineup,
        currentRotationLocal: localTeam.startingLineup,
        currentRotationVisita: visitaTeam.startingLineup,
        serverTeam: 'local',
        serverPlayerId: localTeam.startingLineup[0],
        scoreLocal: 0,
        scoreVisita: 0,
        setsWonLocal: 0,
        setsWonVisita: 0,
        rallies: [],
        substitutions: [],
        timeouts: [],
        cards: [],
        startedAt: Date.now(),
        endedAt: undefined,
        winner: undefined
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onMatchConfigured(match);
    setIsOpen(false);
    toast.success('¡Partido configurado! Listo para comenzar.');
  };

  const teamData = getCurrentTeamData();
  const startingPlayers = teamData.startingLineup.map(id => teamData.players.find(p => p.id === id)!).filter(Boolean);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-white/[0.08] text-label text-white/40 hover:text-white/70 hover:border-white/20 transition-colors">
        <Settings size={12} /> Configurar Equipos
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-[92vh] flex flex-col bg-[#0d0d0d] border border-white/[0.08] rounded-lg shadow-2xl overflow-hidden p-0">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-[#A191FF]" />
              <h2 className="text-[15px] font-semibold text-white">Configuración de Equipos</h2>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5 space-y-6">
            {/* Team tabs */}
            <div className="border-b border-white/[0.06] flex gap-0">
              {[
                { key: 'local',  label: localTeam.name,  color: '#A191FF' },
                { key: 'visita', label: visitaTeam.name, color: '#FF919F' },
              ].map(({ key, label, color }) => (
                <button key={key}
                  onClick={() => setCurrentTeam(key as any)}
                  className={`flex items-center gap-2 px-4 py-3 text-label border-b-2 transition-colors ${
                    currentTeam === key ? 'border-[#A191FF] text-[#A191FF]' : 'border-transparent text-white/30 hover:text-white/60'
                  }`}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  {label}
                </button>
              ))}
            </div>

            {/* Team name + stats */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-5 py-4 space-y-4">
              <div>
                <label className={LABEL_CLS}>Nombre del Equipo</label>
                <input
                  className={INPUT_CLS}
                  value={teamData.name}
                  onChange={(e) => setCurrentTeamData({ ...teamData, name: e.target.value })}
                  placeholder="Nombre del equipo"
                />
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { value: teamData.players.length,        label: 'Convocados' },
                  { value: teamData.startingLineup.length, label: 'Titulares'  },
                  { value: teamData.players.filter(p => p.isLibero).length, label: 'Líberos' },
                ].map(({ value, label }) => (
                  <div key={label} className="bg-white/[0.03] border border-white/[0.06] rounded-lg py-3">
                    <p className="text-[20px] font-bold font-mono text-white">{value}</p>
                    <p className="text-label text-white/25 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Add player */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-5 py-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserPlus size={13} className="text-[#91CAFF]" />
                  <p className="text-[13px] font-semibold text-white">Agregar Jugador</p>
                </div>
                <button
                  onClick={loadPlayersFromDatabase}
                  disabled={!state.players || state.players.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-white/[0.08] text-label text-white/40 hover:text-white/70 hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                  <Database size={11} /> Cargar desde BD ({state.players?.length || 0})
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className={LABEL_CLS}>Nombre</label>
                  <input className={INPUT_CLS} value={newPlayer.name}
                    onChange={(e) => setNewPlayer(p => ({ ...p, name: e.target.value }))}
                    placeholder="Nombre del jugador" />
                </div>
                <div>
                  <label className={LABEL_CLS}>Número</label>
                  <input className={INPUT_CLS} type="number" min="1" max="99" value={newPlayer.number}
                    onChange={(e) => setNewPlayer(p => ({ ...p, number: e.target.value }))}
                    placeholder="1-99" />
                </div>
                <div>
                  <label className={LABEL_CLS}>Posición</label>
                  <Select value={newPlayer.position} onValueChange={(v) => setNewPlayer(p => ({ ...p, position: v }))}>
                    <SelectTrigger className="h-10 text-[13px] bg-white/[0.04] border-white/[0.08] text-white">
                      <SelectValue placeholder="Posición" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-white/[0.08]">
                      {POSITIONS.map(pos => (
                        <SelectItem key={pos.value} value={pos.value} className="text-[13px] text-white/70">{pos.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <button onClick={addPlayer}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#A191FF] hover:bg-[#B8ADFF] text-black text-label font-semibold rounded-lg transition-colors">
                    <UserPlus size={12} /> Agregar
                  </button>
                </div>
              </div>
            </div>

            {/* Players list */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-5 py-4">
              <p className="text-[13px] font-semibold text-white mb-1">
                Jugadores Convocados ({teamData.players.length})
              </p>
              <p className="text-[12px] text-white/40 mb-4">Haz clic para agregar/quitar del cuadro inicial</p>

              {teamData.players.length === 0 ? (
                <div className="py-8 text-center text-[13px] text-white/20 border border-dashed border-white/[0.08] rounded-lg">
                  No hay jugadores. Agrega al menos 6 para iniciar.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {teamData.players.map(player => {
                    const isInStarting = teamData.startingLineup.includes(player.id);
                    const teamColor = currentTeam === 'local' ? { color: '#A191FF', bg: 'rgba(161,145,255,0.08)', border: 'rgba(161,145,255,0.25)' } : { color: '#FF919F', bg: 'rgba(255,145,159,0.08)', border: 'rgba(255,145,159,0.25)' };

                    return (
                      <div key={player.id}
                        className="p-3 rounded-lg border-2 cursor-pointer transition-all hover:opacity-90"
                        style={isInStarting
                          ? { borderColor: teamColor.border, backgroundColor: teamColor.bg }
                          : { borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}
                        onClick={() => toggleStartingLineup(player.id)}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-medium text-white">#{player.number}</span>
                              {isInStarting && <Crown size={11} style={{ color: '#FFD391' }} />}
                              {player.isLibero && <span className="text-label px-1.5 py-0.5 rounded"
                                style={{ color: '#FFD391', backgroundColor: 'rgba(255,211,145,0.10)' }}>L</span>}
                            </div>
                            <p className="text-[13px] text-white/80 mt-0.5">{player.name}</p>
                            <p className="text-[11px] text-white/40">{player.position}</p>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); removePlayer(player.id); }}
                            className="h-6 w-6 flex items-center justify-center rounded text-white/30 hover:text-[#FF919F] transition-colors">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Starting lineup */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-5 py-4">
              <div className="flex items-center gap-2 mb-4">
                <Star size={13} className="text-[#FFD391]" />
                <p className="text-[13px] font-semibold text-white">Cuadro Inicial ({startingPlayers.length}/6)</p>
              </div>

              {startingPlayers.length === 0 ? (
                <p className="text-center py-4 text-[13px] text-white/30">Selecciona 6 jugadores para el cuadro inicial</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {startingPlayers.map((player, index) => {
                    const teamColor = currentTeam === 'local' ? { color: '#A191FF', border: 'rgba(161,145,255,0.25)' } : { color: '#FF919F', border: 'rgba(255,145,159,0.25)' };
                    return (
                      <div key={player.id} className="p-3 rounded-lg border-2 text-center"
                        style={{ borderColor: teamColor.border, backgroundColor: 'rgba(255,255,255,0.02)' }}>
                        <p className="text-label text-white/30 mb-0.5">Pos. {index + 1}</p>
                        <p className="text-[14px] font-bold font-mono" style={{ color: teamColor.color }}>#{player.number}</p>
                        <p className="text-[11px] text-white/60 mt-0.5">{player.name.split(' ')[0]}</p>
                        <p className="text-label text-white/30 mt-1">{player.position}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Validation warning */}
            {validateTeams() && (
              <div className="p-3 rounded-lg border"
                style={{ backgroundColor: 'rgba(255,211,145,0.06)', borderColor: 'rgba(255,211,145,0.20)' }}>
                <p className="text-[12px]" style={{ color: '#FFD391' }}>
                  <strong>Pendiente:</strong> {validateTeams()}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/[0.06] shrink-0 flex gap-3">
            <button onClick={createMatch} disabled={validateTeams() !== null}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#A191FF] hover:bg-[#B8ADFF] text-black text-label font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <Play size={13} /> Iniciar Partido
            </button>
            <button onClick={() => setIsOpen(false)}
              className="px-4 py-2.5 text-label text-white/40 hover:text-white transition-colors">
              Cancelar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DB Player selection dialog */}
      <Dialog open={isPlayerSelectOpen} onOpenChange={setIsPlayerSelectOpen}>
        <DialogContent className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-[80vh] flex flex-col bg-[#0d0d0d] border border-white/[0.08] rounded-lg shadow-2xl overflow-hidden p-0">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
            <div className="flex items-center gap-2">
              <Database size={14} className="text-[#A191FF]" />
              <h2 className="text-[15px] font-semibold text-white">Seleccionar Jugadores</h2>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5">
            {state.players.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-white/20 border border-dashed border-white/[0.08] rounded-lg">
                No hay jugadores registrados en la base de datos.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {state.players.map(player => {
                  const isSelected = selectedDbPlayers.includes(player.id);
                  return (
                    <div key={player.id}
                      className="p-3 rounded-lg border-2 cursor-pointer transition-all hover:opacity-90"
                      style={isSelected
                        ? { borderColor: 'rgba(161,145,255,0.25)', backgroundColor: 'rgba(161,145,255,0.08)' }
                        : { borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}
                      onClick={() => toggleDbPlayerSelection(player.id)}>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-white">#{player.number}</span>
                        {player.isLibero && <span className="text-label px-1.5 py-0.5 rounded"
                          style={{ color: '#FFD391', backgroundColor: 'rgba(255,211,145,0.10)' }}>L</span>}
                      </div>
                      <p className="text-[13px] text-white/80 mt-0.5">{player.name}</p>
                      <p className="text-[11px] text-white/40">{player.position}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="px-6 py-4 border-t border-white/[0.06] shrink-0 flex gap-3">
            <button onClick={addSelectedPlayersFromDB} disabled={selectedDbPlayers.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#A191FF] hover:bg-[#B8ADFF] text-black text-label font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <Plus size={13} /> Agregar Seleccionados ({selectedDbPlayers.length})
            </button>
            <button onClick={() => setIsPlayerSelectOpen(false)}
              className="px-4 py-2.5 text-label text-white/40 hover:text-white transition-colors">
              Cancelar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
