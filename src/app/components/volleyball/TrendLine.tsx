import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TrendLineProps {
  data: Array<Record<string, any>>;
  lines: Array<{
    key: string;
    name: string;
    color: string;
  }>;
  height?: number;
  showMovingAverage?: boolean;
}

export function TrendLine({ 
  data, 
  lines, 
  height = 300, 
  showMovingAverage = false 
}: TrendLineProps) {
  
  // Calculate moving average if requested
  const processedData = showMovingAverage ? data.map((item, index) => {
    const result = { ...item };
    
    lines.forEach(line => {
      if (index >= 2) {
        const last3Values = data.slice(index - 2, index + 1).map(d => d[line.key]);
        const average = last3Values.reduce((sum, val) => sum + val, 0) / 3;
        result[`${line.key}_ma`] = average;
      }
    });
    
    return result;
  }) : data;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-12 rounded-lg shadow-lg border border-neutral-300">
          <p className="body font-medium text-neutral-900 mb-8">
            {new Date(label).toLocaleDateString('es-ES', { 
              day: '2-digit', 
              month: 'short',
              year: 'numeric'
            })}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="caption text-neutral-700">
              <span 
                className="inline-block w-3 h-3 rounded-sm mr-6"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}: {entry.value?.toFixed(1)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={processedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-300" />
          <XAxis 
            dataKey="date"
            tick={{ fontSize: 12, fill: 'var(--neutral-700)' }}
            tickFormatter={(value) => {
              const date = new Date(value);
              return `${date.getDate()}/${date.getMonth() + 1}`;
            }}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: 'var(--neutral-700)' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{
              fontSize: '12px',
              fontWeight: 500
            }}
          />
          
          {lines.map(line => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              stroke={line.color}
              strokeWidth={2}
              dot={{ fill: line.color, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: line.color, strokeWidth: 2 }}
              name={line.name}
            />
          ))}
          
          {showMovingAverage && lines.map(line => (
            <Line
              key={`${line.key}_ma`}
              type="monotone"
              dataKey={`${line.key}_ma`}
              stroke={line.color}
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
              name={`${line.name} (MA)`}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}