import React from 'react';
import { Card, CardContent } from '../ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPIStatProps {
  label: string;
  value: number | string;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  format?: 'number' | 'percentage' | 'decimal';
  size?: 'sm' | 'md' | 'lg';
}

export function KPIStat({ 
  label, 
  value, 
  unit = '',
  trend,
  trendValue,
  format = 'number',
  size = 'md'
}: KPIStatProps) {
  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'percentage':
        return `${val.toFixed(1)}%`;
      case 'decimal':
        return val.toFixed(2);
      default:
        return val.toString();
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      case 'neutral':
        return <Minus className="h-4 w-4 text-neutral-500" />;
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-success';
      case 'down':
        return 'text-destructive';
      default:
        return 'text-neutral-500';
    }
  };

  const sizeClasses = {
    sm: 'p-12',
    md: 'p-16', 
    lg: 'p-24'
  };

  const valueClasses = {
    sm: 'text-xl font-bold',
    md: 'text-2xl font-bold',
    lg: 'text-3xl font-bold'
  };

  return (
    <Card className={`${sizeClasses[size]} rounded-lg shadow-sm`}>
      <CardContent className="p-0">
        <div className="space-y-8">
          <div className="caption text-neutral-500 uppercase tracking-wide">
            {label}
          </div>
          
          <div className="flex items-baseline gap-8">
            <span className={`${valueClasses[size]} text-neutral-900`}>
              {formatValue(value)}
            </span>
            {unit && (
              <span className="body text-neutral-500">{unit}</span>
            )}
          </div>
          
          {trend && (
            <div className="flex items-center gap-6">
              {getTrendIcon()}
              {trendValue && (
                <span className={`caption ${getTrendColor()}`}>
                  {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}
                  {Math.abs(trendValue)}
                  {format === 'percentage' ? '%' : ''}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}