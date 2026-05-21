import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Zap, Settings, BarChart3, Save, Flag, Download, CheckCircle, RotateCcw, Plus } from 'lucide-react';
import { toast } from 'sonner';

// Import the new Live Match Center
import LiveMatchCenter from './live-match/LiveMatchCenter';

// Keep existing components for fallback/settings
import { RallyCapture } from './match-center/RallyCapture';
import { ScoreControl } from './match-center/ScoreControl';
import { MatchTimeline } from './match-center/MatchTimeline';
import { MatchHeader } from './match-center/MatchHeader';
import { VolleyballCourt } from './match-center/VolleyballCourt';
import { TeamSetup } from './match-center/TeamSetup';
import { VolleyballMatch, VolleyballSet, Team_Legacy, Rally, RallyEvent, Player, Rotation } from '../utils/match-types';

interface MatchCenterProps {
  className?: string;
}

export function MatchCenter({ className }: MatchCenterProps) {
  const [activeMode, setActiveMode] = useState<'live' | 'legacy' | 'analytics'>('legacy'); // Changed default to legacy

  // Mock match state for legacy mode
  const [mockMatch, setMockMatch] = useState<VolleyballMatch>({
    id: 'demo-match-1',
    date: new Date().toISOString(),
    localTeam: 'Nuestro Equipo',
    visitaTeam: 'Equipo Rival',
    setsToWin: 3,
    currentSet: 1,
    state: 'playing',
    localPlayers: [
      { id: 'p1', name: 'López', number: 4, position: 'Punta', isLibero: false, isActive: true },
      { id: 'p2', name: 'García', number: 7, position: 'Central', isLibero: false, isActive: true },
      { id: 'p3', name: 'Rodríguez', number: 12, position: 'Colocador', isLibero: false, isActive: true },
      { id: 'p4', name: 'Martínez', number: 2, position: 'Líbero', isLibero: true, isActive: true },
      { id: 'p5', name: 'Fernández', number: 9, position: 'Opuesto', isLibero: false, isActive: true },
      { id: 'p6', name: 'Sánchez', number: 15, position: 'Punta', isLibero: false, isActive: true }
    ],
    visitaPlayers: [
      { id: 'v1', name: 'Silva', number: 7, position: 'Punta', isLibero: false, isActive: true },
      { id: 'v2', name: 'Costa', number: 3, position: 'Central', isLibero: false, isActive: true },
      { id: 'v3', name: 'Oliveira', number: 8, position: 'Colocador', isLibero: false, isActive: true },
      { id: 'v4', name: 'Santos', number: 1, position: 'Líbero', isLibero: true, isActive: true },
      { id: 'v5', name: 'Lima', number: 11, position: 'Opuesto', isLibero: false, isActive: true },
      { id: 'v6', name: 'Reis', number: 6, position: 'Punta', isLibero: false, isActive: true }
    ],
    sets: [
      {
        id: 'set-1',
        matchId: 'demo-match-1',
        number: 1,
        startRotationLocal: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
        startRotationVisita: ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'],
        currentRotationLocal: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
        currentRotationVisita: ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'],
        serverTeam: 'local',
        serverPlayerId: 'p1',
        scoreLocal: 15,
        scoreVisita: 12,
        setsWonLocal: 0,
        setsWonVisita: 0,
        rallies: [],
        substitutions: [],
        timeouts: [],
        cards: [],
        startedAt: Date.now() - 600000, // 10 minutes ago
        endedAt: undefined,
        winner: undefined
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const [isRallyActive, setIsRallyActive] = useState(false);
  const [currentRally, setCurrentRally] = useState<Rally | null>(null);
  const [currentSet, setCurrentSet] = useState<VolleyballSet>(mockMatch.sets[0]);
  const [showManagementMenu, setShowManagementMenu] = useState(false);

  const handleActionSave = async (action: any) => {
    // Mock save - replace with actual API integration
    console.log('Saving action:', action);
    await new Promise(resolve => setTimeout(resolve, 100));
  };

  const handleStartRally = () => {
    const newRally: Rally = {
      id: `rally-${Date.now()}`,
      setId: currentSet.id,
      number: currentSet.rallies.length + 1,
      serverTeam: currentSet.serverTeam,
      serverPlayerId: expectedServer?.id || '',
      events: [],
      winnerTeam: 'local', // Will be updated when rally ends
      cause: '',
      startedAt: Date.now(),
      endedAt: Date.now(), // Will be updated when rally ends
      duration: 0
    };
    setCurrentRally(newRally);
    setIsRallyActive(true);
  };

  const handleEndRally = (winnerTeam: Team_Legacy, cause: string) => {
    if (currentRally) {
      const endedRally = {
        ...currentRally,
        winnerTeam,
        cause,
        endedAt: Date.now(),
        duration: Date.now() - currentRally.startedAt
      };
      
      // Check if there's a side-out (serving team changes)
      const isSideOut = winnerTeam !== currentSet.serverTeam;
      
      // Update set score and add rally to rallies array
      let newSet = winnerTeam === 'local' 
        ? { 
            ...currentSet, 
            scoreLocal: currentSet.scoreLocal + 1,
            rallies: [...currentSet.rallies, endedRally]
          }
        : { 
            ...currentSet, 
            scoreVisita: currentSet.scoreVisita + 1,
            rallies: [...currentSet.rallies, endedRally]
          };
      
      // Check if set is won according to volleyball rules
      const isSetWon = checkSetWin(newSet);
      
      if (isSetWon.hasWinner) {
        // Set is finished
        const finishedSet = {
          ...newSet,
          winner: isSetWon.winner,
          endedAt: Date.now()
        };
        
        // Update match with finished set
        const updatedMatch = {
          ...mockMatch,
          sets: mockMatch.sets.map(s => s.id === currentSet.id ? finishedSet : s)
        };
        
        // Check if match is won (first to 3 sets)
        const setsWonLocal = updatedMatch.sets.filter(s => s.winner === 'local').length;
        const setsWonVisita = updatedMatch.sets.filter(s => s.winner === 'visita').length;
        
        if (setsWonLocal >= 3 || setsWonVisita >= 3) {
          // Match is finished
          const matchWinner = setsWonLocal >= 3 ? 'local' : 'visita';
          console.log(`¡PARTIDO TERMINADO! Ganador: ${matchWinner === 'local' ? mockMatch.localTeam : mockMatch.visitaTeam}`);
          console.log(`Resultado final: ${setsWonLocal}-${setsWonVisita}`);
          
          // Show match result
          setTimeout(() => {
            alert(`¡PARTIDO TERMINADO!\n\n🏆 Ganador: ${matchWinner === 'local' ? mockMatch.localTeam : mockMatch.visitaTeam}\n\n📊 Resultado: ${setsWonLocal}-${setsWonVisita} sets\n\n🏐 Set ${finishedSet.number}: ${newSet.scoreLocal}-${newSet.scoreVisita}`);
          }, 1000);
          
          // Here you would handle match end - save to database, generate reports, etc.
        } else {
          // Start next set
          const nextSetNumber = finishedSet.number + 1;
          const nextSet: VolleyballSet = {
            id: `set-${nextSetNumber}`,
            matchId: mockMatch.id,
            number: nextSetNumber,
            startRotationLocal: finishedSet.currentRotationLocal,
            startRotationVisita: finishedSet.currentRotationVisita,
            currentRotationLocal: finishedSet.currentRotationLocal,
            currentRotationVisita: finishedSet.currentRotationVisita,
            serverTeam: isSetWon.winner === 'local' ? 'visita' : 'local', // Losing team serves first in next set
            serverPlayerId: isSetWon.winner === 'local' ? finishedSet.currentRotationVisita[0] : finishedSet.currentRotationLocal[0],
            scoreLocal: 0,
            scoreVisita: 0,
            setsWonLocal: setsWonLocal,
            setsWonVisita: setsWonVisita,
            rallies: [],
            substitutions: [],
            timeouts: [],
            cards: [],
            startedAt: Date.now(),
            endedAt: undefined,
            winner: undefined
          };
          
          console.log(`¡SET ${finishedSet.number} TERMINADO! ${isSetWon.winner === 'local' ? mockMatch.localTeam : mockMatch.visitaTeam} gana ${newSet.scoreLocal}-${newSet.scoreVisita}`);
          console.log(`Sets ganados: ${mockMatch.localTeam} ${setsWonLocal} - ${setsWonVisita} ${mockMatch.visitaTeam}`);
          console.log(`Iniciando Set ${nextSetNumber}...`);
          
          // Show set transition
          setTimeout(() => {
            alert(`SET ${finishedSet.number} TERMINADO\n\n🏐 ${isSetWon.winner === 'local' ? mockMatch.localTeam : mockMatch.visitaTeam} gana ${newSet.scoreLocal}-${newSet.scoreVisita}\n\n📊 Sets: ${mockMatch.localTeam} ${setsWonLocal} - ${setsWonVisita} ${mockMatch.visitaTeam}\n\n▶️ Iniciando Set ${nextSetNumber}`);
          }, 500);
          
          // Update current set to the new set
          setTimeout(() => {
            setCurrentSet(nextSet);
            // Update the match with the new set
            setMockMatch(prev => ({
              ...prev,
              sets: [...prev.sets, nextSet],
              currentSet: nextSetNumber
            }));
          }, 2000); // Give time to show the alert
        }
        
        setCurrentSet(finishedSet);
        setCurrentRally(null);
        setIsRallyActive(false);
        return;
      }
      
      // If side-out, change serving team and rotate that team
      if (isSideOut) {
        const newServingTeam = winnerTeam;
        
        // Rotate the team that won the point
        let newLocalRotation = newSet.currentRotationLocal;
        let newVisitaRotation = newSet.currentRotationVisita;
        
        if (newServingTeam === 'local') {
          // Rotate local team clockwise: [1,2,3,4,5,6] -> [6,1,2,3,4,5]
          newLocalRotation = [
            newSet.currentRotationLocal[5], // 6 -> 1
            newSet.currentRotationLocal[0], // 1 -> 2
            newSet.currentRotationLocal[1], // 2 -> 3
            newSet.currentRotationLocal[2], // 3 -> 4
            newSet.currentRotationLocal[3], // 4 -> 5
            newSet.currentRotationLocal[4]  // 5 -> 6
          ];
        } else {
          // Rotate visita team clockwise
          newVisitaRotation = [
            newSet.currentRotationVisita[5], // 6 -> 1
            newSet.currentRotationVisita[0], // 1 -> 2
            newSet.currentRotationVisita[1], // 2 -> 3
            newSet.currentRotationVisita[2], // 3 -> 4
            newSet.currentRotationVisita[3], // 4 -> 5
            newSet.currentRotationVisita[4]  // 5 -> 6
          ];
        }
        
        newSet = {
          ...newSet,
          serverTeam: newServingTeam,
          serverPlayerId: newServingTeam === 'local' ? newLocalRotation[0] : newVisitaRotation[0],
          currentRotationLocal: newLocalRotation,
          currentRotationVisita: newVisitaRotation
        };
      }
      
      setCurrentSet(newSet);
      setCurrentRally(null);
      setIsRallyActive(false);
    }
  };

  // Helper function to check if set is won according to volleyball rules
  const checkSetWin = (set: VolleyballSet): { hasWinner: boolean; winner?: Team_Legacy } => {
    const { scoreLocal, scoreVisita, number } = set;
    const targetScore = number === 5 ? 15 : 25; // Set 5 is played to 15, others to 25
    const minDifference = 2;
    
    // Check if local team wins
    if (scoreLocal >= targetScore && (scoreLocal - scoreVisita) >= minDifference) {
      return { hasWinner: true, winner: 'local' };
    }
    
    // Check if visita team wins
    if (scoreVisita >= targetScore && (scoreVisita - scoreLocal) >= minDifference) {
      return { hasWinner: true, winner: 'visita' };
    }
    
    return { hasWinner: false };
  };

  const handleAddRallyEvent = (event: RallyEvent) => {
    if (currentRally) {
      const updatedRally = {
        ...currentRally,
        events: [...currentRally.events, event]
      };
      setCurrentRally(updatedRally);
    }
  };

  const handleRotationChange = (localRotation: Rotation, visitaRotation: Rotation, servingTeam: Team_Legacy) => {
    const updatedSet = {
      ...currentSet,
      currentRotationLocal: localRotation,
      currentRotationVisita: visitaRotation,
      serverTeam: servingTeam,
      serverPlayerId: servingTeam === 'local' ? localRotation[0] : visitaRotation[0]
    };
    setCurrentSet(updatedSet);
  };

  const handleSubstitutionRequest = (team: Team_Legacy, position: number) => {
    // Mock substitution - would integrate with substitution system
    console.log(`Substitution requested for ${team} at position ${position}`);
    // toast.info(`Substitución solicitada: ${team} posición ${position}`);
  };

  // Match Management Functions
  const handleFinishMatch = async () => {
    try {
      // Finalize current set if active
      const finalMatch = {
        ...mockMatch,
        state: 'finished' as const,
        endedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Calculate final match statistics
      const setsWonLocal = finalMatch.sets.filter(s => s.winner === 'local').length;
      const setsWonVisita = finalMatch.sets.filter(s => s.winner === 'visita').length;
      const matchWinner = setsWonLocal > setsWonVisita ? 'local' : 'visita';

      // Here you would save to database/API
      console.log('Saving match data:', finalMatch);
      await handleActionSave(finalMatch);

      // Update the match state to finished
      setMockMatch(finalMatch);
      
      toast.success(`¡Partido finalizado y guardado!\n${matchWinner === 'local' ? mockMatch.localTeam : mockMatch.visitaTeam} gana ${setsWonLocal}-${setsWonVisita}`);
    } catch (error) {
      toast.error('Error al guardar el partido. Inténtalo de nuevo.');
      console.error('Error saving match:', error);
    }
  };

  const handleNewMatch = () => {
    // Create a new empty match
    const newMatch: VolleyballMatch = {
      id: `match-${Date.now()}`,
      date: new Date().toISOString(),
      localTeam: 'Equipo Local',
      visitaTeam: 'Equipo Visitante',
      setsToWin: 3,
      currentSet: 1,
      state: 'playing',
      localPlayers: [
        { id: 'p1', name: 'Jugador 1', number: 1, position: 'Punta', isLibero: false, isActive: true },
        { id: 'p2', name: 'Jugador 2', number: 2, position: 'Central', isLibero: false, isActive: true },
        { id: 'p3', name: 'Jugador 3', number: 3, position: 'Colocador', isLibero: false, isActive: true },
        { id: 'p4', name: 'Jugador 4', number: 4, position: 'Líbero', isLibero: true, isActive: true },
        { id: 'p5', name: 'Jugador 5', number: 5, position: 'Opuesto', isLibero: false, isActive: true },
        { id: 'p6', name: 'Jugador 6', number: 6, position: 'Punta', isLibero: false, isActive: true }
      ],
      visitaPlayers: [
        { id: 'v1', name: 'Rival 1', number: 1, position: 'Punta', isLibero: false, isActive: true },
        { id: 'v2', name: 'Rival 2', number: 2, position: 'Central', isLibero: false, isActive: true },
        { id: 'v3', name: 'Rival 3', number: 3, position: 'Colocador', isLibero: false, isActive: true },
        { id: 'v4', name: 'Rival 4', number: 4, position: 'Líbero', isLibero: true, isActive: true },
        { id: 'v5', name: 'Rival 5', number: 5, position: 'Opuesto', isLibero: false, isActive: true },
        { id: 'v6', name: 'Rival 6', number: 6, position: 'Punta', isLibero: false, isActive: true }
      ],
      sets: [
        {
          id: 'set-1',
          matchId: `match-${Date.now()}`,
          number: 1,
          startRotationLocal: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
          startRotationVisita: ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'],
          currentRotationLocal: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
          currentRotationVisita: ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'],
          serverTeam: 'local',
          serverPlayerId: 'p1',
          scoreLocal: 0,
          scoreVisita: 0,
          setsWonLocal: 0,
          setsWonVisita: 0,
          rallies: [],
          substitutions: [],
          timeouts: [],
          cards: [],
          startedAt: Date.now(),
          endedAt: undefined,
          winner: undefined
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setMockMatch(newMatch);
    setCurrentSet(newMatch.sets[0]);
    setCurrentRally(null);
    setIsRallyActive(false);
    
    toast.success('¡Nuevo partido iniciado! Configura los equipos y comienza a jugar.');
  };

  const handleResetScores = () => {
    // Reset only the current set scores, keeping teams and players
    const resetSet = {
      ...currentSet,
      scoreLocal: 0,
      scoreVisita: 0,
      rallies: [],
      startedAt: Date.now(),
      endedAt: undefined,
      winner: undefined
    };

    const updatedMatch = {
      ...mockMatch,
      sets: mockMatch.sets.map(s => s.id === currentSet.id ? resetSet : s),
      updatedAt: new Date().toISOString()
    };

    setMockMatch(updatedMatch);
    setCurrentSet(resetSet);
    setCurrentRally(null);
    setIsRallyActive(false);
    
    toast.success('Puntuaciones reseteadas. El set ha sido reiniciado.');
  };

  // Additional handler functions that are referenced in the UI
  const handleSaveProgress = async () => {
    try {
      console.log('Saving progress:', mockMatch);
      await handleActionSave({ type: 'save_progress', data: mockMatch });
      
      const updatedMatch = {
        ...mockMatch,
        updatedAt: new Date().toISOString()
      };
      setMockMatch(updatedMatch);
      
      toast.success('Progreso guardado correctamente.');
    } catch (error) {
      toast.error('Error al guardar el progreso.');
      console.error('Error saving progress:', error);
    }
  };

  const handleExportMatchData = () => {
    try {
      const matchData = {
        match: mockMatch,
        currentSet: currentSet,
        exportedAt: new Date().toISOString(),
        exportType: 'full_match_data'
      };

      // Create downloadable JSON file
      const dataStr = JSON.stringify(matchData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `volleyball_match_${mockMatch.localTeam}_vs_${mockMatch.visitaTeam}_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      toast.success('Datos del partido exportados correctamente.');
    } catch (error) {
      toast.error('Error al exportar los datos.');
      console.error('Error exporting match data:', error);
    }
  };

  const expectedServer: Player | null = mockMatch.localPlayers[0]; // Mock server

  return (
    <div className={className}>
      {/* Mode selector */}
      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Match Center - Captura de Partido
            </CardTitle>
            <CardDescription>
              Sistema de análisis técnico-táctico en tiempo real
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeMode} onValueChange={(value) => setActiveMode(value as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="legacy" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Captura Clásica
                </TabsTrigger>
                <TabsTrigger value="live" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Modo Rápido
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Análisis
                </TabsTrigger>
              </TabsList>

              {/* Legacy Mode - Primary interface */}
              <TabsContent value="legacy" className="mt-4">
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">
                        Modo de Captura Detallada - Análisis técnico-táctico completo
                      </span>
                    </div>
                  </div>

                  {/* Match Header with real data */}
                  <MatchHeader 
                    match={mockMatch}
                    currentSet={currentSet}
                  />

                  {/* Match Management Panel */}
                  {/* Compact Match Management Dropdown */}
                  <div className="flex flex-col gap-2">
                    {/* Team Setup - Always visible */}
                    <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-blue-900 truncate">Configuración de Equipos</h4>
                        <p className="text-xs text-blue-700">Equipos y formaciones</p>
                      </div>
                      <TeamSetup 
                        onMatchConfigured={(newMatch) => {
                          setMockMatch(newMatch);
                          setCurrentSet(newMatch.sets[0]);
                          setCurrentRally(null);
                          setIsRallyActive(false);
                        }}
                        initialMatch={mockMatch}
                      />
                    </div>

                    {/* Match Management Dropdown */}
                    <div className="relative">
                      <Button 
                        variant="outline" 
                        className="w-full flex items-center justify-between p-3 h-auto"
                        onClick={() => setShowManagementMenu(!showManagementMenu)}
                      >
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          <div className="text-left">
                            <div className="text-sm font-medium">Gestión del Partido</div>
                            <div className="text-xs text-muted-foreground">
                              {mockMatch.state === 'playing' ? 'En curso' : 'Finalizado'} • 
                              {Math.floor((Date.now() - new Date(mockMatch.createdAt).getTime()) / 60000)} min
                            </div>
                          </div>
                        </div>
                        <div className={`transition-transform ${showManagementMenu ? 'rotate-180' : ''}`}>
                          ↓
                        </div>
                      </Button>

                      {showManagementMenu && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-border rounded-lg shadow-lg">
                          <div className="p-3 space-y-3">
                            {mockMatch.state === 'finished' ? (
                              /* Finished Match Options */
                              <>
                                <div className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <span className="text-xs text-green-800">Partido Finalizado</span>
                                </div>
                                
                                <div className="space-y-2">
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button size="sm" className="w-full justify-start">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Nuevo Partido
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle className="flex items-center gap-2">
                                          <Plus className="h-5 w-5 text-blue-600" />
                                          Iniciar Nuevo Partido
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          ¿Estás seguro de que quieres iniciar un nuevo partido? Esta acción limpiará todos los datos actuales.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleNewMatch}>
                                          Sí, Nuevo Partido
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>

                                  <Button 
                                    onClick={handleExportMatchData} 
                                    variant="outline" 
                                    size="sm"
                                    className="w-full justify-start"
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Exportar Datos
                                  </Button>
                                </div>
                              </>
                            ) : (
                              /* Active Match Options */
                              <div className="space-y-2">
                                <Button 
                                  onClick={handleSaveProgress} 
                                  variant="outline" 
                                  size="sm"
                                  className="w-full justify-start"
                                  disabled={isRallyActive}
                                >
                                  <Save className="h-4 w-4 mr-2" />
                                  Guardar Progreso
                                </Button>

                                <Button 
                                  onClick={handleExportMatchData} 
                                  variant="outline" 
                                  size="sm"
                                  className="w-full justify-start"
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Exportar Datos
                                </Button>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="w-full justify-start border-red-200 text-red-600 hover:bg-red-50"
                                      disabled={isRallyActive}
                                    >
                                      <Flag className="h-4 w-4 mr-2" />
                                      Finalizar Partido
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="flex items-center gap-2">
                                        <Flag className="h-5 w-5 text-red-600" />
                                        Finalizar Partido
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        ¿Estás seguro de que quieres finalizar este partido? No se podrán hacer más cambios.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={handleFinishMatch} className="bg-red-600 hover:bg-red-700">
                                        Sí, Finalizar
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>

                                <div className="border-t pt-2">
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="w-full justify-start border-yellow-200 text-yellow-700 hover:bg-yellow-50"
                                        disabled={isRallyActive}
                                      >
                                        <RotateCcw className="h-4 w-4 mr-2" />
                                        Reiniciar Set
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Reiniciar Set Actual</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          ¿Reiniciar el set {currentSet.number}? Se perderán todos los rallies del set actual.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleResetScores} className="bg-yellow-600 hover:bg-yellow-700">
                                          Sí, Reiniciar
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>

                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="w-full justify-start mt-1"
                                        disabled={isRallyActive}
                                      >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Nuevo Partido
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Iniciar Nuevo Partido</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          ¿Iniciar un nuevo partido? Se perderá el progreso no guardado.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleNewMatch}>
                                          Sí, Nuevo Partido
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                            )}

                            {/* Status Footer */}
                            <div className="border-t pt-2 text-xs text-muted-foreground space-y-1">
                              <div className="flex justify-between">
                                <span>Estado:</span>
                                <Badge variant={mockMatch.state === 'playing' ? 'default' : 'secondary'} className="text-xs">
                                  {mockMatch.state === 'playing' ? 'En curso' : 'Finalizado'}
                                </Badge>
                              </div>
                              <div className="flex justify-between">
                                <span>Guardado:</span>
                                <span>{new Date(mockMatch.updatedAt).toLocaleTimeString()}</span>
                              </div>
                              {isRallyActive && (
                                <div className="flex justify-between">
                                  <span>Rally activo:</span>
                                  <Badge variant="destructive" className="text-xs">
                                    No se puede guardar
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Main capture area */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <ScoreControl 
                        match={mockMatch}
                        currentSet={currentSet}
                        isRallyActive={isRallyActive}
                        expectedServer={expectedServer}
                        onStartRally={handleStartRally}
                        onEndRally={handleEndRally}
                      />
                      
                      <RallyCapture 
                        currentRally={currentRally}
                        isRallyActive={isRallyActive}
                        match={mockMatch}
                        onAddEvent={handleAddRallyEvent}
                      />
                    </div>

                    <div>
                      <VolleyballCourt
                        match={mockMatch}
                        currentSet={currentSet}
                        onRotationChange={handleRotationChange}
                        onSubstitutionRequest={handleSubstitutionRequest}
                        isRallyActive={isRallyActive}
                      />
                    </div>

                    <div>
                      <MatchTimeline 
                        match={mockMatch}
                        currentSet={currentSet}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Live Mode - Optional ultra-fast interface */}
              <TabsContent value="live" className="mt-4">
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-green-500">EXPERIMENTAL</Badge>
                      <div>
                        <h4 className="font-medium">Interfaz Ultra-Rápida</h4>
                        <p className="text-sm text-muted-foreground">
                          Cero teclado • Dos toques máximo • Gestos intuitivos • Modo offline
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <LiveMatchCenter 
                    matchId="demo-match-001"
                    onActionSave={handleActionSave}
                  />
                </div>
              </TabsContent>

              {/* Analytics Mode - Live insights */}
              <TabsContent value="analytics" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Side-out Actual</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">67%</div>
                      <p className="text-xs text-muted-foreground">Últimos 10 rallies</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Racha Actual</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">+3</div>
                      <p className="text-xs text-muted-foreground">Puntos consecutivos</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Eficiencia Ataque</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-600">72%</div>
                      <p className="text-xs text-muted-foreground">Este set</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Servidor Rival</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm font-medium">López #4</div>
                      <div className="text-xs text-muted-foreground">
                        3 saques, 1 ace, 0 errores
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Rotación Débil</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm font-medium text-red-600">Rotación 4</div>
                      <div className="text-xs text-muted-foreground">
                        45% side-out histórico
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Tiempo Jugado</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">18:42</div>
                      <p className="text-xs text-muted-foreground">Set actual</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}