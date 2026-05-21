-- 004_saas_multi_tenant.sql
-- Este script adapta el esquema "Pro" (002) para ser 100% SaaS Multi-Tenant.
-- Agrega la columna org_id a todas las tablas base e implementa RLS estricto.

-- 1. Asegurar que existan orgs y org_members (vienen del 001, pero por si acaso)
CREATE TABLE IF NOT EXISTS orgs (
  org_id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  logo_url text,
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

-- Helper para políticas RLS
CREATE OR REPLACE FUNCTION is_member_of_org(check_org uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = check_org AND user_id = auth.uid() AND activo = true
  );
$$;

-- 2. Agregar org_id a las tablas del esquema Pro
-- Equipos
ALTER TABLE teams ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES orgs(org_id) ON DELETE CASCADE;
-- Jugadores
ALTER TABLE players ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES orgs(org_id) ON DELETE CASCADE;
-- Partidos
ALTER TABLE matches ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES orgs(org_id) ON DELETE CASCADE;
-- Tests y Drills
ALTER TABLE player_tests ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES orgs(org_id) ON DELETE CASCADE;
ALTER TABLE drills ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES orgs(org_id) ON DELETE CASCADE;
ALTER TABLE drill_sessions ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES orgs(org_id) ON DELETE CASCADE;

-- Para las tablas secundarias (sets, rallies, actions) utilizaremos RLS a través de JOINS o de los parent_id 
-- para no forzar a la aplicación a enviar org_id en cada jugada o rally.
-- Ejemplo: un set pertenece a un match, y el match tiene org_id.

CREATE OR REPLACE FUNCTION match_belongs_to_user_org(m_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT is_member_of_org(org_id) FROM matches WHERE id = m_id;
$$;

CREATE OR REPLACE FUNCTION set_belongs_to_user_org(s_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT match_belongs_to_user_org(match_id) FROM sets WHERE id = s_id;
$$;

CREATE OR REPLACE FUNCTION rally_belongs_to_user_org(r_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT set_belongs_to_user_org(set_id) FROM rallies WHERE id = r_id;
$$;

-- 3. Eliminar Políticas Públicas Anteriores
DROP POLICY IF EXISTS "Allow public read access" ON teams;
DROP POLICY IF EXISTS "Allow public read access" ON players;
DROP POLICY IF EXISTS "Allow public read access" ON matches;

-- 4. Habilitar RLS en todas las tablas Pro
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE rotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineups ENABLE ROW LEVEL SECURITY;
ALTER TABLE rallies ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE drill_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE drill_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_tags ENABLE ROW LEVEL SECURITY;

-- 5. Crear nuevas políticas RLS estrictas

-- TEAMS
CREATE POLICY "Teams isolation by org" ON teams
  FOR ALL USING (is_member_of_org(org_id)) WITH CHECK (is_member_of_org(org_id));

-- PLAYERS
CREATE POLICY "Players isolation by org" ON players
  FOR ALL USING (is_member_of_org(org_id)) WITH CHECK (is_member_of_org(org_id));

-- MATCHES
CREATE POLICY "Matches isolation by org" ON matches
  FOR ALL USING (is_member_of_org(org_id)) WITH CHECK (is_member_of_org(org_id));

-- SETS
CREATE POLICY "Sets isolation by org" ON sets
  FOR ALL USING (match_belongs_to_user_org(match_id)) WITH CHECK (match_belongs_to_user_org(match_id));

-- ROTATIONS
CREATE POLICY "Rotations isolation by org" ON rotations
  FOR ALL USING (set_belongs_to_user_org(set_id)) WITH CHECK (set_belongs_to_user_org(set_id));

-- LINEUPS
CREATE POLICY "Lineups isolation by org" ON lineups
  FOR ALL USING (set_belongs_to_user_org(set_id)) WITH CHECK (set_belongs_to_user_org(set_id));

-- RALLIES
CREATE POLICY "Rallies isolation by org" ON rallies
  FOR ALL USING (set_belongs_to_user_org(set_id)) WITH CHECK (set_belongs_to_user_org(set_id));

-- ACTIONS
CREATE POLICY "Actions isolation by org" ON actions
  FOR ALL USING (rally_belongs_to_user_org(rally_id)) WITH CHECK (rally_belongs_to_user_org(rally_id));

-- PLAYER TESTS
CREATE POLICY "Player tests isolation by org" ON player_tests
  FOR ALL USING (is_member_of_org(org_id)) WITH CHECK (is_member_of_org(org_id));

-- DRILLS
CREATE POLICY "Drills isolation by org" ON drills
  FOR ALL USING (is_member_of_org(org_id)) WITH CHECK (is_member_of_org(org_id));

-- DRILL SESSIONS
CREATE POLICY "Drill sessions isolation by org" ON drill_sessions
  FOR ALL USING (is_member_of_org(org_id)) WITH CHECK (is_member_of_org(org_id));

-- DRILL RESULTS
CREATE POLICY "Drill results isolation by org" ON drill_results
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM drill_sessions ds 
      WHERE ds.id = drill_results.drill_session_id AND is_member_of_org(ds.org_id)
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM drill_sessions ds 
      WHERE ds.id = drill_results.drill_session_id AND is_member_of_org(ds.org_id)
    )
  );

-- TAGS y ACTION_TAGS (Tags pueden ser públicos de la app, pero dejémoslo read-only para authenticated)
CREATE POLICY "Tags are public for authenticated" ON tags
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Action tags isolation by org" ON action_tags
  FOR ALL USING (rally_belongs_to_user_org((SELECT rally_id FROM actions WHERE id = action_tags.action_id)))
  WITH CHECK (rally_belongs_to_user_org((SELECT rally_id FROM actions WHERE id = action_tags.action_id)));
