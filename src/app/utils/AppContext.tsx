import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { supabaseService } from './supabaseService';
import { toast } from 'sonner';

// Navigation callback for tab switching
let navigationCallback: ((tab: string) => void) | null = null;

export function setNavigationCallback(callback: (tab: string) => void) {
  navigationCallback = callback;
}

// Types - Keep existing for backward compatibility
interface Player {
  id: string;
  name: string;
  position: string;
  number?: number;
  age?: number;
  height?: number;
  weight?: number;
  reach?: number;
  wingspan?: number;
  reachStatic?: number;
  reachBlock?: number;
  reachAttack?: number;
  dominantHand?: string;
  status?: string;
  experience?: string;
  createdAt: string;
  updatedAt: string;
}

interface Match {
  id: string;
  opponent: string;
  date: string;
  time?: string;
  venue?: string;
  matchType: string;
  notes?: string;
  result?: 'W' | 'L' | 'D' | null;
  score?: string | null;
  sideOut?: number;
  transition?: number;
  players: any[];
  rallies?: any[];
  timeline?: any[];
  schemaVersion?: number;
  captureMode?: 'rapido' | 'completo';
  createdAt: string;
  updatedAt: string;
}

interface PhysicalTest {
  id: string;
  playerId: string;
  testType?: string;
  value?: number;
  date: string;
  notes?: string;
  CMJ?: number;
  SJ?: number;
  abordaje?: number;
  vel5m?: number;
  vel10m?: number;
  tTest?: number;
  spikeSpeed?: number;
  serveSpeed?: number;
  reactionTime?: number;
  shoulderROM?: number;
  ankleROM?: number;
  benchPress?: number;
  squat?: number;
  deadlift?: number;
  cooperTest?: number;
  sitAndReach?: number;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

interface AppState {
  players: Player[];
  matches: Match[];
  physicalTests: PhysicalTest[];
  loading: {
    players: boolean;
    matches: boolean;
    physicalTests: boolean;
    initialization: boolean;
  };
  error: string | null;
  supabaseInitialized: boolean;
}

// Action types
type AppAction =
  | { type: 'SET_LOADING'; entity: keyof AppState['loading']; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_PLAYERS'; players: Player[] }
  | { type: 'ADD_PLAYER'; player: Player }
  | { type: 'UPDATE_PLAYER'; player: Player }
  | { type: 'DELETE_PLAYER'; playerId: string }
  | { type: 'SET_MATCHES'; matches: Match[] }
  | { type: 'ADD_MATCH'; match: Match }
  | { type: 'UPDATE_MATCH'; match: Match }
  | { type: 'DELETE_MATCH'; matchId: string }
  | { type: 'SET_PHYSICAL_TESTS'; tests: PhysicalTest[] }
  | { type: 'ADD_PHYSICAL_TEST'; test: PhysicalTest }
  | { type: 'UPDATE_PHYSICAL_TEST'; test: PhysicalTest }
  | { type: 'DELETE_PHYSICAL_TEST'; testId: string }
  | { type: 'SET_SUPABASE_INITIALIZED'; initialized: boolean };

// Initial state
const initialState: AppState = {
  players: [],
  matches: [],
  physicalTests: [],
  loading: {
    players: false,
    matches: false,
    physicalTests: false,
    initialization: false,
  },
  error: null,
  supabaseInitialized: false,
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.entity]: action.loading,
        },
      };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'SET_PLAYERS':
      return { ...state, players: action.players };
    case 'ADD_PLAYER':
      return { ...state, players: [...state.players, action.player] };
    case 'UPDATE_PLAYER':
      return {
        ...state,
        players: state.players.map(p => p.id === action.player.id ? action.player : p),
      };
    case 'DELETE_PLAYER':
      return {
        ...state,
        players: state.players.filter(p => p.id !== action.playerId),
      };
    case 'SET_MATCHES':
      return { ...state, matches: action.matches };
    case 'ADD_MATCH':
      return { ...state, matches: [...state.matches, action.match] };
    case 'UPDATE_MATCH':
      return {
        ...state,
        matches: state.matches.map(m => m.id === action.match.id ? action.match : m),
      };
    case 'DELETE_MATCH':
      return {
        ...state,
        matches: state.matches.filter(m => m.id !== action.matchId),
      };
    case 'SET_PHYSICAL_TESTS':
      return { ...state, physicalTests: action.tests };
    case 'ADD_PHYSICAL_TEST':
      return { ...state, physicalTests: [...state.physicalTests, action.test] };
    case 'UPDATE_PHYSICAL_TEST':
      return {
        ...state,
        physicalTests: state.physicalTests.map(t => t.id === action.test.id ? action.test : t),
      };
    case 'DELETE_PHYSICAL_TEST':
      return {
        ...state,
        physicalTests: state.physicalTests.filter(t => t.id !== action.testId),
      };
    case 'SET_SUPABASE_INITIALIZED':
      return { ...state, supabaseInitialized: action.initialized };
    default:
      return state;
  }
}

