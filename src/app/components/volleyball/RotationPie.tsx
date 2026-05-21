import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface RotationPieProps {
  data: Array<{
    rotation: number;
    sideOut: number;
    color: string;
  }>;
  height?: number;
}

export function RotationPie({ data, height = 300 }: RotationPieProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-12 rounded-lg shadow-lg border border-neutral-300">
          <p className="body font-medium text-neutral-900">
            Rotación {data.rotation}
          </p>
          <p className="caption text-neutral-700">
            Side-Out: {data.sideOut.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, rotation, sideOut }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="caption font-medium"
      >
        {rotation}
      </text>
    );
  };

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={CustomLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="sideOut"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value, entry: any) => (
              <span className="caption text-neutral-700">
                Rot. {entry.payload.rotation}: {entry.payload.sideOut.toFixed(1)}%
              </span>
            )}
            wrapperStyle={{
              fontSize: '12px',
              fontWeight: 500
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}