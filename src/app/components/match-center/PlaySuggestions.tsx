import React from 'react';
import { Lightbulb, TrendingUp, Activity } from 'lucide-react';
import { VolleyballMatch, VolleyballSet, Rally } from '../../utils/match-types';

interface PlaySuggestionsProps {
  match: VolleyballMatch;
  currentSet: VolleyballSet | null;
  currentRally: Rally | null;
}

export function PlaySuggestions({ match, currentSet, currentRally }: PlaySuggestionsProps) {
  const generateSuggestions = () => {
    if (!currentSet) return [];
    return [
      {
        play: 'A (Rápida Central)',
        targetPlayer: 'Central',
        probability: 85,
        reasoning: ['Alto % en entrenamiento', 'Buena recepción esperada', 'Bloqueo rival débil en centro'],
        score: 4.2
      },
      {
        play: 'Ataque Alto Zona 4',
        targetPlayer: 'Banda',
        probability: 72,
        reasoning: ['Jugada segura', 'Banda en racha', 'Pase calidad 2-3'],
        score: 3.8
      },
      {
        play: 'Pipe (Zaguero)',
        targetPlayer: 'Opuesto',
        probability: 65,
        reasoning: ['Sorpresa táctica', 'Buen timing', 'Bloqueo desorganizado'],
        score: 3.5
      }
    ];
  };

  const getDistribution = () => {
    if (!currentSet) return null;
    return { zona4: 35, zona3: 25, zona2: 20, pipe: 15, back1: 5 };
  };

  const probColor = (pct: number) =>
    pct >= 75 ? '#91FFB0' : pct >= 60 ? '#FFD391' : '#FF919F';

  const suggestions = generateSuggestions();
  const distribution = getDistribution();

  return (
    <div className="space-y-4">
      {/* Suggestions */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2">
          <Lightbulb size={13} className="text-[#FFD391]" />
          <p className="text-[13px] font-semibold text-white">Sugerencias de Jugada</p>
        </div>

        {suggestions.length > 0 ? (
          <div className="divide-y divide-white/[0.04]">
            {suggestions.map((s, i) => (
              <div key={i} className="px-5 py-3.5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-[13px] text-white font-medium">{s.play}</p>
                    <p className="text-[11px] text-white/40 mt-0.5">→ {s.targetPlayer}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-[14px] font-mono font-bold" style={{ color: probColor(s.probability) }}>
                      {s.probability}%
                    </p>
                    <p className="text-[11px] text-white/30 font-mono">Score {s.score}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${s.probability}%`, backgroundColor: probColor(s.probability) }} />
                </div>

                <div className="space-y-0.5">
                  {s.reasoning.map((r, ri) => (
                    <div key={ri} className="flex items-center gap-1.5 text-[11px] text-white/30">
                      <div className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                      {r}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-[13px] text-white/20">
            <Lightbulb className="h-7 w-7 mx-auto mb-2 opacity-30" />
            Inicia un rally para ver sugerencias
          </div>
        )}
      </div>

      {/* Setter distribution */}
      {distribution && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2">
            <TrendingUp size={13} className="text-[#A191FF]" />
            <p className="text-[13px] font-semibold text-white">Distribución del Set</p>
          </div>
          <div className="px-5 py-4 space-y-3">
            {[
              { label: 'Zona 4',  value: distribution.zona4 },
              { label: 'Centro (3)', value: distribution.zona3 },
              { label: 'Zona 2',  value: distribution.zona2 },
              { label: 'Pipe',    value: distribution.pipe },
              { label: 'Back-1',  value: distribution.back1 },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="flex justify-between mb-1">
                  <span className="text-[12px] text-white/50">{label}</span>
                  <span className="text-[12px] font-mono font-semibold text-white/70">{value}%</span>
                </div>
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full bg-[#A191FF] rounded-full transition-all" style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick stats */}
      {currentSet && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2">
            <Activity size={13} className="text-[#91CAFF]" />
            <p className="text-[13px] font-semibold text-white">Stats del Set</p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y divide-white/[0.04]">
            {[
              {
                value: currentSet.rallies.length,
                label: 'Rallies'
              },
              {
                value: currentSet.rallies.length > 0
                  ? `${Math.round(currentSet.rallies.reduce((acc, r) => acc + r.duration, 0) / currentSet.rallies.length / 1000)}s`
                  : '0s',
                label: 'Rally Prom.'
              },
              {
                value: currentSet.scoreLocal + currentSet.scoreVisita > 0
                  ? `${Math.round((currentSet.scoreLocal / (currentSet.scoreLocal + currentSet.scoreVisita)) * 100)}%`
                  : '50%',
                label: 'Side-out Local'
              },
              {
                value: Math.max(currentSet.scoreLocal, currentSet.scoreVisita) >= 20 ? 'ALTA' : 'NORMAL',
                label: 'Intensidad',
                color: Math.max(currentSet.scoreLocal, currentSet.scoreVisita) >= 20 ? '#FF919F' : '#91FFB0'
              },
            ].map(({ value, label, color }) => (
              <div key={label} className="py-3 px-4 text-center">
                <p className="text-[20px] font-bold font-mono" style={{ color: color || 'white' }}>{value}</p>
                <p className="text-label text-white/25 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
