-- ============================================================================
-- MASTER SCHEMA: SPORTS ANALYTICS LAB (MULTI-TENANT, MULTI-SPORT, SAAS)
-- ============================================================================
-- Este script crea toda la arquitectura desde cero.

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. SAAS CORE & MULTI-TENANT (Orgs, Users, Subscriptions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS orgs (
  org_id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  descripcion text,
  logo_url text,
  -- Stripe / Pagos
  stripe_customer_id text,
  subscription_status text check (subscription_status in ('trialing', 'active', 'past_due', 'canceled', 'incomplete')) default 'trialing',
  subscription_price_id text,
  trial_ends_at timestamptz,
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS org_members (
  org_id uuid references orgs(org_id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  rol text check (rol in ('admin','coach','analista','scouter')) not null default 'coach',
  activo boolean not null default true,
  primary key (org_id, user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 2. DOMINIO MULTIDEPORTE & PASAPORTE DEL JUGADOR
-- ============================================================================

-- El pasaporte global del jugador (independiente de un club)
CREATE TABLE IF NOT EXISTS global_players (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid references auth.users(id) on delete set null, -- NULL = Ghost Profile
  global_athlete_id text unique not null, -- Ej. VLL-8X9P
  name text not null,
  birth_date date,
  -- Físico Base (Universal)
  height_cm decimal(5,2),
  weight_kg decimal(5,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Equipos (Asociados a un Club y a un Deporte específico)
CREATE TABLE IF NOT EXISTS teams (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references orgs(org_id) on delete cascade not null,
  sport_type text not null default 'volleyball', -- Ej. soccer, tennis, basketball
  name text not null,
  category text,
  gender text check (gender in ('M', 'F', 'Mixed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Club Roster: Vinculación temporal de un jugador a un club/equipo
CREATE TABLE IF NOT EXISTS club_roster (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references orgs(org_id) on delete cascade not null,
  player_id uuid references global_players(id) on delete cascade not null,
  team_id uuid references teams(id) on delete set null, -- Opcional, puede estar en el club pero sin equipo aún
  status text check (status in ('active', 'inactive', 'transferred')) not null default 'active',
  number text, -- Dorsal en este club
  position text, -- Rol nominal
  sport_metadata jsonb, -- Ej. {"preferred_foot": "left"} para fútbol
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  UNIQUE(org_id, player_id) -- Un jugador solo tiene un registro por club (actualizamos el status)
);

-- ============================================================================
-- 3. ANALÍTICA DE JUEGO (Estructura Agnóstica Jerárquica)
-- ============================================================================

CREATE TABLE IF NOT EXISTS matches (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references orgs(org_id) on delete cascade not null,
  team_id uuid references teams(id) on delete cascade not null,
  sport_type text not null default 'volleyball',
  opponent_name text not null,
  date timestamptz not null default now(),
  competition_type text,
  location text,
  match_metadata jsonb, -- Ej. Clima, Superficie, Tipo de balón
  created_at timestamptz not null default now()
);

-- Match Segments (Sets en Voleibol, Tiempos en Fútbol)
CREATE TABLE IF NOT EXISTS match_segments (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid references matches(id) on delete cascade not null,
  segment_type text not null, -- 'set', 'half', 'quarter'
  number integer not null, -- 1, 2, 3...
  score_us integer default 0,
  score_them integer default 0,
  segment_metadata jsonb,
  created_at timestamptz not null default now()
);

-- Match Sub-segments (Rallies en Voleibol, Posesiones en Básquetbol)
CREATE TABLE IF NOT EXISTS match_subsegments (
  id uuid primary key default uuid_generate_v4(),
  segment_id uuid references match_segments(id) on delete cascade not null,
  subsegment_type text not null, -- 'rally', 'possession', 'game_point'
  number integer,
  subsegment_metadata jsonb,
  created_at timestamptz not null default now()
);

-- Actions (La unidad básica de evento / toque / disparo)
CREATE TABLE IF NOT EXISTS actions (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid references matches(id) on delete cascade not null,
  subsegment_id uuid references match_subsegments(id) on delete cascade, -- Nullable en fútbol fluido
  player_id uuid references global_players(id) on delete cascade, -- Quien hizo la acción
  
  action_type text not null, -- 'serve', 'attack', 'pass', 'shot', 'tackle'
  
  -- Físico Base Universal
  speed_kmh decimal(5,2),
  x decimal(5,2), -- Coordenada origen
  y decimal(5,2),
  
  -- El campo salvavidas Multideporte
  action_details jsonb, -- Voleibol: {"quality": 3, "target_zone": 6}. Fútbol: {"xg": 0.1}
  
  ts timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 4. ENTRENAMIENTOS Y PRUEBAS FÍSICAS (Tracking de Fuentes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS player_tests (
  id uuid primary key default uuid_generate_v4(),
  player_id uuid references global_players(id) on delete cascade not null,
  -- Para saber quién hizo el reporte y a quién le pertenece si es oficial
  org_id uuid references orgs(org_id) on delete cascade, -- NULL si es self_reported solitario
  source text check (source in ('official_coach', 'self_reported')) not null default 'self_reported',
  created_by uuid references auth.users(id) on delete set null,
  
  date date not null default CURRENT_DATE,
  test_type text not null, -- 'vertical_jump', 'sprint_20m', 'vo2_max'
  value decimal(8,2) not null,
  unit text not null,
  notes text,
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS drills (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references orgs(org_id) on delete cascade not null,
  sport_type text not null default 'volleyball',
  name text not null,
  goal text,
  metric text, -- Qué se mide (tiempo, repeticiones)
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS drill_results (
  id uuid primary key default uuid_generate_v4(),
  drill_id uuid references drills(id) on delete cascade not null,
  player_id uuid references global_players(id) on delete cascade not null,
  source text check (source in ('official_coach', 'self_reported')) not null default 'official_coach',
  date date not null default CURRENT_DATE,
  metric_value decimal(8,2) not null,
  unit text not null,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 5. SEGURIDAD (RLS - Row Level Security)
-- ============================================================================

-- Helper para administradores
CREATE OR REPLACE FUNCTION is_member_of_org(check_org uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members WHERE org_id = check_org AND user_id = auth.uid() AND activo = true
  );
$$;

-- Global Players: Solo el propio jugador o miembros de un club que lo tenga en club_roster
ALTER TABLE global_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Jugador o miembros de su club ven el pasaporte" ON global_players
  FOR SELECT
  USING (
    auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM club_roster cr
      JOIN org_members om ON om.org_id = cr.org_id
      WHERE cr.player_id = global_players.id
        AND om.user_id = auth.uid()
        AND om.activo = true
    )
  );
CREATE POLICY "Solo el dueño puede editar su pasaporte" ON global_players FOR UPDATE USING (auth_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.find_player_by_athlete_id(target_athlete_id text)
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT gp.id, gp.name
  FROM public.global_players gp
  WHERE gp.global_athlete_id = target_athlete_id
    AND auth.uid() IS NOT NULL
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.find_player_by_athlete_id(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_player_by_athlete_id(text) TO authenticated;

-- Orgs & Org Members
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Miembros ven su org" ON orgs FOR SELECT USING (is_member_of_org(org_id));
CREATE POLICY "Miembros ven miembros de su org" ON org_members FOR SELECT USING (is_member_of_org(org_id));

-- Teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Aislamiento de equipos" ON teams FOR ALL USING (is_member_of_org(org_id));

-- Club Roster
ALTER TABLE club_roster ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Aislamiento de roster" ON club_roster FOR ALL USING (is_member_of_org(org_id));

-- Partidos (Matches)
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Aislamiento de partidos" ON matches FOR ALL USING (is_member_of_org(org_id));

-- Tests Físicos (Lógica Híbrida)
ALTER TABLE player_tests ENABLE ROW LEVEL SECURITY;
-- Un usuario puede ver sus propios tests (self_reported o no)
CREATE POLICY "Jugador ve sus tests" ON player_tests FOR SELECT USING (
  player_id IN (SELECT id FROM global_players WHERE auth_user_id = auth.uid())
);
-- Los miembros de la org pueden ver todos los tests de los jugadores que pasaron por su club
CREATE POLICY "Club ve tests de su org" ON player_tests FOR SELECT USING (is_member_of_org(org_id));
-- Solo el coach puede insertar oficiales
CREATE POLICY "Coach inserta oficiales" ON player_tests FOR INSERT WITH CHECK (
  (source = 'official_coach' AND is_member_of_org(org_id))
  OR
  (source = 'self_reported' AND player_id IN (SELECT id FROM global_players WHERE auth_user_id = auth.uid()))
);

-- ============================================================================
-- 6. TRIGGERS (Pre-registro y Pasaporte)
-- ============================================================================

-- Generador de códigos aleatorios para el Pasaporte
CREATE OR REPLACE FUNCTION generate_athlete_id() RETURNS text AS $$
DECLARE
  chars text[] := '{0,1,2,3,4,5,6,7,8,9,A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z}';
  result text := 'VLL-';
  i integer := 0;
BEGIN
  FOR i IN 1..4 LOOP
    result := result || chars[1+random()*(array_length(chars, 1)-1)];
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Al registrarse un usuario en auth.users, crearle su Pasaporte Global
CREATE OR REPLACE FUNCTION on_auth_user_created()
RETURNS TRIGGER AS $$
DECLARE
  new_athlete_id text;
BEGIN
  new_athlete_id := generate_athlete_id();
  
  -- Crear perfil global
  INSERT INTO global_players (auth_user_id, global_athlete_id, name)
  VALUES (NEW.id, new_athlete_id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  
  -- Si el admin quiere que los usuarios solitarios formen un "Club Personal" automático:
  -- (Opcional, de momento lo dejamos como jugador global puro)
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_trigger ON auth.users;
CREATE TRIGGER on_auth_user_created_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE on_auth_user_created();
