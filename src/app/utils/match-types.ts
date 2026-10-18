// Updated Match Types for Agnostic Multi-Sport SaaS Schema
export type UUID = string;

// ==========================================
// SAAS CORE & MULTI-TENANT
// ==========================================
export interface Organization {
  org_id: UUID;
  nombre: string;
  descripcion?: string;
  logo_url?: string;
  stripe_customer_id?: string;
  subscription_status?: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete';
  subscription_price_id?: string;
  trial_ends_at?: string;
  created_at: string;
  updated_at: string;
}

export interface OrgMember {
  org_id: UUID;
  user_id: UUID;
  rol: 'admin' | 'coach' | 'analista' | 'scouter';
  activo: boolean;
  created_at: string;
  updated_at: string;
}

// ==========================================
// DOMAIN: MULTI-SPORT & PASSPORT
// ==========================================
export interface GlobalPlayer {
  id: UUID;
  auth_user_id?: UUID; // Null if ghost profile
  global_athlete_id: string; // VLL-XXXX
  name: string;
  birth_date?: string;
  height_cm?: number;
  weight_kg?: number;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: UUID;
  org_id: UUID;
  sport_type: string;
  name: string;
  category?: string;
  gender?: 'M' | 'F' | 'Mixed';
  created_at: string;
  updated_at: string;
}

export interface ClubRoster {
  id: UUID;
  org_id: UUID;
  player_id: UUID;
  team_id?: UUID;
  status: 'active' | 'inactive' | 'transferred';
  number?: string;
  position?: string;
  sport_metadata?: Record<string, any>; // JSONB
  created_at: string;
  updated_at: string;
}

// ==========================================
// GAME ANALYTICS (Agnostic)
// ==========================================
export interface Match {
  id: UUID;
  org_id: UUID;
  team_id: UUID;
  sport_type: string;
  opponent_name: string;
  date: string;
  competition_type?: string;
  location?: string;
  match_metadata?: Record<string, any>; // JSONB
  created_at: string;
}

export interface MatchSegment {
  id: UUID;
  match_id: UUID;
  segment_type: string; // 'set', 'half', 'quarter'
  number: number;
  score_us: number;
  score_them: number;
  segment_metadata?: Record<string, any>; // JSONB
  created_at: string;
}

export interface MatchSubsegment {
  id: UUID;
  segment_id: UUID;
  subsegment_type: string; // 'rally', 'possession'
  number?: number;
  subsegment_metadata?: Record<string, any>; // JSONB
  created_at: string;
}

export interface Action {
  id: UUID;
  match_id: UUID;
  subsegment_id?: UUID;
  player_id?: UUID;
  action_type: string; // 'serve', 'shot', 'pass'
  speed_kmh?: number;
  x?: number;
  y?: number;
  action_details?: Record<string, any>; // JSONB
  ts: string;
  created_at: string;
}

// ==========================================
// TESTS & DRILLS (Data Source Tracking)
// ==========================================
export interface PlayerTest {
  id: UUID;
  player_id: UUID;
  org_id?: UUID;
  source: 'official_coach' | 'self_reported';
  created_by?: UUID;
  date: string;
  test_type: string;
  value: number;
  unit: string;
  notes?: string;
  created_at: string;
}

export interface Drill {
  id: UUID;
  org_id: UUID;
  sport_type: string;
  name: string;
  goal?: string;
  metric?: string;
  created_at: string;
}

export interface DrillResult {
  id: UUID;
  drill_id: UUID;
  player_id: UUID;
  source: 'official_coach' | 'self_reported';
  date: string;
  metric_value: number;
  unit: string;
  created_at: string;
}