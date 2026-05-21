import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { 
  ArrowRightLeft, 
  Users, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  User,
  UserCheck,
  UserX,
  Activity,
  Shield
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { VolleyballMatch, VolleyballSet, Team, Position, Player, SubstitutionState } from '../../utils/match-types';

interface SubstitutionControlProps {
  match: VolleyballMatch;
  currentSet: VolleyballSet | null;
  isRallyActive: boolean;
  onExecuteSubstitution: (
    team: Team,
    inPlayerId: string,
    outPlayerId: string,
    position: Position,
    reason?: 'tactical' | 'injury' | 'performance' | 'rotation' | 'disciplinary'
  ) => boolean;
  onValidateSubstitution: (
    team: Team,
    inPlayerId: string,
    outPlayerId: string,
    position: Position
  ) => { isValid: boolean; reason?: string; warnings?: string[] };
  getTeamSubstitutionState: (team: Team) => SubstitutionState | null;
  getBenchPlayers: (team: Team) => Player[];
  getActivePlayer: (team: Team, position: Position) => Player | null;
}

export function SubstitutionControl({
  match,
  currentSet,
  isRallyActive,
  onExecuteSubstitution,
  onValidateSubstitution,
  getTeamSubstitutionState,
  getBenchPlayers,
  getActivePlayer
}: SubstitutionControlProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team>('local');
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [selectedOutPlayer, setSelectedOutPlayer] = useState<string>('');
  const [selectedInPlayer, setSelectedInPlayer] = useState<string>('');
  const [substitutionReason, setSubstitutionReason] = useState<'tactical' | 'injury' | 'performance' | 'rotation' | 'disciplinary'>('tactical');

  const localSubState = getTeamSubstitutionState('local');
  const visitaSubState = getTeamSubstitutionState('visita');

  const handlePositionSelect = (team: Team, position: Position) => {
    if (isRallyActive) {
      toast.error('No se pueden hacer cambios durante un rally');
      return;
    }

    const activePlayer = getActivePlayer(team, position);
    if (!activePlayer) {
      toast.error('No hay jugador en esa posición');
      return;
    }

    setSelectedTeam(team);
    setSelectedPosition(position);
    setSelectedOutPlayer(activePlayer.id);
    setSelectedInPlayer('');
    setIsDialogOpen(true);
  };

  const handleExecuteSubstitution = () => {
    if (!selectedPosition || !selectedOutPlayer || !selectedInPlayer) {
      toast.error('Completa todos los campos');
      return;
    }

    // Validate substitution
    const validation = onValidateSubstitution(
      selectedTeam,
      selectedInPlayer,
      selectedOutPlayer,
      selectedPosition
    );

    if (!validation.isValid) {
      toast.error(validation.reason || 'Substitución no válida');
      return;
    }

    // Show warnings if any
    if (validation.warnings && validation.warnings.length > 0) {
      validation.warnings.forEach(warning => toast.warning(warning));
    }

    // Execute substitution
    const success = onExecuteSubstitution(
      selectedTeam,
      selectedInPlayer,
      selectedOutPlayer,
      selectedPosition,
      substitutionReason
    );

    if (success) {
      const outPlayer = [...match.localPlayers, ...match.visitaPlayers].find(p => p.id === selectedOutPlayer);
      const inPlayer = [...match.localPlayers, ...match.visitaPlayers].find(p => p.id === selectedInPlayer);
      
      toast.success(`Substitución realizada: ${outPlayer?.name} → ${inPlayer?.name}`);
      setIsDialogOpen(false);
      resetForm();
    } else {
      toast.error('Error al ejecutar la substitución');
    }
  };

  const resetForm = () => {
    setSelectedPosition(null);
    setSelectedOutPlayer('');
    setSelectedInPlayer('');
    setSubstitutionReason('tactical');
  };

  const benchPlayers = getBenchPlayers(selectedTeam);
  const outPlayer = [...match.localPlayers, ...match.visitaPlayers].find(p => p.id === selectedOutPlayer);

  const getPositionName = (position: Position): string => {
    const names = {
      1: 'Servidor',
      2: 'Zaguero',
      3: 'Central',
      4: 'Banda',
      5: 'Colocador',
      6: 'Líbero'
    };
    return names[position] || `Posición ${position}`;
  };

  const formatLastSubstitution = (state: SubstitutionState) => {
    // Since we don't have substitutionHistory in SubstitutionState,
    // we'll show the count of used substitutions instead
    if (state.substitutionsUsed === 0) return 'Sin cambios';
    
    return `${state.substitutionsUsed} cambios`;
  };

  if (!currentSet) return null;

  return (
    <div className="space-y-3">
      {/* Substitution Status */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ArrowRightLeft className="h-4 w-4" />
            Control de Substituciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Team Substitution States */}
          <div className="space-y-2">
            {/* Local Team */}
            <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
              <div className="flex items-center gap-2">
                <Users className="h-3 w-3 text-blue-600" />
                <span className="text-xs font-medium">{match.localTeam}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {localSubState ? `${localSubState.availableSubstitutions}/6` : '6/6'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {localSubState ? formatLastSubstitution(localSubState) : 'Sin cambios'}
                </span>
              </div>
            </div>

            {/* Visita Team */}
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                <Users className="h-3 w-3 text-gray-600" />
                <span className="text-xs font-medium">{match.visitaTeam}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {visitaSubState ? `${visitaSubState.availableSubstitutions}/6` : '6/6'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {visitaSubState ? formatLastSubstitution(visitaSubState) : 'Sin cambios'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <div className="text-xs font-medium">Hacer cambio:</div>
            <div className="grid grid-cols-2 gap-2">
              {/* Local positions */}
              {[1, 2, 3, 4, 5, 6].map(position => {
                const player = getActivePlayer('local', position as Position);
                const canSubstitute = !isRallyActive && localSubState && localSubState.availableSubstitutions > 0;
                
                return (
                  <Button
                    key={`local-${position}`}
                    variant="outline"
                    size="sm"
                    disabled={!canSubstitute || !player}
                    onClick={() => handlePositionSelect('local', position as Position)}
                    className="justify-between h-8 text-xs"
                  >
                    <span>{player ? player.name.split(' ')[0] : `Pos ${position}`}</span>
                    <ArrowRightLeft className="h-3 w-3" />
                  </Button>
                );
              })}

              {/* Visita positions */}
              {[1, 2, 3, 4, 5, 6].map(position => {
                const player = getActivePlayer('visita', position as Position);
                const canSubstitute = !isRallyActive && visitaSubState && visitaSubState.availableSubstitutions > 0;
                
                return (
                  <Button
                    key={`visita-${position}`}
                    variant="outline"
                    size="sm"
                    disabled={!canSubstitute || !player}
                    onClick={() => handlePositionSelect('visita', position as Position)}
                    className="justify-between h-8 text-xs"
                  >
                    <span>{player ? player.name.split(' ')[0] : `Pos ${position}`}</span>
                    <ArrowRightLeft className="h-3 w-3" />
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Rally Status */}
          {isRallyActive && (
            <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
              <Activity className="h-3 w-3 text-yellow-600" />
              <span className="text-xs text-yellow-800">Rally activo - substituciones bloqueadas</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Substitution Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              Realizar Substitución
            </DialogTitle>
            <DialogDescription>
              {selectedTeam === 'local' ? match.localTeam : match.visitaTeam} - {selectedPosition ? getPositionName(selectedPosition) : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Player Out */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <UserX className="h-3 w-3" />
                Jugador que sale
              </label>
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                {outPlayer ? (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-red-800">#{outPlayer.number}</span>
                    </div>
                    <div>
                      <div className="font-medium text-sm">{outPlayer.name}</div>
                      <div className="text-xs text-muted-foreground">{outPlayer.position}</div>
                    </div>
                    {outPlayer.isLibero && (
                      <Badge variant="secondary" className="text-xs">
                        <Shield className="h-3 w-3 mr-1" />
                        Líbero
                      </Badge>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Selecciona una posición</span>
                )}
              </div>
            </div>

            {/* Player In */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <UserCheck className="h-3 w-3" />
                Jugador que entra
              </label>
              <Select value={selectedInPlayer} onValueChange={setSelectedInPlayer}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona jugador de la banca" />
                </SelectTrigger>
                <SelectContent>
                  {benchPlayers.map(player => (
                    <SelectItem key={player.id} value={player.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">#{player.number} {player.name}</span>
                        <span className="text-xs text-muted-foreground">({player.position})</span>
                        {player.isLibero && (
                          <Badge variant="secondary" className="text-xs">Líbero</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo</label>
              <Select value={substitutionReason} onValueChange={(value: any) => setSubstitutionReason(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tactical">Táctico</SelectItem>
                  <SelectItem value="performance">Rendimiento</SelectItem>
                  <SelectItem value="injury">Lesión</SelectItem>
                  <SelectItem value="rotation">Rotación</SelectItem>
                  <SelectItem value="disciplinary">Disciplinario</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Validation Preview */}
            {selectedInPlayer && selectedOutPlayer && selectedPosition && (
              <div className="p-3 rounded border">
                {(() => {
                  const validation = onValidateSubstitution(
                    selectedTeam,
                    selectedInPlayer,
                    selectedOutPlayer,
                    selectedPosition
                  );
                  
                  return validation.isValid ? (
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">Substitución válida</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm">{validation.reason}</span>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleExecuteSubstitution}
                disabled={!selectedInPlayer || !selectedOutPlayer}
                className="flex-1"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}