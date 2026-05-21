import React, { useState } from 'react';
import { X } from 'lucide-react';
import { ActionType } from './ActionIcons';

interface AdvancedCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: ActionType | null;
  onSave: (data: any) => void;
}

const actionSubtypes: Record<string, Record<string, string[]>> = {
  serve: {
    tipo: ['flotado', 'topspin', 'salto', 'corto'],
    objetivo: ['1', '2', '3', '4', '5', '6'],
    velocidad: ['baja', 'media', 'alta'],
  },
  reception: {
    calidad: ['0', '1', '2', '3'],
    receptor: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
    tipo: ['directa', 'lateral', 'emergency'],
  },
  attack: {
    tempo: ['corta', 'slide', 'pipe', 'BIC', 'alta'],
    zona_origen: ['2', '3', '4', 'pipe'],
    altura: ['baja', 'media', 'alta'],
    contra: ['1v1', 'doble', 'triple', 'libre'],
  },
  block: {
    tipo: ['solo', 'doble', 'triple'],
    toque: ['si', 'no'],
    resultado: ['punto', 'ralentiza', 'desvio'],
  },
  defense: {
    tipo: ['dig', 'pancake', 'roll'],
    calidad: ['0', '1', '2', '3'],
    resultado: ['controlado', 'emergency', 'punto_rival'],
  },
  set: {
    tipo: ['alta', 'media', 'corta', 'back'],
    zona_destino: ['2', '3', '4', 'pipe'],
    calidad: ['perfecta', 'buena', 'regular', 'mala'],
  },
  error: {
    causa: ['red', 'fuera', 'antena', 'doble', 'cuatro_toques', 'rotacion'],
    tipo: ['saque', 'ataque', 'recepcion', 'colocacion', 'bloqueo'],
  },
  timeout: {
    tipo: ['tecnico', 'medico', 'tactical'],
    duracion: ['30s', '60s', '90s'],
  },
  substitution: {
    motivo: ['tactico', 'lesion', 'rendimiento', 'rotacion', 'disciplinario'],
    tipo: ['normal', 'libero'],
  },
};

export function AdvancedCapture({ isOpen, onClose, actionType, onSave }: AdvancedCaptureProps) {
  const [selectedData, setSelectedData] = useState<Record<string, string>>({});

  if (!isOpen || !actionType || !actionSubtypes[actionType]) return null;

  const subtypes = actionSubtypes[actionType];

  const handleChipSelect = (category: string, value: string) => {
    setSelectedData(prev => ({ ...prev, [category]: value }));
  };

  const handleSave = () => {
    onSave({ action_type: actionType, subtypes: selectedData, timestamp: new Date().toISOString() });
    setSelectedData({});
    onClose();
  };

  const handleCancel = () => {
    setSelectedData({});
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-40" onClick={handleCancel} />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0d0d0d] border-t border-white/[0.08] rounded-t-xl"
        style={{ maxHeight: '60vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
          <div>
            <p className="text-[15px] font-semibold text-white">
              Captura Avanzada: <span style={{ color: '#A191FF' }}>{actionType?.toUpperCase()}</span>
            </p>
            <p className="text-[12px] text-white/40 mt-0.5">Detalles específicos de la acción</p>
          </div>
          <button onClick={handleCancel}
            className="h-8 w-8 flex items-center justify-center rounded border border-white/[0.08] text-white/40 hover:text-white/70 transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 min-h-0">
          {Object.entries(subtypes).map(([category, options]) => (
            <div key={category}>
              <p className="text-label text-white/40 mb-2">{category.replace('_', ' ')}</p>
              <div className="flex flex-wrap gap-2">
                {(options as string[]).map((option) => {
                  const isSelected = selectedData[category] === option;
                  return (
                    <button
                      key={option}
                      onClick={() => handleChipSelect(category, option)}
                      className="px-3 py-1 rounded-full border text-[12px] transition-all"
                      style={isSelected
                        ? { color: '#A191FF', backgroundColor: 'rgba(161,145,255,0.15)', borderColor: '#A191FF' }
                        : { color: 'rgba(255,255,255,0.40)', backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.10)' }
                      }
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[0.06] flex gap-3 shrink-0">
          <button onClick={handleCancel}
            className="flex-1 px-4 py-2.5 text-label text-white/40 hover:text-white transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={Object.keys(selectedData).length === 0}
            className="flex-1 px-4 py-2.5 bg-[#A191FF] hover:bg-[#B8ADFF] text-black text-label font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            Guardar
          </button>
        </div>
      </div>
    </>
  );
}

export default AdvancedCapture;
