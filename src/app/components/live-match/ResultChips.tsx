import React from 'react';
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { cn } from '../ui/utils';

export type ResultType = 'point' | 'error' | 'continuation';

interface ResultChipProps {
  type: ResultType;
  team?: 'us' | 'opp';
  active?: boolean;
  onSelect?: () => void;
  className?: string;
}

const chipStyle = (type: ResultType, team: 'us' | 'opp' | undefined, active: boolean) => {
  if (type === 'continuation') {
    return {
      backgroundColor: active ? 'rgba(145,202,255,0.20)' : 'rgba(145,202,255,0.06)',
      borderColor: active ? '#91CAFF' : 'rgba(145,202,255,0.20)',
      color: '#91CAFF',
    };
  }
  if (type === 'point') {
    const isPositive = team === 'us';
    const color = isPositive ? '#91FFB0' : '#FF919F';
    const rgb = isPositive ? '145,255,176' : '255,145,159';
    return {
      backgroundColor: active ? `rgba(${rgb},0.20)` : `rgba(${rgb},0.06)`,
      borderColor: active ? color : `rgba(${rgb},0.20)`,
      color,
    };
  }
  // error — inverted: our error = red, opp error = green
  const isNegative = team === 'us';
  const color = isNegative ? '#FF919F' : '#91FFB0';
  const rgb = isNegative ? '255,145,159' : '145,255,176';
  return {
    backgroundColor: active ? `rgba(${rgb},0.20)` : `rgba(${rgb},0.06)`,
    borderColor: active ? color : `rgba(${rgb},0.20)`,
    color,
  };
};

const typeLabel: Record<ResultType, string> = {
  point: 'Punto',
  error: 'Error',
  continuation: 'Continúa',
};

const typeIcon = { point: CheckCircle, error: XCircle, continuation: ArrowRight };

export function ResultChip({
  type,
  team,
  active = false,
  onSelect,
  className
}: ResultChipProps) {
  const Icon = typeIcon[type];

  return (
    <button
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all duration-150",
        "font-medium text-sm active:scale-95 disabled:opacity-50",
        className
      )}
      style={chipStyle(type, team, active)}
      onClick={onSelect}
    >
      <Icon className="h-4 w-4" />
      <span>{typeLabel[type]}{team === 'us' ? ' Nosotros' : team === 'opp' ? ' Rival' : ''}</span>
    </button>
  );
}

interface ResultBarProps {
  onResultSelect: (result: ResultType, team?: 'us' | 'opp') => void;
  activeResult?: ResultType;
  activeTeam?: 'us' | 'opp';
  disabled?: boolean;
  className?: string;
}

export function ResultBar({
  onResultSelect,
  activeResult,
  activeTeam,
  disabled = false,
  className
}: ResultBarProps) {
  return (
    <div className={cn(
      "flex items-center justify-center gap-2 flex-wrap p-4 bg-[#0d0d0d] border-t border-white/[0.06]",
      disabled && "opacity-50 pointer-events-none",
      className
    )}>
      <ResultChip
        type="point"
        team="us"
        active={activeResult === 'point' && activeTeam === 'us'}
        onSelect={() => onResultSelect('point', 'us')}
      />
      <ResultChip
        type="continuation"
        active={activeResult === 'continuation'}
        onSelect={() => onResultSelect('continuation')}
      />
      <ResultChip
        type="point"
        team="opp"
        active={activeResult === 'point' && activeTeam === 'opp'}
        onSelect={() => onResultSelect('point', 'opp')}
      />
    </div>
  );
}

export default ResultChip;
