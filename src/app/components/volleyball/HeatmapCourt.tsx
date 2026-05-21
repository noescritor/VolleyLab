import React from 'react';

interface HeatmapCourtProps {
  data: Array<{
    zone: number;
    intensity: number; // 0-100
    count?: number;
  }>;
  title?: string;
  showLegend?: boolean;
}

export function HeatmapCourt({ data, title, showLegend = true }: HeatmapCourtProps) {
  const getIntensityColor = (intensity: number) => {
    const alpha = intensity / 100;
    return `rgba(37, 99, 235, ${alpha})`; // Primary color with variable alpha
  };

  const getZonePosition = (zone: number) => {
    // Volleyball court zones 1-6 from right to left, back to front
    const positions = {
      1: { x: 66.7, y: 75 },  // Back right
      2: { x: 33.3, y: 75 },  // Back center  
      3: { x: 0, y: 75 },     // Back left
      4: { x: 0, y: 25 },     // Front left
      5: { x: 33.3, y: 25 },  // Front center
      6: { x: 66.7, y: 25 }   // Front right
    };
    return positions[zone as keyof typeof positions] || { x: 0, y: 0 };
  };

  const maxIntensity = Math.max(...data.map(d => d.intensity), 1);

  return (
    <div className="space-y-16">
      {title && (
        <h3 className="title text-neutral-900">{title}</h3>
      )}
      
      <div className="relative">
        {/* Court background */}
        <div className="relative w-full bg-neutral-100 border-2 border-neutral-300 rounded-lg overflow-hidden"
             style={{ aspectRatio: '2/1', height: '200px' }}>
          
          {/* Court lines */}
          <div className="absolute inset-0">
            {/* Center line */}
            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-neutral-300 transform -translate-y-0.5" />
            
            {/* Attack lines */}
            <div className="absolute left-0 right-0 h-0.5 bg-neutral-300" style={{ top: '25%' }} />
            <div className="absolute left-0 right-0 h-0.5 bg-neutral-300" style={{ top: '75%' }} />
            
            {/* Zone separators */}
            <div className="absolute top-0 bottom-0 w-0.5 bg-neutral-300" style={{ left: '33.3%' }} />
            <div className="absolute top-0 bottom-0 w-0.5 bg-neutral-300" style={{ left: '66.7%' }} />
          </div>
          
          {/* Heatmap zones */}
          {data.map(({ zone, intensity, count }) => {
            const position = getZonePosition(zone);
            return (
              <div
                key={zone}
                className="absolute flex items-center justify-center text-white font-medium transition-all duration-300 hover:scale-105"
                style={{
                  left: `${position.x}%`,
                  top: `${position.y}%`,
                  width: '33.33%',
                  height: '50%',
                  backgroundColor: getIntensityColor(intensity),
                  border: intensity > 0 ? '2px solid rgba(255, 255, 255, 0.3)' : 'none'
                }}
                title={`Zona ${zone}: ${intensity.toFixed(1)}% intensidad${count ? ` (${count} eventos)` : ''}`}
              >
                <div className="text-center">
                  <div className="caption font-bold">{zone}</div>
                  {count && (
                    <div className="text-xs opacity-90">{count}</div>
                  )}
                </div>
              </div>
            );
          })}
          
          {/* Zone numbers for empty zones */}
          {[1, 2, 3, 4, 5, 6].map(zone => {
            const hasData = data.some(d => d.zone === zone);
            if (hasData) return null;
            
            const position = getZonePosition(zone);
            return (
              <div
                key={`empty-${zone}`}
                className="absolute flex items-center justify-center text-neutral-500"
                style={{
                  left: `${position.x}%`,
                  top: `${position.y}%`,
                  width: '33.33%',
                  height: '50%'
                }}
              >
                <div className="caption">{zone}</div>
              </div>
            );
          })}
        </div>
        
        {/* Legend */}
        {showLegend && (
          <div className="flex items-center justify-center gap-16 mt-12">
            <span className="caption text-neutral-500">Baja</span>
            <div className="flex gap-2">
              {[0, 25, 50, 75, 100].map(intensity => (
                <div
                  key={intensity}
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: getIntensityColor(intensity) }}
                />
              ))}
            </div>
            <span className="caption text-neutral-500">Alta</span>
          </div>
        )}
      </div>
    </div>
  );
}