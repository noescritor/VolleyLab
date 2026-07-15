import React, { useState } from 'react';
import { Calendar, Layers, Activity, Target, ChevronRight, Plus, CalendarDays } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const MOCK_MACROCYCLES = [
  { id: '1', name: 'Temporada 2026-2027', startDate: '2026-08-01', endDate: '2027-05-31', status: 'active' }
];

const MOCK_MESOCYCLES = [
  { id: 'm1', name: 'Pretemporada (Preparación Física)', phase: 'Acumulación', duration: '4 Semanas', color: '#91CAFF' },
  { id: 'm2', name: 'Fase Regular I (Ajustes Tácticos)', phase: 'Transformación', duration: '6 Semanas', color: '#A191FF' },
  { id: 'm3', name: 'Fase Regular II (Picos de Rendimiento)', phase: 'Realización', duration: '4 Semanas', color: '#91FFB0' },
  { id: 'm4', name: 'Playoffs (Competencia Máxima)', phase: 'Realización', duration: '3 Semanas', color: '#FFD391' },
];

const MOCK_MICROCYCLES = [
  { id: 'mic1', name: 'Semana 1 - Fuerza Base', type: 'Carga', dates: '01 Ago - 07 Ago' },
  { id: 'mic2', name: 'Semana 2 - Resistencia', type: 'Choque', dates: '08 Ago - 14 Ago' },
  { id: 'mic3', name: 'Semana 3 - Ajustes Tácticos', type: 'Aproximación', dates: '15 Ago - 21 Ago' },
  { id: 'mic4', name: 'Semana 4 - Recuperación Activa', type: 'Recuperación', dates: '22 Ago - 28 Ago' },
];

export function TrainingPlan() {
  const [activeMacro, setActiveMacro] = useState('1');
  const [activeMeso, setActiveMeso] = useState('m1');

  return (
    <div className="px-6 py-5 space-y-6">
      
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CalendarDays size={18} className="text-[#A191FF]" />
          <h2 className="text-[16px] font-bold text-foreground">Planeación Periodizada (ATR)</h2>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#A191FF] hover:bg-[#B8ADFF] text-black text-label font-semibold rounded-lg transition-colors">
          <Plus size={14} /> Nuevo Ciclo
        </button>
      </div>

      {/* ── Selector de Macrociclo ───────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-lg p-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[250px]">
          <p className="text-label text-foreground-muted mb-2">Macrociclo Actual</p>
          <Select value={activeMacro} onValueChange={setActiveMacro}>
            <SelectTrigger className="w-full bg-input border-border text-[14px] text-foreground font-semibold h-11">
              <SelectValue placeholder="Seleccionar Macrociclo" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {MOCK_MACROCYCLES.map(m => (
                <SelectItem key={m.id} value={m.id} className="text-[13px]">
                  {m.name} ({m.startDate} / {m.endDate})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-4">
          <div className="px-4 py-3 bg-secondary rounded-lg border border-border">
            <p className="text-label text-foreground-muted mb-0.5">ESTADO</p>
            <p className="text-[14px] font-semibold text-success">En progreso</p>
          </div>
          <div className="px-4 py-3 bg-secondary rounded-lg border border-border">
            <p className="text-label text-foreground-muted mb-0.5">DURACIÓN</p>
            <p className="text-[14px] font-semibold text-foreground">10 Meses</p>
          </div>
        </div>
      </div>

      {/* ── Línea de Tiempo de Mesociclos (ATR) ─────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-[14px] font-bold text-foreground flex items-center gap-2">
          <Layers size={14} className="text-[#91CAFF]" />
          Mesociclos (Modelo ATR)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {MOCK_MESOCYCLES.map(meso => (
            <button
              key={meso.id}
              onClick={() => setActiveMeso(meso.id)}
              className={`text-left p-4 rounded-xl border transition-all ${
                activeMeso === meso.id 
                  ? 'border-[#A191FF] bg-[#A191FF]/5 shadow-[0_0_15px_rgba(161,145,255,0.1)]' 
                  : 'border-border bg-card hover:border-border-hover'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <span 
                  className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded text-black"
                  style={{ backgroundColor: meso.color }}
                >
                  {meso.phase}
                </span>
                <span className="text-[11px] text-foreground-muted">{meso.duration}</span>
              </div>
              <p className="text-[14px] font-semibold text-foreground mb-1">{meso.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Microciclos del Mesociclo Activo ────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-success" />
            <h3 className="text-[14px] font-bold text-foreground">Microciclos Planificados</h3>
          </div>
          <button className="text-[12px] text-primary hover:underline font-medium">Ver Detalles</button>
        </div>
        
        <div className="divide-y divide-border">
          {MOCK_MICROCYCLES.map(micro => (
            <div key={micro.id} className="p-4 flex items-center gap-4 hover:bg-hover-bg transition-colors">
              <div className="w-12 h-12 shrink-0 rounded-lg bg-secondary flex flex-col items-center justify-center">
                <Calendar size={14} className="text-foreground-muted mb-0.5" />
                <span className="text-[10px] font-mono font-bold text-foreground">W-{micro.id.replace('mic','')}</span>
              </div>
              
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-foreground">{micro.name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[12px] text-foreground-muted">{micro.dates}</span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span className="text-[12px] text-foreground-secondary flex items-center gap-1">
                    <Target size={12} /> {micro.type}
                  </span>
                </div>
              </div>
              
              <ChevronRight size={16} className="text-foreground-muted" />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
