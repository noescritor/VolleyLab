import React from 'react';
import { Users, Trophy, Info, Sparkles } from 'lucide-react';
import { useApp } from '../utils/AppContext';

export function SampleDataInfo() {
  const { state } = useApp();

  const SAMPLE_NAMES = [
    'Sofia Martínez', 'Isabella Rodriguez', 'Camila Fernández', 'Valeria López',
    'Antonella Silva', 'Martina González', 'Renata Torres', 'Bianca Herrera'
  ];

  const hasSampleData = state.players.some(p => SAMPLE_NAMES.includes(p.name));
  if (!hasSampleData) return null;

  const positionCounts = state.players.reduce<Record<string, number>>((acc, p) => {
    acc[p.position] = (acc[p.position] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="border border-dashed border-[#A191FF]/25 bg-[#A191FF]/04 rounded-lg px-5 py-4">
      <div className="flex items-start gap-3">
        <Sparkles size={14} className="text-[#A191FF] mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-white">Datos de Ejemplo Cargados</p>
          <p className="text-[12px] text-white/40 mt-0.5 mb-3">
            Datos ficticios para explorar todas las funcionalidades del sistema.
          </p>

          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-[12px] text-white/50">
                <Users size={11} />
                <span className="font-semibold">{state.players.length} Jugadoras:</span>
              </div>
              {Object.entries(positionCounts).map(([pos, cnt]) => (
                <span key={pos} className="text-label px-2 py-0.5 rounded-full border border-white/[0.08] text-white/40">
                  {cnt} {pos}
                </span>
              ))}
            </div>

            {state.matches.length > 0 && (
              <div className="flex items-center gap-1.5 text-[12px] text-white/50">
                <Trophy size={11} />
                <span>{state.matches.length} partidos de ejemplo</span>
              </div>
            )}

            <div className="flex items-start gap-2 mt-3 bg-white/[0.03] border border-white/[0.06] rounded px-3 py-2.5">
              <Info size={11} className="text-white/25 mt-0.5 shrink-0" />
              <div className="text-[11px] text-white/40 space-y-0.5">
                <p className="font-semibold text-white/50 mb-1">Jugadoras incluidas:</p>
                <p>• <span className="text-white/60">Centrales:</span> Sofia Martínez, Isabella Rodriguez</p>
                <p>• <span className="text-white/60">Puntas:</span> Camila Fernández, Valeria López</p>
                <p>• <span className="text-white/60">Opuesto:</span> Antonella Silva</p>
                <p>• <span className="text-white/60">Líberos:</span> Martina González, Renata Torres</p>
                <p>• <span className="text-white/60">Colocador:</span> Bianca Herrera</p>
                <p className="mt-1.5 text-white/30">Puedes editar, eliminar o agregar jugadoras.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