// Context
interface AppContextType {
  state: AppState;
  // Navigation
  navigateToTab: (tab: string) => void;
  // Player actions
  loadPlayers: () => Promise<void>;
  createPlayer: (playerData: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updatePlayer: (playerId: string, playerData: Partial<Player>) => Promise<void>;
  deletePlayer: (playerId: string) => Promise<void>;
  // Match actions
  loadMatches: () => Promise<void>;
  createMatch: (matchData: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateMatch: (matchId: string, matchData: Partial<Match>) => Promise<void>;
  deleteMatch: (matchId: string) => Promise<void>;
  // Physical test actions
  loadPhysicalTests: () => Promise<void>;
  createPhysicalTest: (testData: any) => Promise<void>;
  updatePhysicalTest: (testId: string, testData: any) => Promise<void>;
  deletePhysicalTest: (testId: string) => Promise<void>;
  // Supabase actions
  initializeSupabase: () => Promise<void>;
  // Database cleanup
  clearAllData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Utility functions to convert between Supabase and legacy formats
function convertSupabasePlayerToLegacy(sp: any): Player {
  return {
    id: sp.id, // global_players.id
    name: sp.name,
    position: sp.position || 'Punta', // From club_roster
    height: sp.height_cm,
    weight: sp.weight_kg,
    reach: sp.sport_metadata?.reachAttack || 0,
    createdAt: sp.created_at,
    updatedAt: sp.updated_at
  };
}

function convertSupabaseTestToLegacy(row: any): any {
  return {
    id:           row.id,
    playerId:     row.player_id,
    date:         row.date,
    notes:        row.notes,
    // Salto
    CMJ:          row.cmj,
    SJ:           row.sj,
    abordaje:     row.abordaje,
    // Velocidad
    vel5m:        row.vel_5m,
    vel10m:       row.vel_10m,
    tTest:        row.t_test,
    // Potencia
    spikeSpeed:   row.spike_speed,
    serveSpeed:   row.serve_speed,
    // Reacción / Movilidad
    reactionTime: row.reaction_time,
    shoulderROM:  row.shoulder_rom,
    ankleROM:     row.ankle_rom,
    createdAt:    row.created_at,
    updatedAt:    row.updated_at || row.created_at,
  };
}

// Provider component
function convertSupabaseMatchToLegacy(sm: any): Match {
  return {
    id: sm.id,
    opponent: sm.opponent_name,
    date: sm.date,
    matchType: sm.competition_type || 'Amistoso',
    venue: sm.location,
    notes: sm.match_metadata?.notes,
    result: sm.match_metadata?.result,
    score: sm.match_metadata?.score,
    rallies: sm.match_metadata?.rallies || [],
    timeline: sm.match_metadata?.timeline || [],
    schemaVersion: sm.match_metadata?.schemaVersion || 1,
    captureMode: sm.match_metadata?.captureMode || 'rapido',
    players: [],
    createdAt: sm.created_at,
    updatedAt: sm.created_at
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Navigation
  const navigateToTab = (tab: string) => {
    console.log('Navigating to tab:', tab);
    if (navigationCallback) {
      navigationCallback(tab);
    }
  };

  // Initialize Supabase
  const initializeSupabase = async () => {
    dispatch({ type: 'SET_LOADING', entity: 'initialization', loading: true });
    try {
      console.log('🚀 Initializing Supabase integration...');
      
      // Check if user is authenticated and has org access
      const currentUser = await supabaseService.getCurrentUser();
      if (!currentUser) {
        console.log('⚠️ No authenticated user, using fallback data');
        dispatch({ type: 'SET_SUPABASE_INITIALIZED', initialized: false });
        return;
      }

      const userOrg = await supabaseService.getUserOrg();
      if (!userOrg) {
        console.log('📋 No organization found. Please log out and log in again.');
      } else {
        // Ensure at least one team exists (idempotent)
        await supabaseService.ensureDefaultTeam();
      }

      dispatch({ type: 'SET_SUPABASE_INITIALIZED', initialized: true });
      console.log('✅ Supabase integration ready');

    } catch (error) {
      console.error('❌ Error initializing Supabase:', error);
      dispatch({ type: 'SET_ERROR', error: 'Error inicializando Supabase' });
      dispatch({ type: 'SET_SUPABASE_INITIALIZED', initialized: false });
    } finally {
      dispatch({ type: 'SET_LOADING', entity: 'initialization', loading: false });
    }
  };

  // Player actions
  const loadPlayers = async (useSupabase?: boolean) => {
    const fromSupabase = useSupabase !== undefined ? useSupabase : state.supabaseInitialized;
    dispatch({ type: 'SET_LOADING', entity: 'players', loading: true });
    try {
      if (fromSupabase) {
        const supabasePlayers = await supabaseService.getPlayers();
        const legacyPlayers = supabasePlayers.map(convertSupabasePlayerToLegacy);
        dispatch({ type: 'SET_PLAYERS', players: legacyPlayers });
      } else {
        dispatch({ type: 'SET_PLAYERS', players: [] });
      }
      dispatch({ type: 'SET_ERROR', error: null });
    } catch (error) {
      console.error('Error loading players:', error);
      dispatch({ type: 'SET_ERROR', error: error instanceof Error ? error.message : 'Error loading players' });
      toast.error('Error al cargar jugadores');
    } finally {
      dispatch({ type: 'SET_LOADING', entity: 'players', loading: false });
    }
  };

  const createPlayer = async (playerData: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const ghostPlayer = await supabaseService.createGhostPlayer(
        {
          name: playerData.name,
          height_cm: playerData.height,
          weight_kg: playerData.weight,
        },
        {
          position: playerData.position,
          sport_metadata: {
            reachAttack: playerData.reach
          }
        }
      );
      
      const newPlayer = convertSupabasePlayerToLegacy(ghostPlayer);
      dispatch({ type: 'ADD_PLAYER', player: newPlayer });
      toast.success('Jugador creado');
    } catch (error) {
      console.error('Error creating player:', error);
      toast.error('Error al crear jugador');
    }
  };

  const updatePlayer = async (playerId: string, playerData: Partial<Player>) => {
    try {
      await supabaseService.updatePlayer(
        playerId,
        {
          ...(playerData.name && { name: playerData.name }),
          ...(playerData.height && { height_cm: playerData.height }),
          ...(playerData.weight && { weight_kg: playerData.weight }),
        },
        {
          ...(playerData.position && { position: playerData.position }),
          ...(playerData.reach && { sport_metadata: { reachAttack: playerData.reach } })
        }
      );
      
      await loadPlayers();
      toast.success('Jugador actualizado');
    } catch (error) {
      console.error('Error updating player:', error);
      toast.error('Error al actualizar jugador');
    }
  };

  const deletePlayer = async (playerId: string) => {
    try {
      await supabaseService.removePlayerFromRoster(playerId);
      dispatch({ type: 'DELETE_PLAYER', playerId });
      toast.success('Jugador eliminado del equipo');
    } catch (error) {
      console.error('Error deleting player:', error);
      toast.error('Error al eliminar jugador');
    }
  };

  // Match actions
  const loadMatches = async (useSupabase?: boolean) => {
    const fromSupabase = useSupabase !== undefined ? useSupabase : state.supabaseInitialized;
    dispatch({ type: 'SET_LOADING', entity: 'matches', loading: true });
    try {
      if (fromSupabase) {
        const supabaseMatches = await supabaseService.getMatches('volleyball');
        const legacyMatches = supabaseMatches.map(convertSupabaseMatchToLegacy);
        dispatch({ type: 'SET_MATCHES', matches: legacyMatches });
      } else {
        dispatch({ type: 'SET_MATCHES', matches: [] });
      }
      dispatch({ type: 'SET_ERROR', error: null });
    } catch (error) {
      console.error('Error loading matches:', error);
      dispatch({ type: 'SET_ERROR', error: error instanceof Error ? error.message : 'Error loading matches' });
      toast.error('Error al cargar partidos');
    } finally {
      dispatch({ type: 'SET_LOADING', entity: 'matches', loading: false });
    }
  };

  const createMatch = async (matchData: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const teams = await supabaseService.getTeams();
      if (teams.length === 0) throw new Error('Crea un equipo primero antes de registrar un partido');
      
      const supabaseMatch = await supabaseService.createMatch({
        team_id: teams[0].id,
        sport_type: 'volleyball',
        opponent_name: matchData.opponent,
        date: matchData.date,
        competition_type: matchData.matchType,
        location: matchData.venue,
        match_metadata: {
          schemaVersion: (matchData as any).schemaVersion || 2,
          captureMode: (matchData as any).captureMode || 'rapido',
          notes: matchData.notes,
          result: matchData.result,
          score: matchData.score,
          rallies: (matchData as any).rallies || [],
          timeline: (matchData as any).timeline || []
        }
      });
      
      dispatch({ type: 'ADD_MATCH', match: convertSupabaseMatchToLegacy(supabaseMatch) });
      toast.success('Partido creado exitosamente');
    } catch (error) {
      console.error('Error creating match:', error);
      toast.error('Error al crear partido');
      throw error;
    }
  };

  const updateMatch = async (matchId: string, matchData: Partial<Match>) => {
    try {
      const teams = await supabaseService.getTeams();
      if (teams.length === 0) throw new Error('Crea un equipo primero antes de actualizar un partido');
      
      const existingMatch = state.matches.find(m => m.id === matchId);
      const existingRallies = (matchData as any).rallies !== undefined ? (matchData as any).rallies : (existingMatch?.rallies || []);
      const existingTimeline = (matchData as any).timeline !== undefined ? (matchData as any).timeline : (existingMatch?.timeline || []);

      const supabaseMatch = await supabaseService.updateMatch(matchId, {
        team_id: teams[0].id,
        opponent_name: matchData.opponent,
        date: matchData.date,
        competition_type: matchData.matchType,
        location: matchData.venue,
        match_metadata: {
          schemaVersion: (matchData as any).schemaVersion || existingMatch?.schemaVersion || 2,
          captureMode: (matchData as any).captureMode || existingMatch?.captureMode || 'rapido',
          notes: matchData.notes !== undefined ? matchData.notes : existingMatch?.notes,
          result: matchData.result !== undefined ? matchData.result : existingMatch?.result,
          score: matchData.score !== undefined ? matchData.score : existingMatch?.score,
          rallies: existingRallies,
          timeline: existingTimeline
        }
      });
      
      dispatch({ type: 'UPDATE_MATCH', match: convertSupabaseMatchToLegacy(supabaseMatch) });
      toast.success('Partido actualizado exitosamente');
    } catch (error) {
      console.error('Error updating match:', error);
      toast.error('Error al actualizar partido');
    }
  };

  const deleteMatch = async (matchId: string) => {
    try {
      await supabaseService.deleteMatch(matchId);
      dispatch({ type: 'DELETE_MATCH', matchId });
      toast.success('Partido eliminado exitosamente');
    } catch (error) {
      console.error('Error deleting match:', error);
      toast.error('Error al eliminar partido');
    }
  };

  // Physical test actions
  const loadPhysicalTests = async (useSupabase?: boolean) => {
    const fromSupabase = useSupabase !== undefined ? useSupabase : state.supabaseInitialized;
    dispatch({ type: 'SET_LOADING', entity: 'physicalTests', loading: true });
    try {
      if (fromSupabase) {
        const supabaseTests = await supabaseService.getPhysicalTests();
        const legacyTests = supabaseTests.map(convertSupabaseTestToLegacy);
        dispatch({ type: 'SET_PHYSICAL_TESTS', tests: legacyTests });
      } else {
        dispatch({ type: 'SET_PHYSICAL_TESTS', tests: [] });
      }
      dispatch({ type: 'SET_ERROR', error: null });
    } catch (error) {
      console.error('Error loading physical tests:', error);
      dispatch({ type: 'SET_ERROR', error: error instanceof Error ? error.message : 'Error loading physical tests' });
      toast.error('Error al cargar tests físicos');
    } finally {
      dispatch({ type: 'SET_LOADING', entity: 'physicalTests', loading: false });
    }
  };

  const createPhysicalTest = async (formData: any) => {
    try {
      const row = await supabaseService.createPhysicalTest(formData);
      const legacyTest = convertSupabaseTestToLegacy(row);
      dispatch({ type: 'ADD_PHYSICAL_TEST', test: legacyTest });
      toast.success('Test físico registrado');
    } catch (error: any) {
      console.error('Error creating physical test:', error);
      toast.error(`Error al registrar test: ${error.message || error}`);
    }
  };

  const updatePhysicalTest = async (testId: string, formData: any) => {
    try {
      const row = await supabaseService.updatePhysicalTest(testId, formData);
      const legacyTest = convertSupabaseTestToLegacy(row);
      dispatch({ type: 'UPDATE_PHYSICAL_TEST', test: legacyTest });
      toast.success('Test físico actualizado');
    } catch (error: any) {
      console.error('Error updating physical test:', error);
      toast.error(`Error al actualizar test: ${error.message || error}`);
    }
  };

  const deletePhysicalTest = async (testId: string) => {
    try {
      await supabaseService.deletePhysicalTest(testId);
      dispatch({ type: 'DELETE_PHYSICAL_TEST', testId });
      toast.success('Test físico eliminado exitosamente');
    } catch (error) {
      console.error('Error deleting physical test:', error);
      toast.error('Error al eliminar test físico');
    }
  };

  // Initialize on mount
  useEffect(() => {
    const initialize = async () => {
      await initializeSupabase();

      const user = await supabaseService.getCurrentUser();
      const orgId = user ? await supabaseService.getUserOrg() : null;
      const hasSupabase = !!user && !!orgId;

      await Promise.all([
        loadPlayers(hasSupabase),
        loadMatches(hasSupabase),
        loadPhysicalTests(hasSupabase)
      ]);
    };

    initialize();
  }, []);

  // Clear all data from both Supabase and local state
  const clearAllData = async () => {
    try {
      if (state.supabaseInitialized) {
        await supabaseService.clearAllData();
      }
      
      dispatch({ type: 'SET_PLAYERS', players: [] });
      dispatch({ type: 'SET_MATCHES', matches: [] });
      dispatch({ type: 'SET_PHYSICAL_TESTS', tests: [] });
      dispatch({ type: 'SET_ERROR', error: null });
      
      toast.success('¡Base de datos limpiada exitosamente! Todos los datos han sido eliminados.');
      
    } catch (error) {
      console.error('❌ Error clearing database:', error);
      toast.error(`Error limpiando la base de datos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      throw error;
    }
  };

  const contextValue: AppContextType = {
    state,
    navigateToTab,
    loadPlayers,
    createPlayer,
    updatePlayer,
    deletePlayer,
    loadMatches,
    createMatch,
    updateMatch,
    deleteMatch,
    loadPhysicalTests,
    createPhysicalTest,
    updatePhysicalTest,
    deletePhysicalTest,
    initializeSupabase,
    clearAllData
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

// Hook to use the context
export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export type { Player, Match, PhysicalTest };