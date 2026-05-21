import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  Clock, 
  ArrowRightLeft, 
  User,
  Shield,
  AlertCircle,
  TrendingUp,
  Activity
} from 'lucide-react';
import { VolleyballMatch, VolleyballSet, Substitution, Player } from '../../utils/match-types';

interface SubstitutionHistoryProps {
  match: VolleyballMatch;
  currentSet: VolleyballSet | null;
}

export function SubstitutionHistory({ match, currentSet }: SubstitutionHistoryProps) {
  if (!currentSet) return null;

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const getPlayer = (playerId: string): Player | undefined => {
    return [...match.localPlayers, ...match.visitaPlayers].find(p => p.id === playerId);
  };

  const getReasonIcon = (reason?: string) => {
    switch (reason) {
      case 'tactical': return <TrendingUp className="h-3 w-3" />;
      case 'injury': return <AlertCircle className="h-3 w-3" />;
      case 'performance': return <Activity className="h-3 w-3" />;
      default: return <ArrowRightLeft className="h-3 w-3" />;
    }
  };

  const getReasonColor = (reason?: string): string => {
    switch (reason) {
      case 'tactical': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'injury': return 'bg-red-50 text-red-700 border-red-200';
      case 'performance': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'rotation': return 'bg-green-50 text-green-700 border-green-200';
      case 'disciplinary': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getReasonText = (reason?: string): string => {
    switch (reason) {
      case 'tactical': return 'Táctico';
      case 'injury': return 'Lesión';
      case 'performance': return 'Rendimiento';
      case 'rotation': return 'Rotación';
      case 'disciplinary': return 'Disciplinario';
      default: return 'General';
    }
  };

  // Group substitutions by team
  const localSubstitutions = currentSet.substitutions.filter(s => s.team === 'local');
  const visitaSubstitutions = currentSet.substitutions.filter(s => s.team === 'visita');

  // Statistics
  const totalSubstitutions = currentSet.substitutions.length;
  const liberoSubstitutions = currentSet.substitutions.filter(s => s.isLibero).length;
  const regularSubstitutions = totalSubstitutions - liberoSubstitutions;

  const renderSubstitution = (substitution: Substitution, index: number) => {
    const inPlayer = getPlayer(substitution.inPlayerId);
    const outPlayer = getPlayer(substitution.outPlayerId);
    const isRecent = (Date.now() - substitution.timestamp) < 300000; // Last 5 minutes

    return (
      <div 
        key={substitution.id}
        className={`
          p-3 rounded-lg border transition-all
          ${isRecent ? 'ring-1 ring-green-200 bg-green-50' : 'bg-white'}
        `}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-primary">#{index + 1}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {formatTime(substitution.timestamp)}
              </span>
            </div>
            {isRecent && (
              <Badge variant="default" className="text-xs bg-green-600">
                Reciente
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {substitution.isLibero && (
              <Badge variant="secondary" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                Líbero
              </Badge>
            )}
            <div className={`px-2 py-1 rounded text-xs border ${getReasonColor(substitution.reason)}`}>
              <div className="flex items-center gap-1">
                {getReasonIcon(substitution.reason)}
                {getReasonText(substitution.reason)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Player Out */}
          <div className="flex items-center gap-2 flex-1">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-red-800">#{outPlayer?.number}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm truncate">{outPlayer?.name}</div>
              <div className="text-xs text-muted-foreground">{outPlayer?.position}</div>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex items-center">
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Player In */}
          <div className="flex items-center gap-2 flex-1">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-green-800">#{inPlayer?.number}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm truncate">{inPlayer?.name}</div>
              <div className="text-xs text-muted-foreground">{inPlayer?.position}</div>
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Posición {substitution.position}</span>
          <span>Rally #{substitution.rallyNumber}</span>
          <span>Hace {formatDuration(substitution.timestamp)}</span>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ArrowRightLeft className="h-4 w-4" />
          Historial de Substituciones
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statistics */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-blue-50 rounded">
            <div className="text-lg font-bold text-blue-700">{totalSubstitutions}</div>
            <div className="text-xs text-blue-600">Total</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <div className="text-lg font-bold text-green-700">{regularSubstitutions}</div>
            <div className="text-xs text-green-600">Regulares</div>
          </div>
          <div className="text-center p-2 bg-yellow-50 rounded">
            <div className="text-lg font-bold text-yellow-700">{liberoSubstitutions}</div>
            <div className="text-xs text-yellow-600">Líbero</div>
          </div>
        </div>

        {/* Team Sections */}
        {localSubstitutions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-3 w-3 text-blue-600" />
              <span className="text-sm font-medium">{match.localTeam}</span>
              <Badge variant="outline" className="text-xs">
                {localSubstitutions.length} cambios
              </Badge>
            </div>
            <div className="space-y-2">
              {localSubstitutions.map((sub, index) => renderSubstitution(sub, index))}
            </div>
          </div>
        )}

        {visitaSubstitutions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-3 w-3 text-gray-600" />
              <span className="text-sm font-medium">{match.visitaTeam}</span>
              <Badge variant="outline" className="text-xs">
                {visitaSubstitutions.length} cambios
              </Badge>
            </div>
            <div className="space-y-2">
              {visitaSubstitutions.map((sub, index) => renderSubstitution(sub, index))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {totalSubstitutions === 0 && (
          <div className="text-center py-6">
            <ArrowRightLeft className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <div className="text-sm text-muted-foreground">
              No se han realizado substituciones en este set
            </div>
          </div>
        )}

        {/* Quick Stats */}
        {totalSubstitutions > 0 && (
          <div className="pt-2 border-t">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">Disponibles:</span>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {match.localTeam}: {6 - localSubstitutions.filter(s => !s.isLibero).length}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {match.visitaTeam}: {6 - visitaSubstitutions.filter(s => !s.isLibero).length}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Última:</span>
                <div className="mt-1">
                  {currentSet.substitutions.length > 0 && (
                    <span className="text-xs">
                      {formatDuration(currentSet.substitutions[currentSet.substitutions.length - 1].timestamp)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}