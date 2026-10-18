import React, { useState, useMemo, useRef } from 'react';

import { Download, Loader2, Plus, Target, Shield, Zap, Activity, Calendar, MapPin, Users, TrendingUp, RotateCw, Layers, Info } from 'lucide-react';
import { PrintableMatchReport } from './analytics/PrintableMatchReport';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts';
import { toast } from 'sonner';
import { useApp } from '../utils/AppContext';
import { AdvancedHeatmapDashboard } from './AdvancedHeatmapDashboard';
import {
  computeRotationStats,
  computeReceptionStats,
  computeAttackStats,
  computePointsByOrigin,
  computeServeStats,
  computeSetterDistribution,
  normalizeQuality,
  Rotation,
  AttackZone,
  AttackType,
  ServeType,
  SetTarget,
  CourtZone
} from '../utils/rallyModel';

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

  let prevWinnerBySet: Record<number, 'our' | 'rival'> = {};
  rallies.forEach((r: any) => {
    const oScore = r.ourScore ?? 0;
    const rScore = r.rivalScore ?? 0;
    const totalPts = oScore + rScore;
    const pIdx = totalPts <= 15 ? 0 : totalPts <= 32 ? 1 : 2;
    const sNum = r.setNum || 1;

    momentum.push({
      name: `${oScore}-${rScore}`,
      diff: oScore - rScore,
      ourScore: oScore,
      rivalScore: rScore
    });

    // Side-out and Transition based on servingTeam (or deduced from previous rally winner / first action)
    const firstAction = r.actions?.[0];
    const servingTeam: 'our' | 'rival' | null =
      r.servingTeam ||
      prevWinnerBySet[sNum] ||
      (firstAction && firstAction.gesture === 'saque'
        ? (firstAction.playerId ? 'our' : 'rival')
        : (firstAction && (firstAction.gesture === 'recepción' || firstAction.gesture === 'recepcion')
          ? 'rival'
          : null));

    if (servingTeam === 'our') {
      transitionChances++;
      if (r.winner === 'our') transitionSuccess++;
    } else if (servingTeam === 'rival') {
      sideOutChances++;
      if (r.winner === 'our') sideOutSuccess++;
    }
    if (r.winner === 'our' || r.winner === 'rival') {
      prevWinnerBySet[sNum] = r.winner;
    }

    if (r.actions && r.actions.length > 0) {
      r.actions.forEach((a: any) => {
        if (!a.playerId || !pStats[a.playerId]) return;
        const s = pStats[a.playerId];
        const nq = normalizeQuality(a.quality);
        const q = (nq === '#' || nq === '+') ? 'pos' : (nq === '=' || nq === '-') ? 'neg' : 'neu';
        
        teamBalance[q]++;
        
        const g = a.gesture?.toLowerCase();
        
        if (q === 'neg') {
          if (g === 'saque') errorPhaseFreq[pIdx].Saque++;
          else if (g === 'ataque' || g === 'ataque ' || g === 'dejada') errorPhaseFreq[pIdx].Ataque++;
          else if (g === 'recepción' || g === 'recepcion') errorPhaseFreq[pIdx].Recepcion++;
          else if (g === 'bloqueo') errorPhaseFreq[pIdx].Bloqueo++;
        }
        if (g === 'ataque' || g === 'ataque ' || g === 'dejada') {
          s.attacks[q]++;
          s.attacks.attempts++;
          if (nq === '#') s.attacks.kills++;
        }
        else if (g === 'saque') {
          s.serves[q]++;
          if (nq === '#') s.serves.aces++;
          if (nq === '=') s.serves.errors++;
        }
        else if (g === 'recepción' || g === 'recepcion') {
          s.receptions[q]++;
          s.receptions.attempts++;
          if (nq === '#') s.receptions.perfect++;
        }
        else if (g === 'bloqueo') {
          s.blocks[q]++;
          if (nq === '#') s.blocks.stuffs++;
        }
        else if (g === 'defensa') {
          s.digs[q]++;
        }
        else if (g === 'armado' || g === 'acomodo') {
          s.sets[q]++;
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
        else if (g === 'armado' || g === 'acomodo') {
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
      let histPrevWinnerBySet: Record<number, 'our' | 'rival'> = {};
      (m.rallies || []).forEach((r: any) => {
        const sNum = r.setNum || 1;
        const firstAction = r.actions?.[0];
        const servingTeam: 'our' | 'rival' | null =
          r.servingTeam ||
          histPrevWinnerBySet[sNum] ||
          (firstAction && firstAction.gesture === 'saque'
            ? (firstAction.playerId ? 'our' : 'rival')
            : (firstAction && (firstAction.gesture === 'recepción' || firstAction.gesture === 'recepcion')
              ? 'rival'
              : null));

        if (servingTeam === 'our') {
          histTrChances++;
          if (r.winner === 'our') histTrSuccess++;
        } else if (servingTeam === 'rival') {
          histSOChances++;
          if (r.winner === 'our') histSOSuccess++;
        }
        if (r.winner === 'our' || r.winner === 'rival') {
          histPrevWinnerBySet[sNum] = r.winner;
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
      p.receptions.attempts > 0 || p.blocks.pos > 0 || p.blocks.neg > 0 || p.blocks.neu > 0 ||
      p.digs.pos > 0 || p.digs.neg > 0 || p.digs.neu > 0 ||
      p.sets.pos > 0 || p.sets.neg > 0 || p.sets.neu > 0
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
  const [activeTab, setActiveTab] = useState<'heatmaps'|'efficiency'|'tactics'|'kpis'|'timeline'|'insights'>('efficiency');
  const [attackBreakdownTab, setAttackBreakdownTab] = useState<'player' | 'zone' | 'type' | 'blockers'>('player');
  const [serveBreakdownTab, setServeBreakdownTab] = useState<'player' | 'type' | 'destinations'>('player');
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

  const playerLookup = useMemo(() => {
    const map = new Map<string, any>();
    state.players.forEach(p => map.set(p.id, p));
    return map;
  }, [state.players]);

  const v2Stats = useMemo(() => {
    if (!dynStats?.rallies) return null;
    const rallies = dynStats.rallies;
    const isV2 = rallies.some((r: any) => r.rotation !== undefined && r.rotation !== null);
    const rotationStats = computeRotationStats(rallies);
    const receptionStats = computeReceptionStats(rallies);
    const attackStats = computeAttackStats(rallies);
    const pointsOrigin = computePointsByOrigin(rallies);
    const hasDetailedAttack = Object.values(attackStats.byBlockers).some(b => b.attempts > 0) ||
      Object.values(attackStats.byType).some(t => t.attempts > 0) ||
      Object.values(attackStats.byZone).some(z => z.attempts > 0);

    const serveStats = computeServeStats(rallies);
    const setterDistribution = computeSetterDistribution(rallies);
    const hasDetailedServe = Object.values(serveStats.byType).some(t => t.attempts > 0) ||
      Object.values(serveStats.destinations).some(d => d > 0);

    return {
      isV2,
      rotationStats,
      receptionStats,
      attackStats,
      pointsOrigin,
      hasDetailedAttack,
      serveStats,
      setterDistribution,
      hasDetailedServe
    };
  }, [dynStats?.rallies]);

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
        <div className="py-12 text-center border border-dashed border-white/[0.08] rounded-lg">
          <p className="text-[13px] text-white/40 mb-4">Sin partidos registrados.</p>
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
          <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-lg overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-[#A191FF] tracking-widest uppercase mb-1">{dynStats.match.matchType || 'Oficial'}</p>
                <p className="text-[18px] font-semibold text-white">vs {dynStats.match.opponent}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[24px] font-mono font-bold text-white leading-none">{dynStats.match.score || '0-0'}</span>
                <span className="text-[10px] tracking-wider px-2 py-0.5 rounded border uppercase"
                  style={dynStats.match.result === 'W'
                    ? { color: '#A191FF', borderColor: '#A191FF', backgroundColor: 'rgba(161,145,255,0.08)' }
                    : dynStats.match.result === 'D'
                    ? { color: '#FFD391', borderColor: '#FFD391', backgroundColor: 'rgba(255,211,145,0.08)' }
                    : { color: '#FF919F', borderColor: '#FF919F', backgroundColor: 'rgba(255,145,159,0.08)' }}>
                  {dynStats.match.result === 'W' ? 'Victoria' : dynStats.match.result === 'D' ? 'Empate' : 'Derrota'}
                </span>
              </div>
            </div>
          </div>

          {/* Custom Tabs Navigation */}
          <div className="flex gap-1 bg-[#0d0d0d] p-1 rounded-lg border border-white/[0.08] w-fit flex-wrap">
            <button onClick={() => setActiveTab('heatmaps')} className={`px-4 py-2 text-[11px] uppercase font-mono tracking-wider rounded transition-colors ${activeTab === 'heatmaps' ? 'bg-[#A191FF] text-black font-semibold' : 'text-white/40 hover:text-white'}`}>
              Resumen & Heatmaps
            </button>
            <button onClick={() => setActiveTab('efficiency')} className={`px-4 py-2 text-[11px] uppercase font-mono tracking-wider rounded transition-colors ${activeTab === 'efficiency' ? 'bg-[#A191FF] text-black font-semibold' : 'text-white/40 hover:text-white'}`}>
              Análisis de Eficiencia
            </button>
            <button onClick={() => setActiveTab('tactics')} className={`flex items-center gap-1.5 px-4 py-2 text-[11px] uppercase font-mono tracking-wider rounded transition-colors ${activeTab === 'tactics' ? 'bg-[#A191FF] text-black font-semibold' : 'text-white/40 hover:text-white'}`}>
              <RotateCw size={13} /> Táctica & Rotación
            </button>
            <button onClick={() => setActiveTab('kpis')} className={`px-4 py-2 text-[11px] uppercase font-mono tracking-wider rounded transition-colors ${activeTab === 'kpis' ? 'bg-[#A191FF] text-black font-semibold' : 'text-white/40 hover:text-white'}`}>
              KPIs Individuales
            </button>
            <button onClick={() => setActiveTab('timeline')} className={`px-4 py-2 text-[11px] uppercase font-mono tracking-wider rounded transition-colors ${activeTab === 'timeline' ? 'bg-[#A191FF] text-black font-semibold' : 'text-white/40 hover:text-white'}`}>
              Línea de Tiempo
            </button>
            <button onClick={() => setActiveTab('insights')} className={`flex items-center gap-2 px-4 py-2 text-[11px] uppercase font-mono tracking-wider rounded transition-colors ${activeTab === 'insights' ? 'bg-[#A191FF] text-black font-semibold' : 'text-white/40 hover:text-white'}`}>
              <Zap size={14} /> Insights
            </button>
          </div>

          {/* TAB 1: HEATMAPS & MOMENTUM */}
          {activeTab === 'heatmaps' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Momentum Line Chart */}
              {dynStats.momentum.length > 1 && (
                <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-lg p-5">
                  <p className="text-[12px] font-semibold text-[#A191FF] uppercase tracking-widest mb-4">Momentum del Partido (Diferencia de Puntos)</p>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dynStats.momentum} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" opacity={1} />
                        <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={20} />
                        <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }} labelStyle={{ color: '#A191FF', marginBottom: '4px' }} itemStyle={{ color: '#fff', fontSize: '12px' }} />
                        <ReferenceLine y={0} stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
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
              <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-lg p-5">
                <p className="text-[12px] font-semibold text-[#A191FF] uppercase tracking-widest mb-4">Balance General del Equipo</p>
                
                <div className="flex h-6 rounded-full overflow-hidden mb-3 bg-black">
                  {(() => {
                    const t = dynStats.teamBalance.pos + dynStats.teamBalance.neu + dynStats.teamBalance.neg;
                    if (t === 0) return <div className="w-full bg-white/[0.08]"></div>;
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
              <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-lg overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-white/[0.08] bg-white/[0.03]">
                      <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-white/40 font-semibold">Jugadora</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-white/40 font-semibold text-center">Ataques (+ / = / -)</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-white/40 font-semibold text-center">Saques (+ / = / -)</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-white/40 font-semibold text-center">Recepción (+ / = / -)</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-white/40 font-semibold text-center">Eficacia Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {dynStats.players.map((p: any) => {
                      const totalPos = p.attacks.pos + p.serves.pos + p.receptions.pos + p.blocks.pos + p.digs.pos + p.sets.pos;
                      const totalNeg = p.attacks.neg + p.serves.neg + p.receptions.neg + p.blocks.neg + p.digs.neg + p.sets.neg;
                      const totalAtt = totalPos + totalNeg + p.attacks.neu + p.serves.neu + p.receptions.neu + p.blocks.neu + p.digs.neu + p.sets.neu;
                      const eff = totalAtt > 0 ? ((totalPos - totalNeg) / totalAtt * 100).toFixed(1) : '0.0';

                      return (
                        <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-[13px] text-white font-medium">{p.name}</p>
                            <p className="text-[10px] text-white/40">{p.position}</p>
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
                        <td colSpan={5} className="px-4 py-8 text-center text-[12px] text-white/40">No hay jugadas registradas para evaluar jugadoras.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: TÁCTICA & ROTACIÓN (FASE 1) */}
          {activeTab === 'tactics' && v2Stats && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Header Context Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0d0d0d] border border-white/[0.08] rounded-lg p-5">
                <div>
                  <div className="flex items-center gap-2">
                    <RotateCw size={15} className="text-[#A191FF]" />
                    <h3 className="text-[14px] font-semibold text-white">Táctica de Partido y Rendimiento por Fase</h3>
                  </div>
                  <p className="text-[12px] text-white/50 mt-1">
                    Eficacia en Side-Out (K1), Break Point (K2), rotaciones P1 a P6, control de recepción, distribución de ataque y origen de puntos.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-[10px] tracking-wider uppercase px-2.5 py-1 rounded border border-white/[0.08] bg-white/[0.03] text-white/70">
                    Modo: {dynStats.match?.captureMode === 'completo' ? 'Completo' : 'Rápido'}
                  </span>
                  <span className="font-mono text-[10px] tracking-wider uppercase px-2.5 py-1 rounded border border-[#A191FF]/30 bg-[#A191FF]/10 text-[#A191FF]">
                    {v2Stats.isV2 ? 'Tracking v2' : 'Tracking Legado'}
                  </span>
                </div>
              </div>

              {/* 1. SECCIÓN ROTACIONES P1 A P6 */}
              <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[13px] font-semibold text-white">1. Desempeño por Rotación (P1 a P6)</h4>
                    <p className="text-[11px] text-white/40">Side-Out en recepción de saque rival (K1) vs Break Point en saque propio (K2)</p>
                  </div>
                  <span className="font-mono text-[10px] text-white/40 uppercase">6 Rotaciones</span>
                </div>

                {!v2Stats.isV2 ? (
                  <div className="py-10 text-center border border-dashed border-white/[0.08] rounded-lg bg-white/[0.01]">
                    <Info size={18} className="mx-auto text-white/30 mb-2" />
                    <p className="text-[12px] text-white/50">Métricas de rotación disponibles en partidos registrados con v2.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[620px]">
                      <thead>
                        <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                          <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-white/40">Rotación</th>
                          <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-white/40 text-center">Side-Out % (K1)</th>
                          <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-white/40 text-center">Break Point % (K2)</th>
                          <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-white/40 text-center">Rallies K1 (Ganados/Tot)</th>
                          <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-white/40 text-center">Rallies K2 (Ganados/Tot)</th>
                          <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-white/40 text-center">Diferencial Pts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {([1, 2, 3, 4, 5, 6] as Rotation[]).map(rot => {
                          const s = v2Stats.rotationStats[rot];
                          return (
                            <tr key={rot} className="hover:bg-white/[0.02] transition-colors">
                              <td className="px-4 py-3 font-mono font-bold text-[13px]">
                                <span className="px-2.5 py-1 rounded bg-[#A191FF]/10 text-[#A191FF] border border-[#A191FF]/30">
                                  P{rot}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-[13px]">
                                <span className={s.sideOutPct >= 50 ? 'text-[#91FFB0] font-semibold' : 'text-white/70'}>
                                  {s.sideOutPct}%
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-[13px]">
                                <span className={s.breakPointPct >= 40 ? 'text-[#91CAFF] font-semibold' : 'text-white/70'}>
                                  {s.breakPointPct}%
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-[12px] text-white/60">
                                {s.k1Wins} / {s.k1Rallies}
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-[12px] text-white/60">
                                {s.k2Wins} / {s.k2Rallies}
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-[13px] font-semibold">
                                <span className={s.pointDiff > 0 ? 'text-[#91FFB0]' : s.pointDiff < 0 ? 'text-[#FF919F]' : 'text-white/40'}>
                                  {s.pointDiff > 0 ? `+${s.pointDiff}` : s.pointDiff}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 2. SECCIÓN PUNTOS POR ORIGEN */}
              <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[13px] font-semibold text-white">2. Origen de los Puntos (Por Set)</h4>
                    <p className="text-[11px] text-white/40">Puntos ganados por mérito propio vs regalados por errores del rival</p>
                  </div>
                </div>

                {!v2Stats.pointsOrigin || v2Stats.pointsOrigin.length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-white/[0.08] rounded-lg bg-white/[0.01]">
                    <p className="text-[12px] text-white/50">Sin registros de puntos por set.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                          <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-white/40">Set</th>
                          <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-[#91FFB0] text-center">Nosotros: Ganados</th>
                          <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-[#A191FF] text-center">Nosotros: Error Rival</th>
                          <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-white font-bold text-center">Total Propios</th>
                          <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-white/60 text-center">Rival: Ganados</th>
                          <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-[#FF919F] text-center">Rival: Error Nuestro</th>
                          <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-white font-bold text-center">Total Rival</th>
                          <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-white/40 text-center">Diferencial Errores</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {v2Stats.pointsOrigin.map((setStat, idx) => {
                          const isTotal = setStat.setNum === 'total';
                          const errorDiff = setStat.regalado_rival - setStat.regalado_nuestro;
                          return (
                            <tr key={idx} className={isTotal ? 'bg-white/[0.04] font-semibold' : 'hover:bg-white/[0.02] transition-colors'}>
                              <td className="px-4 py-3 font-mono text-[12px] text-white">
                                {isTotal ? 'TOTAL' : `Set ${setStat.setNum}`}
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-[12px] text-[#91FFB0]">
                                {setStat.ganado}
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-[12px] text-[#A191FF]">
                                {setStat.regalado_rival}
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-[13px] font-bold text-white">
                                {setStat.totalOurPoints}
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-[12px] text-white/70">
                                {setStat.perdido}
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-[12px] text-[#FF919F]">
                                {setStat.regalado_nuestro}
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-[13px] font-bold text-white">
                                {setStat.totalRivalPoints}
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-[12px]">
                                <span className={errorDiff > 0 ? 'text-[#91FFB0]' : errorDiff < 0 ? 'text-[#FF919F]' : 'text-white/40'}>
                                  {errorDiff > 0 ? `+${errorDiff}` : errorDiff}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 3. SECCIÓN RECEPCIÓN */}
              <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[13px] font-semibold text-white">3. Control y Calidad de Recepción (Escala 5 Niveles)</h4>
                    <p className="text-[11px] text-white/40">Distribución de pases (#, +, !, -, =) y porcentaje de efectividad</p>
                  </div>
                </div>

                {!v2Stats.receptionStats || v2Stats.receptionStats.length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-white/[0.08] rounded-lg bg-white/[0.01]">
                    <p className="text-[12px] text-white/50">Sin acciones de recepción registradas en este partido.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                          <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-white/40">Jugadora</th>
                          <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-white/40 text-center">Total</th>
                          <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-[#91FFB0] text-center"># (Perf)</th>
                          <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-[#A191FF] text-center">+ (Pos)</th>
                          <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-white text-center">(+#)%</th>
                          <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-[#FFD391] text-center">! (Reg)</th>
                          <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-white/60 text-center">- (Mal)</th>
                          <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-[#FF919F] text-center">= (Ace rec)</th>
                          <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-[#A191FF] text-center">Eficiencia %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {v2Stats.receptionStats.map(r => {
                          const player = playerLookup.get(r.playerId);
                          const displayName = player ? `#${player.number ?? ''} ${player.name}` : `ID: ${r.playerId.slice(0, 8)}`;
                          const pos = player?.position || '';
                          return (
                            <tr key={r.playerId} className="hover:bg-white/[0.02] transition-colors">
                              <td className="px-4 py-3">
                                <p className="text-[13px] font-medium text-white">{displayName}</p>
                                {pos && <p className="text-[10px] text-white/40">{pos}</p>}
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-[12px] font-bold text-white">
                                {r.total}
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-[12px] text-[#91FFB0]">
                                {r.perfect} <span className="text-[10px] text-white/40">({r.perfectPct}%)</span>
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-[12px] text-[#A191FF]">
                                {r.positive}
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-[12px] font-semibold text-white">
                                {r.positivePct}%
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-[12px] text-[#FFD391]">
                                {r.neutral}
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-[12px] text-white/60">
                                {r.negative}
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-[12px] text-[#FF919F]">
                                {r.error}
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-[12px] font-bold">
                                <span className={`px-2 py-0.5 rounded ${
                                  r.efficiencyPct >= 35 ? 'bg-[#91FFB0]/10 text-[#91FFB0]' :
                                  r.efficiencyPct >= 15 ? 'bg-[#FFD391]/10 text-[#FFD391]' :
                                  'bg-[#FF919F]/10 text-[#FF919F]'
                                }`}>
                                  {r.efficiencyPct > 0 ? `+${r.efficiencyPct}` : r.efficiencyPct}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 4. SECCIÓN ATAQUE */}
              <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-lg p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-[13px] font-semibold text-white">4. Eficacia y Desglose de Ataque</h4>
                    <p className="text-[11px] text-white/40">Puntos, errores directos, bloqueos recibidos y porcentaje de eficacia</p>
                  </div>

                  {/* Subtabs for attack breakdown */}
                  <div className="flex gap-1 bg-white/[0.04] p-1 rounded-md border border-white/[0.06] self-start sm:self-auto flex-wrap">
                    <button
                      onClick={() => setAttackBreakdownTab('player')}
                      className={`px-3 py-1 text-[11px] font-mono uppercase rounded transition-colors ${
                        attackBreakdownTab === 'player' ? 'bg-[#A191FF] text-black font-semibold' : 'text-white/50 hover:text-white'
                      }`}>
                      Por Jugadora
                    </button>
                    <button
                      onClick={() => setAttackBreakdownTab('zone')}
                      className={`px-3 py-1 text-[11px] font-mono uppercase rounded transition-colors ${
                        attackBreakdownTab === 'zone' ? 'bg-[#A191FF] text-black font-semibold' : 'text-white/50 hover:text-white'
                      }`}>
                      Por Zona
                    </button>
                    <button
                      onClick={() => setAttackBreakdownTab('type')}
                      className={`px-3 py-1 text-[11px] font-mono uppercase rounded transition-colors ${
                        attackBreakdownTab === 'type' ? 'bg-[#A191FF] text-black font-semibold' : 'text-white/50 hover:text-white'
                      }`}>
                      Por Tipo
                    </button>
                    <button
                      onClick={() => setAttackBreakdownTab('blockers')}
                      className={`px-3 py-1 text-[11px] font-mono uppercase rounded transition-colors ${
                        attackBreakdownTab === 'blockers' ? 'bg-[#A191FF] text-black font-semibold' : 'text-white/50 hover:text-white'
                      }`}>
                      Por Bloqueadores
                    </button>
                  </div>
                </div>

                {!v2Stats.attackStats || v2Stats.attackStats.total.attempts === 0 ? (
                  <div className="py-8 text-center border border-dashed border-white/[0.08] rounded-lg bg-white/[0.01]">
                    <p className="text-[12px] text-white/50">Sin acciones de ataque registradas en este partido.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Summary KPIs */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <div className="bg-white/[0.02] border border-white/[0.06] p-3 rounded text-center">
                        <span className="block font-mono text-[10px] text-white/40 uppercase">Intentos</span>
                        <span className="font-mono text-[18px] font-bold text-white">{v2Stats.attackStats.total.attempts}</span>
                      </div>
                      <div className="bg-white/[0.02] border border-white/[0.06] p-3 rounded text-center">
                        <span className="block font-mono text-[10px] text-[#91FFB0] uppercase">Puntos (#)</span>
                        <span className="font-mono text-[18px] font-bold text-[#91FFB0]">{v2Stats.attackStats.total.kills}</span>
                      </div>
                      <div className="bg-white/[0.02] border border-white/[0.06] p-3 rounded text-center">
                        <span className="block font-mono text-[10px] text-[#FFD391] uppercase">Bloqueados</span>
                        <span className="font-mono text-[18px] font-bold text-[#FFD391]">{v2Stats.attackStats.total.blocked}</span>
                      </div>
                      <div className="bg-white/[0.02] border border-white/[0.06] p-3 rounded text-center">
                        <span className="block font-mono text-[10px] text-[#FF919F] uppercase">Errores (=)</span>
                        <span className="font-mono text-[18px] font-bold text-[#FF919F]">{v2Stats.attackStats.total.errors}</span>
                      </div>
                      <div className="bg-white/[0.02] border border-white/[0.06] p-3 rounded text-center col-span-2 sm:col-span-1">
                        <span className="block font-mono text-[10px] text-[#A191FF] uppercase">Eficacia %</span>
                        <span className="font-mono text-[18px] font-bold text-[#A191FF]">{v2Stats.attackStats.total.efficiencyPct}%</span>
                      </div>
                    </div>

                    {/* Subtab breakdown views */}
                    {attackBreakdownTab === 'player' && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[620px]">
                          <thead>
                            <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-white/40">Jugadora</th>
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-white/40 text-center">Intentos</th>
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-[#91FFB0] text-center">Kills (#)</th>
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-[#FFD391] text-center">Bloqueados</th>
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-[#FF919F] text-center">Errores (=)</th>
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-[#A191FF] text-center">Eficiencia %</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.06]">
                            {Object.entries(v2Stats.attackStats.byPlayer).map(([pId, s]) => {
                              const player = playerLookup.get(pId);
                              const displayName = player ? `#${player.number ?? ''} ${player.name}` : `ID: ${pId.slice(0, 8)}`;
                              return (
                                <tr key={pId} className="hover:bg-white/[0.02] transition-colors">
                                  <td className="px-4 py-3">
                                    <p className="text-[13px] font-medium text-white">{displayName}</p>
                                    {player?.position && <p className="text-[10px] text-white/40">{player.position}</p>}
                                  </td>
                                  <td className="px-4 py-3 text-center font-mono text-[12px] text-white font-bold">{s.attempts}</td>
                                  <td className="px-4 py-3 text-center font-mono text-[12px] text-[#91FFB0]">{s.kills}</td>
                                  <td className="px-4 py-3 text-center font-mono text-[12px] text-[#FFD391]">{s.blocked}</td>
                                  <td className="px-4 py-3 text-center font-mono text-[12px] text-[#FF919F]">{s.errors}</td>
                                  <td className="px-4 py-3 text-center font-mono text-[12px] font-semibold text-[#A191FF]">
                                    {s.efficiencyPct > 0 ? `+${s.efficiencyPct}` : s.efficiencyPct}%
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {attackBreakdownTab !== 'player' && !v2Stats.hasDetailedAttack && (
                      <div className="py-8 text-center border border-dashed border-white/[0.08] rounded-lg bg-white/[0.01]">
                        <Info size={16} className="mx-auto text-white/30 mb-2" />
                        <p className="text-[12px] text-white/50">
                          Detalles avanzados de ataque ({attackBreakdownTab === 'zone' ? 'zonas' : attackBreakdownTab === 'type' ? 'tipos' : 'bloqueadores'}) disponibles en partidos registrados en modo Completo.
                        </p>
                      </div>
                    )}

                    {attackBreakdownTab === 'zone' && v2Stats.hasDetailedAttack && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[500px]">
                          <thead>
                            <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-white/40">Zona de Red / Zaga</th>
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-white/40 text-center">Intentos</th>
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-[#91FFB0] text-center">Kills (#)</th>
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-[#FFD391] text-center">Bloqueados</th>
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-[#FF919F] text-center">Errores (=)</th>
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-[#A191FF] text-center">Eficiencia %</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.06]">
                            {([4, 3, 2, 1, 6, 5] as AttackZone[]).map(z => {
                              const s = v2Stats.attackStats.byZone[z];
                              const label = z === 4 ? 'Zona 4 (Punta / Ala Izq)' :
                                            z === 3 ? 'Zona 3 (Central)' :
                                            z === 2 ? 'Zona 2 (Opuesto / Ala Der)' :
                                            z === 1 ? 'Zona 1 (Zaga Der)' :
                                            z === 6 ? 'Zona 6 (Pipe / Fondo Centro)' :
                                            'Zona 5 (Zaga Izq)';
                              return (
                                <tr key={z} className="hover:bg-white/[0.02] transition-colors">
                                  <td className="px-4 py-3 font-medium text-[13px] text-white">
                                    <span className="font-mono text-[#A191FF] mr-2">Z{z}</span> {label}
                                  </td>
                                  <td className="px-4 py-3 text-center font-mono text-[12px] text-white font-bold">{s.attempts}</td>
                                  <td className="px-4 py-3 text-center font-mono text-[12px] text-[#91FFB0]">{s.kills}</td>
                                  <td className="px-4 py-3 text-center font-mono text-[12px] text-[#FFD391]">{s.blocked}</td>
                                  <td className="px-4 py-3 text-center font-mono text-[12px] text-[#FF919F]">{s.errors}</td>
                                  <td className="px-4 py-3 text-center font-mono text-[12px] font-semibold text-[#A191FF]">
                                    {s.efficiencyPct > 0 ? `+${s.efficiencyPct}` : s.efficiencyPct}%
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {attackBreakdownTab === 'type' && v2Stats.hasDetailedAttack && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[500px]">
                          <thead>
                            <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-white/40">Tipo de Balón</th>
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-white/40 text-center">Intentos</th>
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-[#91FFB0] text-center">Kills (#)</th>
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-[#FFD391] text-center">Bloqueados</th>
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-[#FF919F] text-center">Errores (=)</th>
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-[#A191FF] text-center">Eficiencia %</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.06]">
                            {(['alta', 'rapida', 'media', 'pipe', 'segunda'] as AttackType[]).map(t => {
                              const s = v2Stats.attackStats.byType[t];
                              const label = t === 'alta' ? 'Balón Alto' :
                                            t === 'rapida' ? 'Balón Rápido / Primer Tiempo' :
                                            t === 'media' ? 'Balón Medio' :
                                            t === 'pipe' ? 'Ataque Pipe (Zaga Centro)' :
                                            'Segunda Intención (Colocador)';
                              return (
                                <tr key={t} className="hover:bg-white/[0.02] transition-colors">
                                  <td className="px-4 py-3 font-medium text-[13px] text-white capitalize">{label}</td>
                                  <td className="px-4 py-3 text-center font-mono text-[12px] text-white font-bold">{s.attempts}</td>
                                  <td className="px-4 py-3 text-center font-mono text-[12px] text-[#91FFB0]">{s.kills}</td>
                                  <td className="px-4 py-3 text-center font-mono text-[12px] text-[#FFD391]">{s.blocked}</td>
                                  <td className="px-4 py-3 text-center font-mono text-[12px] text-[#FF919F]">{s.errors}</td>
                                  <td className="px-4 py-3 text-center font-mono text-[12px] font-semibold text-[#A191FF]">
                                    {s.efficiencyPct > 0 ? `+${s.efficiencyPct}` : s.efficiencyPct}%
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {attackBreakdownTab === 'blockers' && v2Stats.hasDetailedAttack && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[500px]">
                          <thead>
                            <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-white/40">Bloqueadores Rivales</th>
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-white/40 text-center">Intentos</th>
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-[#91FFB0] text-center">Kills (#)</th>
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-[#FFD391] text-center">Bloqueados</th>
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-[#FF919F] text-center">Errores (=)</th>
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-[#A191FF] text-center">Eficiencia %</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.06]">
                            {([0, 1, 2, 3] as const).map(b => {
                              const s = v2Stats.attackStats.byBlockers[b];
                              const label = b === 0 ? 'Sin Bloqueo' : b === 1 ? '1 Bloqueador' : b === 2 ? '2 Bloqueadores (Doble)' : '3 Bloqueadores (Triple)';
                              return (
                                <tr key={b} className="hover:bg-white/[0.02] transition-colors">
                                  <td className="px-4 py-3 font-medium text-[13px] text-white">{label}</td>
                                  <td className="px-4 py-3 text-center font-mono text-[12px] text-white font-bold">{s.attempts}</td>
                                  <td className="px-4 py-3 text-center font-mono text-[12px] text-[#91FFB0]">{s.kills}</td>
                                  <td className="px-4 py-3 text-center font-mono text-[12px] text-[#FFD391]">{s.blocked}</td>
                                  <td className="px-4 py-3 text-center font-mono text-[12px] text-[#FF919F]">{s.errors}</td>
                                  <td className="px-4 py-3 text-center font-mono text-[12px] font-semibold text-[#A191FF]">
                                    {s.efficiencyPct > 0 ? `+${s.efficiencyPct}` : s.efficiencyPct}%
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 5. SECCIÓN SAQUE */}
              <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-lg p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-[13px] font-semibold text-white">5. Eficacia y Control de Saque</h4>
                    <p className="text-[11px] text-white/40">Aces, errores directos, calidad del servicio y zonas de destino</p>
                  </div>

                  {/* Subtabs for serve breakdown */}
                  <div className="flex gap-1 bg-white/[0.04] p-1 rounded-md border border-white/[0.06] self-start sm:self-auto flex-wrap">
                    <button
                      onClick={() => setServeBreakdownTab('player')}
                      className={`px-3 py-1 text-[11px] font-mono uppercase rounded transition-colors ${
                        serveBreakdownTab === 'player' ? 'bg-[#A191FF] text-black font-semibold' : 'text-white/50 hover:text-white'
                      }`}>
                      Por Jugadora
                    </button>
                    <button
                      onClick={() => setServeBreakdownTab('type')}
                      className={`px-3 py-1 text-[11px] font-mono uppercase rounded transition-colors ${
                        serveBreakdownTab === 'type' ? 'bg-[#A191FF] text-black font-semibold' : 'text-white/50 hover:text-white'
                      }`}>
                      Por Tipo
                    </button>
                    <button
                      onClick={() => setServeBreakdownTab('destinations')}
                      className={`px-3 py-1 text-[11px] font-mono uppercase rounded transition-colors ${
                        serveBreakdownTab === 'destinations' ? 'bg-[#A191FF] text-black font-semibold' : 'text-white/50 hover:text-white'
                      }`}>
                      Mapa Destino (serveTo)
                    </button>
                  </div>
                </div>

                {!v2Stats.serveStats || v2Stats.serveStats.total.attempts === 0 ? (
                  <div className="py-8 text-center border border-dashed border-white/[0.08] rounded-lg bg-white/[0.01]">
                    <p className="text-[12px] text-white/50">Sin acciones de saque registradas en este partido.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Summary KPIs */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <div className="bg-white/[0.02] border border-white/[0.06] p-3 rounded text-center">
                        <span className="block font-mono text-[10px] text-white/40 uppercase">Total Saques</span>
                        <span className="font-mono text-[18px] font-bold text-white">{v2Stats.serveStats.total.attempts}</span>
                      </div>
                      <div className="bg-white/[0.02] border border-white/[0.06] p-3 rounded text-center">
                        <span className="block font-mono text-[10px] text-[#91FFB0] uppercase">Aces (#)</span>
                        <span className="font-mono text-[18px] font-bold text-[#91FFB0]">{v2Stats.serveStats.total.aces}</span>
                      </div>
                      <div className="bg-white/[0.02] border border-white/[0.06] p-3 rounded text-center">
                        <span className="block font-mono text-[10px] text-[#A191FF] uppercase">Positivos (+)</span>
                        <span className="font-mono text-[18px] font-bold text-[#A191FF]">{v2Stats.serveStats.total.positive}</span>
                      </div>
                      <div className="bg-white/[0.02] border border-white/[0.06] p-3 rounded text-center">
                        <span className="block font-mono text-[10px] text-[#FF919F] uppercase">Errores (=)</span>
                        <span className="font-mono text-[18px] font-bold text-[#FF919F]">{v2Stats.serveStats.total.errors}</span>
                      </div>
                      <div className="bg-white/[0.02] border border-white/[0.06] p-3 rounded text-center col-span-2 sm:col-span-1">
                        <span className="block font-mono text-[10px] text-[#FFD391] uppercase">Eficiencia %</span>
                        <span className="font-mono text-[18px] font-bold text-[#FFD391]">{v2Stats.serveStats.total.efficiencyPct}%</span>
                      </div>
                    </div>

                    {serveBreakdownTab === 'player' && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[620px]">
                          <thead>
                            <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-white/40">Jugadora</th>
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-white/40 text-center">Total Saques</th>
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-[#91FFB0] text-center">Aces (#)</th>
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-[#A191FF] text-center">Positivos (+)</th>
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-[#FFD391] text-center">Regulares (!)</th>
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-white/50 text-center">Negativos (-)</th>
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-[#FF919F] text-center">Errores (=)</th>
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-white text-center">Eficiencia %</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.06]">
                            {Object.entries(v2Stats.serveStats.byPlayer).map(([pId, s]) => {
                              const player = playerLookup.get(pId);
                              const displayName = player ? `#${player.number ?? ''} ${player.name}` : `ID: ${pId.slice(0, 8)}`;
                              return (
                                <tr key={pId} className="hover:bg-white/[0.02] transition-colors">
                                  <td className="px-4 py-3">
                                    <p className="text-[13px] font-medium text-white">{displayName}</p>
                                    {player?.position && <p className="text-[10px] text-white/40">{player.position}</p>}
                                  </td>
                                  <td className="px-4 py-3 text-center font-mono text-[12px] text-white font-bold">{s.attempts}</td>
                                  <td className="px-4 py-3 text-center font-mono text-[12px] text-[#91FFB0]">{s.aces}</td>
                                  <td className="px-4 py-3 text-center font-mono text-[12px] text-[#A191FF]">{s.positive}</td>
                                  <td className="px-4 py-3 text-center font-mono text-[12px] text-[#FFD391]">{s.neutral}</td>
                                  <td className="px-4 py-3 text-center font-mono text-[12px] text-white/50">{s.negative}</td>
                                  <td className="px-4 py-3 text-center font-mono text-[12px] text-[#FF919F]">{s.errors}</td>
                                  <td className="px-4 py-3 text-center font-mono text-[12px] font-semibold text-[#FFD391]">
                                    {s.efficiencyPct > 0 ? `+${s.efficiencyPct}` : s.efficiencyPct}%
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {serveBreakdownTab !== 'player' && !v2Stats.hasDetailedServe && (
                      <div className="py-8 text-center border border-dashed border-white/[0.08] rounded-lg bg-white/[0.01]">
                        <Info size={16} className="mx-auto text-white/30 mb-2" />
                        <p className="text-[12px] text-white/50">
                          Detalles de saque ({serveBreakdownTab === 'type' ? 'tipo de saque' : 'mapa de destino'}) disponibles en partidos registrados en modo Completo.
                        </p>
                      </div>
                    )}

                    {serveBreakdownTab === 'type' && v2Stats.hasDetailedServe && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[500px]">
                          <thead>
                            <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-white/40">Tipo de Saque</th>
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-white/40 text-center">Intentos</th>
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-[#91FFB0] text-center">Aces (#)</th>
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-[#A191FF] text-center">Positivos (+)</th>
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-[#FF919F] text-center">Errores (=)</th>
                              <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-white text-center">Eficiencia %</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.06]">
                            {(['flotado', 'salto', 'salto_flotado'] as ServeType[]).map(st => {
                              const s = v2Stats.serveStats.byType[st];
                              const label = st === 'flotado' ? 'Saque Flotado' : st === 'salto' ? 'Saque Potencia / Salto' : 'Salto-Flotado';
                              return (
                                <tr key={st} className="hover:bg-white/[0.02] transition-colors">
                                  <td className="px-4 py-3 font-medium text-[13px] text-white">{label}</td>
                                  <td className="px-4 py-3 text-center font-mono text-[12px] text-white font-bold">{s.attempts}</td>
                                  <td className="px-4 py-3 text-center font-mono text-[12px] text-[#91FFB0]">{s.aces}</td>
                                  <td className="px-4 py-3 text-center font-mono text-[12px] text-[#A191FF]">{s.positive}</td>
                                  <td className="px-4 py-3 text-center font-mono text-[12px] text-[#FF919F]">{s.errors}</td>
                                  <td className="px-4 py-3 text-center font-mono text-[12px] font-semibold text-[#FFD391]">
                                    {s.efficiencyPct > 0 ? `+${s.efficiencyPct}` : s.efficiencyPct}%
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {serveBreakdownTab === 'destinations' && v2Stats.hasDetailedServe && (
                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                        {([1, 2, 3, 4, 5, 6] as CourtZone[]).map(z => {
                          const count = v2Stats.serveStats.destinations[z] || 0;
                          const totalServes = v2Stats.serveStats.total.attempts;
                          const pct = totalServes > 0 ? Math.round((count / totalServes) * 100) : 0;
                          return (
                            <div key={z} className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4 text-center">
                              <span className="font-mono text-[11px] text-[#A191FF] uppercase font-bold block mb-1">Zona {z}</span>
                              <span className="font-mono text-[22px] font-bold text-white block">{count}</span>
                              <span className="font-mono text-[10px] text-white/40 block mt-1">{pct}% del total</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 6. SECCIÓN DISTRIBUCIÓN DEL COLOCADOR */}
              <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[13px] font-semibold text-white">6. Distribución del Colocador (Pase vs Destino)</h4>
                    <p className="text-[11px] text-white/40">Frecuencia y porcentaje de armado según la calidad de la recepción previa</p>
                  </div>
                  <span className="font-mono text-[10px] text-white/40 uppercase">
                    {v2Stats.setterDistribution.totalSets} Armados analizados
                  </span>
                </div>

                {v2Stats.setterDistribution.totalSets === 0 ? (
                  <div className="py-8 text-center border border-dashed border-white/[0.08] rounded-lg bg-white/[0.01]">
                    <Info size={16} className="mx-auto text-white/30 mb-2" />
                    <p className="text-[12px] text-white/50">
                      Sin datos de distribución de colocador. Se requiere registrar recepción y armado con destino en el mismo rally (modo Completo).
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[620px]">
                      <thead>
                        <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                          <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-white/40">Calidad Recepción Previa</th>
                          <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-[#A191FF] text-center">Z4 (Punta)</th>
                          <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-[#91FFB0] text-center">Z3 (Central)</th>
                          <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-[#91CAFF] text-center">Z2 (Opuesto)</th>
                          <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-[#FFD391] text-center">Pipe (Z6)</th>
                          <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-white/70 text-center">Zaga (Z1)</th>
                          <th className="px-4 py-2.5 text-[10px] uppercase font-mono tracking-wider text-white font-bold text-center">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {([
                          { q: '#' as const, label: 'Perfecta (#)', color: 'text-[#91FFB0]' },
                          { q: '+' as const, label: 'Positiva (+)', color: 'text-[#A191FF]' },
                          { q: '!' as const, label: 'Regular (!)', color: 'text-[#FFD391]' },
                          { q: '-' as const, label: 'Mala (-)', color: 'text-[#FF919F]' }
                        ]).map(({ q, label, color }) => {
                          const totalQ = v2Stats.setterDistribution.totalsByQuality[q];
                          return (
                            <tr key={q} className="hover:bg-white/[0.02] transition-colors">
                              <td className={`px-4 py-3 font-medium text-[13px] ${color}`}>
                                {label}
                              </td>
                              {([4, 3, 2, 6, 1] as SetTarget[]).map(t => {
                                const count = v2Stats.setterDistribution.matrix[q][t];
                                const pct = v2Stats.setterDistribution.percentages[q][t];
                                return (
                                  <td key={t} className="px-4 py-3 text-center font-mono text-[12px]">
                                    <span className="text-white font-bold">{count}</span>
                                    <span className="text-[10px] text-white/40 ml-1.5">({pct}%)</span>
                                  </td>
                                );
                              })}
                              <td className="px-4 py-3 text-center font-mono text-[13px] font-bold text-white bg-white/[0.02]">
                                {totalQ}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-white/[0.08] bg-white/[0.03] font-semibold">
                          <td className="px-4 py-3 text-[12px] font-mono text-white/60 uppercase">Total Por Destino</td>
                          {([4, 3, 2, 6, 1] as SetTarget[]).map(t => {
                            const tot = v2Stats.setterDistribution.totalsByTarget[t];
                            const totSets = v2Stats.setterDistribution.totalSets;
                            const pct = totSets > 0 ? Math.round((tot / totSets) * 100) : 0;
                            return (
                              <td key={t} className="px-4 py-3 text-center font-mono text-[12px]">
                                <span className="text-[#A191FF] font-bold">{tot}</span>
                                <span className="text-[10px] text-white/40 ml-1.5">({pct}%)</span>
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 text-center font-mono text-[13px] font-bold text-[#A191FF] bg-white/[0.04]">
                            {v2Stats.setterDistribution.totalSets}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: INDIVIDUAL KPIs */}
          {activeTab === 'kpis' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              {/* General KPIs */}
              <div className="grid grid-cols-2 divide-x divide-white/[0.08] bg-[#0d0d0d] border border-white/[0.08] rounded-lg">
                <div className="px-5 py-4 text-center">
                  <p className="text-[26px] font-bold font-mono text-[#A191FF]">{dynStats.sideOutPct}%</p>
                  <p className="text-[10px] uppercase tracking-widest text-white/40 mt-1">Side-Out</p>
                </div>
                <div className="px-5 py-4 text-center">
                  <p className="text-[26px] font-bold font-mono text-white">{dynStats.transPct}%</p>
                  <p className="text-[10px] uppercase tracking-widest text-white/40 mt-1">Transición</p>
                </div>
              </div>

              {/* Fundament tabs + chart */}
              <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-lg overflow-hidden">
                <div className="border-b border-white/[0.08] flex gap-0 px-2">
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
                          : 'border-transparent text-white/40 hover:text-white'
                      }`}>
                      <Icon size={12} />{label}
                    </button>
                  ))}
                </div>
                <div className="px-5 py-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData(selectedFundament)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" opacity={1} />
                      <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
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
                    <div key={player.id} className="bg-[#0d0d0d] border border-white/[0.08] rounded-lg overflow-hidden">
                      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                        <p className="text-[13px] font-semibold text-white">{player.name}</p>
                        <span className="text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded"
                          style={{ color: posColor, backgroundColor: `${posColor}15` }}>
                          {player.position}
                        </span>
                      </div>
                      <div className="px-4 py-3 space-y-3">
                        {kpis.includes('attacks') && (
                          <div>
                            <p className="text-[9px] uppercase tracking-widest text-white/40 flex items-center gap-1.5 mb-1.5"><Target size={10} />Ataque</p>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-white/[0.03] border border-white/[0.08] rounded p-2 text-center">
                                <p className="text-[16px] font-bold font-mono text-white">
                                  {player.attacks.attempts > 0 ? (((player.attacks.pos - player.attacks.neg) / player.attacks.attempts) * 100).toFixed(1) : 0}%
                                </p>
                                <p className="text-[9px] font-mono text-white/40">EFICACIA</p>
                              </div>
                              <div className="bg-white/[0.03] border border-white/[0.08] rounded p-2 text-center">
                                <p className="text-[16px] font-bold font-mono text-white">{player.attacks.pos}/{player.attacks.attempts}</p>
                                <p className="text-[9px] font-mono text-white/40">KILLS (+)</p>
                              </div>
                            </div>
                          </div>
                        )}
                        {kpis.includes('serves') && (
                          <div>
                            <p className="text-[9px] uppercase tracking-widest text-white/40 flex items-center gap-1.5 mb-1.5"><Zap size={10} />Saque</p>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-white/[0.03] border border-white/[0.08] rounded p-2 text-center">
                                <p className="text-[16px] font-bold font-mono text-[#A191FF]">{player.serves.pos}</p>
                                <p className="text-[9px] font-mono text-white/40">ACES</p>
                              </div>
                              <div className="bg-white/[0.03] border border-white/[0.08] rounded p-2 text-center">
                                <p className="text-[16px] font-bold font-mono text-[#FF919F]">{player.serves.neg}</p>
                                <p className="text-[9px] font-mono text-white/40">ERRORES</p>
                              </div>
                            </div>
                          </div>
                        )}
                        {kpis.includes('reception') && (
                          <div>
                            <p className="text-[9px] uppercase tracking-widest text-white/40 flex items-center gap-1.5 mb-1.5"><Activity size={10} />Recepción</p>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-white/[0.03] border border-white/[0.08] rounded p-2 text-center">
                                <p className="text-[16px] font-bold font-mono text-white">
                                  {player.receptions.attempts > 0 ? ((player.receptions.pos - player.receptions.neg) / player.receptions.attempts).toFixed(2) : 0}
                                </p>
                                <p className="text-[9px] font-mono text-white/40">EFICIENCIA</p>
                              </div>
                              <div className="bg-white/[0.03] border border-white/[0.08] rounded p-2 text-center">
                                <p className="text-[16px] font-bold font-mono text-[#A191FF]">{player.receptions.pos}/{player.receptions.attempts}</p>
                                <p className="text-[9px] font-mono text-white/40">PERFECTAS</p>
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
              
              <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-lg p-5">
                <p className="text-[12px] font-semibold text-[#A191FF] uppercase tracking-widest mb-4">Frecuencia de Errores por Fase de Set</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dynStats.errorPhaseFreq} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" opacity={1} />
                      <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip {...CHART_TOOLTIP} />
                      <Bar dataKey="Saque" stackId="a" fill="#FFD391" name="Errores de Saque" />
                      <Bar dataKey="Ataque" stackId="a" fill="#A191FF" name="Errores de Ataque/Dejada" />
                      <Bar dataKey="Recepcion" stackId="a" fill="#91FFB0" name="Errores de Recepción" />
                      <Bar dataKey="Bloqueo" stackId="a" fill="#DC91FF" name="Errores de Bloqueo" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {dynStats.match.timeline && dynStats.match.timeline.length > 0 && (
                <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-lg p-5">
                  <p className="text-[12px] font-semibold text-[#A191FF] uppercase tracking-widest mb-4">Línea de Tiempo del Partido</p>
                  <div className="space-y-3 pl-2 border-l border-white/[0.08]">
                    {dynStats.match.timeline.map((evt: any, i: number) => (
                      <div key={i} className="relative pl-4">
                        <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-[#A191FF]"></div>
                        <p className="text-[11px] text-white/40 font-mono mb-1">
                          {evt.type === 'timeout' ? 'TIEMPO FUERA' : evt.type === 'sub' ? 'CAMBIO' : 'RALLY'}
                        </p>
                        {evt.type === 'timeout' && (
                          <p className="text-[13px] text-white">
                            Tiempo pedido por <span className={evt.team === 'our' ? 'text-[#A191FF]' : 'text-[#FF919F]'}>{evt.team === 'our' ? 'Nosotros' : 'Rival'}</span> (Marcador: {evt.ourScore}-{evt.rivalScore})
                          </p>
                        )}
                        {evt.type === 'sub' && (
                          <p className="text-[13px] text-white">
                            Entra <span className="text-[#A191FF]">{evt.in}</span> x Sale <span className="text-white/40">{evt.out}</span>
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
              
              <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-lg p-5">
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
                      <div className="font-mono text-[11px] tracking-[1.4px] text-[#FFD391] mb-6">ANTES DEL CAMBIO</div>
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

              <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-lg p-5">
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
