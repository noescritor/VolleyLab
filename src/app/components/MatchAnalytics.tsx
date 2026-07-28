import React, { useState, useMemo, useRef } from 'react';

import { Download, Loader2, Plus, Target, Shield, Zap, Activity, Calendar, MapPin, Users } from 'lucide-react';
import { PrintableMatchReport } from './analytics/PrintableMatchReport';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts';
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
  attacks: '#A191FF', serves: '#FFD391', reception: '#91FFB0', blocks: '#A191FF'
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
  
  const errorPhaseFreq = [
    { name: 'Inicio (0-15 pts)', Saque: 0, Ataque: 0, Recepcion: 0, Bloqueo: 0 },
    { name: 'Desarrollo (16-32 pts)', Saque: 0, Ataque: 0, Recepcion: 0, Bloqueo: 0 },
    { name: 'Cierre (33+ pts)', Saque: 0, Ataque: 0, Recepcion: 0, Bloqueo: 0 },
  ];
  
  // Initialize all players
  allPlayers.forEach(p => {
    pStats[p.id] = {
      id: p.id, name: p.name, position: p.position, number: p.number,
      attacks: { pos: 0, neu: 0, neg: 0, kills: 0, attempts: 0 },
      serves: { pos: 0, neu: 0, neg: 0, aces: 0, errors: 0 },
      receptions: { pos: 0, neu: 0, neg: 0, perfect: 0, attempts: 0 },
      blocks: { pos: 0, neu: 0, neg: 0, stuffs: 0 },
      digs: { pos: 0, neu: 0, neg: 0 },
      sets: { pos: 0, neu: 0, neg: 0 }
    };
  });

  rallies.forEach((r: any, idx: number) => {
    const totalPts = (r.ourScore || 0) + (r.rivalScore || 0);
    const pIdx = totalPts <= 15 ? 0 : totalPts <= 32 ? 1 : 2;

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
        const q = (a.quality === 'pos' || a.quality === '+') ? 'pos' : (a.quality === 'neg' || a.quality === '-') ? 'neg' : 'neu';
        
        teamBalance[q]++;
        
        const g = a.gesture?.toLowerCase();
        
        if (q === 'neg') {
          if (g === 'saque') errorPhaseFreq[pIdx].Saque++;
          else if (g === 'ataque' || g === 'ataque ' || g === 'dejada') errorPhaseFreq[pIdx].Ataque++;
          else if (g === 'recepción' || g === 'recepcion') errorPhaseFreq[pIdx].Recepcion++;
          else if (g === 'bloqueo') errorPhaseFreq[pIdx].Bloqueo++;
        }
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
        
        if (g === 'ataque' || g === 'ataque ' || g === 'dejada') {
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
        else if (g === 'recepción' || g === 'recepcion') {
          s.receptions[q]++;
          s.receptions.attempts++;
        }
        else if (g === 'defensa') {
          s.digs[q]++;
        }
        else if (g === 'acomodo') {
          s.sets[q]++;
        }
      }
    }
  });

  // HISTORICAL TRENDS CALCULATION
  let histSideOutAvg = 0;
  let histTransAvg = 0;
  if (matches && matches.length > 0) {
    const pastMatches = matches
      .filter((m: any) => m.id !== currentMatch.id && new Date(m.createdAt || m.date) <= new Date(currentMatch.createdAt || currentMatch.date))
      .sort((a: any, b: any) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime())
      .slice(0, 5);

    let histSOChances = 0, histSOSuccess = 0, histTrChances = 0, histTrSuccess = 0;
    
    pastMatches.forEach((m: any) => {
      (m.rallies || []).forEach((r: any, idx: number) => {
        const firstAction = r.actions?.[0];
        if (firstAction && firstAction.gesture === 'saque') {
          if (firstAction.playerId) { histTrChances++; if (r.winner === 'our') histTrSuccess++; }
          else { histSOChances++; if (r.winner === 'our') histSOSuccess++; }
        } else {
          if (idx % 2 === 0) { histSOChances++; if(r.winner === 'our') histSOSuccess++; }
          else { histTrChances++; if(r.winner === 'our') histTrSuccess++; }
        }
      });
    });

    histSideOutAvg = histSOChances > 0 ? Math.round((histSOSuccess/histSOChances)*100) : 0;
    histTransAvg = histTrChances > 0 ? Math.round((histTrSuccess/histTrChances)*100) : 0;
  }

  // SUBSTITUTION IMPACT CALCULATION
  let subImpact = null;
  const timeline = currentMatch.timeline || [];
  const firstSubIdx = timeline.findIndex((t: any) => t.type === 'sub');
  
  if (firstSubIdx !== -1) {
    const subEvent = timeline[firstSubIdx];
    // Find the rally immediately following this substitution by score or timeline order
    // Since timeline interleaves timeouts, subs, and rallies, we can just split rallies by looking at their index in timeline
    const ralliesBefore = timeline.slice(0, firstSubIdx).filter((t: any) => t.type === 'rally').map((t: any) => t.data);
    const ralliesAfter = timeline.slice(firstSubIdx + 1).filter((t: any) => t.type === 'rally').map((t: any) => t.data);
    
    const calcImpact = (rallyArray: any[]) => {
      let pos = 0, neg = 0, neu = 0;
      let recAttempts = 0, recPerfect = 0, attAttempts = 0, attKills = 0, attErrors = 0;
      rallyArray.forEach((r: any) => {
        if (r.actions && r.actions.length > 0) {
          r.actions.forEach((a: any) => {
            const q = (a.quality === 'pos' || a.quality === '+') ? 'pos' : (a.quality === 'neg' || a.quality === '-') ? 'neg' : 'neu';
            if (q === 'pos') pos++; else if (q === 'neg') neg++; else neu++;
            
            const g = a.gesture?.toLowerCase();
            if (g === 'recepción' || g === 'recepcion') {
              recAttempts++;
              if (q === 'pos') recPerfect++;
            }
            if (g === 'ataque' || g === 'ataque ') {
              attAttempts++;
              if (q === 'pos') attKills++;
              if (q === 'neg') attErrors++;
            }
          });
        }
      });
      const balance = pos - neg; // Simplified global balance
      const recEff = recAttempts > 0 ? Math.round((recPerfect / recAttempts) * 100) : 0;
      const attEff = attAttempts > 0 ? Math.round(((attKills - attErrors) / attAttempts) * 100) : 0;
      return { balance, recEff, attEff };
    };

    subImpact = {
      subDetails: subEvent,
      before: calcImpact(ralliesBefore),
      after: calcImpact(ralliesAfter)
    };
  }

  return {
    match: currentMatch,
    rallies,
    momentum,
    teamBalance,
    errorPhaseFreq,
    players: Object.values(pStats).filter((p: any) => 
      p.attacks.attempts > 0 || p.serves.pos > 0 || p.serves.neg > 0 || p.serves.neu > 0 || 
      p.receptions.attempts > 0 || p.blocks.pos > 0 || p.blocks.neg > 0 || p.blocks.neu > 0
    ),
    sideOutPct: sideOutChances > 0 ? Math.round((sideOutSuccess/sideOutChances)*100) : 0,
    transPct: transitionChances > 0 ? Math.round((transitionSuccess/transitionChances)*100) : 0,
    historicalAvg: { sideOut: histSideOutAvg, trans: histTransAvg },
    subImpact
  };
}

