import React from 'react';
import {
  Zap,
  ArrowDownToLine,
  RotateCw,
  Swords,
  Shield,
  Users,
  AlertTriangle,
  RefreshCw,
  Clock,
  Hand
} from 'lucide-react';
import { cn } from '../ui/utils';

export type ActionType =
  | 'serve'
  | 'reception'
  | 'set'
  | 'attack'
  | 'block'
  | 'defense'
  | 'libero'
  | 'error'
  | 'substitution'
  | 'timeout';

export type Team = 'us' | 'opp' | 'neutral';

interface ActionIconProps {
  type: ActionType;
  team?: Team;
  active?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onTap?: () => void;
  onLongPress?: () => void;
  className?: string;
}

const iconMap = {
  serve: Zap,
  reception: ArrowDownToLine,
  set: RotateCw,
  attack: Swords,
  block: Hand,
  defense: Shield,
  libero: Users,
  error: AlertTriangle,
  substitution: RefreshCw,
  timeout: Clock,
};

const sizeClasses = {
  sm: 'h-10 w-10 text-sm',
  md: 'h-12 w-12 text-base',
  lg: 'h-14 w-14 text-lg',
};

const teamStyle = (team: Team, active: boolean) => {
  if (active) {
    switch (team) {
      case 'us':      return { backgroundColor: 'rgba(145,255,176,0.20)', borderColor: '#91FFB0', color: '#91FFB0' };
      case 'opp':     return { backgroundColor: 'rgba(255,145,159,0.20)', borderColor: '#FF919F', color: '#FF919F' };
      case 'neutral': return { backgroundColor: 'rgba(161,145,255,0.20)', borderColor: '#A191FF', color: '#A191FF' };
    }
  }
  switch (team) {
    case 'us':      return { backgroundColor: 'rgba(145,255,176,0.06)', borderColor: 'rgba(145,255,176,0.20)', color: '#91FFB0' };
    case 'opp':     return { backgroundColor: 'rgba(255,145,159,0.06)', borderColor: 'rgba(255,145,159,0.20)', color: '#FF919F' };
    case 'neutral': return { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.50)' };
  }
};

export function ActionIcon({
  type,
  team = 'neutral',
  active = false,
  disabled = false,
  size = 'md',
  onTap,
  onLongPress,
  className
}: ActionIconProps) {
  const Icon = iconMap[type];

  const handleMouseDown = React.useCallback(() => {
    if (disabled) return;

    const timeout = setTimeout(() => {
      onLongPress?.();
    }, 600);

    const handleMouseUp = () => {
      clearTimeout(timeout);
      onTap?.();
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleMouseUp);
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleMouseUp);
  }, [disabled, onTap, onLongPress]);

  return (
    <button
      className={cn(
        "rounded-xl border-2 transition-all duration-150 font-medium",
        "flex items-center justify-center",
        "active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
        sizeClasses[size],
        className
      )}
      style={teamStyle(team, active)}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
      disabled={disabled}
      aria-label={`${type} ${team}`}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

interface ActionBarProps {
  onActionSelect: (action: ActionType, team: Team) => void;
  onAdvancedMode: (action: ActionType) => void;
  activeAction?: ActionType;
  activeTeam?: Team;
  className?: string;
}

export function ActionBar({
  onActionSelect,
  onAdvancedMode,
  activeAction,
  activeTeam,
  className
}: ActionBarProps) {
  const actions: Array<{ type: ActionType; defaultTeam: Team; label: string }> = [
    { type: 'serve',        defaultTeam: 'opp',     label: 'Saque' },
    { type: 'reception',    defaultTeam: 'us',      label: 'Recepción' },
    { type: 'set',          defaultTeam: 'us',      label: 'Colocación' },
    { type: 'attack',       defaultTeam: 'us',      label: 'Ataque' },
    { type: 'block',        defaultTeam: 'us',      label: 'Bloqueo' },
    { type: 'defense',      defaultTeam: 'us',      label: 'Defensa' },
    { type: 'error',        defaultTeam: 'neutral', label: 'Error' },
    { type: 'substitution', defaultTeam: 'neutral', label: 'Cambio' },
    { type: 'timeout',      defaultTeam: 'neutral', label: 'Tiempo' },
  ];

  return (
    <div className={cn("bg-[#0d0d0d] border-t border-white/[0.06] p-4", className)}>
      <div className="grid grid-cols-5 gap-3 mb-4">
        {actions.slice(0, 5).map((action) => (
          <div key={action.type} className="flex flex-col items-center gap-1">
            <ActionIcon
              type={action.type}
              team={action.defaultTeam}
              active={activeAction === action.type}
              size="lg"
              onTap={() => onActionSelect(action.type, action.defaultTeam)}
              onLongPress={() => onAdvancedMode(action.type)}
            />
            <span className="text-[11px] font-mono uppercase tracking-wide text-white/40">
              {action.label}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-3">
        {actions.slice(5).map((action) => (
          <div key={action.type} className="flex flex-col items-center gap-1">
            <ActionIcon
              type={action.type}
              team={action.defaultTeam}
              active={activeAction === action.type}
              size="lg"
              onTap={() => onActionSelect(action.type, action.defaultTeam)}
              onLongPress={() => onAdvancedMode(action.type)}
            />
            <span className="text-[11px] font-mono uppercase tracking-wide text-white/40">
              {action.label}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 text-[11px] text-white/25 text-center font-mono uppercase tracking-wide">
        Tap: acción rápida • Mantener: modo avanzado
      </div>
    </div>
  );
}

export default ActionIcon;
