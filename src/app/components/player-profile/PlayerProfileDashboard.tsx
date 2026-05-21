import React, { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, Legend,
} from 'recharts';
import { Download, X, TrendingUp, Activity, Dumbbell, Zap } from 'lucide-react';
import { exportPlayerTestsToCSV } from '../../utils/exportUtils';

interface PlayerDashboardProps {
  player: any;
  tests: any[];
  onClose: () => void;
}

const CHART_STYLE = {
  contentStyle: {
    background: '#111', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8, fontSize: 12, color: 'rgba(255,255,255,0.7)',
  },
  labelStyle: { color: 'rgba(255,255,255,0.3)', fontSize: 11 },
};

// ─── Helper: calcular PR (récord personal) ───────────────────────────────────
function pr(tests: any[], field: string, higherIsBetter = true) {
  const vals = tests.map(t => parseFloat(t[field])).filter(v => !isNaN(v) && v > 0);
  if (!vals.length) return null;
  return higherIsBetter ? Math.max(...vals) : Math.min(...vals);
}

// ─── Tarjeta de métrica ───────────────────────────────────────────────────────
function MetricCard({ label, value, unit, color = '#A191FF' }: { label: string; value: string | number | null; unit?: string; color?: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
      <p className="text-[11px] font-mono text-white/30 uppercase tracking-wider mb-2">{label}</p>
      <p className="text-2xl font-bold" style={{ color: value ? color : 'rgba(255,255,255,0.2)' }}>
        {value != null ? value : '—'}
        {value != null && unit ? <span className="text-sm font-normal text-white/40 ml-1">{unit}</span> : ''}
      </p>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function PlayerProfileDashboard({ player, tests, onClose }: PlayerDashboardProps) {

  // ── Datos para gráfica de evolución (por tipo de test) ──────────────────
  const evolutionData = useMemo(() => {
    const sorted = [...tests].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return sorted.map(t => ({
      date: new Date(t.date).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
      CMJ: t.CMJ ? parseFloat(t.CMJ) : undefined,
      SJ: t.SJ ? parseFloat(t.SJ) : undefined,
      abordaje: t.abordaje ? parseFloat(t.abordaje) : undefined,
      vel5m: t.vel5m ? parseFloat(t.vel5m) : undefined,
      spikeSpeed: t.spikeSpeed ? parseFloat(t.spikeSpeed) : undefined,
      // Si es test nuevo estilo (testType + value)
      value: (t.value && t.testType) ? parseFloat(t.value) : undefined,
    }));
  }, [tests]);

  // ── PRs ──────────────────────────────────────────────────────────────────
  const prCMJ = pr(tests, 'CMJ');
  const prSJ  = pr(tests, 'SJ');
  const prVel = pr(tests, 'vel5m', false); // Menor es mejor

  // ── Radar (comparativa contra umbrales estándar voleibol amateur) ─────────
  const radarData = [
    {
      subject: 'Salto CMJ',
      jugador: prCMJ ? Math.min(100, (prCMJ / 70) * 100) : 0,
      referencia: 80,
    },
    {
      subject: 'Velocidad 5m',
      jugador: prVel ? Math.min(100, ((1.3 - prVel) / 0.3) * 100 + 60) : 0,
      referencia: 75,
    },
    {
      subject: 'Remate',
      jugador: pr(tests, 'spikeSpeed') ? Math.min(100, ((pr(tests, 'spikeSpeed') || 0) / 80) * 100) : 0,
      referencia: 70,
    },
    {
      subject: 'Saque',
      jugador: pr(tests, 'serveSpeed') ? Math.min(100, ((pr(tests, 'serveSpeed') || 0) / 70) * 100) : 0,
      referencia: 65,
    },
    {
      subject: 'Agilidad T',
      jugador: pr(tests, 'tTest', false) ? Math.min(100, ((11 - (pr(tests, 'tTest', false) || 11)) / 2) * 100 + 40) : 0,
      referencia: 70,
    },
  ];

  // ── Historial completo ordenado ───────────────────────────────────────────
  const historial = [...tests].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}
    >
      <div
        className="w-full max-w-5xl h-[92vh] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between shrink-0"
             style={{ background: 'rgba(255,255,255,0.01)' }}>
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold"
                 style={{ background: 'rgba(161,145,255,0.15)', color: '#A191FF' }}>
              {player.name?.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{player.name}</h2>
              <p className="text-[12px] text-white/40">
                {player.position}{player.number ? ` · #${player.number}` : ''}
                {player.height ? ` · ${player.height} cm` : ''}
                {player.weight ? ` · ${player.weight} kg` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportPlayerTestsToCSV(player, tests)}
              className="flex items-center gap-2 px-4 py-2 text-[12px] text-white/60 hover:text-white rounded-lg transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <Download size={14} /> Exportar CSV
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white/30 hover:text-white rounded-lg transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Cuerpo scrollable ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── PRs / Métricas clave ───────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Salto Máx. (CMJ)" value={prCMJ} unit="cm" color="#A191FF" />
            <MetricCard label="Salto Máx. (SJ)"  value={prSJ}  unit="cm" color="#91FFB0" />
            <MetricCard label="Vel. 5m (Mejor)"  value={prVel} unit="s"  color="#FFD391" />
            <MetricCard label="Tests Registrados" value={tests.length} color="#91CAFF" />
          </div>

          {/* ── Gráficas ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Evolución de Salto */}
            <div className="lg:col-span-2 rounded-xl overflow-hidden"
                 style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-2">
                <TrendingUp size={15} style={{ color: '#A191FF' }} />
                <span className="text-[13px] font-semibold text-white">Evolución de Salto</span>
              </div>
              <div className="p-5" style={{ height: 260 }}>
                {evolutionData.some(d => d.CMJ || d.SJ) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={evolutionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} axisLine={false} tickLine={false} domain={['dataMin - 3', 'dataMax + 3']} unit=" cm" />
                      <Tooltip {...CHART_STYLE} />
                      <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }} />
                      <Line type="monotone" dataKey="CMJ" stroke="#A191FF" strokeWidth={2.5}
                            dot={{ fill: '#A191FF', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }}
                            name="CMJ" connectNulls={false} />
                      <Line type="monotone" dataKey="SJ" stroke="#91FFB0" strokeWidth={2.5}
                            dot={{ fill: '#91FFB0', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }}
                            name="SJ" connectNulls={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-white/20 gap-2">
                    <Activity size={28} className="opacity-30" />
                    <p className="text-[12px]">Registra tests de salto (CMJ / SJ) para ver la evolución</p>
                  </div>
                )}
              </div>
            </div>

            {/* Radar */}
            <div className="rounded-xl overflow-hidden"
                 style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="px-5 py-4 border-b border-white/[0.05]">
                <span className="text-[13px] font-semibold text-white">Perfil vs Referencia</span>
              </div>
              <div className="p-3" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.06)" />
                    <PolarAngleAxis dataKey="subject"
                      tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name={player.name} dataKey="jugador"
                      stroke="#A191FF" fill="#A191FF" fillOpacity={0.25} strokeWidth={2} />
                    <Radar name="Referencia" dataKey="referencia"
                      stroke="rgba(255,255,255,0.2)" fill="rgba(255,255,255,0.04)" strokeWidth={1} strokeDasharray="4 4" />
                    <Legend wrapperStyle={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ── Evolución de Velocidad ─────────────────────────────────────── */}
          {evolutionData.some(d => d.vel5m) && (
            <div className="rounded-xl overflow-hidden"
                 style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-2">
                <Zap size={15} style={{ color: '#FFD391' }} />
                <span className="text-[13px] font-semibold text-white">Evolución de Velocidad (5m)</span>
              </div>
              <div className="p-5" style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolutionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} axisLine={false} tickLine={false} unit="s" reversed />
                    <Tooltip {...CHART_STYLE} />
                    <Line type="monotone" dataKey="vel5m" stroke="#FFD391" strokeWidth={2.5}
                          dot={{ fill: '#FFD391', r: 4, strokeWidth: 0 }} name="5 metros (s)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Historial completo ─────────────────────────────────────────── */}
          <div className="rounded-xl overflow-hidden"
               style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-2">
              <Dumbbell size={15} style={{ color: '#91CAFF' }} />
              <span className="text-[13px] font-semibold text-white">Historial Completo de Tests</span>
            </div>
            {historial.length === 0 ? (
              <div className="p-10 text-center text-[13px] text-white/20">
                No hay pruebas registradas. Ve a la pestaña "Tests Físicos" y agrega la primera.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
                      {['Fecha', 'CMJ (cm)', 'SJ (cm)', 'Abordaje (cm)', '5m (s)', '10m (s)', 'Remate (km/h)', 'Saque (km/h)'].map(h => (
                        <th key={h} className="px-5 py-3 text-[10px] font-mono text-white/30 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map((t, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                          className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3 text-[12px] text-white/50 font-mono whitespace-nowrap">
                          {new Date(t.date).toLocaleDateString('es-MX')}
                        </td>
                        {['CMJ', 'SJ', 'abordaje', 'vel5m', 'vel10m', 'spikeSpeed', 'serveSpeed'].map(k => (
                          <td key={k} className="px-5 py-3 text-[13px] text-white font-mono">
                            {t[k] || <span className="text-white/15">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
