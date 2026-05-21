// Live Match Types - Enhanced data structures for ultra-fast capture

export interface ActionEvent {
  id: string;
  rally_id: string;
  sequence: number;
  action_type: 'serve' | 'reception' | 'set' | 'attack' | 'block' | 'defense' | 'libero' | 'error' | 'substitution' | 'timeout';
  team: 'us' | 'opp' | 'neutral';
  
  // Enhanced location data
  landing_zone?: string; // '1F','5B','fuera_izq','fuera_der','fondo'
  landing_x?: number; // 0..1 normalized
  landing_y?: number; // 0..1 normalized
  
  // Attack specifics
  opp_attack_zone?: string; // '2','4','pipe','bic'
  block_touch?: boolean;
  net_touch?: boolean;
  tempo?: 'corta' | 'slide' | 'pipe' | 'bic' | 'alta';
  
  // Trajectory data (optional)
  trajectory?: Array<{x: number; y: number}>;
  
  // Error details
  error_cause?: 'red' | 'fuera' | 'antena' | 'doble' | 'cuatro' | 'rotacion';
  
  // Serve details
  serve_type?: 'flotado' | 'topspin' | 'salto' | 'corto';
  serve_speed?: number; // km/h
  
  // Reception quality
  reception_quality?: 0 | 1 | 2 | 3;
  
  // Block details
  block_type?: 'solo' | 'doble' | 'triple';
  
  // Player involved
  player_id?: string;
  
  // Timestamps
  timestamp: string;
  created_at?: string;
}

export interface Rally {
  id: string;
  set_id: string;
  point_number: number;
  serving_team: 'us' | 'opp';
  serving_player_id?: string;
  
  // Rally outcome
  won_by?: 'us' | 'opp';
  end_cause?: 'point' | 'error' | 'timeout';
  duration_ms?: number;
  
  // Rally stats
  actions_count: number;
  touches_us: number;
  touches_opp: number;
  
  // Timestamps
  started_at: string;
  ended_at?: string;
}

export interface Substitution {
  id: string;
  set_id: string;
  point_number: number;
  team: 'us' | 'opp';
  
  from_player_id: string;
  to_player_id: string;
  position: number; // 1-6
  
  is_libero: boolean;
  reason?: 'tactical' | 'injury' | 'performance' | 'rotation' | 'disciplinary';
  
  created_at: string;
}

export interface Timeout {
  id: string;
  set_id: string;
  point_number: number;
  
  by_team: 'us' | 'opp';
  type: 'technical' | 'medical' | 'tactical';
  
  start_ts: string;
  duration_s: number;
  reason?: string;
}

export interface LiveMatchState {
  match_id: string;
  current_set: number;
  
  // Score
  score_us: number;
  score_opp: number;
  sets_us: number;
  sets_opp: number;
  
  // Rotation and serving
  rotation_us: number; // 1-6
  rotation_opp: number; // 1-6
  serving_team: 'us' | 'opp';
  serving_player_id?: string;
  
  // Rally state
  current_rally_id?: string;
  rally_active: boolean;
  
  // Live stats
  sideout_percentage: number;
  current_streak: {
    team: 'us' | 'opp';
    count: number;
  };
  
  // Substitutions remaining
  substitutions_left_us: number;
  substitutions_left_opp: number;
  timeouts_left_us: number;
  timeouts_left_opp: number;
  
  // Timestamps
  updated_at: string;
}

export interface Player {
  id: string;
  name: string;
  number: number;
  position: 'S' | 'OH' | 'MB' | 'OPP' | 'L';
  is_libero: boolean;
  is_active: boolean;
  current_court_position?: number; // 1-6, null if on bench
}

export interface CourtZone {
  zone: string; // '1F', '1B', '2F', '2B', etc. or 'fuera_izq', 'fuera_der', 'fondo'
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
}

// Offline queue types
export interface QueuedAction {
  id: string;
  type: 'action' | 'rally_start' | 'rally_end' | 'substitution' | 'timeout';
  data: any;
  timestamp: string;
  attempts: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
}

// API response types
export interface ActionResponse {
  success: boolean;
  action_id: string;
  rally_updated?: boolean;
  score_updated?: boolean;
  error?: string;
}

export interface RallyResponse {
  success: boolean;
  rally_id: string;
  set_ended?: boolean;
  match_ended?: boolean;
  final_score?: {
    us: number;
    opp: number;
  };
  error?: string;
}

// Analytics helpers for live insights
export interface LiveInsight {
  type: 'sideout' | 'streak' | 'efficiency' | 'momentum';
  value: number;
  trend: 'up' | 'down' | 'stable';
  message: string;
}

export interface PlayerPerformance {
  player_id: string;
  actions_total: number;
  actions_successful: number;
  efficiency: number;
  last_action: string;
}

// Gesture types
export type SwipeDirection = 'left' | 'right' | 'up' | 'down';
export type GestureType = 'tap' | 'double_tap' | 'long_press' | 'swipe';

export interface GestureEvent {
  type: GestureType;
  direction?: SwipeDirection;
  target: string;
  data?: any;
}

// UI State types
export interface LiveUIState {
  selected_action?: string;
  selected_team?: 'us' | 'opp';
  selected_zone?: CourtZone;
  
  show_advanced_capture: boolean;
  show_substitutions: boolean;
  show_timeout_timer: boolean;
  
  last_action_time?: string;
  undo_available: boolean;
}

export default {
  ActionEvent,
  Rally,
  Substitution,
  Timeout,
  LiveMatchState,
  Player,
  CourtZone,
  QueuedAction,
  ActionResponse,
  RallyResponse,
  LiveInsight,
  PlayerPerformance,
  GestureEvent,
  LiveUIState
};