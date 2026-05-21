import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface BarStackedProps {
  data: Array<{
    name: string;
    aciertos: number;
    errores: number;
    total?: number;
  }>;
  height?: number;
  showLegend?: boolean;
}

export function BarStacked({ data, height = 300, showLegend = true }: BarStackedProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
      
      return (
        <div className="bg-white p-12 rounded-lg shadow-lg border border-neutral-300">
          <p className="body font-medium text-neutral-900 mb-8">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="caption text-neutral-700">
              <span 
                className="inline-block w-3 h-3 rounded-sm mr-6"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}: {entry.value} ({((entry.value / total) * 100).toFixed(1)}%)
            </p>
          ))}
          <div className="border-t border-neutral-300 mt-8 pt-8">
            <p className="caption font-medium text-neutral-900">
              Total: {total}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-300" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12, fill: 'var(--neutral-700)' }}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: 'var(--neutral-700)' }}
          />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && (
            <Legend
              wrapperStyle={{
                fontSize: '12px',
                fontWeight: 500
              }}
            />
          )}
          <Bar 
            dataKey="aciertos" 
            stackId="a" 
            fill="var(--success)"
            name="Aciertos"
            radius={[0, 0, 0, 0]}
          />
          <Bar 
            dataKey="errores" 
            stackId="a" 
            fill="var(--destructive)"
            name="Errores"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}