import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, TrendingUp, Timer, Zap, Target, Edit, Trash2, Activity, Move } from 'lucide-react';
import { useApp } from '../utils/AppContext';

const INPUT_CLS = 'w-full bg-white/[0.04] border border-white/[0.08] rounded px-3 py-2.5 text-[13px] text-white placeholder:text-white/20 focus:outline-none focus:border-[#A191FF]/50 transition-colors';
const LABEL_CLS = 'block text-[11px] font-mono uppercase tracking-wide text-white/40 mb-1';

const testCategories = {
  jump: {
    name: 'Salto',
    icon: TrendingUp,
    tests: [
      { key: 'CMJ',      name: 'CMJ (Counter Movement Jump)', unit: 'cm', target: { min: 50, good: 60, excellent: 70 } },
      { key: 'SJ',       name: 'SJ (Squat Jump)',             unit: 'cm', target: { min: 45, good: 55, excellent: 65 } },
      { key: 'abordaje', name: 'Abordaje (Con carrera)',       unit: 'cm', target: { min: 60, good: 70, excellent: 80 } }
    ]
  },
  speed: {
    name: 'Velocidad',
    icon: Zap,
    tests: [
      { key: 'vel5m',  name: '5 metros',        unit: 's', target: { excellent: 1.0, good: 1.1, min: 1.2 }, reverse: true },
      { key: 'vel10m', name: '10 metros',        unit: 's', target: { excellent: 1.7, good: 1.8, min: 2.0 }, reverse: true },
      { key: 'tTest',  name: 'T-Test (Agilidad)',unit: 's', target: { excellent: 9.0, good: 9.5, min: 10.0 }, reverse: true }
    ]
  },
  power: {
    name: 'Fuerza / 1RM',
    icon: Target,
    tests: [
      { key: 'benchPress', name: 'Bench Press (1RM)', unit: 'kg', target: { min: 30, good: 45, excellent: 60 } },
      { key: 'squat', name: 'Sentadilla (1RM)', unit: 'kg', target: { min: 50, good: 70, excellent: 90 } },
      { key: 'deadlift', name: 'Peso Muerto (1RM)', unit: 'kg', target: { min: 50, good: 75, excellent: 95 } }
    ]
  },
  endurance: {
    name: 'Resistencia',
    icon: Activity,
    tests: [
      { key: 'cooperTest', name: 'Test de Cooper', unit: 'm', target: { min: 2000, good: 2400, excellent: 2800 } }
    ]
  },
  flexibility: {
    name: 'Flexibilidad',
    icon: Move,
    tests: [
      { key: 'sitAndReach', name: 'Sit and Reach', unit: 'cm', target: { min: 20, good: 25, excellent: 30 } }
    ]
  },
  reaction: {
    name: 'Reacción',
    icon: Timer,
    tests: [
      { key: 'reactionTime', name: 'Tiempo de Reacción', unit: 's',  target: { excellent: 0.2, good: 0.25, min: 0.3 }, reverse: true }
    ]
  }
};

const BLANK_FORM = {
  playerId: '', date: new Date().toISOString().split('T')[0],
  CMJ: '', SJ: '', abordaje: '', vel5m: '', vel10m: '', tTest: '',
  reactionTime: '', spikeSpeed: '', serveSpeed: '', 
  benchPress: '', squat: '', deadlift: '', cooperTest: '', sitAndReach: ''
};

function getLevel(value, test) {
  if (!value || !test.target) return 'unknown';
  const v = parseFloat(value);
  if (test.reverse) {
    if (v <= test.target.excellent) return 'excellent';
    if (v <= test.target.good)      return 'good';
    if (v <= test.target.min)       return 'average';
    return 'below';
  } else {
    if (v >= test.target.excellent) return 'excellent';
    if (v >= test.target.good)      return 'good';
    if (v >= test.target.min)       return 'average';
    return 'below';
  }
}

function levelBadge(level: string) {
  const map = {
    excellent: { color: '#91FFB0', bg: 'rgba(145,255,176,0.08)', label: 'EXCELENTE' },
    good:      { color: '#91CAFF', bg: 'rgba(145,202,255,0.08)', label: 'BUENO'     },
    average:   { color: '#FFD391', bg: 'rgba(255,211,145,0.08)', label: 'PROMEDIO'  },
    below:     { color: '#FF919F', bg: 'rgba(255,145,159,0.08)', label: 'BAJO'      },
    unknown:   { color: 'rgba(255,255,255,0.25)', bg: 'rgba(255,255,255,0.04)', label: 'N/A' },
  };
  const s = map[level] || map.unknown;
  return (
    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full"
      style={{ color: s.color, backgroundColor: s.bg }}>
      {s.label}
    </span>
  );
}

const CHART_TOOLTIP_STYLE = {
  contentStyle: { background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6 },
  labelStyle: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  itemStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
};

