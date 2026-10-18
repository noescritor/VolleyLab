import React, { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import { FileText, Download, TrendingUp, Target, Award, AlertTriangle, Sparkles } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useApp } from '../utils/AppContext';

const CHART_TOOLTIP = {
  contentStyle: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6 },
  labelStyle:   { color: 'var(--muted-foreground)', fontSize: 11 },
  itemStyle:    { color: 'var(--foreground)', fontSize: 12 },
};

const positionKPIs: Record<string, any> = {
  Opuesto: {
    primary: ['Hitting%', 'Aces/Set', 'Stuffs/Set'],
    secondary: ['Kill%', 'Saque Error%', 'Pipe Attack%'],
    targets: {
      'Hitting%':   { excellent: 45, good: 40, min: 35 },
      'Aces/Set':   { excellent: 1.5, good: 1.0, min: 0.5 },
      'Stuffs/Set': { excellent: 1.0, good: 0.7, min: 0.4 },
    }
  },
  Punta: {
    primary: ['Hitting%', 'Reception Eff', 'Side-Out%'],
    secondary: ['Kill%', 'Perfect Reception%', 'Dig/Set'],
    targets: {
      'Hitting%':      { excellent: 40, good: 35, min: 30 },
      'Reception Eff': { excellent: 2.5, good: 2.2, min: 1.8 },
      'Side-Out%':     { excellent: 70, good: 65, min: 60 },
    }
  },
  Central: {
    primary: ['Hitting% Rápidas', 'Stuff Blocks/Set', 'First Tempo%'],
    secondary: ['Quick Attack%', 'Block Participation', 'Saque Float%'],
    targets: {
      'Hitting% Rápidas':  { excellent: 55, good: 50, min: 45 },
      'Stuff Blocks/Set':  { excellent: 1.2, good: 0.8, min: 0.5 },
      'First Tempo%':      { excellent: 80, good: 70, min: 60 },
    }
  },
  Colocador: {
    primary: ['Side-Out%', 'Set Distribution', 'Dump Points'],
    secondary: ['Perfect Sets%', 'Quick Ball%', 'Reading%'],
    targets: {
      'Side-Out%':       { excellent: 70, good: 65, min: 60 },
      'Set Distribution':{ excellent: 85, good: 80, min: 75 },
      'Dump Points':     { excellent: 3, good: 2, min: 1 },
    }
  },
  Líbero: {
    primary: ['Reception Eff', 'Dig Quality', 'Organization'],
    secondary: ['Perfect Reception%', 'Transition Digs%', 'Leadership'],
    targets: {
      'Reception Eff': { excellent: 2.7, good: 2.4, min: 2.0 },
      'Dig Quality':   { excellent: 2.5, good: 2.2, min: 1.8 },
      'Organization':  { excellent: 90, good: 85, min: 80 },
    }
  }
};

function getLevel(value: number | null | undefined, kpi: string, posKPI: any) {
  if (value === null || value === undefined || !posKPI?.targets?.[kpi]) return 'unknown';
  const t = posKPI.targets[kpi];
  if (value >= t.excellent) return 'excellent';
  if (value >= t.good)      return 'good';
  if (value >= t.min)       return 'average';
  return 'below';
}

function levelStyle(level: string) {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    excellent: { color: '#91FFB0', bg: 'rgba(145,255,176,0.08)', label: 'EXCELENTE' },
    good:      { color: '#91CAFF', bg: 'rgba(145,202,255,0.08)', label: 'BUENO'     },
    average:   { color: '#FFD391', bg: 'rgba(255,211,145,0.08)', label: 'PROMEDIO'  },
    below:     { color: '#FF919F', bg: 'rgba(255,145,159,0.08)', label: 'BAJO'      },
    unknown:   { color: 'rgba(255,255,255,0.25)', bg: 'rgba(255,255,255,0.04)', label: 'SIN DATOS' },
  };
  return map[level] || map.unknown;
}

function levelTextColor(level: string) {
  const m: Record<string, string> = {
    excellent: '#91FFB0', good: '#91CAFF', average: '#FFD391', below: '#FF919F', unknown: 'rgba(255,255,255,0.25)'
  };
  return m[level] || m.unknown;
}

