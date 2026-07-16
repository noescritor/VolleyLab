import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Plus, TrendingUp, Target, Shield, Zap, Activity, Calendar, MapPin, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useApp } from '../utils/AppContext';
import { Player, Match } from '../utils/match-types';
import { AdvancedHeatmapDashboard } from './AdvancedHeatmapDashboard';

const INPUT_CLS = 'w-full bg-white/[0.04] border border-white/[0.08] rounded px-3 py-2.5 text-[13px] text-white placeholder:text-white/20 focus:outline-none focus:border-[#A191FF]/50 transition-colors';
const LABEL_CLS = 'block text-[11px] font-mono uppercase tracking-wide text-white/40 mb-1';

const CHART_TOOLTIP = {
  contentStyle: { background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6 },
  labelStyle:   { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  itemStyle:    { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
};

const POS_COLORS: Record<string, string> = {
  Opuesto: '#91CAFF', Punta: '#A191FF', Central: '#91FFB0', Colocador: '#FFD391', Líbero: '#FF919F'
};

const FUNDAM_COLOR: Record<string, string> = {
  attacks: '#A191FF', serves: '#91FFB0', reception: '#FFD391', blocks: '#91CAFF'
};

const positionKPIs: Record<string, string[]> = {
  Opuesto:   ['attacks', 'serves', 'blocks'],
  Punta:     ['attacks', 'serves', 'reception'],
  Central:   ['attacks', 'blocks', 'serves'],
  Colocador: ['serves'],
  Líbero:    ['reception'],
};

export function MatchAnalytics() {
  const { state, createMatch } = useApp();
  const [selectedMatch, setSelectedMatch]     = useState('');
  const [selectedFundament, setSelectedFundament] = useState('attacks');
  const [isDialogOpen, setIsDialogOpen]       = useState(false);

  const [newMatchForm, setNewMatchForm] = useState({
    opponent: '', date: '', time: '', venue: '', matchType: 'regular', notes: '', selectedPlayers: [] as any[]
  });

  React.useEffect(() => {
    if (state.matches?.length > 0 && !selectedMatch) setSelectedMatch(state.matches[0].id);
  }, [state.matches, selectedMatch]);

  const currentMatch = state.matches?.find(m => m.id === selectedMatch);

  const handlePlayerToggle = (id) => {
    setNewMatchForm(p => ({
      ...p,
      selectedPlayers: p.selectedPlayers.includes(id)
        ? p.selectedPlayers.filter(x => x !== id)
        : [...p.selectedPlayers, id]
    }));
  };

  const handleCreateMatch = async (e) => {
    e.preventDefault();
    if (!newMatchForm.opponent.trim()) { toast.error('El equipo rival es requerido'); return; }
    if (!newMatchForm.date)            { toast.error('La fecha es requerida');         return; }
    if (newMatchForm.selectedPlayers.length === 0) { toast.error('Selecciona al menos una jugadora'); return; }

    try {
      await createMatch({
        opponent: newMatchForm.opponent, date: newMatchForm.date,
        time: newMatchForm.time,         venue: newMatchForm.venue,
        matchType: newMatchForm.matchType, notes: newMatchForm.notes,
        result: null, score: null, sideOut: 0, transition: 0,
        players: newMatchForm.selectedPlayers.map(pid => {
          const p = state.players.find(x => x.id === pid);
          return {
            id: p?.id || pid, name: p?.name || 'Desconocida', position: p?.position || 'N/A',
            attacks:   { attempts: 0, kills: 0, errors: 0, blocked: 0, hitting: 0 },
            serves:    { attempts: 0, aces: 0, errors: 0, effectiveness: 0 },
            reception: { attempts: 0, perfect: 0, good: 0, efficiency: 0 },
            blocks:    { stuffs: 0, assists: 0, participation: 0 }
          };
        })
      });
      setNewMatchForm({ opponent: '', date: '', time: '', venue: '', matchType: 'regular', notes: '', selectedPlayers: [] });
      setIsDialogOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Chart data helpers
  const chartData = (type: string) => {
    if (!currentMatch) return [];
    return currentMatch.players.map(p => ({
      name:       p.name.split(' ')[0],
      hitting:    p.attacks.hitting,
      kills:      p.attacks.kills,
      aces:       p.serves.aces,
      efficiency: p.reception.efficiency,
      stuffs:     p.blocks.stuffs,
    }));
  };

  const positionDist = () => {
    if (!currentMatch) return [];
    const counts: Record<string, number> = {};
    currentMatch.players.forEach(p => { counts[p.position] = (counts[p.position] || 0) + 1; });
    return Object.entries(counts).map(([pos, val]) => ({ name: pos, value: val, fill: POS_COLORS[pos] || '#A191FF' }));
  };

  const fundDataKey = { attacks: 'hitting', serves: 'aces', reception: 'efficiency', blocks: 'stuffs' };

  if (state.loading?.matches) {
    return (
      <div className="flex items-center justify-center py-16 gap-3">
        <Loader2 size={18} className="animate-spin text-[#A191FF]" />
        <span className="text-[13px] text-white/40">Cargando partidos…</span>
      </div>
    );
  }

  return (
    <div className="px-6 py-5 space-y-5">

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <Select value={selectedMatch} onValueChange={setSelectedMatch}>
          <SelectTrigger className="w-64 bg-white/[0.04] border-white/[0.08] text-[13px] text-white">
            <SelectValue placeholder="Seleccionar partido" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border-white/[0.08]">
            {state.matches?.map(m => (
              <SelectItem key={m.id} value={m.id} className="text-[13px] text-white/70">
                vs {m.opponent} — {m.date}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <button onClick={() => setIsDialogOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#A191FF] hover:bg-[#B8ADFF] text-black text-label font-semibold rounded-lg transition-colors">
          <Plus size={14} />Nuevo Partido
        </button>
      </div>

      {/* ── Dialog: new match ────────────────────────────────────────────── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl h-[92vh] flex flex-col bg-[#0d0d0d] border border-white/[0.08] p-0">
          <DialogHeader className="shrink-0 px-6 py-4 border-b border-white/[0.06]">
            <DialogTitle className="text-[15px] font-semibold text-white">Registrar Nuevo Partido</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateMatch} className="flex-1 overflow-y-auto min-h-0">
            <div className="px-6 py-5 space-y-5">

              {/* Info del partido */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={13} className="text-[#A191FF]" />
                  <p className="text-[12px] font-semibold text-white">Información del partido</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL_CLS}>Equipo rival *</label>
                    <input type="text" value={newMatchForm.opponent} placeholder="Ej: Club Deportivo Rival"
                      onChange={e => setNewMatchForm(p => ({ ...p, opponent: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                      className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Tipo de partido</label>
                    <Select value={newMatchForm.matchType} onValueChange={v => setNewMatchForm(p => ({ ...p, matchType: v }))}>
                      <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-[13px] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-white/[0.08]">
                        {[['regular','Liga Regular'],['playoff','Playoff'],['friendly','Amistoso'],['tournament','Torneo'],['cup','Copa']]
                          .map(([v, l]) => <SelectItem key={v} value={v} className="text-[13px] text-white/70">{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Fecha *</label>
                    <input type="date" value={newMatchForm.date}
                      onChange={e => setNewMatchForm(p => ({ ...p, date: e.target.value }))}
                      className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Hora</label>
                    <input type="time" value={newMatchForm.time}
                      onChange={e => setNewMatchForm(p => ({ ...p, time: e.target.value }))}
                      className={INPUT_CLS} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={LABEL_CLS}>Lugar</label>
                    <div className="relative">
                      <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
                      <input type="text" value={newMatchForm.venue} placeholder="Ej: Polideportivo Municipal"
                        onChange={e => setNewMatchForm(p => ({ ...p, venue: e.target.value }))}
                        className={INPUT_CLS + ' pl-8'} />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={LABEL_CLS}>Notas</label>
                    <textarea value={newMatchForm.notes} rows={2} placeholder="Estrategias, condiciones del partido…"
                      onChange={e => setNewMatchForm(p => ({ ...p, notes: e.target.value }))}
                      className={INPUT_CLS + ' resize-none'} />
                  </div>
                </div>
              </div>

              {/* Jugadoras */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users size={13} className="text-[#A191FF]" />
                    <p className="text-[12px] font-semibold text-white">Jugadoras convocadas</p>
                  </div>
                  <span className="text-label text-white/25">{newMatchForm.selectedPlayers.length} SEL.</span>
                </div>

                {state.players.length === 0 ? (
                  <p className="text-[13px] text-white/30 py-4 text-center">Sin jugadoras registradas.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {state.players.map(player => {
                      const selected = newMatchForm.selectedPlayers.includes(player.id);
                      return (
                        <div key={player.id}
                          onClick={() => handlePlayerToggle(player.id)}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            selected ? 'border-[#A191FF]/40 bg-[#A191FF]/05' : 'border-white/[0.08] hover:border-white/20'
                          }`}>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            selected ? 'bg-[#A191FF] border-[#A191FF]' : 'border-white/20'
                          }`}>
                            {selected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4l2.5 2.5L9 1" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>}
                          </div>
                          <div>
                            <p className="text-[13px] text-white">{player.name}</p>
                            <p className="text-[11px] text-white/30">{player.position}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Resumen */}
              {(newMatchForm.opponent || newMatchForm.date || newMatchForm.selectedPlayers.length > 0) && (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 space-y-2">
                  <p className="text-[12px] font-semibold text-white">Resumen del partido</p>
                  {newMatchForm.opponent && <p className="text-[13px] text-white/50"><span className="text-white/25">Rival:</span> {newMatchForm.opponent}</p>}
                  {newMatchForm.date    && <p className="text-[13px] text-white/50 font-mono"><span className="text-white/25">Fecha:</span> {newMatchForm.date}</p>}
                  {newMatchForm.selectedPlayers.length > 0 && <p className="text-[13px] text-white/50"><span className="text-white/25">Jugadoras:</span> {newMatchForm.selectedPlayers.length} convocadas</p>}
                </div>
              )}
            </div>

            <div className="shrink-0 px-6 py-4 border-t border-white/[0.06] flex justify-end gap-3">
              <button type="button" onClick={() => setIsDialogOpen(false)}
                className="px-4 py-2 text-label text-white/40 hover:text-white transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={state.players.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-[#A191FF] hover:bg-[#B8ADFF] text-black text-label font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                <Plus size={14} />Crear Partido
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {(!state.matches || state.matches.length === 0) && (
        <div className="py-12 text-center border border-dashed border-white/[0.08] rounded-lg">
          <p className="text-[13px] text-white/30 mb-4">Sin partidos registrados.</p>
          <button onClick={() => setIsDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#A191FF] hover:bg-[#B8ADFF] text-black text-label font-semibold rounded-lg transition-colors mx-auto">
            <Plus size={14} />Crear primer partido
          </button>
        </div>
      )}

      {/* ── Match detail ─────────────────────────────────────────────────── */}
      {currentMatch && (
        <>
          {/* KPI header */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
              <p className="text-[14px] font-semibold text-white">vs {currentMatch.opponent}</p>
              <div className="flex items-center gap-2">
                <span className="text-label font-mono text-white">{currentMatch.score}</span>
                <span className="text-label px-2 py-0.5 rounded-full"
                  style={currentMatch.result === 'W'
                    ? { color: '#91FFB0', backgroundColor: 'rgba(145,255,176,0.08)' }
                    : { color: '#FF919F', backgroundColor: 'rgba(255,145,159,0.08)' }}>
                  {currentMatch.result === 'W' ? 'VICTORIA' : 'DERROTA'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 divide-x divide-white/[0.06]">
              <div className="px-5 py-4 text-center">
                <p className="text-[26px] font-bold font-mono" style={{ color: '#91FFB0' }}>{currentMatch.sideOut}%</p>
                <p className="text-label text-white/25 mt-1">SIDE-OUT</p>
              </div>
              <div className="px-5 py-4 text-center">
                <p className="text-[26px] font-bold font-mono text-white">{currentMatch.transition}%</p>
                <p className="text-label text-white/25 mt-1">TRANSICIÓN</p>
              </div>
            </div>
          </div>

          {/* Advanced Interactive Heatmaps (Cancha & Red) */}
          <AdvancedHeatmapDashboard rallies={(currentMatch as any).rallies || []} />

          {/* Fundament tabs + chart */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
            <div className="border-b border-white/[0.06] flex gap-0 px-2">
              {[
                { key: 'attacks',   label: 'Ataque',    icon: Target   },
                { key: 'serves',    label: 'Saque',     icon: Zap      },
                { key: 'reception', label: 'Recepción', icon: Activity },
                { key: 'blocks',    label: 'Bloqueo',   icon: Shield   },
              ].map(({ key, label, icon: Icon }) => (
                <button key={key}
                  onClick={() => setSelectedFundament(key)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-label border-b-2 transition-colors ${
                    selectedFundament === key
                      ? 'border-[#A191FF] text-[#A191FF]'
                      : 'border-transparent text-white/30 hover:text-white/60'
                  }`}>
                  <Icon size={12} />{label}
                </button>
              ))}
            </div>
            <div className="px-5 py-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData(selectedFundament)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip {...CHART_TOOLTIP} />
                  <Bar dataKey={fundDataKey[selectedFundament]} fill={FUNDAM_COLOR[selectedFundament]} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Individual KPI cards */}
          <div>
            <p className="text-[13px] font-semibold text-white mb-3">Rendimiento individual</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {currentMatch.players.map(player => {
                const kpis = positionKPIs[player.position] || ['attacks'];
                const posColor = POS_COLORS[player.position] || '#A191FF';
                return (
                  <div key={player.id} className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                      <p className="text-[13px] font-semibold text-white">{player.name}</p>
                      <span className="text-label px-2 py-0.5 rounded-full"
                        style={{ color: posColor, backgroundColor: `${posColor}15` }}>
                        {player.position.toUpperCase()}
                      </span>
                    </div>
                    <div className="px-4 py-3 space-y-3">
                      {kpis.includes('attacks') && (
                        <div>
                          <p className="text-label text-white/25 flex items-center gap-1.5 mb-1.5"><Target size={10} />ATAQUE</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white/[0.03] rounded p-2 text-center">
                              <p className="text-[16px] font-bold font-mono text-white">{player.attacks.hitting.toFixed(1)}%</p>
                              <p className="text-[10px] font-mono text-white/25">EFICACIA</p>
                            </div>
                            <div className="bg-white/[0.03] rounded p-2 text-center">
                              <p className="text-[16px] font-bold font-mono text-white">{player.attacks.kills}/{player.attacks.attempts}</p>
                              <p className="text-[10px] font-mono text-white/25">KILLS</p>
                            </div>
                          </div>
                        </div>
                      )}
                      {kpis.includes('serves') && (
                        <div>
                          <p className="text-label text-white/25 flex items-center gap-1.5 mb-1.5"><Zap size={10} />SAQUE</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white/[0.03] rounded p-2 text-center">
                              <p className="text-[16px] font-bold font-mono text-white">{player.serves.aces}</p>
                              <p className="text-[10px] font-mono text-white/25">ACES</p>
                            </div>
                            <div className="bg-white/[0.03] rounded p-2 text-center">
                              <p className="text-[16px] font-bold font-mono text-white">{player.serves.errors}</p>
                              <p className="text-[10px] font-mono text-white/25">ERRORES</p>
                            </div>
                          </div>
                        </div>
                      )}
                      {kpis.includes('reception') && player.reception.attempts > 0 && (
                        <div>
                          <p className="text-label text-white/25 flex items-center gap-1.5 mb-1.5"><Activity size={10} />RECEPCIÓN</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white/[0.03] rounded p-2 text-center">
                              <p className="text-[16px] font-bold font-mono text-white">{player.reception.efficiency.toFixed(2)}</p>
                              <p className="text-[10px] font-mono text-white/25">EFICIENCIA</p>
                            </div>
                            <div className="bg-white/[0.03] rounded p-2 text-center">
                              <p className="text-[16px] font-bold font-mono text-white">{player.reception.perfect}/{player.reception.attempts}</p>
                              <p className="text-[10px] font-mono text-white/25">PERFECTAS</p>
                            </div>
                          </div>
                        </div>
                      )}
                      {kpis.includes('blocks') && (
                        <div>
                          <p className="text-label text-white/25 flex items-center gap-1.5 mb-1.5"><Shield size={10} />BLOQUEO</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white/[0.03] rounded p-2 text-center">
                              <p className="text-[16px] font-bold font-mono text-white">{player.blocks.stuffs}</p>
                              <p className="text-[10px] font-mono text-white/25">DIRECTOS</p>
                            </div>
                            <div className="bg-white/[0.03] rounded p-2 text-center">
                              <p className="text-[16px] font-bold font-mono text-white">{player.blocks.assists}</p>
                              <p className="text-[10px] font-mono text-white/25">ASISTENCIAS</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
