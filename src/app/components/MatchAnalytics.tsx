import React, { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts';
import { Plus, Target, Shield, Zap, Activity, Calendar, MapPin, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useApp } from '../utils/AppContext';
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
  attacks: '#00e5ff', serves: '#ffdd00', reception: '#91FFB0', blocks: '#A191FF'
};

const fundDataKey: Record<string, string> = {
  attacks: 'hitting', serves: 'aces', reception: 'efficiency', blocks: 'stuffs'
};

const positionKPIs: Record<string, string[]> = {
  Opuesto:   ['attacks', 'serves', 'blocks'],
  Punta:     ['attacks', 'serves', 'reception'],
  Central:   ['attacks', 'blocks', 'serves'],
  Colocador: ['serves'],
  Líbero:    ['reception'],
};

function computeDynamicStats(matches: any[], selectedMatchId: string, allPlayers: any[]) {
  const currentMatch = selectedMatchId ? matches?.find(m => m.id === selectedMatchId) : matches?.[0];
  if (!currentMatch) return null;

  const rallies = currentMatch.rallies || [];
  
  const teamBalance = { pos: 0, neu: 0, neg: 0 };
  const momentum: any[] = [{ name: '0-0', diff: 0, ourScore: 0, rivalScore: 0 }];
  
  let sideOutChances = 0;
  let sideOutSuccess = 0;
  let transitionChances = 0;
  let transitionSuccess = 0;

  const pStats: Record<string, any> = {};
  
  // Initialize all players
  allPlayers.forEach(p => {
    pStats[p.id] = {
      id: p.id, name: p.name, position: p.position, number: p.number,
      attacks: { pos: 0, neu: 0, neg: 0, kills: 0, attempts: 0 },
      serves: { pos: 0, neu: 0, neg: 0, aces: 0, errors: 0 },
      receptions: { pos: 0, neu: 0, neg: 0, perfect: 0, attempts: 0 },
      blocks: { pos: 0, neu: 0, neg: 0, stuffs: 0 }
    };
  });

  rallies.forEach((r: any, idx: number) => {
    momentum.push({
      name: `${r.ourScore}-${r.rivalScore}`,
      diff: r.ourScore - r.rivalScore,
      ourScore: r.ourScore,
      rivalScore: r.rivalScore
    });

    // Simulate Sideout/Transition based on serve (very basic heuristic)
    const firstAction = r.actions?.[0];
    if (firstAction && firstAction.gesture === 'saque') {
      if (firstAction.playerId) { // We served -> Transition phase for us
        transitionChances++;
        if (r.winner === 'our') transitionSuccess++;
      } else { // They served -> Sideout phase for us
        sideOutChances++;
        if (r.winner === 'our') sideOutSuccess++;
      }
    } else {
      // Seed data heuristic
      if (idx % 2 === 0) { sideOutChances++; if(r.winner === 'our') sideOutSuccess++; }
      else { transitionChances++; if(r.winner === 'our') transitionSuccess++; }
    }

    if (r.actions && r.actions.length > 0) {
      r.actions.forEach((a: any) => {
        if (!a.playerId || !pStats[a.playerId]) return;
        const s = pStats[a.playerId];
        const q = a.quality === '+' ? 'pos' : a.quality === '-' ? 'neg' : 'neu';
        
        teamBalance[q]++;
        
        const g = a.gesture?.toLowerCase();
        if (g === 'ataque' || g === 'ataque ') {
          s.attacks[q]++;
          s.attacks.attempts++;
          if (q === 'pos') s.attacks.kills++;
        }
        else if (g === 'saque') {
          s.serves[q]++;
          if (q === 'pos') s.serves.aces++;
          if (q === 'neg') s.serves.errors++;
        }
        else if (g === 'recepción' || g === 'recepcion') {
          s.receptions[q]++;
          s.receptions.attempts++;
          if (q === 'pos') s.receptions.perfect++;
        }
        else if (g === 'bloqueo') {
          s.blocks[q]++;
          if (q === 'pos') s.blocks.stuffs++;
        }
      });
    } else {
      // Seed data fallback
      let matchedPlayerId = null;
      if (r.playerNumber) {
        const p = allPlayers.find(x => x.number == r.playerNumber);
        if (p) matchedPlayerId = p.id;
      }
      
      if (matchedPlayerId && pStats[matchedPlayerId]) {
        const s = pStats[matchedPlayerId];
        const g = r.finalAction?.toLowerCase();
        const q = r.winner === 'our' ? 'pos' : r.winner === 'rival' ? 'neg' : 'neu';
        
        teamBalance[q]++;
        
        if (g === 'ataque') {
          s.attacks[q]++;
          s.attacks.attempts++;
          if (q === 'pos') s.attacks.kills++;
        }
        else if (g === 'saque') {
          s.serves[q]++;
          if (q === 'pos') s.serves.aces++;
          if (q === 'neg') s.serves.errors++;
        }
        else if (g === 'bloqueo') {
          s.blocks[q]++;
          if (q === 'pos') s.blocks.stuffs++;
        }
      }
    }
  });

  return {
    match: currentMatch,
    rallies,
    momentum,
    teamBalance,
    players: Object.values(pStats).filter((p: any) => 
      p.attacks.attempts > 0 || p.serves.pos > 0 || p.serves.neg > 0 || p.serves.neu > 0 || 
      p.receptions.attempts > 0 || p.blocks.pos > 0 || p.blocks.neg > 0 || p.blocks.neu > 0
    ),
    sideOutPct: sideOutChances > 0 ? Math.round((sideOutSuccess/sideOutChances)*100) : 0,
    transPct: transitionChances > 0 ? Math.round((transitionSuccess/transitionChances)*100) : 0,
  };
}