const PHYSICAL_TARGETS: Record<string, { CMJ: number; SpikeSpeed: number; Agility: number }> = {
  Opuesto:   { CMJ: 75, SpikeSpeed: 85, Agility: 8.8 },
  Punta:     { CMJ: 65, SpikeSpeed: 75, Agility: 9.2 },
  Central:   { CMJ: 70, SpikeSpeed: 80, Agility: 9.0 },
  Colocador: { CMJ: 58, SpikeSpeed: 70, Agility: 9.5 },
  Líbero:    { CMJ: 50, SpikeSpeed: 63, Agility: 8.2 },
};

function computeRealPlayerReport(player: any, matches: any[], physicalTests: any[]) {
  const position = player.position || 'Punta';
  let attacksPos = 0, attacksNeg = 0, attacksAtt = 0;
  let servesPos = 0, servesAtt = 0;
  let recPos = 0, recNeu = 0, recNeg = 0, recAtt = 0;
  let blocksPos = 0;
  let digsPos = 0, digsNeu = 0, digsNeg = 0, digsAtt = 0;
  let setsPos = 0, setsNeu = 0, setsNeg = 0, setsAtt = 0;
  let setsPlayed = 0;

  let sideOutChances = 0, sideOutSuccess = 0;
  let set20Att = 0, set20Pos = 0;
  let deuceAtt = 0, deucePos = 0;

  (matches || []).forEach((m: any) => {
    const rallies = m.rallies || [];
    const setsInMatch = new Set<number>();
    let prevWinnerBySet: Record<number, 'our' | 'rival'> = {};

    rallies.forEach((r: any) => {
      const sNum = r.setNum || 1;
      const oScore = r.ourScore ?? 0;
      const rScore = r.rivalScore ?? 0;
      const firstAction = r.actions?.[0];
      const servingTeam: 'our' | 'rival' | null =
        r.servingTeam ||
        prevWinnerBySet[sNum] ||
        (firstAction && firstAction.gesture === 'saque'
          ? (firstAction.playerId ? 'our' : 'rival')
          : (firstAction && (firstAction.gesture === 'recepción' || firstAction.gesture === 'recepcion')
            ? 'rival'
            : null));

      if (r.winner === 'our' || r.winner === 'rival') {
        prevWinnerBySet[sNum] = r.winner;
      }

      const actions = r.actions || [];
      const playerParticipated = actions.some((a: any) => a.playerId === player.id) ||
        (r.lineup && Object.values(r.lineup).includes(player.id));

      if (playerParticipated) {
        setsInMatch.add(sNum);
        if (servingTeam === 'rival') {
          sideOutChances++;
          if (r.winner === 'our') sideOutSuccess++;
        }
      }

      actions.forEach((a: any) => {
        if (a.playerId !== player.id) return;
        const q = (a.quality === 'pos' || a.quality === '+') ? 'pos' : (a.quality === 'neg' || a.quality === '-') ? 'neg' : 'neu';
        const g = a.gesture?.toLowerCase();

        if (oScore >= 20 || rScore >= 20) {
          set20Att++;
          if (q === 'pos') set20Pos++;
        }
        if (oScore >= 24 && rScore >= 24) {
          deuceAtt++;
          if (q === 'pos') deucePos++;
        }

        if (g === 'ataque' || g === 'ataque ' || g === 'dejada') {
          attacksAtt++;
          if (q === 'pos') attacksPos++;
          if (q === 'neg') attacksNeg++;
        } else if (g === 'saque') {
          servesAtt++;
          if (q === 'pos') servesPos++;
        } else if (g === 'recepción' || g === 'recepcion') {
          recAtt++;
          if (q === 'pos') recPos++;
          else if (q === 'neu') recNeu++;
          else recNeg++;
        } else if (g === 'bloqueo') {
          if (q === 'pos') blocksPos++;
        } else if (g === 'defensa') {
          digsAtt++;
          if (q === 'pos') digsPos++;
          else if (q === 'neu') digsNeu++;
          else digsNeg++;
        } else if (g === 'armado' || g === 'acomodo') {
          setsAtt++;
          if (q === 'pos') setsPos++;
          else if (q === 'neu') setsNeu++;
          else setsNeg++;
        }
      });
    });

    setsPlayed += setsInMatch.size;
  });

  const hasMatchData = (attacksAtt + servesAtt + recAtt + blocksPos + digsAtt + setsAtt) > 0;
  const effSets = Math.max(1, setsPlayed);

  const hittingPct = attacksAtt > 0 ? Math.max(0, ((attacksPos - attacksNeg) / attacksAtt) * 100) : null;
  const acesPerSet = hasMatchData ? servesPos / effSets : null;
  const stuffsPerSet = hasMatchData ? blocksPos / effSets : null;
  const recEff = recAtt > 0 ? ((recPos * 3 + recNeu * 2 + recNeg * 0.5) / recAtt) : null;
  const sideOutPct = sideOutChances > 0 ? (sideOutSuccess / sideOutChances) * 100 : null;
  const digQuality = digsAtt > 0 ? ((digsPos * 3 + digsNeu * 2 + digsNeg * 0.5) / digsAtt) : null;
  const setDist = setsAtt > 0 ? ((setsPos + setsNeu) / setsAtt) * 100 : null;
  const orgScore = (recAtt + digsAtt) > 0 ? (((recPos + digsPos + recNeu + digsNeu) / (recAtt + digsAtt)) * 100) : null;

  const statsByPos: Record<string, Record<string, number | null>> = {
    Opuesto:   { 'Hitting%': hittingPct, 'Aces/Set': acesPerSet, 'Stuffs/Set': stuffsPerSet },
    Punta:     { 'Hitting%': hittingPct, 'Reception Eff': recEff, 'Side-Out%': sideOutPct },
    Central:   { 'Hitting% Rápidas': hittingPct, 'Stuff Blocks/Set': stuffsPerSet, 'First Tempo%': sideOutPct },
    Colocador: { 'Side-Out%': sideOutPct, 'Set Distribution': setDist, 'Dump Points': attacksPos > 0 ? attacksPos : null },
    Líbero:    { 'Reception Eff': recEff, 'Dig Quality': digQuality, 'Organization': orgScore },
  };

  // Real physical tests sorted by date desc
  const pTests = (physicalTests || [])
    .filter((t: any) => t.playerId === player.id)
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const targets = PHYSICAL_TARGETS[position] || PHYSICAL_TARGETS.Punta;
  const latest = pTests[0];
  const prev   = pTests[1];

  const physicalProgress: Record<string, { current: number; previous: number; target: number }> = {};
  if (latest?.CMJ) {
    physicalProgress.CMJ = {
      current: Number(latest.CMJ),
      previous: Number(prev?.CMJ ?? latest.CMJ),
      target: targets.CMJ,
    };
  }
  if (latest?.spikeSpeed) {
    physicalProgress.SpikeSpeed = {
      current: Number(latest.spikeSpeed),
      previous: Number(prev?.spikeSpeed ?? latest.spikeSpeed),
      target: targets.SpikeSpeed,
    };
  }
  if (latest?.tTest) {
    physicalProgress.Agility = {
      current: Number(latest.tTest),
      previous: Number(prev?.tTest ?? latest.tTest),
      target: targets.Agility,
    };
  }

  const hasClutchData = set20Att > 0 || deuceAtt > 0;
  const set20Pct = set20Att > 0 ? Math.round((set20Pos / set20Att) * 1000) / 10 : null;
  const deucePct = deuceAtt > 0 ? Math.round((deucePos / deuceAtt) * 1000) / 10 : null;
  const overallClutch = hasClutchData
    ? Math.round((((set20Pct ?? 0) + (deucePct ?? set20Pct ?? 0)) / (deucePct !== null && set20Pct !== null ? 2 : 1)) * 10) / 10
    : null;

  return {
    id: player.id,
    name: player.name,
    position,
    hasMatchData,
    hasPhysicalData: Object.keys(physicalProgress).length > 0,
    hasClutchData,
    stats: statsByPos[position] || statsByPos.Punta,
    physicalProgress,
    clutchPerformance: {
      set20Plus: set20Pct,
      deuce: deucePct,
      overall: overallClutch,
    }
  };
}

