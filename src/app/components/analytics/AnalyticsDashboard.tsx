import React, { useState, useEffect, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Activity, Target, Brain, BarChart3, Zap, RotateCcw } from 'lucide-react';
import { PythonAnalytics } from './PythonAnalytics';

interface AnalyticsDashboardProps {
  matchId?: string;
  timeframe?: 'current' | 'last5' | 'season';
}

export function AnalyticsDashboard({ matchId, timeframe: initTimeframe = 'current' }: AnalyticsDashboardProps) {
  const [sideOutData, setSideOutData]   = useState<any[]>([]);
  const [attackData, setAttackData]     = useState<any[]>([]);
  const [serveData, setServeData]       = useState<any[]>([]);
  const [loading, setLoading]           = useState(false);
  const [activeTab, setActiveTab]       = useState('widgets');
  const [timeframe, setTimeframe]       = useState(initTimeframe);

  const generateMockData = () => ({
    sideOut: [
      { rotation: 1, totalRallies: 12, sideouts: 8,  percentage: 66.7, trend: 'stable'    },
      { rotation: 2, totalRallies: 10, sideouts: 7,  percentage: 70.0, trend: 'improving' },
      { rotation: 3, totalRallies: 11, sideouts: 9,  percentage: 81.8, trend: 'improving' },
      { rotation: 4, totalRallies: 9,  sideouts: 5,  percentage: 55.6, trend: 'declining' },
      { rotation: 5, totalRallies: 13, sideouts: 10, percentage: 76.9, trend: 'stable'    },
      { rotation: 6, totalRallies: 8,  sideouts: 6,  percentage: 75.0, trend: 'improving' },
    ],
    attack: [
      { playerId: '1', playerName: 'Miguel Torres',   position: 'OPP', zone: '2', totalAttacks: 25, kills: 18, errors: 3, expectedValue: 0.72, killPercentage: 72.0 },
      { playerId: '2', playerName: 'Alejandro Silva', position: 'OH',  zone: '4', totalAttacks: 22, kills: 15, errors: 2, expectedValue: 0.65, killPercentage: 68.2 },
      { playerId: '3', playerName: 'Juan Morales',    position: 'MB',  zone: '3', totalAttacks: 18, kills: 12, errors: 1, expectedValue: 0.61, killPercentage: 66.7 },
      { playerId: '4', playerName: 'Ricardo López',   position: 'OH',  zone: '4', totalAttacks: 20, kills: 11, errors: 4, expectedValue: 0.35, killPercentage: 55.0 },
      { playerId: '5', playerName: 'Carlos Méndez',   position: 'S',   zone: '6', totalAttacks: 5,  kills: 3,  errors: 0, expectedValue: 0.60, killPercentage: 60.0 },
    ],
    serve: [
      { zone: '1', totalServes: 15, aces: 3, acePercentage: 20.0, subsequentPointWin: 73 },
      { zone: '2', totalServes: 12, aces: 1, acePercentage: 8.3,  subsequentPointWin: 58 },
      { zone: '3', totalServes: 18, aces: 2, acePercentage: 11.1, subsequentPointWin: 61 },
      { zone: '4', totalServes: 14, aces: 4, acePercentage: 28.6, subsequentPointWin: 79 },
      { zone: '5', totalServes: 16, aces: 2, acePercentage: 12.5, subsequentPointWin: 63 },
      { zone: '6', totalServes: 11, aces: 1, acePercentage: 9.1,  subsequentPointWin: 55 },
    ],
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const d = generateMockData();
      setSideOutData(d.sideOut);
      setAttackData(d.attack);
      setServeData(d.serve);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => { loadData(); }, [matchId, timeframe]);

  // ── Side-out widget ──────────────────────────────────────────────────────
  function SideOutWidget() {
    const barColor = (pct: number) =>
      pct >= 70 ? '#91FFB0' : pct >= 50 ? '#FFD391' : '#FF919F';
    const strong = sideOutData.filter(d => d.percentage >= 70).length;
    const mid    = sideOutData.filter(d => d.percentage >= 50 && d.percentage < 70).length;
    const weak   = sideOutData.filter(d => d.percentage < 50).length;

    return (
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2">
          <RotateCcw size={13} className="text-[#A191FF]" />
          <p className="text-[13px] font-semibold text-white">Side-out por Rotación</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          {sideOutData.map(r => (
            <div key={r.rotation} className="flex items-center gap-3">
              <span className="text-label text-white/40 w-6 text-center">R{r.rotation}</span>
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-[11px] text-white/30">Side-out%</span>
                  <span className="text-[11px] font-mono font-semibold" style={{ color: barColor(r.percentage) }}>
                    {r.percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${r.percentage}%`, backgroundColor: barColor(r.percentage) }} />
                </div>
              </div>
              <span className="text-[11px] text-white/25 font-mono w-10 text-right">
                {r.sideouts}/{r.totalRallies}
              </span>
            </div>
          ))}
        </div>
        <div className="border-t border-white/[0.06] grid grid-cols-3 divide-x divide-white/[0.06]">
          {[
            { count: strong, label: 'FUERTES', color: '#91FFB0' },
            { count: mid,    label: 'REGULARES', color: '#FFD391' },
            { count: weak,   label: 'VULNERABLES', color: '#FF919F' },
          ].map(({ count, label, color }) => (
            <div key={label} className="py-3 text-center">
              <p className="text-[20px] font-bold font-mono" style={{ color }}>{count}</p>
              <p className="text-label text-white/25 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Serve heatmap widget ─────────────────────────────────────────────────
  function ServeHeatmapWidget() {
    const maxServes = Math.max(...serveData.map(d => d.totalServes), 1);
    const zoneStyle = (zone: string) => {
      const d = serveData.find(x => x.zone === zone) || { acePercentage: 0, subsequentPointWin: 0, totalServes: 0 };
      const intensity = Math.min(100, (d.totalServes / maxServes) * 100);
      const bg = intensity > 66 ? 'rgba(255,145,159,0.12)' : intensity > 33 ? 'rgba(255,211,145,0.10)' : 'rgba(145,255,176,0.08)';
      const border = intensity > 66 ? 'rgba(255,145,159,0.20)' : intensity > 33 ? 'rgba(255,211,145,0.18)' : 'rgba(145,255,176,0.14)';
      return { bg, border, d };
    };

    return (
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2">
          <Target size={13} className="text-[#FFD391]" />
          <p className="text-[13px] font-semibold text-white">Mapa de Saques</p>
        </div>
        <div className="px-5 py-4">
          <div className="grid grid-cols-3 grid-rows-2 gap-1.5 aspect-[3/2] mb-4">
            {['4','3','2','5','6','1'].map(zone => {
              const { bg, border, d } = zoneStyle(zone);
              return (
                <div key={zone} className="relative rounded border flex flex-col items-center justify-center p-1"
                  style={{ backgroundColor: bg, borderColor: border }}>
                  <p className="text-[15px] font-bold font-mono text-white">{zone}</p>
                  <p className="text-[10px] font-mono text-white/50">{d.acePercentage.toFixed(1)}% ace</p>
                  <p className="text-[10px] font-mono text-white/30">{d.subsequentPointWin.toFixed(0)}% pto</p>
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full border border-white/10 bg-black flex items-center justify-center text-[9px] font-mono text-white/50">
                    {d.totalServes}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-label text-white/25">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgba(145,255,176,0.4)' }} />Pocas
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgba(255,211,145,0.4)' }} />Moderadas
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgba(255,145,159,0.4)' }} />Muchas
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Attack EV widget ─────────────────────────────────────────────────────
  function AttackEfficiencyWidget() {
    const evColor = (ev: number) =>
      ev > 0.5 ? '#91FFB0' : ev > 0 ? '#FFD391' : '#FF919F';

    return (
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2">
          <Zap size={13} className="text-[#91FFB0]" />
          <p className="text-[13px] font-semibold text-white">Expected Value por Jugada</p>
        </div>
        <div className="divide-y divide-white/[0.04] max-h-72 overflow-y-auto">
          {[...attackData]
            .sort((a, b) => b.expectedValue - a.expectedValue)
            .slice(0, 10)
            .map((play, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors">
                <div>
                  <p className="text-[13px] text-white">{play.playerName}</p>
                  <p className="text-[11px] text-white/30">{play.position} → Zona {play.zone}</p>
                </div>
                <div className="text-right">
                  <p className="text-[14px] font-mono font-bold" style={{ color: evColor(play.expectedValue) }}>
                    {play.expectedValue.toFixed(3)} EV
                  </p>
                  <p className="text-[11px] text-white/30 font-mono">{play.killPercentage.toFixed(1)}% kill</p>
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-5 space-y-5">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[16px] font-semibold text-white flex items-center gap-2">
            <Brain size={16} className="text-[#A191FF]" />
            Dashboard Analítico
          </p>
          <p className="text-[12px] text-white/30 mt-0.5">Insights tácticos y métricas con IA</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-44 bg-white/[0.04] border-white/[0.08] text-[13px] text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-white/[0.08]">
              <SelectItem value="current" className="text-[13px] text-white/70">Partido Actual</SelectItem>
              <SelectItem value="last5"   className="text-[13px] text-white/70">Últimos 5 partidos</SelectItem>
              <SelectItem value="season"  className="text-[13px] text-white/70">Temporada</SelectItem>
            </SelectContent>
          </Select>
          <button onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-white/[0.08] text-label text-white/40 hover:text-white/70 hover:border-white/20 transition-colors">
            <Activity size={12} />Actualizar
          </button>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="border-b border-white/[0.06] flex gap-0">
        {[
          { key: 'widgets', label: 'Widgets Analíticos', icon: BarChart3 },
          { key: 'python',  label: 'Análisis Python',    icon: Brain     },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-3 text-label border-b-2 transition-colors ${
              activeTab === key ? 'border-[#A191FF] text-[#A191FF]' : 'border-transparent text-white/30 hover:text-white/60'
            }`}>
            <Icon size={12} />{label}
          </button>
        ))}
      </div>

      {activeTab === 'widgets' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          <SideOutWidget />
          <ServeHeatmapWidget />
          <AttackEfficiencyWidget />
        </div>
      )}

      {activeTab === 'python' && <PythonAnalytics />}

      {/* ── Loading overlay ──────────────────────────────────────────────── */}
      {loading && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#0d0d0d] border border-white/[0.08] px-6 py-4 rounded-lg flex items-center gap-3">
            <div className="w-4 h-4 rounded-full border-2 border-[#A191FF] border-t-transparent animate-spin" />
            <span className="text-[13px] text-white/60">Cargando analítica…</span>
          </div>
        </div>
      )}
    </div>
  );
}
