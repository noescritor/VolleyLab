import React, { useState, useMemo } from 'react';
import { CourtHeatmap } from './live-match/CourtHeatmap';
import { NetHeatmap } from './live-match/NetHeatmap';

interface AdvancedHeatmapDashboardProps {
  rallies: any[];
}

export function AdvancedHeatmapDashboard({ rallies }: AdvancedHeatmapDashboardProps) {
  const [activeTab, setActiveTab] = useState<'ataques'|'saques'|'bloqueos'>('ataques');

  // Filter and format impacts for CourtHeatmap (Ataques / Saques / Recepciones)
  const courtImpacts = useMemo(() => {
    return rallies
      .filter(r => r.impact && r.impact.plane === 'court')
      .filter(r => {
        const gesture = r.actions && r.actions.length > 0 
          ? r.actions[r.actions.length - 1]?.gesture?.toLowerCase()
          : r.finalAction?.toLowerCase();
        if (activeTab === 'ataques') return gesture === 'ataque';
        if (activeTab === 'saques') return gesture === 'saque';
        return false;
      })
      .map(r => ({
        x: r.impact.x,
        y: r.impact.y,
        weight: r.winner === 'our' ? 2 : 1, // Winner impacts are hotter
        type: r.winner
      }));
  }, [rallies, activeTab]);

  // Filter and format impacts for NetHeatmap (Bloqueos)
  const netImpacts = useMemo(() => {
    return rallies
      .filter(r => r.impact && r.impact.plane === 'net')
      .filter(r => {
        const gesture = r.actions && r.actions.length > 0 
          ? r.actions[r.actions.length - 1]?.gesture?.toLowerCase()
          : r.finalAction?.toLowerCase();
        return gesture === 'bloqueo';
      })
      .map(r => ({
        x: r.impact.x,
        y: r.impact.y,
        weight: r.winner === 'our' ? 2 : 1, // our blocks vs rival penetrations
        type: r.winner
      }));
  }, [rallies]);

  const activeImpacts = activeTab === 'bloqueos' ? netImpacts : courtImpacts;

  return (
    <div className="bg-[#11141a] border border-[#2e4a72]/50 rounded-lg overflow-hidden flex flex-col md:flex-row mt-6">
      {/* Visual Canvas Area */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-[#2e4a72]/50 relative">
        {/* Tabs inside Canvas Area */}
        <div className="absolute top-4 left-4 flex gap-1 bg-[#0a0c10] p-1 rounded-md border border-[#2e4a72]/30">
          <button 
            onClick={() => setActiveTab('ataques')}
            className={`px-3 py-1.5 text-[10px] uppercase font-mono tracking-wider rounded transition-colors ${activeTab === 'ataques' ? 'bg-[#A191FF] text-black font-semibold' : 'text-[#5a6070] hover:text-white'}`}
          >
            Ataques
          </button>
          <button 
            onClick={() => setActiveTab('saques')}
            className={`px-3 py-1.5 text-[10px] uppercase font-mono tracking-wider rounded transition-colors ${activeTab === 'saques' ? 'bg-[#A191FF] text-black font-semibold' : 'text-[#5a6070] hover:text-white'}`}
          >
            Saques
          </button>
          <button 
            onClick={() => setActiveTab('bloqueos')}
            className={`px-3 py-1.5 text-[10px] uppercase font-mono tracking-wider rounded transition-colors ${activeTab === 'bloqueos' ? 'bg-[#A191FF] text-black font-semibold' : 'text-[#5a6070] hover:text-white'}`}
          >
            Bloqueos (Red)
          </button>
        </div>

        <div className="mt-12">
          {activeTab === 'bloqueos' ? (
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] text-[#5a6070] tracking-widest uppercase mb-2">Vista Frontal de Red</span>
              <NetHeatmap impacts={netImpacts} width={300} height={200} mode="view" />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] text-[#5a6070] tracking-widest uppercase mb-2">Vista Superior de Cancha</span>
              <CourtHeatmap impacts={courtImpacts} width={260} height={468} mode="view" />
            </div>
          )}
        </div>
      </div>

      {/* Stats Panel */}
      <div className="w-full md:w-64 p-5 flex flex-col gap-6 bg-[#0a0c10]/50">
        <div>
          <h3 className="text-[9px] tracking-[0.2em] uppercase text-[#A191FF] mb-4">// Estadísticas de {activeTab}</h3>
          <div className="flex justify-between items-center py-2 border-b border-[#2e4a72]/30">
            <span className="text-[11px] text-[#5a6070] tracking-wider">Total impactos</span>
            <span className="text-[14px] text-white font-medium">{activeImpacts.length}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-[#2e4a72]/30">
            <span className="text-[11px] text-[#5a6070] tracking-wider">Puntos a favor</span>
            <span className="text-[14px] text-[#A191FF] font-medium">
              {activeImpacts.filter(i => i.type === 'our').length}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-[#2e4a72]/30">
            <span className="text-[11px] text-[#5a6070] tracking-wider">Puntos en contra</span>
            <span className="text-[14px] text-[#ff6b35] font-medium">
              {activeImpacts.filter(i => i.type === 'rival').length}
            </span>
          </div>
        </div>

        <div>
          <h3 className="text-[9px] tracking-[0.2em] uppercase text-[#A191FF] mb-4">// Escala de Intensidad</h3>
          <div className="flex h-3.5 rounded overflow-hidden">
            {['#0a0c10','#001a3d','#003380','#0066cc','#00b3ff','#A191FF','#FFD391','#ff6b35','#FF919F'].map(color => (
              <div key={color} style={{ background: color, flex: 1 }} />
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[9px] text-[#5a6070] uppercase tracking-wider">Baja</span>
            <span className="text-[9px] text-[#5a6070] uppercase tracking-wider">Alta</span>
          </div>
        </div>
      </div>
    </div>
  );
}
