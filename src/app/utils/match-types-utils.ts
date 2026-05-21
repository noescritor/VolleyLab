// Volleyball Match Utility Functions
// Core business logic for volleyball match management

import {
  VolleyballMatch,
  VolleyballSet,
  Team_Legacy as Team,
  Position,
  Rotation,
  Player,
  Substitution,
  SubstitutionValidation,
  SubstitutionState
} from './match-types';

// Server and rotation utilities
export function getExpectedServer(rotation: Rotation): string {
  // Position 1 is always the server in volleyball
  return rotation[0]; // Position 1 (index 0)
}

export function rotateClockwise(rotation: Rotation): Rotation {
  // In volleyball, when a team wins a point and gains the serve,
  // all players rotate one position clockwise
  // Position 6 → 1, Position 1 → 2, etc.
  return [
    rotation[5], // Position 6 moves to Position 1
    rotation[0], // Position 1 moves to Position 2
    rotation[1], // Position 2 moves to Position 3
    rotation[2], // Position 3 moves to Position 4
    rotation[3], // Position 4 moves to Position 5
    rotation[4]  // Position 5 moves to Position 6
  ];
}

// Point and set management
export function applyPoint(currentSet: VolleyballSet, winnerTeam: Team): Partial<VolleyballSet> {
  const updates: Partial<VolleyballSet> = {};
  
  // First, update the score
  if (winnerTeam === 'local') {
    updates.scoreLocal = currentSet.scoreLocal + 1;
  } else {
    updates.scoreVisita = currentSet.scoreVisita + 1;
  }
  
  // Determine if the serving team changes
  const currentServerTeam = currentSet.serverTeam;
  const shouldRotate = winnerTeam === currentServerTeam;
  
  if (shouldRotate) {
    // Same team wins, they continue serving but rotate
    if (winnerTeam === 'local') {
      updates.currentRotationLocal = rotateClockwise(currentSet.currentRotationLocal);
      updates.serverPlayerId = getExpectedServer(updates.currentRotationLocal);
    } else {
      updates.currentRotationVisita = rotateClockwise(currentSet.currentRotationVisita);
      updates.serverPlayerId = getExpectedServer(updates.currentRotationVisita);
    }
  } else {
    // Serving team changes (side-out)
    updates.serverTeam = winnerTeam;
    
    if (winnerTeam === 'local') {
      updates.currentRotationLocal = rotateClockwise(currentSet.currentRotationLocal);
      updates.serverPlayerId = getExpectedServer(updates.currentRotationLocal);
    } else {
      updates.currentRotationVisita = rotateClockwise(currentSet.currentRotationVisita);
      updates.serverPlayerId = getExpectedServer(updates.currentRotationVisita);
    }
  }
  
  return updates;
}