export function PerformanceReports() {
  const { state } = useApp();
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [reportType, setReportType]         = useState('individual');
  const [timeframe, setTimeframe]           = useState('season');

  const playerStats = useMemo(
    () => (state.players || []).map(p => computeRealPlayerReport(p, state.matches, state.physicalTests)),
    [state.players, state.matches, state.physicalTests]
  );

  React.useEffect(() => {
    if (playerStats.length > 0 && !selectedPlayer) setSelectedPlayer(playerStats[0].id);
  }, [playerStats.length, selectedPlayer]);

  if (!state.players?.length) {
    return (
      <div className="px-6 py-5 space-y-4">
        <SampleDataBanner players={state.players} matches={state.matches} />
        <div className="py-12 text-center border border-dashed border-white/[0.08] rounded-lg">
          <FileText size={32} className="text-white/20 mx-auto mb-3" />
          <p className="text-[13px] text-white/40 mb-1">Sin datos disponibles</p>
          <p className="text-[12px] text-white/25">Agrega jugadoras en la pestaña Jugadoras.</p>
        </div>
      </div>
    );
  }

  const current   = playerStats.find(p => p.id === selectedPlayer);
  const posKPI    = current ? positionKPIs[current.position] : null;

  const radarData = current && posKPI
    ? posKPI.primary.map((kpi: string) => ({
        subject: kpi,
        current: current.stats[kpi] ?? 0,
        target:  posKPI.targets[kpi]?.good || 100,
      }))
    : [];

  const progressData = current
    ? Object.entries(current.physicalProgress).map(([test, d]: [string, any]) => ({
        test,
        current:  d.current,
        previous: d.previous,
        target:   d.target,
        progress: d.previous > 0 ? (((d.current - d.previous) / d.previous) * 100).toFixed(1) : '0.0',
      }))
    : [];

  const generateReport = async () => {
    if (!current || !posKPI) { toast.error('Selecciona una jugadora'); return; }
    try {
      toast.info('Generando reporte…');
      let content = `REPORTE DE RENDIMIENTO — VOLLEYLAB\n=====================================\n\n`;
      content += `Jugadora: ${current.name}\nPosición: ${current.position}\nPeríodo: ${timeframe}\nFecha: ${new Date().toLocaleDateString('es-ES')}\n\n`;
      content += `KPIs PRINCIPALES\n----------------\n`;
      posKPI.primary.forEach((kpi: string) => {
        const v = current.stats[kpi];
        content += `${kpi}: ${v !== null && v !== undefined ? v.toFixed(1) : 'Sin datos'}\n`;
      });
      const blob = new Blob([content], { type: 'text/plain' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `reporte_${current.name.replace(/\s+/g, '_')}.txt`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      toast.success('Reporte descargado');
    } catch (err) {
      toast.error('Error al generar reporte');
    }
  };

  return (
    <div className="px-6 py-5 space-y-5">

      <SampleDataBanner players={state.players} matches={state.matches} />

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-48 bg-white/[0.04] border-white/[0.08] text-[13px] text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-white/[0.08]">
              <SelectItem value="individual" className="text-[13px] text-white/70">Reporte Individual</SelectItem>
              <SelectItem value="team"       className="text-[13px] text-white/70">Reporte de Equipo</SelectItem>
              <SelectItem value="position"   className="text-[13px] text-white/70">Por Posición</SelectItem>
            </SelectContent>
          </Select>

          {reportType === 'individual' && (
            <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
              <SelectTrigger className="w-48 bg-white/[0.04] border-white/[0.08] text-[13px] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/[0.08]">
                {playerStats.map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-[13px] text-white/70">{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32 bg-white/[0.04] border-white/[0.08] text-[13px] text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-white/[0.08]">
              <SelectItem value="month"  className="text-[13px] text-white/70">Mes</SelectItem>
              <SelectItem value="season" className="text-[13px] text-white/70">Temporada</SelectItem>
              <SelectItem value="year"   className="text-[13px] text-white/70">Año</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <button onClick={generateReport}
          className="flex items-center gap-2 px-4 py-2 bg-[#A191FF] hover:bg-[#B8ADFF] text-black text-label font-semibold rounded-lg transition-colors">
          <Download size={14} />Exportar
        </button>
      </div>

      {reportType === 'individual' && current && posKPI && (
        <>
          {/* ── Report header ──────────────────────────────────────────── */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-[#A191FF]" />
                <p className="text-[14px] font-semibold text-white">Reporte — {current.name}</p>
              </div>
              <span className="text-label text-white/25">{timeframe.toUpperCase()}</span>
            </div>
            <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
              <div className="px-5 py-4 text-center">
                <p className="text-[26px] font-bold font-mono" style={{ color: '#91FFB0' }}>
                  {posKPI.primary.filter((k: string) => getLevel(current.stats[k], k, posKPI) === 'excellent').length}
                </p>
                <p className="text-label text-white/25 mt-1">KPIs EXCELENTES</p>
              </div>
              <div className="px-5 py-4 text-center">
                <p className="text-[26px] font-bold font-mono" style={{ color: '#91CAFF' }}>
                  {posKPI.primary.filter((k: string) => getLevel(current.stats[k], k, posKPI) === 'good').length}
                </p>
                <p className="text-label text-white/25 mt-1">KPIs BUENOS</p>
              </div>
              <div className="px-5 py-4 text-center">
                <p className="text-[26px] font-bold font-mono" style={{ color: '#DC91FF' }}>
                  {current.clutchPerformance.overall !== null ? `${current.clutchPerformance.overall}%` : '—'}
                </p>
                <p className="text-label text-white/25 mt-1">CLUTCH</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* KPIs radar */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2">
                <Target size={13} className="text-[#A191FF]" />
                <p className="text-[13px] font-semibold text-white">KPIs Técnico-Tácticos</p>
                <span className="text-label text-white/25 ml-auto">{current.position.toUpperCase()}</span>
              </div>
              {!current.hasMatchData ? (
                <div className="px-5 py-12 text-center">
                  <p className="text-[13px] text-white/40 mb-1">No hay datos de partidos registrados para esta jugadora</p>
                  <p className="text-[12px] text-white/25">Registra acciones en el centro de partido en vivo para calcular sus KPIs reales.</p>
                </div>
              ) : (
                <>
                  <div className="px-5 py-4 h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                        <PolarGrid stroke="rgba(255,255,255,0.06)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.30)', fontSize: 10 }} />
                        <PolarRadiusAxis tick={{ fill: 'rgba(255,255,255,0.15)', fontSize: 9 }} />
                        <Radar name="Actual"  dataKey="current" stroke="#A191FF" fill="#A191FF" fillOpacity={0.15} strokeWidth={2} />
                        <Radar name="Objetivo" dataKey="target"  stroke="#91CAFF" fill="#91CAFF" fillOpacity={0.05} strokeWidth={1} strokeDasharray="4 4" />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {posKPI.primary.map((kpi: string) => {
                      const v  = current.stats[kpi];
                      const lv = getLevel(v, kpi, posKPI);
                      const ls = levelStyle(lv);
                      return (
                        <div key={kpi} className="flex items-center justify-between px-5 py-2.5">
                          <span className="text-[13px] text-white/70">{kpi}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-mono font-semibold" style={{ color: levelTextColor(lv) }}>
                              {v !== null && v !== undefined ? v.toFixed(1) : '—'}
                            </span>
                            <span className="text-label px-2 py-0.5 rounded-full" style={{ color: ls.color, backgroundColor: ls.bg }}>
                              {ls.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Physical progress */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2">
                <TrendingUp size={13} className="text-[#91FFB0]" />
                <p className="text-[13px] font-semibold text-white">Progreso Físico</p>
              </div>
              {!current.hasPhysicalData ? (
                <div className="px-5 py-12 text-center">
                  <p className="text-[13px] text-white/40 mb-1">No hay pruebas físicas registradas para esta jugadora</p>
                  <p className="text-[12px] text-white/25">Registra mediciones en la pestaña Tests Físicos para ver su evolución.</p>
                </div>
              ) : (
                <>
                  <div className="px-5 py-4 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={progressData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="test" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip {...CHART_TOOLTIP} />
                        <Bar dataKey="current"  fill="#A191FF" radius={[3,3,0,0]} name="Actual"  />
                        <Bar dataKey="target"   fill="#91CAFF" radius={[3,3,0,0]} name="Objetivo" fillOpacity={0.5} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {progressData.map(d => {
                      const pos = parseFloat(d.progress) >= 0;
                      return (
                        <div key={d.test} className="flex items-center justify-between px-5 py-2.5">
                          <div>
                            <p className="text-[13px] text-white">{d.test}</p>
                            <p className="text-[11px] text-white/30 font-mono">{d.previous} → {d.current}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-label px-2 py-0.5 rounded-full"
                              style={pos
                                ? { color: '#91FFB0', backgroundColor: 'rgba(145,255,176,0.08)' }
                                : { color: '#FF919F', backgroundColor: 'rgba(255,145,159,0.08)' }}>
                              {pos ? '+' : ''}{d.progress}%
                            </span>
                            <p className="text-[11px] text-white/25 mt-1">Meta: {d.target}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Clutch */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2">
                <Award size={13} className="text-[#DC91FF]" />
                <p className="text-[13px] font-semibold text-white">Rendimiento Clutch</p>
              </div>
              {!current.hasClutchData ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-[13px] text-white/40 mb-1">Sin datos en momentos clave (20+ pts o deuce)</p>
                  <p className="text-[12px] text-white/25">Se calculará automáticamente con acciones registradas al cierre de cada set.</p>
                </div>
              ) : (
                <div className="px-5 py-4 space-y-4">
                  {[
                    ['Sets 20+ puntos', current.clutchPerformance.set20Plus ?? 0],
                    ['Puntos Deuce',    current.clutchPerformance.deuce ?? 0],
                    ['Overall Clutch',  current.clutchPerformance.overall ?? 0],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-[13px] text-white/60">{label as string}</span>
                        <span className="text-[13px] font-mono font-semibold text-white">{value as number}%</span>
                      </div>
                      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: '#DC91FF' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Improvement areas */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2">
                <AlertTriangle size={13} className="text-[#FFD391]" />
                <p className="text-[13px] font-semibold text-white">Áreas de Mejora</p>
              </div>
              <div className="px-5 py-4 space-y-3">
                {!current.hasMatchData ? (
                  <div className="py-6 text-center">
                    <p className="text-[13px] text-white/40 mb-1">Sin datos para evaluar áreas de mejora</p>
                    <p className="text-[12px] text-white/25">Registra partidos para detectar oportunidades técnicas.</p>
                  </div>
                ) : (
                  <>
                    {posKPI.primary.map((kpi: string) => {
                      const v  = current.stats[kpi];
                      const lv = getLevel(v, kpi, posKPI);
                      if (lv !== 'below' && lv !== 'average') return null;
                      return (
                        <div key={kpi} className="bg-white/[0.03] rounded-lg p-3">
                          <p className="text-[13px] font-semibold text-white">{kpi}</p>
                          <p className="text-[11px] text-white/30 font-mono mt-0.5">
                            Actual: {v !== null && v !== undefined ? v.toFixed(1) : '—'} · Objetivo: {posKPI.targets[kpi]?.good}
                          </p>
                          <p className="text-[12px] text-white/50 mt-1">
                            {kpi === 'Hitting%'       && 'Trabajar en selección de ataques y técnica.'}
                            {kpi === 'Reception Eff'  && 'Mejorar posicionamiento y técnica de antebrazos.'}
                            {kpi === 'Aces/Set'       && 'Incrementar agresividad en el saque.'}
                          </p>
                        </div>
                      );
                    }).filter(Boolean)}

                    {posKPI.primary.every((k: string) => ['excellent', 'good'].includes(getLevel(current.stats[k], k, posKPI))) && (
                      <div className="py-6 text-center">
                        <Award size={24} className="mx-auto mb-2" style={{ color: '#91FFB0' }} />
                        <p className="text-[13px] font-semibold" style={{ color: '#91FFB0' }}>¡Rendimiento excelente!</p>
                        <p className="text-[12px] text-white/30 mt-1">Todos los KPIs en niveles óptimos.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {reportType !== 'individual' && (
        <div className="py-10 text-center text-[13px] text-white/30 border border-dashed border-white/[0.08] rounded-lg">
          {reportType === 'team' ? 'Reporte de equipo en desarrollo.' : 'Análisis por posición en desarrollo.'}
        </div>
      )}
    </div>
  );
}

// ── Inline sample data banner ──────────────────────────────────────────────
function SampleDataBanner({ players, matches }: { players: any[]; matches: any[] }) {
  const SAMPLE_NAMES = ['Sofia Martínez','Isabella Rodriguez','Camila Fernández','Valeria López',
    'Antonella Silva','Martina González','Renata Torres','Bianca Herrera'];
  const hasSample = players.some(p => SAMPLE_NAMES.includes(p.name));
  if (!hasSample) return null;

  const counts = players.reduce<Record<string, number>>((acc, p) => {
    acc[p.position] = (acc[p.position] || 0) + 1; return acc;
  }, {});

  return (
    <div className="border border-dashed border-[#A191FF]/20 bg-[#A191FF]/04 rounded-lg px-5 py-4">
      <div className="flex items-start gap-3">
        <Sparkles size={14} className="text-[#A191FF] mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-white">Datos de ejemplo cargados</p>
          <p className="text-[12px] text-white/40 mt-0.5 mb-3">
            {players.length} jugadoras · {matches.length} partidos disponibles para análisis.
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(counts).map(([pos, count]) => (
              <span key={pos} className="text-label px-2.5 py-1 rounded bg-white/[0.04] text-white/50">
                {pos}: {count}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