export function PhysicalTesting() {
  const { state, createPhysicalTest, updatePhysicalTest, deletePhysicalTest } = useApp();
  const { players, physicalTests } = state;
  const [selectedPlayer, setSelectedPlayer] = useState('all');
  const [isDialogOpen, setIsDialogOpen]     = useState(false);
  const [activeCategory, setActiveCategory] = useState('jump');
  const [editingTest, setEditingTest]       = useState(null);
  const [formTab, setFormTab]               = useState('jump');

  const playerTestHistory = physicalTests.filter(t =>
    selectedPlayer === 'all' || !selectedPlayer || t.playerId.toString() === selectedPlayer
  );

  const chartData = [...playerTestHistory].reverse().map(t => ({
    date:       t.date,
    CMJ:        t.CMJ,
    abordaje:   t.abordaje,
    squat:      t.squat,
  }));

  const handleEditTest  = (test) => { setEditingTest(test); setIsDialogOpen(true); };
  const handleNewTest   = ()     => { setEditingTest(null);  setIsDialogOpen(true); };
  const handleDeleteTest = async (id) => {
    if (window.confirm('¿Eliminar este test?')) await deletePhysicalTest(id);
  };

  // ── Test Form ─────────────────────────────────────────────────────────────
  function TestForm() {
    const [formData, setFormData] = useState({ ...BLANK_FORM });

    useEffect(() => {
      setFormData(editingTest
        ? { playerId: editingTest.playerId || '', date: editingTest.date || BLANK_FORM.date,
            CMJ: editingTest.CMJ || '', SJ: editingTest.SJ || '', abordaje: editingTest.abordaje || '',
            vel5m: editingTest.vel5m || '', vel10m: editingTest.vel10m || '', tTest: editingTest.tTest || '',
            reactionTime: editingTest.reactionTime || '', spikeSpeed: editingTest.spikeSpeed || '',
            serveSpeed: editingTest.serveSpeed || '', benchPress: editingTest.benchPress || '',
            squat: editingTest.squat || '', deadlift: editingTest.deadlift || '', cooperTest: editingTest.cooperTest || '',
            sitAndReach: editingTest.sitAndReach || '' }
        : { ...BLANK_FORM });
    }, []);

    const set = (k, v) => setFormData(p => ({ ...p, [k]: v }));

    const handleSubmit = (e) => {
      e.preventDefault();
      if (editingTest) updatePhysicalTest(editingTest.id, formData);
      else createPhysicalTest(formData);
      setIsDialogOpen(false);
      setEditingTest(null);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Jugadora</label>
            <Select value={formData.playerId} onValueChange={v => set('playerId', v)}>
              <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-[13px] text-white">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/[0.08]">
                {players.map(p => (
                  <SelectItem key={p.id} value={p.id.toString()} className="text-[13px] text-white/70">
                    {p.name} – {p.position}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className={LABEL_CLS}>Fecha</label>
            <input type="date" value={formData.date} onChange={e => set('date', e.target.value)} className={INPUT_CLS} />
          </div>
        </div>

        {/* Category tabs inside form */}
        <div className="border-b border-white/[0.06] flex gap-0 -mx-1 overflow-x-auto pb-px scrollbar-hide">
          {Object.entries(testCategories).map(([key, cat]) => (
            <button key={key} type="button"
              onClick={() => setFormTab(key)}
              className={`px-3 py-2.5 text-label border-b-2 transition-colors whitespace-nowrap ${
                formTab === key ? 'border-[#A191FF] text-[#A191FF]' : 'border-transparent text-white/30 hover:text-white/60'
              }`}>
              {cat.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {testCategories[formTab].tests.map(test => (
            <div key={test.key}>
              <label className={LABEL_CLS}>{test.name} ({test.unit})</label>
              <input type="number" step="0.01"
                value={formData[test.key]}
                onChange={e => set(test.key, e.target.value)}
                placeholder={`Valor en ${test.unit}`}
                className={INPUT_CLS} />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button"
            onClick={() => { setIsDialogOpen(false); setEditingTest(null); }}
            className="px-4 py-2 text-label text-white/40 hover:text-white transition-colors">
            Cancelar
          </button>
          <button type="submit"
            className="flex items-center gap-2 px-4 py-2 bg-[#A191FF] hover:bg-[#B8ADFF] text-black text-label font-semibold rounded-lg transition-colors">
            Guardar Test
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="px-6 py-5 space-y-5">

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
          <SelectTrigger className="w-56 bg-white/[0.04] border-white/[0.08] text-[13px] text-white">
            <SelectValue placeholder="Todas las jugadoras" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border-white/[0.08]">
            <SelectItem value="all" className="text-[13px] text-white/70">Todas las jugadoras</SelectItem>
            {players.map(p => (
              <SelectItem key={p.id} value={p.id.toString()} className="text-[13px] text-white/70">
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <button onClick={handleNewTest}
          className="flex items-center gap-2 px-4 py-2 bg-[#A191FF] hover:bg-[#B8ADFF] text-black text-label font-semibold rounded-lg transition-colors">
          <Plus size={14} />Nuevo Test
        </button>
      </div>

      {/* ── Dialog ───────────────────────────────────────────────────────── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-xl md:max-w-2xl bg-[#0d0d0d] border border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold text-white">
              {editingTest ? 'Editar Test Físico' : 'Registrar Test Físico'}
            </DialogTitle>
          </DialogHeader>
          <TestForm />
        </DialogContent>
      </Dialog>

      {/* ── Evolution chart ──────────────────────────────────────────────── */}
      {chartData.length > 0 && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
            <p className="text-[13px] font-semibold text-white">Evolución de rendimiento</p>
            <p className="text-label text-white/25">PRUEBAS PRINCIPALES</p>
          </div>
          <div className="px-5 py-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...CHART_TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="CMJ"        stroke="#A191FF" strokeWidth={2} dot={false} name="CMJ (cm)" />
                <Line type="monotone" dataKey="abordaje"   stroke="#91FFB0" strokeWidth={2} dot={false} name="Abordaje (cm)" />
                <Line type="monotone" dataKey="squat"      stroke="#FFD391" strokeWidth={2} dot={false} name="Sentadilla (kg)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Category tabs ────────────────────────────────────────────────── */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
        <div className="border-b border-white/[0.06] flex gap-0 px-2 overflow-x-auto scrollbar-hide">
          {Object.entries(testCategories).map(([key, cat]) => {
            const Icon = cat.icon;
            return (
              <button key={key}
                onClick={() => setActiveCategory(key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-label border-b-2 transition-colors whitespace-nowrap ${
                  activeCategory === key
                    ? 'border-[#A191FF] text-[#A191FF]'
                    : 'border-transparent text-white/30 hover:text-white/60'
                }`}>
                <Icon size={12} />{cat.name}
              </button>
            );
          })}
        </div>

        <div className="p-4 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          {testCategories[activeCategory].tests.map(test => (
            <div key={test.key} className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/[0.06]">
                <p className="text-[12px] font-semibold text-white">{test.name}</p>
                <p className="text-label text-white/25">Últimos resultados</p>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {playerTestHistory.slice(0, 3).map(testData => {
                  const value = testData[test.key];
                  const player = players.find(p => p.id === testData.playerId);
                  return (
                    <div key={testData.id} className="flex items-center justify-between px-4 py-2.5">
                      <div>
                        <p className="text-[13px] text-white">{player?.name || 'Desconocida'}</p>
                        <p className="text-[11px] text-white/30 font-mono">{testData.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[14px] font-mono font-semibold text-white">
                          {value ? `${value} ${test.unit}` : '—'}
                        </p>
                        <div className="mt-0.5">{levelBadge(getLevel(value, test))}</div>
                      </div>
                    </div>
                  );
                })}
                {playerTestHistory.length === 0 && (
                  <div className="px-4 py-5 text-center text-[12px] text-white/20">Sin datos</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Management table ─────────────────────────────────────────────── */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.06]">
          <p className="text-[13px] font-semibold text-white">Gestión de tests</p>
        </div>

        {playerTestHistory.length === 0 ? (
          <div className="py-8 text-center text-[13px] text-white/20 border border-dashed border-white/[0.08] rounded-lg m-4">
            Sin tests físicos registrados.
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/[0.04]">
                <th className="text-left px-5 py-2 text-label text-white/25 font-normal">JUGADORA</th>
                <th className="text-left px-5 py-2 text-label text-white/25 font-normal hidden sm:table-cell">MÉTRICAS</th>
                <th className="text-right px-5 py-2 text-label text-white/25 font-normal">ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {[...playerTestHistory]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map(test => {
                  const player = players.find(p => p.id === test.playerId);
                  return (
                    <tr key={test.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-[13px] text-white">{player?.name || 'Desconocida'}</p>
                        <p className="text-[11px] text-white/30 font-mono">{test.date}</p>
                      </td>
                      <td className="px-5 py-3 hidden sm:table-cell">
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          {test.CMJ        && <span className="text-[11px] text-white/40 font-mono">CMJ: {test.CMJ}cm</span>}
                          {test.SJ         && <span className="text-[11px] text-white/40 font-mono">SJ: {test.SJ}cm</span>}
                          {test.abordaje   && <span className="text-[11px] text-white/40 font-mono">Abordaje: {test.abordaje}cm</span>}
                          {test.vel5m      && <span className="text-[11px] text-white/40 font-mono">5m: {test.vel5m}s</span>}
                          {test.spikeSpeed && <span className="text-[11px] text-white/40 font-mono">Remate: {test.spikeSpeed}km/h</span>}
                          {test.serveSpeed && <span className="text-[11px] text-white/40 font-mono">Saque: {test.serveSpeed}km/h</span>}
                          {test.squat      && <span className="text-[11px] text-white/40 font-mono">Sentadilla: {test.squat}kg</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleEditTest(test)}
                            className="p-1.5 rounded border border-white/[0.08] text-white/30 hover:text-white/70 hover:border-white/20 transition-colors">
                            <Edit size={13} />
                          </button>
                          <button onClick={() => handleDeleteTest(test.id)}
                            className="p-1.5 rounded border border-white/[0.08] text-white/30 hover:text-[#FF919F] hover:border-[#FF919F]/30 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
