import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Plus, AlertTriangle, TrendingUp, Activity, Heart, Moon } from 'lucide-react';
import { useApp } from '../utils/AppContext';

const INPUT_CLS = 'w-full bg-white/[0.04] border border-white/[0.08] rounded px-3 py-2.5 text-[13px] text-white placeholder:text-white/20 focus:outline-none focus:border-[#A191FF]/50 transition-colors';
const LABEL_CLS = 'block text-[11px] font-mono uppercase tracking-wide text-white/40 mb-1';

const CHART_TOOLTIP = {
  contentStyle: { background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6 },
  labelStyle:   { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  itemStyle:    { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
};

const wellnessLabels: Record<string, string> = {
  sleep: 'Sueño', stress: 'Estrés', fatigue: 'Fatiga', DOMS: 'DOMS',
  shoulderPain: 'Dolor Hombro', kneePain: 'Dolor Rodilla', anklePain: 'Dolor Tobillo'
};

const generateMockLoadData = (players) => {
  if (!players?.length) return [];
  const dates = ['2025-01-15','2025-01-14','2025-01-13','2025-01-12','2025-01-11'];
  const data: any[] = [];
  players.slice(0, 3).forEach(player => {
    dates.forEach(date => {
      const minutes = 70 + Math.floor(Math.random() * 30);
      const RPE     = 6  + Math.floor(Math.random() * 3);
      data.push({
        playerId: player.id, playerName: player.name, date,
        minutes, RPE, sRPE: minutes * RPE,
        jumps: 80 + Math.floor(Math.random() * 80),
        wellness: {
          sleep: 2 + Math.floor(Math.random() * 3), stress: 1 + Math.floor(Math.random() * 3),
          fatigue: 2 + Math.floor(Math.random() * 3), DOMS: 1 + Math.floor(Math.random() * 3),
          shoulderPain: Math.floor(Math.random() * 3), kneePain: Math.floor(Math.random() * 2),
          anklePain: Math.floor(Math.random() * 2),
        }
      });
    });
  });
  return data;
};

const calculateACWR = (data) => {
  if (data.length < 7) return null;
  const w7  = data.slice(-7).reduce((s, d) => s + d.sRPE, 0);
  const w28 = data.slice(-28).reduce((s, d) => s + d.sRPE, 0) / 4;
  return w28 > 0 ? (w7 / w28).toFixed(2) : '0';
};

const getACWRStatus = (acwr) => {
  if (!acwr) return { text: 'N/A', color: '#91CAFF', bg: 'rgba(145,202,255,0.08)' };
  const v = parseFloat(acwr);
  if (v < 0.8)  return { text: 'BAJO RIESGO',      color: '#FFD391', bg: 'rgba(255,211,145,0.08)' };
  if (v <= 1.3) return { text: 'ÓPTIMO',            color: '#91FFB0', bg: 'rgba(145,255,176,0.08)' };
  if (v <= 1.5) return { text: 'RIESGO MODERADO',   color: '#FFD391', bg: 'rgba(255,211,145,0.08)' };
  return              { text: 'ALTO RIESGO',         color: '#FF919F', bg: 'rgba(255,145,159,0.08)' };
};

export function LoadManagement() {
  const { state } = useApp();
  const { players, loading } = state;
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [isDialogOpen, setIsDialogOpen]     = useState(false);
  const [viewMode, setViewMode]             = useState('individual');

  if (loading?.players) {
    return (
      <div className="px-6 py-16 text-center text-[13px] text-white/30">
        Cargando jugadoras…
      </div>
    );
  }
  if (!players?.length) {
    return (
      <div className="px-6 py-16 text-center text-[13px] text-white/30">
        Sin jugadoras registradas.
      </div>
    );
  }

  if (!selectedPlayer && players.length > 0) setSelectedPlayer(players[0].id);

  const allLoad    = generateMockLoadData(players);
  const playerLoad = allLoad.filter(d => d.playerId === selectedPlayer).slice(-14);
  const chartData  = playerLoad.map(d => ({
    date:     d.date.split('-')[2] + '/' + d.date.split('-')[1],
    sRPE:     d.sRPE,
    jumps:    d.jumps,
    RPE:      d.RPE,
    wellness: ((d.wellness.sleep + d.wellness.stress + d.wellness.fatigue + d.wellness.DOMS) / 4),
  }));

  const currentPlayer = players.find(p => p.id === selectedPlayer);
  const acwr          = calculateACWR(playerLoad);
  const acwrStatus    = getACWRStatus(acwr);
  const weekSRPE      = playerLoad.slice(-7).reduce((s, d) => s + d.sRPE, 0);
  const weekJumps     = playerLoad.slice(-7).reduce((s, d) => s + d.jumps, 0);
  const wellnessAvg   = playerLoad.length
    ? (playerLoad.slice(-7).reduce((s, d) =>
        s + (d.wellness.sleep + d.wellness.stress + d.wellness.fatigue + d.wellness.DOMS) / 4, 0
      ) / Math.min(playerLoad.length, 7)).toFixed(1)
    : '0';

  // ── Load Form ─────────────────────────────────────────────────────────────
  function LoadForm() {
    const [formData, setFormData] = useState({
      playerId: selectedPlayer, date: new Date().toISOString().split('T')[0],
      minutes: '', RPE: '', jumps: '',
      wellness: { sleep: 3, stress: 2, fatigue: 2, DOMS: 1, shoulderPain: 0, kneePain: 0, anklePain: 0 }
    });

    const setW = (k, v) => setFormData(p => ({ ...p, wellness: { ...p.wellness, [k]: parseInt(v) } }));

    const handleSubmit = (e) => {
      e.preventDefault();
      console.log('Load saved:', { ...formData, sRPE: parseInt(formData.minutes) * parseInt(formData.RPE) });
      setIsDialogOpen(false);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Jugadora</label>
            <Select value={formData.playerId} onValueChange={v => setFormData(p => ({ ...p, playerId: v }))}>
              <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-[13px] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/[0.08]">
                {players.map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-[13px] text-white/70">
                    {p.name} – {p.position}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className={LABEL_CLS}>Fecha</label>
            <input type="date" value={formData.date}
              onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
              className={INPUT_CLS} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[['minutes','Minutos','90'],['RPE','RPE (1–10)','7'],['jumps','N° Saltos','120']].map(([k, l, ph]) => (
            <div key={k}>
              <label className={LABEL_CLS}>{l}</label>
              <input type="number" value={formData[k]} placeholder={ph}
                onChange={e => setFormData(p => ({ ...p, [k]: e.target.value }))}
                className={INPUT_CLS} />
            </div>
          ))}
        </div>

        <div>
          <label className={LABEL_CLS}>Bienestar (1=Muy mal · 5=Excelente)</label>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {Object.entries(wellnessLabels).slice(0, 4).map(([k, l]) => (
              <div key={k}>
                <label className={LABEL_CLS}>{l}</label>
                <Select value={formData.wellness[k].toString()} onValueChange={v => setW(k, v)}>
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-[13px] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/[0.08]">
                    {[1,2,3,4,5].map(v => <SelectItem key={v} value={v.toString()} className="text-[13px] text-white/70">{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className={LABEL_CLS}>Dolor articular (0=Sin dolor · 10=Severo)</label>
          <div className="grid grid-cols-3 gap-3 mt-2">
            {Object.entries(wellnessLabels).slice(4).map(([k, l]) => (
              <div key={k}>
                <label className={LABEL_CLS}>{l}</label>
                <Select value={formData.wellness[k].toString()} onValueChange={v => setW(k, v)}>
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-[13px] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/[0.08]">
                    {[0,1,2,3,4,5,6,7,8,9,10].map(v => <SelectItem key={v} value={v.toString()} className="text-[13px] text-white/70">{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => setIsDialogOpen(false)}
            className="px-4 py-2 text-label text-white/40 hover:text-white transition-colors">
            Cancelar
          </button>
          <button type="submit"
            className="flex items-center gap-2 px-4 py-2 bg-[#A191FF] hover:bg-[#B8ADFF] text-black text-label font-semibold rounded-lg transition-colors">
            Guardar Registro
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="px-6 py-5 space-y-5">

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 justify-between flex-wrap">
        <div className="flex items-center gap-3">
          <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
            <SelectTrigger className="w-56 bg-white/[0.04] border-white/[0.08] text-[13px] text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-white/[0.08]">
              {players.map(p => (
                <SelectItem key={p.id} value={p.id} className="text-[13px] text-white/70">
                  {p.name} – {p.position}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={viewMode} onValueChange={setViewMode}>
            <SelectTrigger className="w-44 bg-white/[0.04] border-white/[0.08] text-[13px] text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-white/[0.08]">
              <SelectItem value="individual" className="text-[13px] text-white/70">Vista Individual</SelectItem>
              <SelectItem value="team"       className="text-[13px] text-white/70">Vista Equipo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <button onClick={() => setIsDialogOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#A191FF] hover:bg-[#B8ADFF] text-black text-label font-semibold rounded-lg transition-colors">
          <Plus size={14} />Registrar Carga
        </button>
      </div>

      {/* ── Dialog ───────────────────────────────────────────────────────── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl bg-[#0d0d0d] border border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold text-white">Registrar Carga de Entrenamiento</DialogTitle>
          </DialogHeader>
          <LoadForm />
        </DialogContent>
      </Dialog>

      {viewMode === 'individual' && currentPlayer && (
        <>
          {playerLoad.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-white/30 border border-dashed border-white/[0.08] rounded-lg">
              Sin datos de carga para {currentPlayer.name}. Usa "Registrar Carga".
            </div>
          ) : (
            <>
              {/* ── KPI stat cards ─────────────────────────────────────────── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="px-5 py-4 bg-white/[0.02] border border-white/[0.06] rounded-lg">
                  <p className="text-label text-white/25 mb-1">ACWR (7d/28d)</p>
                  <p className="text-[26px] font-bold font-mono leading-none text-white">{acwr || '—'}</p>
                  <span className="text-label mt-1 inline-block px-2 py-0.5 rounded-full"
                    style={{ color: acwrStatus.color, backgroundColor: acwrStatus.bg }}>
                    {acwrStatus.text}
                  </span>
                  {parseFloat(acwr) > 1.5 && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <AlertTriangle size={12} style={{ color: '#FF919F' }} />
                      <p className="text-[11px]" style={{ color: '#FF919F' }}>Riesgo elevado</p>
                    </div>
                  )}
                </div>

                <div className="px-5 py-4 bg-white/[0.02] border border-white/[0.06] rounded-lg">
                  <p className="text-label text-white/25 mb-1">CARGA SEMANAL</p>
                  <p className="text-[26px] font-bold font-mono leading-none text-white">{weekSRPE}</p>
                  <div className="mt-2 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: '75%', backgroundColor: '#A191FF' }} />
                  </div>
                  <p className="text-[11px] text-white/30 mt-1">75% carga objetivo</p>
                </div>

                <div className="px-5 py-4 bg-white/[0.02] border border-white/[0.06] rounded-lg">
                  <p className="text-label text-white/25 mb-1">SALTOS/SEMANA</p>
                  <p className="text-[26px] font-bold font-mono leading-none text-white">{weekJumps}</p>
                  <p className="text-[11px] text-white/30 mt-1">Últimos 7 días</p>
                </div>

                <div className="px-5 py-4 bg-white/[0.02] border border-white/[0.06] rounded-lg">
                  <p className="text-label text-white/25 mb-1">BIENESTAR PROM.</p>
                  <p className="text-[26px] font-bold font-mono leading-none text-white">{wellnessAvg}/5</p>
                  <div className="flex gap-0.5 mt-2">
                    {[1,2,3,4,5].map(i => (
                      <Heart key={i} size={12}
                        className={i <= Math.round(parseFloat(wellnessAvg)) ? 'fill-current' : ''}
                        style={{ color: i <= Math.round(parseFloat(wellnessAvg)) ? '#FF919F' : 'rgba(255,255,255,0.12)' }} />
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Charts ─────────────────────────────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2">
                    <Activity size={13} className="text-[#A191FF]" />
                    <p className="text-[13px] font-semibold text-white">Carga de Entrenamiento (sRPE)</p>
                  </div>
                  <div className="px-5 py-4 h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip {...CHART_TOOLTIP} />
                        <Area type="monotone" dataKey="sRPE" stroke="#A191FF" fill="#A191FF" fillOpacity={0.12} strokeWidth={2} name="sRPE" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2">
                    <TrendingUp size={13} className="text-[#91FFB0]" />
                    <p className="text-[13px] font-semibold text-white">RPE y Bienestar</p>
                  </div>
                  <div className="px-5 py-4 h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip {...CHART_TOOLTIP} />
                        <Line type="monotone" dataKey="RPE"      stroke="#FFD391" strokeWidth={2} dot={false} name="RPE" />
                        <Line type="monotone" dataKey="wellness" stroke="#91FFB0" strokeWidth={2} dot={false} name="Bienestar" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* ── Wellness log ───────────────────────────────────────────── */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
                <div className="px-5 py-3.5 border-b border-white/[0.06]">
                  <p className="text-[13px] font-semibold text-white">Registro de bienestar reciente</p>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {playerLoad.slice(-5).reverse().map((data, i) => {
                    const hasPain = (data.wellness.shoulderPain + data.wellness.kneePain + data.wellness.anklePain) > 0;
                    return (
                      <div key={i} className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                        <div>
                          <p className="text-[13px] text-white font-mono">{data.date}</p>
                          <p className="text-[11px] text-white/30">{data.minutes} min · RPE {data.RPE}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 text-[12px] text-white/50">
                            <Moon size={12} />{data.wellness.sleep}/5
                          </div>
                          <div className="flex items-center gap-1.5 text-[12px] text-white/50">
                            <Activity size={12} />{data.wellness.fatigue}/5
                          </div>
                          {hasPain && (
                            <span className="text-label px-2 py-0.5 rounded-full"
                              style={{ color: '#FF919F', backgroundColor: 'rgba(255,145,159,0.08)' }}>
                              DOLOR
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {viewMode === 'team' && (
        <div className="py-10 text-center text-[13px] text-white/30 border border-dashed border-white/[0.08] rounded-lg">
          Vista de equipo en desarrollo.
        </div>
      )}
    </div>
  );
}
