import React from 'react';
import { Badge } from '../ui/badge';

interface PositionBadgeProps {
  position: 'OH' | 'OPP' | 'MB' | 'S' | 'L';
  size?: 'sm' | 'md';
}

const positionConfig = {
  OH: { label: 'OH', color: 'bg-blue-500 text-white', name: 'Opuesto' },
  OPP: { label: 'OPP', color: 'bg-red-500 text-white', name: 'Punta' },
  MB: { label: 'MB', color: 'bg-green-500 text-white', name: 'Central' },
  S: { label: 'S', color: 'bg-purple-500 text-white', name: 'Colocador' },
  L: { label: 'L', color: 'bg-orange-500 text-white', name: 'Líbero' }
};

export function PositionBadge({ position, size = 'md' }: PositionBadgeProps) {
  const config = positionConfig[position];
  
  return (
    <Badge 
      className={`${config.color} ${size === 'sm' ? 'caption px-8 py-4' : 'body px-12 py-6'} rounded-lg font-medium`}
      title={config.name}
    >
      {config.label}
    </Badge>
  );
}