// Substitution validation and management
export function validateSubstitution(
  match: VolleyballMatch,
  currentSet: VolleyballSet,
  team: Team,
  inPlayerId: string,
  outPlayerId: string,
  position: Position
): SubstitutionValidation {
  
  // Check if we have reached the maximum substitutions (6 per team per set)
  const teamSubstitutions = currentSet.substitutions.filter(sub => sub.team === team);
  if (teamSubstitutions.length >= 6) {
    return {
      isValid: false,
      reason: "Máximo de 6 substituciones por equipo por set alcanzado"
    };
  }
  
  // Check if the outgoing player is actually in the specified position
  const rotation = team === 'local' ? currentSet.currentRotationLocal : currentSet.currentRotationVisita;
  if (rotation[position - 1] !== outPlayerId) {
    return {
      isValid: false,
      reason: "El jugador que sale no está en la posición especificada"
    };
  }
  
  // Check if the incoming player is already on court
  if (rotation.includes(inPlayerId)) {
    return {
      isValid: false,
      reason: "El jugador que entra ya está en cancha"
    };
  }
  
  // Check if the incoming player exists in the team
  const players = team === 'local' ? match.localPlayers : match.visitaPlayers;
  const inPlayer = players.find(p => p.id === inPlayerId);
  const outPlayer = players.find(p => p.id === outPlayerId);
  
  if (!inPlayer || !outPlayer) {
    return {
      isValid: false,
      reason: "Uno o ambos jugadores no encontrados en el equipo"
    };
  }
  
  // Check if both players are active
  if (!inPlayer.isActive || !outPlayer.isActive) {
    return {
      isValid: false,
      reason: "Uno o ambos jugadores no están activos"
    };
  }
  
  // Libero-specific rules
  if (inPlayer.isLibero || outPlayer.isLibero) {
    // Libero can only substitute back-row players (positions 1, 5, 6)
    if (![1, 5, 6].includes(position)) {
      return {
        isValid: false,
        reason: "El líbero solo puede sustituir jugadores de zaga (posiciones 1, 5, 6)"
      };
    }
    
    // Additional libero rules could be added here
    // (e.g., libero substitution timing, previous substitution history)
  }
  
  // Check re-entry rules: A player can only re-enter for the player they originally substituted for
  const previousSubstitutions = teamSubstitutions.filter(sub => 
    sub.inPlayerId === outPlayerId || sub.outPlayerId === inPlayerId
  );
  
  if (previousSubstitutions.length > 0) {
    // Find if this incoming player has been substituted before
    const inPlayerPreviousSub = previousSubstitutions.find(sub => sub.outPlayerId === inPlayerId);
    if (inPlayerPreviousSub && inPlayerPreviousSub.inPlayerId !== outPlayerId) {
      return {
        isValid: false,
        reason: "Un jugador solo puede regresar por el jugador que lo sustituyó"
      };
    }
  }
  
  return { isValid: true };
}

export function applySubstitution(
  match: VolleyballMatch,
  currentSet: VolleyballSet,
  substitution: Omit<Substitution, 'id' | 'timestamp' | 'rallyNumber'>
): { updatedMatch: VolleyballMatch; updatedSet: VolleyballSet } {
  
  // Create the complete substitution record
  const completeSubstitution: Substitution = {
    ...substitution,
    id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    rallyNumber: currentSet.rallies.length
  };
  
  // Update the rotation
  const rotation = substitution.team === 'local' 
    ? [...currentSet.currentRotationLocal] 
    : [...currentSet.currentRotationVisita];
  
  rotation[substitution.position - 1] = substitution.inPlayerId;
  
  // Update player active status
  const players = substitution.team === 'local' ? [...match.localPlayers] : [...match.visitaPlayers];
  const updatedPlayers = players.map(player => {
    if (player.id === substitution.inPlayerId) {
      return { ...player, isActive: true };
    } else if (player.id === substitution.outPlayerId) {
      return { ...player, isActive: false };
    }
    return player;
  });
  
  // Update the set
  const updatedSet: VolleyballSet = {
    ...currentSet,
    substitutions: [...currentSet.substitutions, completeSubstitution],
    currentRotationLocal: substitution.team === 'local' ? rotation as Rotation : currentSet.currentRotationLocal,
    currentRotationVisita: substitution.team === 'visita' ? rotation as Rotation : currentSet.currentRotationVisita,
    updatedAt: new Date().toISOString()
  };
  
  // Update the match
  const updatedMatch: VolleyballMatch = {
    ...match,
    localPlayers: substitution.team === 'local' ? updatedPlayers : match.localPlayers,
    visitaPlayers: substitution.team === 'visita' ? updatedPlayers : match.visitaPlayers,
    sets: match.sets.map((set, index) => 
      index === match.currentSet - 1 ? updatedSet : set
    ),
    updatedAt: new Date().toISOString()
  };
  
  return { updatedMatch, updatedSet };
}

export function getSubstitutionState(currentSet: VolleyballSet, team: Team): SubstitutionState {
  const teamSubstitutions = currentSet.substitutions.filter(sub => sub.team === team);
  const liberoSubstitutions = teamSubstitutions.filter(sub => sub.isLibero);
  
  return {
    substitutionsUsed: teamSubstitutions.length,
    maxSubstitutions: 6,
    availableSubstitutions: 6 - teamSubstitutions.length,
    liberoSubstitutions: liberoSubstitutions.length
  };
}

