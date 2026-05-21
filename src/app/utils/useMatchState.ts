import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';
import { liveMatchAPI } from './liveMatchAPI';
import { 
  VolleyballMatch, 
  VolleyballSet, 
  Rally, 
  RallyEvent, 
  Team, 
  Position,
  Rotation,
  Player,
  Substitution,
  SubstitutionValidation,
  SubstitutionState,
  applyPoint,
  getExpectedServer,
  rotateClockwise,
  validateSubstitution,
  applySubstitution,
  getSubstitutionState
} from './match-types';

// Local Storage utilities for backup/fallback
const STORAGE_KEY = 'volleyball-matches';
const ACTIVE_MATCH_KEY = 'volleyball-active-match';

interface StoredMatch {
  id: string;
  name: string;
  match: VolleyballMatch;
  lastUpdated: string;
  isActive: boolean;
}

// Backup functions for localStorage (fallback)
function saveMatchToLocalStorage(match: VolleyballMatch): void {
  try {
    const stored = getStoredMatchesFromLocal();
    const matchName = `${match.localTeam} vs ${match.visitaTeam}`;
    
    const storedMatch: StoredMatch = {
      id: match.id,
      name: matchName,
      match,
      lastUpdated: new Date().toISOString(),
      isActive: match.state === 'playing' || match.state === 'preparing'
    };

    const existingIndex = stored.findIndex(m => m.id === match.id);
    if (existingIndex >= 0) {
      stored[existingIndex] = storedMatch;
    } else {
      stored.push(storedMatch);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    localStorage.setItem(ACTIVE_MATCH_KEY, match.id);
  } catch (error) {
    console.error('Error saving match to localStorage:', error);
  }
}

function getStoredMatchesFromLocal(): StoredMatch[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading matches from localStorage:', error);
    return [];
  }
}

// Main save function with database + localStorage backup
async function saveMatchToDatabase(match: VolleyballMatch): Promise<void> {
  try {
    const matchName = `${match.localTeam} vs ${match.visitaTeam}`;
    
    const storedMatch = {
      id: match.id,
      name: matchName,
      match,
      lastUpdated: new Date().toISOString(),
      isActive: match.state === 'playing' || match.state === 'preparing'
    };

    // Save to database
    await liveMatchAPI.updateLiveMatch(match.id, storedMatch);
    
    // Also save to localStorage as backup
    saveMatchToLocalStorage(match);
    
    console.log(`✅ Match saved to database: ${matchName}`, match);
  } catch (error) {
    console.error('Error saving match to database:', error);
    // Fall back to localStorage only
    saveMatchToLocalStorage(match);
    toast.error('Error guardando en servidor, usando almacenamiento local');
  }
}

async function getStoredMatches(): Promise<StoredMatch[]> {
  try {
    const matches = await liveMatchAPI.getLiveMatches();
    return matches || [];
  } catch (error) {
    console.error('Error loading matches from database:', error);
    // Fall back to localStorage
    return getStoredMatchesFromLocal();
  }
}

async function loadMatchFromDatabase(matchId: string): Promise<VolleyballMatch | null> {
  try {
    const storedMatch = await liveMatchAPI.getLiveMatch(matchId);
    return storedMatch ? storedMatch.match : null;
  } catch (error) {
    console.error('Error loading match from database:', error);
    // Fall back to localStorage
    const stored = getStoredMatchesFromLocal();
    const storedMatch = stored.find(m => m.id === matchId);
    return storedMatch ? storedMatch.match : null;
  }
}

