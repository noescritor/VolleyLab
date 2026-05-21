import React from 'react';
import { RadarChart as RechartsRadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend } from 'recharts';

interface RadarChartProps {
  data: Array<{
    subject: string;
    player: number;
    reference?: number;
  }>;
  playerName?: string;
  referenceName?: string;
  height?: number;
}

const fundamentals = [
  'Saque',
  'Recepción', 
  'Ataque',
  'Bloqueo',
  'Defensa'
];

export function RadarChart({ 
  data, 
  playerName = 'Jugador',
  referenceName = 'Referencia',
  height = 300 
}: RadarChartProps) {
  // Ensure data has all 5 fundamentals
  const completeData = fundamentals.map(fundamental => {
    const existing = data.find(d => d.subject === fundamental);
    return existing || { subject: fundamental, player: 0, reference: 0 };
  });

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart data={completeData}>
          <PolarGrid className="stroke-neutral-300" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fontSize: 12, fill: 'var(--neutral-700)' }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: 'var(--neutral-500)' }}
            tickCount={6}
          />
          <Radar
            name={playerName}
            dataKey="player"
            stroke="var(--primary)"
            fill="var(--primary)"
            fillOpacity={0.2}
            strokeWidth={2}
          />
          {completeData.some(d => d.reference !== undefined) && (
            <Radar
              name={referenceName}
              dataKey="reference"
              stroke="var(--neutral-500)"
              fill="var(--neutral-500)"
              fillOpacity={0.1}
              strokeWidth={1}
              strokeDasharray="5 5"
            />
          )}
          <Legend
            wrapperStyle={{
              fontSize: '12px',
              fontWeight: 500
            }}
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}