export function MatchAnalytics() {
  const { state, createMatch } = useApp();
  const [selectedMatch, setSelectedMatch] = useState('');
  const [activeTab, setActiveTab] = useState<'heatmaps'|'efficiency'|'kpis'|'timeline'|'insights'>('efficiency');
  const [selectedFundament, setSelectedFundament] = useState('attacks');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const exportToPDF = () => {
    if (!dynStats?.match) return;
    
    // Cambiar título temporalmente para que el navegador sugiera este nombre al guardar el PDF
    const originalTitle = document.title;
    const matchName = dynStats.match.opponent ? dynStats.match.opponent : 'Rival';
    const matchDate = dynStats.match.date ? dynStats.match.date : 'Fecha';
    document.title = `${matchName} - ${matchDate}`;
    
    setIsExporting(true);
    
    // Damos un pequeño respiro para que React actualice estados si es necesario
    setTimeout(() => {
      window.print();
      
      // Restauramos el título después de un pequeño retraso
      setTimeout(() => {
        document.title = originalTitle;
        setIsExporting(false);
      }, 500);
    }, 100);
  };

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
        <Loader2 size={18} className="animate-spin text-[#A191FF]" />
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

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button onClick={exportToPDF} disabled={isExporting || state.matches.length === 0}
            className="flex items-center gap-2 px-4 py-2 border border-white/[0.08] hover:bg-white/[0.04] text-white/70 text-label font-semibold rounded-lg transition-colors justify-center disabled:opacity-40 disabled:cursor-not-allowed print:hidden">
            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} 
            {isExporting ? 'Preparando...' : 'Exportar PDF'}
          </button>
          <button onClick={() => setIsDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#A191FF] hover:bg-[#A191FF]/80 text-black text-label font-semibold rounded-lg transition-colors justify-center">
            <Plus size={14} />Nuevo Partido
          </button>
        </div>
      </div>

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {(!state.matches || state.matches.length === 0) && (
        <div className="py-12 text-center border border-dashed border-[#2e4a72]/50 rounded-lg">
          <p className="text-[13px] text-[#5a6070] mb-4">Sin partidos registrados.</p>
          <button onClick={() => setIsDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#A191FF] hover:bg-[#A191FF]/80 text-black text-label font-semibold rounded-lg transition-colors mx-auto">
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
                <p className="text-[10px] text-[#A191FF] tracking-widest uppercase mb-1">{dynStats.match.matchType || 'Oficial'}</p>
                <p className="text-[18px] font-semibold text-white">vs {dynStats.match.opponent}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[24px] font-mono font-bold text-white leading-none">{dynStats.match.score || '0-0'}</span>
                <span className="text-[10px] tracking-wider px-2 py-0.5 rounded border uppercase"
                  style={dynStats.match.result === 'W'
                    ? { color: '#A191FF', borderColor: '#A191FF', backgroundColor: 'rgba(0,229,255,0.05)' }
                    : { color: '#FF919F', borderColor: '#FF919F', backgroundColor: 'rgba(255,17,0,0.05)' }}>
                  {dynStats.match.result === 'W' ? 'Victoria' : 'Derrota'}
                </span>
              </div>
            </div>
          </div>

          {/* Custom Tabs Navigation */}
          <div className="flex gap-1 bg-[#11141a] p-1 rounded-lg border border-[#2e4a72]/30 w-fit">
            <button onClick={() => setActiveTab('heatmaps')} className={`px-4 py-2 text-[11px] uppercase font-mono tracking-wider rounded transition-colors ${activeTab === 'heatmaps' ? 'bg-[#A191FF] text-black font-semibold' : 'text-[#5a6070] hover:text-white'}`}>
              Resumen & Heatmaps
            </button>
            <button onClick={() => setActiveTab('efficiency')} className={`px-4 py-2 text-[11px] uppercase font-mono tracking-wider rounded transition-colors ${activeTab === 'efficiency' ? 'bg-[#A191FF] text-black font-semibold' : 'text-[#5a6070] hover:text-white'}`}>
              Análisis de Eficiencia
            </button>
            <button onClick={() => setActiveTab('kpis')} className={`px-4 py-2 text-[11px] uppercase font-mono tracking-wider rounded transition-colors ${activeTab === 'kpis' ? 'bg-[#A191FF] text-black font-semibold' : 'text-[#5a6070] hover:text-white'}`}>
              KPIs Individuales
            </button>
            <button onClick={() => setActiveTab('timeline')} className={`px-4 py-2 text-[11px] uppercase font-mono tracking-wider rounded transition-colors ${activeTab === 'timeline' ? 'bg-[#A191FF] text-black font-semibold' : 'text-[#5a6070] hover:text-white'}`}>
              Línea de Tiempo
            </button>
            <button onClick={() => setActiveTab('insights')} className={`flex items-center gap-2 px-4 py-2 text-[11px] uppercase font-mono tracking-wider rounded transition-colors ${activeTab === 'insights' ? 'bg-[#A191FF] text-black font-semibold' : 'text-[#5a6070] hover:text-white'}`}>
              <Zap size={14} /> Insights
            </button>
          </div>

          {/* TAB 1: HEATMAPS & MOMENTUM */}
          {activeTab === 'heatmaps' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Momentum Line Chart */}
              {dynStats.momentum.length > 1 && (
                <div className="bg-[#11141a] border border-[#2e4a72]/50 rounded-lg p-5">
                  <p className="text-[12px] font-semibold text-[#A191FF] uppercase tracking-widest mb-4">Momentum del Partido (Diferencia de Puntos)</p>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dynStats.momentum} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2e4a72" opacity={0.3} />
                        <XAxis dataKey="name" tick={{ fill: '#5a6070', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={20} />
                        <YAxis tick={{ fill: '#5a6070', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#0a0c10', border: '1px solid #2e4a72', borderRadius: '8px' }} labelStyle={{ color: '#A191FF', marginBottom: '4px' }} itemStyle={{ color: '#fff', fontSize: '12px' }} />
                        <ReferenceLine y={0} stroke="#5a6070" strokeWidth={1} />
                        <Line type="monotone" dataKey="diff" name="Diferencia" stroke="#A191FF" strokeWidth={3} dot={{ r: 2, fill: '#A191FF' }} activeDot={{ r: 5, fill: '#fff' }} />
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
                <p className="text-[12px] font-semibold text-[#A191FF] uppercase tracking-widest mb-4">Balance General del Equipo</p>
                
                <div className="flex h-6 rounded-full overflow-hidden mb-3 bg-black">
                  {(() => {
                    const t = dynStats.teamBalance.pos + dynStats.teamBalance.neu + dynStats.teamBalance.neg;
                    if (t === 0) return <div className="w-full bg-[#2e4a72]/30"></div>;
                    const pPct = (dynStats.teamBalance.pos / t) * 100;
                    const ePct = (dynStats.teamBalance.neu / t) * 100;
                    const nPct = (dynStats.teamBalance.neg / t) * 100;
                    return (
                      <>
                        <div style={{ width: `${pPct}%` }} className="bg-[#A191FF] transition-all duration-500" title={`Positivos: ${pPct.toFixed(1)}%`} />
                        <div style={{ width: `${ePct}%` }} className="bg-[#FFD391] transition-all duration-500" title={`Neutros: ${ePct.toFixed(1)}%`} />
                        <div style={{ width: `${nPct}%` }} className="bg-[#FF919F] transition-all duration-500" title={`Negativos: ${nPct.toFixed(1)}%`} />
                      </>
                    );
                  })()}
                </div>
                
                <div className="flex justify-between items-center text-[11px] font-mono">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#A191FF]"></div><span className="text-white">{dynStats.teamBalance.pos} Positivos</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#FFD391]"></div><span className="text-white">{dynStats.teamBalance.neu} Neutros</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#FF919F]"></div><span className="text-white">{dynStats.teamBalance.neg} Errores</span></div>
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
                            <span className="text-[#A191FF]">{p.attacks.pos}</span> / <span className="text-[#FFD391]">{p.attacks.neu}</span> / <span className="text-[#FF919F]">{p.attacks.neg}</span>
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-[12px]">
                            <span className="text-[#A191FF]">{p.serves.pos}</span> / <span className="text-[#FFD391]">{p.serves.neu}</span> / <span className="text-[#FF919F]">{p.serves.neg}</span>
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-[12px]">
                            <span className="text-[#A191FF]">{p.receptions.pos}</span> / <span className="text-[#FFD391]">{p.receptions.neu}</span> / <span className="text-[#FF919F]">{p.receptions.neg}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-[12px] font-mono font-semibold px-2 py-1 rounded ${Number(eff) > 0 ? 'bg-[#A191FF]/10 text-[#A191FF]' : Number(eff) < 0 ? 'bg-[#FF919F]/10 text-[#FF919F]' : 'bg-white/5 text-white/50'}`}>
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
                  <p className="text-[26px] font-bold font-mono text-[#A191FF]">{dynStats.sideOutPct}%</p>
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
                          ? 'border-[#A191FF] text-[#A191FF]'
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
                      <Bar dataKey={fundDataKey[selectedFundament]} fill={FUNDAM_COLOR[selectedFundament] || '#A191FF'} radius={[3,3,0,0]} />
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
                                <p className="text-[16px] font-bold font-mono text-[#A191FF]">{player.serves.pos}</p>
                                <p className="text-[9px] font-mono text-[#5a6070]">ACES</p>
                              </div>
                              <div className="bg-[#0a0c10] border border-[#2e4a72]/30 rounded p-2 text-center">
                                <p className="text-[16px] font-bold font-mono text-[#FF919F]">{player.serves.neg}</p>
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
                                <p className="text-[16px] font-bold font-mono text-[#A191FF]">{player.receptions.pos}/{player.receptions.attempts}</p>
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

          {/* TAB 4: LÍNEA DE TIEMPO */}
          {activeTab === 'timeline' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              <div className="bg-[#11141a] border border-[#2e4a72]/50 rounded-lg p-5">
                <p className="text-[12px] font-semibold text-[#A191FF] uppercase tracking-widest mb-4">Frecuencia de Errores por Fase de Set</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dynStats.errorPhaseFreq} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2e4a72" opacity={0.3} />
                      <XAxis dataKey="name" tick={{ fill: '#5a6070', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#5a6070', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip {...CHART_TOOLTIP} />
                      <Bar dataKey="Saque" stackId="a" fill="#FFD391" name="Errores de Saque" />
                      <Bar dataKey="Ataque" stackId="a" fill="#A191FF" name="Errores de Ataque/Dejada" />
                      <Bar dataKey="Recepcion" stackId="a" fill="#91FFB0" name="Errores de Recepción" />
                      <Bar dataKey="Bloqueo" stackId="a" fill="#A191FF" name="Errores de Bloqueo" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {dynStats.match.timeline && dynStats.match.timeline.length > 0 && (
                <div className="bg-[#11141a] border border-[#2e4a72]/50 rounded-lg p-5">
                  <p className="text-[12px] font-semibold text-[#A191FF] uppercase tracking-widest mb-4">Línea de Tiempo del Partido</p>
                  <div className="space-y-3 pl-2 border-l border-[#2e4a72]/30">
                    {dynStats.match.timeline.map((evt: any, i: number) => (
                      <div key={i} className="relative pl-4">
                        <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-[#A191FF]"></div>
                        <p className="text-[11px] text-[#5a6070] font-mono mb-1">
                          {evt.type === 'timeout' ? 'TIEMPO FUERA' : evt.type === 'sub' ? 'CAMBIO' : 'RALLY'}
                        </p>
                        {evt.type === 'timeout' && (
                          <p className="text-[13px] text-white">
                            Tiempo pedido por <span className={evt.team === 'our' ? 'text-[#A191FF]' : 'text-[#FF919F]'}>{evt.team === 'our' ? 'Nosotros' : 'Rival'}</span> (Marcador: {evt.ourScore}-{evt.rivalScore})
                          </p>
                        )}
                        {evt.type === 'sub' && (
                          <p className="text-[13px] text-white">
                            Entra <span className="text-[#A191FF]">{evt.in}</span> x Sale <span className="text-[#5a6070]">{evt.out}</span>
                          </p>
                        )}
                        {evt.type === 'rally' && evt.data && (
                          <p className="text-[13px] text-white">
                            Punto para <span className={evt.data.winner === 'our' ? 'text-[#A191FF]' : 'text-[#FF919F]'}>{evt.data.winner === 'our' ? 'Nosotros' : 'Rival'}</span> 
                            {evt.data.actions && evt.data.actions.length > 0 && ` (${evt.data.actions.length} acciones)`}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 5: INSIGHTS & IMPACT */}
          {activeTab === 'insights' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              <div className="bg-[#11141a] border border-[#2e4a72]/50 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="text-[#A191FF]" size={16} />
                  <h3 className="text-[13px] font-semibold text-white">Impacto de Sustituciones</h3>
                </div>
                <div className="text-[13px] text-white/60 mb-6">
                  {dynStats.subImpact ? `Rendimiento antes vs después del cambio: Entró ${dynStats.subImpact.subDetails.in} por ${dynStats.subImpact.subDetails.out}` : 'No se registraron cambios o no hay datos suficientes.'}
                </div>
                
                {dynStats.subImpact && (
                  <div className="flex gap-4">
                    {/* Antes */}
                    <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-lg p-5 relative overflow-hidden">
                      <div className="font-mono text-[11px] tracking-[1.4px] text-[#FFAC91] mb-6">ANTES DEL CAMBIO</div>
                      <div className="flex justify-between mt-4">
                        <div>
                          <div className="text-[24px] font-bold text-white">{dynStats.subImpact.before.balance > 0 ? `+${dynStats.subImpact.before.balance}` : dynStats.subImpact.before.balance}</div>
                          <div className="font-mono text-[9px] tracking-[0.4px] text-white/45">BALANCE</div>
                        </div>
                        <div>
                          <div className="text-[24px] font-bold text-white">{dynStats.subImpact.before.attEff}%</div>
                          <div className="font-mono text-[9px] tracking-[0.4px] text-white/45">EFIC. ATAQUE</div>
                        </div>
                        <div>
                          <div className="text-[24px] font-bold text-white">{dynStats.subImpact.before.recEff}%</div>
                          <div className="font-mono text-[9px] tracking-[0.4px] text-white/45">EFIC. RECP</div>
                        </div>
                      </div>
                    </div>

                    {/* Despues */}
                    <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-lg p-5 relative overflow-hidden">
                      <div className="font-mono text-[11px] tracking-[1.4px] text-[#91FFB0] mb-6">DESPUÉS DEL CAMBIO</div>
                      <div className="flex justify-between mt-4">
                        <div>
                          <div className="text-[24px] font-bold text-white">{dynStats.subImpact.after.balance > 0 ? `+${dynStats.subImpact.after.balance}` : dynStats.subImpact.after.balance}</div>
                          <div className="font-mono text-[9px] tracking-[0.4px] text-white/45">BALANCE</div>
                        </div>
                        <div>
                          <div className="text-[24px] font-bold text-white">{dynStats.subImpact.after.attEff}%</div>
                          <div className="font-mono text-[9px] tracking-[0.4px] text-white/45">EFIC. ATAQUE</div>
                        </div>
                        <div>
                          <div className="text-[24px] font-bold text-white">{dynStats.subImpact.after.recEff}%</div>
                          <div className="font-mono text-[9px] tracking-[0.4px] text-white/45">EFIC. RECP</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-[#11141a] border border-[#2e4a72]/50 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-6">
                  <Activity className="text-[#A191FF]" size={16} />
                  <h3 className="text-[13px] font-semibold text-white">Proyección Histórica (Últimos 5 partidos)</h3>
                </div>
                
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-[140px] font-mono text-[10px] tracking-[0.4px] text-white/60">ESTE PARTIDO (SO%)</div>
                    <div className="flex-1 h-[12px] bg-white/5 rounded-full relative overflow-hidden">
                      <div className="h-full bg-[#91CAFF] rounded-full" style={{ width: `${dynStats.sideOutPct}%` }} />
                    </div>
                    <div className="w-[40px] text-right font-mono text-[11px] text-white">{dynStats.sideOutPct}%</div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-[140px] font-mono text-[10px] tracking-[0.4px] text-white/60">PROMEDIO HISTÓRICO</div>
                    <div className="flex-1 h-[12px] bg-white/5 rounded-full relative overflow-hidden">
                      <div className="h-full bg-white/40 rounded-full" style={{ width: `${dynStats.historicalAvg?.sideOut || 0}%` }} />
                    </div>
                    <div className="w-[40px] text-right font-mono text-[11px] text-white">{dynStats.historicalAvg?.sideOut || 0}%</div>
                  </div>
                </div>
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
                            selected ? 'border-[#A191FF]/40 bg-[#A191FF]/5' : 'border-white/[0.08] hover:border-white/20'
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
            </div>

            <div className="shrink-0 px-6 py-4 border-t border-white/[0.06] flex justify-end gap-3">
              <button type="button" onClick={() => setIsDialogOpen(false)}
                className="px-4 py-2 text-[12px] font-semibold text-white/40 hover:text-white transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={state.players.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-[#A191FF] hover:bg-[#A191FF]/80 text-black text-[12px] font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                <Plus size={14} />Crear Partido
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* HIDDEN PRINTABLE REPORT */}
      <div id="pdf-preview-wrapper" className="hidden print:block absolute top-0 left-0 w-full bg-[#0A0A0E] z-[9999]">
         {dynStats && <PrintableMatchReport ref={printRef} dynStats={dynStats} match={dynStats.match} players={dynStats.players} />}
      </div>
    </div>
  );
}