async function deleteMatchFromDatabase(matchId: string): Promise<void> {
  try {
    await liveMatchAPI.deleteLiveMatch(matchId);
    
    // Also remove from localStorage
    const stored = getStoredMatchesFromLocal();
    const filtered = stored.filter(m => m.id !== matchId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    
    const activeMatchId = localStorage.getItem(ACTIVE_MATCH_KEY);
    if (activeMatchId === matchId) {
      localStorage.removeItem(ACTIVE_MATCH_KEY);
    }
  } catch (error) {
    console.error('Error deleting match from database:', error);
    toast.error('Error eliminando partido del servidor');
  }
}

function getActiveMatchId(): string | null {
  return localStorage.getItem(ACTIVE_MATCH_KEY);
}

export function useMatchState() {
  const [match, setMatch] = useState<VolleyballMatch | null>(null);
  const [currentRally, setCurrentRally] = useState<Rally | null>(null);
  const [isRallyActive, setIsRallyActive] = useState(false);
  const [rallyStartTime, setRallyStartTime] = useState<number | null>(null);
  const rallyTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save match whenever it changes
  useEffect(() => {
    if (match) {
      saveMatchToDatabase(match);
    }
  }, [match]);

  // Load active match on mount
  useEffect(() => {
    const loadActiveMatch = async () => {
      const activeMatchId = getActiveMatchId();
      if (activeMatchId && !match) {
        const loadedMatch = await loadMatchFromDatabase(activeMatchId);
        if (loadedMatch) {
          setMatch(loadedMatch);
          console.log(`🔄 Match restored: ${loadedMatch.localTeam} vs ${loadedMatch.visitaTeam}`);
        }
      }
    };
    
    loadActiveMatch();
  }, [match]);

  // Initialize new match
  const initializeMatch = useCallback(async (
    localTeam: string,
    visitaTeam: string,
    localPlayers: Player[],
    visitaPlayers: Player[],
    setsToWin: 2 | 3 = 3
  ) => {
    const matchId = `match_${Date.now()}`;
    const setId = `set_${matchId}_1`;
    
    // Default rotation (positions 1-6)
    const defaultRotationLocal: Rotation = localPlayers.slice(0, 6).map(p => p.id) as Rotation;
    const defaultRotationVisita: Rotation = visitaPlayers.slice(0, 6).map(p => p.id) as Rotation;

    const initialSet: VolleyballSet = {
      id: setId,
      matchId,
      number: 1,
      startRotationLocal: defaultRotationLocal,
      startRotationVisita: defaultRotationVisita,
      currentRotationLocal: defaultRotationLocal,
      currentRotationVisita: defaultRotationVisita,
      serverTeam: 'local', // Default to local team serving first
      serverPlayerId: getExpectedServer(defaultRotationLocal),
      scoreLocal: 0,
      scoreVisita: 0,
      setsWonLocal: 0,
      setsWonVisita: 0,
      rallies: [],
      substitutions: [],
      timeouts: [],
      cards: [],
      startedAt: Date.now()
    };

    const newMatch: VolleyballMatch = {
      id: matchId,
      date: new Date().toISOString(),
      localTeam,
      visitaTeam,
      setsToWin,
      state: 'preparing',
      currentSet: 1,
      sets: [initialSet],
      localPlayers,
      visitaPlayers,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Create match in database
    try {
      const storedMatch = {
        id: matchId,
        name: `${localTeam} vs ${visitaTeam}`,
        match: newMatch,
        lastUpdated: new Date().toISOString(),
        isActive: true
      };
      
      await liveMatchAPI.createLiveMatch(storedMatch);
      console.log('✅ Match created in database');
    } catch (error) {
      console.error('Error creating match in database:', error);
      // Continue with localStorage fallback
    }

    setMatch(newMatch);
    return newMatch;
  }, []);

  // Load existing match
  const loadMatch = useCallback(async (matchId: string) => {
    const loadedMatch = await loadMatchFromDatabase(matchId);
    if (loadedMatch) {
      setMatch(loadedMatch);
      setCurrentRally(null);
      setIsRallyActive(false);
      setRallyStartTime(null);
      return loadedMatch;
    }
    return null;
  }, []);

  // Delete match
  const deleteMatch = useCallback(async (matchId: string) => {
    await deleteMatchFromDatabase(matchId);
    if (match?.id === matchId) {
      setMatch(null);
      setCurrentRally(null);
      setIsRallyActive(false);
      setRallyStartTime(null);
    }
  }, [match]);

  // Get all stored matches
  const getStoredMatchesList = useCallback(async () => {
    return await getStoredMatches();
  }, []);

  // Set initial rotations
  const setRotations = useCallback((
    localRotation: Rotation,
    visitaRotation: Rotation,
    servingTeam: Team
  ) => {
    if (!match) return;

    const currentSet = match.sets[match.currentSet - 1];
    const serverPlayerId = servingTeam === 'local' 
      ? getExpectedServer(localRotation)
      : getExpectedServer(visitaRotation);

    const updatedSet: VolleyballSet = {
      ...currentSet,
      startRotationLocal: localRotation,
      startRotationVisita: visitaRotation,
      currentRotationLocal: localRotation,
      currentRotationVisita: visitaRotation,
      serverTeam: servingTeam,
      serverPlayerId
    };

    const updatedMatch = {
      ...match,
      sets: match.sets.map((set, index) => 
        index === match.currentSet - 1 ? updatedSet : set
      ),
      state: 'playing' as const,
      updatedAt: new Date().toISOString()
    };

    setMatch(updatedMatch);
  }, [match]);

  // Substitution functions
  const validatePlayerSubstitution = useCallback((
    team: Team,
    inPlayerId: string,
    outPlayerId: string,
    position: Position
  ): SubstitutionValidation => {
    if (!match) {
      return { isValid: false, reason: "No hay partido activo" };
    }
    
    const currentSet = match.sets[match.currentSet - 1];
    return validateSubstitution(match, currentSet, team, inPlayerId, outPlayerId, position);
  }, [match]);

  const executeSubstitution = useCallback((
    team: Team,
    inPlayerId: string,
    outPlayerId: string,
    position: Position,
    reason?: 'tactical' | 'injury' | 'performance' | 'rotation' | 'disciplinary'
  ) => {
    if (!match) return false;

    const currentSet = match.sets[match.currentSet - 1];
    
    // Validate substitution first
    const validation = validateSubstitution(match, currentSet, team, inPlayerId, outPlayerId, position);
    if (!validation.isValid) {
      console.error('Substitution validation failed:', validation.reason);
      return false;
    }

    // Determine if it's a libero substitution
    const players = team === 'local' ? match.localPlayers : match.visitaPlayers;
    const inPlayer = players.find(p => p.id === inPlayerId);
    const outPlayer = players.find(p => p.id === outPlayerId);
    const isLibero = inPlayer?.isLibero || outPlayer?.isLibero || false;

    // Create substitution object
    const substitution: Omit<Substitution, 'id' | 'timestamp' | 'rallyNumber'> = {
      setId: currentSet.id,
      team,
      inPlayerId,
      outPlayerId,
      position,
      isLibero,
      reason
    };

    // Apply substitution
    const { updatedMatch, updatedSet } = applySubstitution(match, currentSet, substitution);
    
    // Update state
    setMatch(updatedMatch);
    
    console.log(`✅ Substitution executed: ${outPlayer?.name} → ${inPlayer?.name}`);
    return true;
  }, [match]);

  const getTeamSubstitutionState = useCallback((team: Team): SubstitutionState | null => {
    if (!match) return null;
    
    const currentSet = match.sets[match.currentSet - 1];
    return getSubstitutionState(currentSet, team);
  }, [match]);

  const getBenchPlayers = useCallback((team: Team): Player[] => {
    if (!match) return [];
    
    const players = team === 'local' ? match.localPlayers : match.visitaPlayers;
    return players.filter(player => !player.isActive);
  }, [match]);

  const getActivePlayer = useCallback((team: Team, position: Position): Player | null => {
    if (!match) return null;
    
    const currentSet = match.sets[match.currentSet - 1];
    const rotation = team === 'local' ? currentSet.currentRotationLocal : currentSet.currentRotationVisita;
    const playerId = rotation[position - 1];
    
    const players = team === 'local' ? match.localPlayers : match.visitaPlayers;
    return players.find(p => p.id === playerId) || null;
  }, [match]);

  // Start a new rally
  const startRally = useCallback(() => {
    if (!match || isRallyActive) return;

    const currentSet = match.sets[match.currentSet - 1];
    const rallyNumber = currentSet.rallies.length + 1;
    const rallyId = `rally_${currentSet.id}_${rallyNumber}`;

    const newRally: Rally = {
      id: rallyId,
      setId: currentSet.id,
      number: rallyNumber,
      serverTeam: currentSet.serverTeam,
      serverPlayerId: currentSet.serverPlayerId,
      events: [],
      winnerTeam: 'local', // Will be updated when rally ends
      cause: '',
      startedAt: Date.now(),
      endedAt: 0,
      duration: 0
    };

    setCurrentRally(newRally);
    setIsRallyActive(true);
    setRallyStartTime(Date.now());
  }, [match, isRallyActive]);

  // Add event to current rally
  const addRallyEvent = useCallback((event: RallyEvent) => {
    if (!currentRally) return;

    const updatedRally = {
      ...currentRally,
      events: [...currentRally.events, event]
    };

    setCurrentRally(updatedRally);
  }, [currentRally]);

  // End current rally and apply point
  const endRally = useCallback((winnerTeam: Team, cause: string) => {
    if (!match || !currentRally || !isRallyActive) return;

    const endTime = Date.now();
    const rallyDuration = rallyStartTime ? endTime - rallyStartTime : 0;

    const completedRally: Rally = {
      ...currentRally,
      winnerTeam,
      cause,
      endedAt: endTime,
      duration: rallyDuration
    };

    const currentSet = match.sets[match.currentSet - 1];
    
    // Apply point and rotation logic
    const setUpdates = applyPoint(currentSet, winnerTeam);
    
    const updatedSet: VolleyballSet = {
      ...currentSet,
      ...setUpdates,
      rallies: [...currentSet.rallies, completedRally]
    };

    // Check if set is won
    const setWon = checkSetWon(updatedSet.scoreLocal, updatedSet.scoreVisita, updatedSet.number);
    if (setWon) {
      updatedSet.winner = setWon;
      updatedSet.endedAt = endTime;
      
      // Update sets won count in the set (for this set specifically)
      if (setWon === 'local') {
        updatedSet.setsWonLocal = currentSet.setsWonLocal + 1;
      } else {
        updatedSet.setsWonVisita = currentSet.setsWonVisita + 1;
      }
      
      // Show set won notification
      const targetScore = updatedSet.number === 5 ? 15 : 25;
      toast.success(
        `¡Set ${updatedSet.number} ganado por ${setWon === 'local' ? match.localTeam : match.visitaTeam}! ` +
        `(${updatedSet.scoreLocal}-${updatedSet.scoreVisita})`
      );
    }

    let updatedMatch = {
      ...match,
      sets: match.sets.map((set, index) => 
        index === match.currentSet - 1 ? updatedSet : set
      ),
      updatedAt: new Date().toISOString()
    };

    // Check if match is won
    const matchWon = checkMatchWon(updatedMatch);
    if (matchWon) {
      updatedMatch.state = 'finished';
      toast.success(`¡Partido terminado! Ganador: ${matchWon === 'local' ? match.localTeam : match.visitaTeam}`);
    } else if (setWon && updatedMatch.currentSet < 5) {
      // Create next set if match isn't over and we're not in the 5th set
      const nextSetNumber = updatedMatch.currentSet + 1;
      const nextSetId = `set_${match.id}_${nextSetNumber}`;
      
      // Calculate sets won for the match
      const setsWonLocal = updatedMatch.sets.filter(s => s.winner === 'local').length;
      const setsWonVisita = updatedMatch.sets.filter(s => s.winner === 'visita').length;
      
      const nextSet: VolleyballSet = {
        id: nextSetId,
        matchId: match.id,
        number: nextSetNumber as 1 | 2 | 3 | 4 | 5,
        startRotationLocal: currentSet.startRotationLocal,
        startRotationVisita: currentSet.startRotationVisita,
        currentRotationLocal: currentSet.startRotationLocal,
        currentRotationVisita: currentSet.startRotationVisita,
        serverTeam: 'local', // Reset for new set
        serverPlayerId: getExpectedServer(currentSet.startRotationLocal),
        scoreLocal: 0,
        scoreVisita: 0,
        setsWonLocal,
        setsWonVisita,
        rallies: [],
        substitutions: [],
        timeouts: [],
        cards: [],
        startedAt: Date.now()
      };
      
      updatedMatch = {
        ...updatedMatch,
        sets: [...updatedMatch.sets, nextSet],
        currentSet: nextSetNumber
      };
      
      toast.info(`Set ${nextSetNumber} iniciado${nextSetNumber === 5 ? ' (Set decisivo a 15 puntos)' : ''}`);
    }

    setMatch(updatedMatch);
    setCurrentRally(null);
    setIsRallyActive(false);
    setRallyStartTime(null);
  }, [match, currentRally, isRallyActive, rallyStartTime]);

  // Utility functions
  const checkSetWon = (scoreLocal: number, scoreVisita: number, setNumber: number): Team | null => {
    // Set rules: Regular sets to 25, decisive set (5th) to 15, both with 2-point advantage
    const targetScore = setNumber === 5 ? 15 : 25;
    
    if (scoreLocal >= targetScore && scoreLocal - scoreVisita >= 2) return 'local';
    if (scoreVisita >= targetScore && scoreVisita - scoreLocal >= 2) return 'visita';
    return null;
  };

  const checkMatchWon = (match: VolleyballMatch): Team | null => {
    const setsWonLocal = match.sets.filter(set => set.winner === 'local').length;
    const setsWonVisita = match.sets.filter(set => set.winner === 'visita').length;
    
    if (setsWonLocal >= match.setsToWin) return 'local';
    if (setsWonVisita >= match.setsToWin) return 'visita';
    return null;
  };

  // Get current set
  const getCurrentSet = useCallback(() => {
    return match?.sets[match.currentSet - 1] || null;
  }, [match]);

  // Get expected server
  const getExpectedServerPlayer = useCallback(() => {
    const currentSet = getCurrentSet();
    if (!currentSet || !match) return null;

    const rotation = currentSet.serverTeam === 'local' 
      ? currentSet.currentRotationLocal 
      : currentSet.currentRotationVisita;
    
    const players = currentSet.serverTeam === 'local' 
      ? match.localPlayers 
      : match.visitaPlayers;

    const expectedServerId = getExpectedServer(rotation);
    return players.find(p => p.id === expectedServerId) || null;
  }, [match, getCurrentSet]);

  // Validate server
  const isValidServer = useCallback((playerId: string): boolean => {
    const expectedServer = getExpectedServerPlayer();
    return expectedServer?.id === playerId;
  }, [getExpectedServerPlayer]);

  return {
    match,
    currentRally,
    isRallyActive,
    initializeMatch,
    loadMatch,
    deleteMatch,
    getStoredMatchesList,
    setRotations,
    startRally,
    addRallyEvent,
    endRally,
    getCurrentSet,
    getExpectedServerPlayer,
    isValidServer,
    setMatch,
    // Substitution functions
    validatePlayerSubstitution,
    executeSubstitution,
    getTeamSubstitutionState,
    getBenchPlayers,
    getActivePlayer
  };
}