// Team and player utilities
export function getPlayerByPosition(
  match: VolleyballMatch,
  team: Team,
  position: Position,
  setNumber?: number
): Player | null {
  const currentSet = setNumber ? match.sets[setNumber - 1] : match.sets[match.currentSet - 1];
  if (!currentSet) return null;
  
  const rotation = team === 'local' ? currentSet.currentRotationLocal : currentSet.currentRotationVisita;
  const playerId = rotation[position - 1];
  
  const players = team === 'local' ? match.localPlayers : match.visitaPlayers;
  return players.find(p => p.id === playerId) || null;
}

export function getTeamRotation(match: VolleyballMatch, team: Team, setNumber?: number): Rotation | null {
  const currentSet = setNumber ? match.sets[setNumber - 1] : match.sets[match.currentSet - 1];
  if (!currentSet) return null;
  
  return team === 'local' ? currentSet.currentRotationLocal : currentSet.currentRotationVisita;
}

export function isPlayerLibero(match: VolleyballMatch, playerId: string): boolean {
  const allPlayers = [...match.localPlayers, ...match.visitaPlayers];
  const player = allPlayers.find(p => p.id === playerId);
  return player?.isLibero || false;
}

// Match state utilities
export function isMatchFinished(match: VolleyballMatch): boolean {
  return match.state === 'finished';
}

export function getCurrentScore(match: VolleyballMatch): { local: number; visita: number } {
  const currentSet = match.sets[match.currentSet - 1];
  return {
    local: currentSet?.scoreLocal || 0,
    visita: currentSet?.scoreVisita || 0
  };
}

export function getSetScore(match: VolleyballMatch): { local: number; visita: number } {
  const setsWonLocal = match.sets.filter(set => set.winner === 'local').length;
  const setsWonVisita = match.sets.filter(set => set.winner === 'visita').length;
  
  return {
    local: setsWonLocal,
    visita: setsWonVisita
  };
}

export function getMatchDuration(match: VolleyballMatch): number {
  if (match.sets.length === 0) return 0;
  
  const firstSet = match.sets[0];
  const lastSet = match.sets[match.sets.length - 1];
  
  const startTime = firstSet.startedAt;
  const endTime = lastSet.endedAt || Date.now();
  
  return Math.floor((endTime - startTime) / 1000 / 60); // Duration in minutes
}

// Statistics utilities
export function calculateSideOutPercentage(currentSet: VolleyballSet, team: Team): number {
  const rallies = currentSet.rallies;
  if (rallies.length === 0) return 0;
  
  const opponentTeam = team === 'local' ? 'visita' : 'local';
  const opponentServeRallies = rallies.filter(rally => rally.serverTeam === opponentTeam);
  const sideOuts = opponentServeRallies.filter(rally => rally.winnerTeam === team);
  
  return opponentServeRallies.length > 0 ? (sideOuts.length / opponentServeRallies.length) * 100 : 0;
}

export function calculateBreakPointPercentage(currentSet: VolleyballSet, team: Team): number {
  const rallies = currentSet.rallies;
  if (rallies.length === 0) return 0;
  
  const teamServeRallies = rallies.filter(rally => rally.serverTeam === team);
  const breakPoints = teamServeRallies.filter(rally => rally.winnerTeam === team);
  
  return teamServeRallies.length > 0 ? (breakPoints.length / teamServeRallies.length) * 100 : 0;
}

// Position and rotation helpers
export function getRotationNumber(rotation: Rotation, referenceRotation: Rotation): number {
  // Calculate how many rotations have occurred from the reference
  for (let i = 0; i < 6; i++) {
    let matches = true;
    for (let j = 0; j < 6; j++) {
      if (rotation[j] !== referenceRotation[(j + i) % 6]) {
        matches = false;
        break;
      }
    }
    if (matches) return i + 1;
  }
  return 1; // Default to rotation 1 if no match found
}

export function predictNextRotation(currentRotation: Rotation, team: Team): Rotation {
  // This would predict the next rotation based on current game state
  // For now, just return the clockwise rotation
  return rotateClockwise(currentRotation);
}