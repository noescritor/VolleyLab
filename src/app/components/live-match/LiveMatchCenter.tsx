import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner@2.0.3';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { RotateCcw, TrendingUp, TrendingDown } from 'lucide-react';

import LiveMatchHeader from './LiveMatchHeader';
import MiniCourt, { CourtZone } from './MiniCourt';
import { ActionBar, ActionType } from './ActionIcons';
import { ResultBar, ResultType } from './ResultChips';
import AdvancedCapture from './AdvancedCapture';
import SubstitutionDrawer from './SubstitutionDrawer';
import OfflineQueue, { useOfflineQueue } from './OfflineQueue';

interface LiveMatchCenterProps {
  matchId?: string;
  onActionSave?: (action: any) => Promise<void>;
}

interface RallyState {
  id: string | null;
  isActive: boolean;
  sequence: number;
  actions: any[];
}

interface MatchState {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  currentSet: number;
  totalSets: number;
  rotation: number;
  server: string;
  sideOutCurrent: number;
  streak: { team: 'us' | 'opp'; count: number };
}

function LiveMatchCenterContent({ matchId, onActionSave }: LiveMatchCenterProps) {
  // Queue context
  const { addToQueue, isOnline } = useOfflineQueue();

  // Rally state
  const [rallyState, setRallyState] = useState<RallyState>({
    id: null,
    isActive: false,
    sequence: 0,
    actions: []
  });

  // Match state (mock data for demo)
  const [matchState, setMatchState] = useState<MatchState>({
    homeTeam: 'Nuestro Equipo',
    awayTeam: 'Rival',
    homeScore: 15,
    awayScore: 12,
    currentSet: 1,
    totalSets: 5,
    rotation: 3,
    server: 'López #4',
    sideOutCurrent: 67,
    streak: { team: 'us', count: 3 }
  });

  // UI state
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<'us' | 'opp' | null>(null);
  const [selectedZone, setSelectedZone] = useState<CourtZone | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSubstitutions, setShowSubstitutions] = useState(false);

  // Auto-start rally when action is selected
  useEffect(() => {
    if (selectedAction && !rallyState.isActive) {
      startNewRally();
    }
  }, [selectedAction]);

  const startNewRally = useCallback(() => {
    const rallyId = `rally-${Date.now()}`;
    setRallyState({
      id: rallyId,
      isActive: true,
      sequence: 0,
      actions: []
    });
    
    toast.success('Rally iniciado', {
      description: 'Registra las acciones del rally'
    });
  }, []);

  const addActionToRally = useCallback((actionData: any) => {
    if (!rallyState.id) return;

    const newAction = {
      id: `action-${Date.now()}`,
      rally_id: rallyState.id,
      sequence: rallyState.sequence + 1,
      ...actionData,
      timestamp: new Date().toISOString()
    };

    setRallyState(prev => ({
      ...prev,
      sequence: prev.sequence + 1,
      actions: [...prev.actions, newAction]
    }));

    // Add to offline queue
    const queueId = addToQueue({
      type: 'action',
      data: newAction
    });

    toast.success('Acción registrada', {
      action: {
        label: 'Deshacer',
        onClick: () => undoLastAction(queueId)
      },
      duration: 3000
    });
  }, [rallyState, addToQueue]);

  const undoLastAction = useCallback((queueId?: string) => {
    if (rallyState.actions.length === 0) return;

    setRallyState(prev => ({
      ...prev,
      sequence: Math.max(0, prev.sequence - 1),
      actions: prev.actions.slice(0, -1)
    }));

    // TODO: Remove from queue if queueId provided
    toast.success('Acción deshecha');
  }, [rallyState]);

  const endRally = useCallback((result: ResultType, team?: 'us' | 'opp') => {
    if (!rallyState.id) return;

    const rallyEnd = {
      type: 'rally_end',
      rally_id: rallyState.id,
      result,
      team,
      duration: Date.now() - parseInt(rallyState.id.split('-')[1]),
      actions_count: rallyState.sequence
    };

    // Add to queue
    addToQueue({
      type: 'rally_end',
      data: rallyEnd
    });

    // Update score if point
    if (result === 'point' && team) {
      setMatchState(prev => ({
        ...prev,
        homeScore: team === 'us' ? prev.homeScore + 1 : prev.homeScore,
        awayScore: team === 'opp' ? prev.awayScore + 1 : prev.awayScore,
        streak: {
          team,
          count: prev.streak.team === team ? prev.streak.count + 1 : 1
        }
      }));
    }

    // Reset rally state
    setRallyState({
      id: null,
      isActive: false,
      sequence: 0,
      actions: []
    });

    // Clear selections
    setSelectedAction(null);
    setSelectedTeam(null);
    setSelectedZone(null);

    toast.success('Rally finalizado');
  }, [rallyState, addToQueue]);

  const handleActionSelect = useCallback((action: ActionType, team: 'us' | 'opp' | 'neutral') => {
    setSelectedAction(action);
    setSelectedTeam(team === 'neutral' ? null : team);

    // For some actions, we need zone selection
    const needsZone = ['serve', 'attack', 'defense'].includes(action);
    if (!needsZone) {
      // Direct action without zone
      addActionToRally({
        action_type: action,
        team,
        zone: null
      });
    }
  }, [addActionToRally]);

  const handleZoneSelect = useCallback((zone: CourtZone) => {
    if (!selectedAction) return;

    setSelectedZone(zone);
    
    // Complete the action with zone
    addActionToRally({
      action_type: selectedAction,
      team: selectedTeam,
      landing_zone: zone.zone,
      landing_x: zone.x,
      landing_y: zone.y
    });

    // Clear selections for next action
    setSelectedAction(null);
    setSelectedTeam(null);
    setSelectedZone(null);
  }, [selectedAction, selectedTeam, addActionToRally]);

  const handleAdvancedCapture = useCallback((data: any) => {
    addActionToRally(data);
    setShowAdvanced(false);
  }, [addActionToRally]);

  const handleScoreSwipe = useCallback((direction: 'left' | 'right') => {
    const team = direction === 'right' ? 'us' : 'opp';
    endRally('point', team);
  }, [endRally]);

  const handleScoreLongPress = useCallback(() => {
    // Start timeout
    toast.info('Tiempo fuera solicitado', {
      description: 'Temporizador de 60 segundos iniciado'
    });
  }, []);

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <LiveMatchHeader
        homeTeam={matchState.homeTeam}
        awayTeam={matchState.awayTeam}
        homeScore={matchState.homeScore}
        awayScore={matchState.awayScore}
        currentSet={matchState.currentSet}
        totalSets={matchState.totalSets}
        rotation={matchState.rotation}
        server={matchState.server}
        isOnline={isOnline}
        onScoreSwipe={handleScoreSwipe}
        onScoreLongPress={handleScoreLongPress}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Status chips */}
        <div className="p-4 bg-[#0d0d0d] border-b border-white/[0.06]">
          <div className="flex flex-wrap gap-2 justify-center">
            <span className="flex items-center gap-1.5 text-label px-3 py-1 rounded-full border"
              style={rallyState.isActive
                ? { color: '#91FFB0', backgroundColor: 'rgba(145,255,176,0.08)', borderColor: 'rgba(145,255,176,0.20)' }
                : { color: 'rgba(255,255,255,0.30)', backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
              <div className={`h-2 w-2 rounded-full ${rallyState.isActive ? 'animate-pulse' : ''}`}
                style={{ backgroundColor: rallyState.isActive ? '#91FFB0' : 'rgba(255,255,255,0.20)' }} />
              {rallyState.isActive ? 'RALLY ACTIVO' : 'RALLY INACTIVO'}
            </span>

            <span className="text-label px-3 py-1 rounded-full border"
              style={{ color: '#91CAFF', backgroundColor: 'rgba(145,202,255,0.08)', borderColor: 'rgba(145,202,255,0.20)' }}>
              SIDE-OUT {matchState.sideOutCurrent}%
            </span>

            <span className="flex items-center gap-1 text-label px-3 py-1 rounded-full border"
              style={matchState.streak.team === 'us'
                ? { color: '#91FFB0', backgroundColor: 'rgba(145,255,176,0.08)', borderColor: 'rgba(145,255,176,0.20)' }
                : { color: '#FF919F', backgroundColor: 'rgba(255,145,159,0.08)', borderColor: 'rgba(255,145,159,0.20)' }}>
              {matchState.streak.team === 'us'
                ? <TrendingUp className="h-3 w-3" />
                : <TrendingDown className="h-3 w-3" />}
              RACHA {matchState.streak.count}
            </span>
          </div>
        </div>

        {/* Court area */}
        <div className="flex-1 p-4 flex items-center justify-center">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-6 w-full max-w-md">
            <div className="text-center mb-4">
              <h3 className="text-[14px] font-semibold text-white">
                {selectedAction ? `${selectedAction.toUpperCase()} — Selecciona zona` : 'Selecciona una acción'}
              </h3>
              {rallyState.isActive && (
                <p className="text-[12px] text-white/30 mt-1">
                  Secuencia: {rallyState.sequence} acciones
                </p>
              )}
            </div>

            <MiniCourt
              side="us"
              onTap={handleZoneSelect}
              showOutLanes={true}
              highlightZone={selectedZone?.zone}
              className="mb-4"
            />

            {/* Quick actions */}
            {rallyState.isActive && (
              <div className="flex gap-2 justify-center">
                <button onClick={() => endRally('continuation')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-white/[0.08] text-label text-white/40 hover:text-white/70 hover:border-white/20 transition-colors">
                  Continuar Rally
                </button>
                <button onClick={() => setShowSubstitutions(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-white/[0.08] text-label text-white/40 hover:text-white/70 hover:border-white/20 transition-colors">
                  Sustituciones
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Result bar */}
        {rallyState.isActive && (
          <ResultBar
            onResultSelect={endRally}
            disabled={false}
          />
        )}

        {/* Action bar */}
        <ActionBar
          onActionSelect={handleActionSelect}
          onAdvancedMode={(action) => {
            setSelectedAction(action);
            setShowAdvanced(true);
          }}
          activeAction={selectedAction}
          activeTeam={selectedTeam}
        />
      </div>

      {/* Modals */}
      <AdvancedCapture
        isOpen={showAdvanced}
        onClose={() => setShowAdvanced(false)}
        actionType={selectedAction}
        onSave={handleAdvancedCapture}
      />

      <SubstitutionDrawer
        isOpen={showSubstitutions}
        onClose={() => setShowSubstitutions(false)}
        courtPlayers={[
          { id: '1', name: 'Pérez', number: 1, position: 'MB' },
          { id: '2', name: 'García', number: 2, position: 'OH' },
          { id: '3', name: 'López', number: 3, position: 'OPP' },
          { id: '4', name: 'Silva', number: 4, position: 'OH' },
          { id: '5', name: 'Torres', number: 5, position: 'S' },
          { id: '6', name: 'Morales', number: 6, position: 'MB' },
        ]}
        benchPlayers={[
          { id: '7', name: 'Jiménez', number: 7, position: 'L', isLibero: true },
          { id: '8', name: 'Castro', number: 8, position: 'OH' },
          { id: '9', name: 'Vargas', number: 9, position: 'MB' },
        ]}
        substitutionHistory={[]}
        substitutionsLeft={6}
        onSubstitution={(from, to, pos) => {
          toast.success('Sustitución registrada');
        }}
        onLiberoToggle={(isEntering, playerId) => {
          toast.success(`Líbero ${isEntering ? 'entra' : 'sale'}`);
        }}
        onRevertLastSubstitution={() => {
          toast.success('Sustitución revertida');
        }}
      />
    </div>
  );
}

export function LiveMatchCenter(props: LiveMatchCenterProps) {
  const handleSync = async (actions: any[]) => {
    // Mock sync - replace with actual API calls
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Syncing actions:', actions);
    
    if (props.onActionSave) {
      for (const action of actions) {
        await props.onActionSave(action.action);
      }
    }
  };

  return (
    <OfflineQueue onSync={handleSync}>
      <LiveMatchCenterContent {...props} />
    </OfflineQueue>
  );
}

export default LiveMatchCenter;