export function MatchAnalytics() {
  const { state, createMatch } = useApp();
  const [selectedMatch, setSelectedMatch] = useState('');
  const [activeTab, setActiveTab] = useState<'heatmaps'|'efficiency'|'kpis'>('efficiency');
  const [selectedFundament, setSelectedFundament] = useState('attacks');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [newMatchForm, setNewMatchForm] = useState({
    opponent: '', date: '', time: '', venue: '', matchType: 'regular', notes: '', selectedPlayers: [] as string[]
  });

  React.useEffect(() => {
    if (state.matches?.length > 0 && !selectedMatch) setSelectedMatch(state.matches[0].id);
  }, [state.matches, selectedMatch]);

  const handlePlayerToggle = (id: string) => {
    setNewMatchForm(p => ({
      ...p,
      selectedPlayers: p.selectedPlayers.includes(id) ? p.selectedPlayers.filter(x => x !== id) : [...p.selectedPlayers, id]
    }));
  };

  const handleCreateMatch = async (e: React.FormEvent) => {
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
        players: []
      });
      setNewMatchForm({ opponent: '', date: '', time: '', venue: '', matchType: 'regular', notes: '', selectedPlayers: [] });
      setIsDialogOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const dynStats = useMemo(() => computeDynamicStats(state.matches, selectedMatch, state.players), [state.matches, selectedMatch, state.players]);

  if (state.loading?.matches) {
    return (
      <div className="flex items-center justify-center py-16 gap-3">
        <Loader2 size={18} className="animate-spin text-[#00e5ff]" />
        <span className="text-[13px] text-white/40">Cargando partidos…</span>
      </div>
    );
  }

  // --- Rendering Helpers ---
  const chartData = (type: string) => {
    if (!dynStats) return [];
    return dynStats.players.map((p: any) => ({
      name: p.name.split(' ')[0],
      hitting: p.attacks.attempts > 0 ? Math.round(((p.attacks.pos - p.attacks.neg) / p.attacks.attempts) * 100) : 0,
      kills: p.attacks.kills,
      aces: p.serves.pos,
      efficiency: p.receptions.attempts > 0 ? ((p.receptions.pos - p.receptions.neg) / p.receptions.attempts).toFixed(2) : 0,
      stuffs: p.blocks.pos,
    }));
  };

  return (
    <div className="px-6 py-5 space-y-5">
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        <Select value={selectedMatch} onValueChange={setSelectedMatch}>
          <SelectTrigger className="w-full md:w-64 bg-white/[0.04] border-white/[0.08] text-[13px] text-white">
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
          className="flex items-center gap-2 px-4 py-2 bg-[#00e5ff] hover:bg-[#00e5ff]/80 text-black text-label font-semibold rounded-lg transition-colors w-full md:w-auto justify-center">
          <Plus size={14} />Nuevo Partido
        </button>
      </div>

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {(!state.matches || state.matches.length === 0) && (
        <div className="py-12 text-center border border-dashed border-[#2e4a72]/50 rounded-lg">
          <p className="text-[13px] text-[#5a6070] mb-4">Sin partidos registrados.</p>
          <button onClick={() => setIsDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#00e5ff] hover:bg-[#00e5ff]/80 text-black text-label font-semibold rounded-lg transition-colors mx-auto">
            <Plus size={14} />Crear primer partido
          </button>
        </div>
      )}

      {/* ── Match detail ─────────────────────────────────────────────────── */}
      {dynStats && dynStats.match && (
        <>
          {/* Header Info */}
          <div className="bg-[#11141a] border border-[#2e4a72]/50 rounded-lg overflow-hidden shadow-[0_0_15px_rgba(0,229,255,0.05)]">
            <div className="px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-[#00e5ff] tracking-widest uppercase mb-1">{dynStats.match.matchType || 'Oficial'}</p>
                <p className="text-[18px] font-semibold text-white">vs {dynStats.match.opponent}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[24px] font-mono font-bold text-white leading-none">{dynStats.match.score || '0-0'}</span>
                <span className="text-[10px] tracking-wider px-2 py-0.5 rounded border uppercase"
                  style={dynStats.match.result === 'W'
                    ? { color: '#00e5ff', borderColor: '#00e5ff', backgroundColor: 'rgba(0,229,255,0.05)' }
                    : { color: '#ff1100', borderColor: '#ff1100', backgroundColor: 'rgba(255,17,0,0.05)' }}>
                  {dynStats.match.result === 'W' ? 'Victoria' : 'Derrota'}
                </span>
              </div>
            </div>
          </div>

          {/* Custom Tabs Navigation */}
          <div className="flex gap-1 bg-[#11141a] p-1 rounded-lg border border-[#2e4a72]/30 w-fit">
            <button onClick={() => setActiveTab('heatmaps')} className={`px-4 py-2 text-[11px] uppercase font-mono tracking-wider rounded transition-colors ${activeTab === 'heatmaps' ? 'bg-[#00e5ff] text-black font-semibold' : 'text-[#5a6070] hover:text-white'}`}>
              Resumen & Heatmaps
            </button>
            <button onClick={() => setActiveTab('efficiency')} className={`px-4 py-2 text-[11px] uppercase font-mono tracking-wider rounded transition-colors ${activeTab === 'efficiency' ? 'bg-[#00e5ff] text-black font-semibold' : 'text-[#5a6070] hover:text-white'}`}>
              Análisis de Eficiencia
            </button>
            <button onClick={() => setActiveTab('kpis')} className={`px-4 py-2 text-[11px] uppercase font-mono tracking-wider rounded transition-colors ${activeTab === 'kpis' ? 'bg-[#00e5ff] text-black font-semibold' : 'text-[#5a6070] hover:text-white'}`}>
              KPIs Individuales
            </button>
          </div>

          {/* TAB 1: HEATMAPS & MOMENTUM */}
          {activeTab === 'heatmaps' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Momentum Line Chart */}
              {dynStats.momentum.length > 1 && (
                <div className="bg-[#11141a] border border-[#2e4a72]/50 rounded-lg p-5">
                  <p className="text-[12px] font-semibold text-[#00e5ff] uppercase tracking-widest mb-4">Momentum del Partido (Diferencia de Puntos)</p>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dynStats.momentum} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2e4a72" opacity={0.3} />
                        <XAxis dataKey="name" tick={{ fill: '#5a6070', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={20} />
                        <YAxis tick={{ fill: '#5a6070', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#0a0c10', border: '1px solid #2e4a72', borderRadius: '8px' }} labelStyle={{ color: '#00e5ff', marginBottom: '4px' }} itemStyle={{ color: '#fff', fontSize: '12px' }} />
                        <ReferenceLine y={0} stroke="#5a6070" strokeWidth={1} />
                        <Line type="monotone" dataKey="diff" name="Diferencia" stroke="#00e5ff" strokeWidth={3} dot={{ r: 2, fill: '#00e5ff' }} activeDot={{ r: 5, fill: '#fff' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Heatmaps */}
              <AdvancedHeatmapDashboard rallies={dynStats.rallies} />
            </div>
          )}

          {/* TAB 2: EFFICIENCY MATRIX */}
          {activeTab === 'efficiency' && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              {/* Team Balance Bar */}
              <div className="bg-[#11141a] border border-[#2e4a72]/50 rounded-lg p-5">
                <p className="text-[12px] font-semibold text-[#00e5ff] uppercase tracking-widest mb-4">Balance General del Equipo</p>
                
                <div className="flex h-6 rounded-full overflow-hidden mb-3 bg-black">
                  {(() => {
                    const t = dynStats.teamBalance.pos + dynStats.teamBalance.neu + dynStats.teamBalance.neg;
                    if (t === 0) return <div className="w-full bg-[#2e4a72]/30"></div>;
                    const pPct = (dynStats.teamBalance.pos / t) * 100;
                    const ePct = (dynStats.teamBalance.neu / t) * 100;
                    const nPct = (dynStats.teamBalance.neg / t) * 100;
                    return (
                      <>
                        <div style={{ width: `${pPct}%` }} className="bg-[#00e5ff] transition-all duration-500" title={`Positivos: ${pPct.toFixed(1)}%`} />
                        <div style={{ width: `${ePct}%` }} className="bg-[#ffdd00] transition-all duration-500" title={`Neutros: ${ePct.toFixed(1)}%`} />
                        <div style={{ width: `${nPct}%` }} className="bg-[#ff1100] transition-all duration-500" title={`Negativos: ${nPct.toFixed(1)}%`} />
                      </>
                    );
                  })()}
                </div>
                
                <div className="flex justify-between items-center text-[11px] font-mono">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#00e5ff]"></div><span className="text-white">{dynStats.teamBalance.pos} Positivos</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ffdd00]"></div><span className="text-white">{dynStats.teamBalance.neu} Neutros</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ff1100]"></div><span className="text-white">{dynStats.teamBalance.neg} Errores</span></div>
                </div>
              </div>

              {/* Player Matrix Table */}
              <div className="bg-[#11141a] border border-[#2e4a72]/50 rounded-lg overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-[#2e4a72]/50 bg-[#0a0c10]">
                      <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-[#5a6070] font-semibold">Jugadora</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-[#5a6070] font-semibold text-center">Ataques (+ / = / -)</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-[#5a6070] font-semibold text-center">Saques (+ / = / -)</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-[#5a6070] font-semibold text-center">Recepción (+ / = / -)</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-[#5a6070] font-semibold text-center">Eficacia Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2e4a72]/20">
                    {dynStats.players.map((p: any) => {
                      const totalPos = p.attacks.pos + p.serves.pos + p.receptions.pos + p.blocks.pos;
                      const totalNeg = p.attacks.neg + p.serves.neg + p.receptions.neg + p.blocks.neg;
                      const totalAtt = totalPos + totalNeg + p.attacks.neu + p.serves.neu + p.receptions.neu + p.blocks.neu;
                      const eff = totalAtt > 0 ? ((totalPos - totalNeg) / totalAtt * 100).toFixed(1) : '0.0';

                      return (
                        <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-[13px] text-white font-medium">{p.name}</p>
                            <p className="text-[10px] text-[#5a6070]">{p.position}</p>
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-[12px]">
                            <span className="text-[#00e5ff]">{p.attacks.pos}</span> / <span className="text-[#ffdd00]">{p.attacks.neu}</span> / <span className="text-[#ff1100]">{p.attacks.neg}</span>
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-[12px]">
                            <span className="text-[#00e5ff]">{p.serves.pos}</span> / <span className="text-[#ffdd00]">{p.serves.neu}</span> / <span className="text-[#ff1100]">{p.serves.neg}</span>
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-[12px]">
                            <span className="text-[#00e5ff]">{p.receptions.pos}</span> / <span className="text-[#ffdd00]">{p.receptions.neu}</span> / <span className="text-[#ff1100]">{p.receptions.neg}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-[12px] font-mono font-semibold px-2 py-1 rounded ${Number(eff) > 0 ? 'bg-[#00e5ff]/10 text-[#00e5ff]' : Number(eff) < 0 ? 'bg-[#ff1100]/10 text-[#ff1100]' : 'bg-white/5 text-white/50'}`}>
                              {Number(eff) > 0 ? '+' : ''}{eff}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {dynStats.players.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-[12px] text-[#5a6070]">No hay jugadas registradas para evaluar jugadoras.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: INDIVIDUAL KPIs */}
          {activeTab === 'kpis' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              {/* General KPIs */}
              <div className="grid grid-cols-2 divide-x divide-[#2e4a72]/50 bg-[#11141a] border border-[#2e4a72]/50 rounded-lg">
                <div className="px-5 py-4 text-center">
                  <p className="text-[26px] font-bold font-mono text-[#00e5ff]">{dynStats.sideOutPct}%</p>
                  <p className="text-[10px] uppercase tracking-widest text-[#5a6070] mt-1">Side-Out</p>
                </div>
                <div className="px-5 py-4 text-center">
                  <p className="text-[26px] font-bold font-mono text-white">{dynStats.transPct}%</p>
                  <p className="text-[10px] uppercase tracking-widest text-[#5a6070] mt-1">Transición</p>
                </div>
              </div>

              {/* Fundament tabs + chart */}
              <div className="bg-[#11141a] border border-[#2e4a72]/50 rounded-lg overflow-hidden">
                <div className="border-b border-[#2e4a72]/50 flex gap-0 px-2">
                  {[
                    { key: 'attacks',   label: 'Ataque',    icon: Target   },
                    { key: 'serves',    label: 'Saque',     icon: Zap      },
                    { key: 'reception', label: 'Recepción', icon: Activity },
                    { key: 'blocks',    label: 'Bloqueo',   icon: Shield   },
                  ].map(({ key, label, icon: Icon }) => (
                    <button key={key}
                      onClick={() => setSelectedFundament(key)}
                      className={`flex items-center gap-1.5 px-4 py-3 text-[11px] font-mono uppercase tracking-wider border-b-2 transition-colors ${
                        selectedFundament === key
                          ? 'border-[#00e5ff] text-[#00e5ff]'
                          : 'border-transparent text-[#5a6070] hover:text-white'
                      }`}>
                      <Icon size={12} />{label}
                    </button>
                  ))}
                </div>
                <div className="px-5 py-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData(selectedFundament)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2e4a72" opacity={0.3} />
                      <XAxis dataKey="name" tick={{ fill: '#5a6070', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#5a6070', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip {...CHART_TOOLTIP} />
                      <Bar dataKey={fundDataKey[selectedFundament]} fill={FUNDAM_COLOR[selectedFundament] || '#00e5ff'} radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Individual Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {dynStats.players.map((player: any) => {
                  const kpis = positionKPIs[player.position] || ['attacks'];
                  const posColor = POS_COLORS[player.position] || '#A191FF';
                  return (
                    <div key={player.id} className="bg-[#11141a] border border-[#2e4a72]/50 rounded-lg overflow-hidden">
                      <div className="px-4 py-3 border-b border-[#2e4a72]/30 flex items-center justify-between">
                        <p className="text-[13px] font-semibold text-white">{player.name}</p>
                        <span className="text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded"
                          style={{ color: posColor, backgroundColor: `${posColor}15` }}>
                          {player.position}
                        </span>
                      </div>
                      <div className="px-4 py-3 space-y-3">
                        {kpis.includes('attacks') && (
                          <div>
                            <p className="text-[9px] uppercase tracking-widest text-[#5a6070] flex items-center gap-1.5 mb-1.5"><Target size={10} />Ataque</p>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-[#0a0c10] border border-[#2e4a72]/30 rounded p-2 text-center">
                                <p className="text-[16px] font-bold font-mono text-white">
                                  {player.attacks.attempts > 0 ? (((player.attacks.pos - player.attacks.neg) / player.attacks.attempts) * 100).toFixed(1) : 0}%
                                </p>
                                <p className="text-[9px] font-mono text-[#5a6070]">EFICACIA</p>
                              </div>
                              <div className="bg-[#0a0c10] border border-[#2e4a72]/30 rounded p-2 text-center">
                                <p className="text-[16px] font-bold font-mono text-white">{player.attacks.pos}/{player.attacks.attempts}</p>
                                <p className="text-[9px] font-mono text-[#5a6070]">KILLS (+)</p>
                              </div>
                            </div>
                          </div>
                        )}
                        {kpis.includes('serves') && (
                          <div>
                            <p className="text-[9px] uppercase tracking-widest text-[#5a6070] flex items-center gap-1.5 mb-1.5"><Zap size={10} />Saque</p>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-[#0a0c10] border border-[#2e4a72]/30 rounded p-2 text-center">
                                <p className="text-[16px] font-bold font-mono text-[#00e5ff]">{player.serves.pos}</p>
                                <p className="text-[9px] font-mono text-[#5a6070]">ACES</p>
                              </div>
                              <div className="bg-[#0a0c10] border border-[#2e4a72]/30 rounded p-2 text-center">
                                <p className="text-[16px] font-bold font-mono text-[#ff1100]">{player.serves.neg}</p>
                                <p className="text-[9px] font-mono text-[#5a6070]">ERRORES</p>
                              </div>
                            </div>
                          </div>
                        )}
                        {kpis.includes('reception') && (
                          <div>
                            <p className="text-[9px] uppercase tracking-widest text-[#5a6070] flex items-center gap-1.5 mb-1.5"><Activity size={10} />Recepción</p>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-[#0a0c10] border border-[#2e4a72]/30 rounded p-2 text-center">
                                <p className="text-[16px] font-bold font-mono text-white">
                                  {player.receptions.attempts > 0 ? ((player.receptions.pos - player.receptions.neg) / player.receptions.attempts).toFixed(2) : 0}
                                </p>
                                <p className="text-[9px] font-mono text-[#5a6070]">EFICIENCIA</p>
                              </div>
                              <div className="bg-[#0a0c10] border border-[#2e4a72]/30 rounded p-2 text-center">
                                <p className="text-[16px] font-bold font-mono text-[#00e5ff]">{player.receptions.pos}/{player.receptions.attempts}</p>
                                <p className="text-[9px] font-mono text-[#5a6070]">PERFECTAS</p>
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
          )}
        </>
      )}

      {/* Dialog for creating Match - Included from before */}
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
                            selected ? 'border-[#00e5ff]/40 bg-[#00e5ff]/5' : 'border-white/[0.08] hover:border-white/20'
                          }`}>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            selected ? 'bg-[#00e5ff] border-[#00e5ff]' : 'border-white/20'
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
            </div>

            <div className="shrink-0 px-6 py-4 border-t border-white/[0.06] flex justify-end gap-3">
              <button type="button" onClick={() => setIsDialogOpen(false)}
                className="px-4 py-2 text-[12px] font-semibold text-white/40 hover:text-white transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={state.players.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-[#00e5ff] hover:bg-[#00e5ff]/80 text-black text-[12px] font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                <Plus size={14} />Crear Partido
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
