-- ============================================================================
-- MASTER SCHEMA (PRODUCCIÓN REAL): SPORTS ANALYTICS LAB (MULTI-TENANT, SAAS)
-- ============================================================================
-- Migración base unificada con el esquema real de producción (`public`).
-- Los archivos 001–004 antiguos fueron movidos a /legacy.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. SAAS CORE & MULTI-TENANT (Orgs, Users, Invitations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.orgs (
  org_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre text NOT NULL,
  descripcion text,
  logo_url text,
  stripe_customer_id text,
  subscription_status text CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete')) DEFAULT 'trialing',
  subscription_price_id text,
  trial_ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.org_members (
  org_id uuid REFERENCES public.orgs(org_id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  rol text CHECK (rol IN ('admin','coach','analista','scouter')) NOT NULL DEFAULT 'coach',
  activo boolean NOT NULL DEFAULT true,
  PRIMARY KEY (org_id, user_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pre_registros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  org_id uuid NOT NULL REFERENCES public.orgs(org_id) ON DELETE CASCADE,
  rol text CHECK (rol IN ('admin','coach','analista','scouter')) NOT NULL DEFAULT 'coach',
  invitado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. DOMINIO MULTIDEPORTE & PASAPORTE DEL JUGADOR
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.global_players (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  global_athlete_id text UNIQUE NOT NULL,
  name text NOT NULL,
  birth_date date,
  height_cm decimal(5,2),
  weight_kg decimal(5,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid REFERENCES public.orgs(org_id) ON DELETE CASCADE NOT NULL,
  sport_type text NOT NULL DEFAULT 'volleyball',
  name text NOT NULL,
  category text,
  gender text CHECK (gender IN ('M', 'F', 'Mixed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.club_roster (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid REFERENCES public.orgs(org_id) ON DELETE CASCADE NOT NULL,
  player_id uuid REFERENCES public.global_players(id) ON DELETE CASCADE NOT NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  status text CHECK (status IN ('active', 'inactive', 'transferred')) NOT NULL DEFAULT 'active',
  number text,
  position text,
  sport_metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, player_id)
);

-- ============================================================================
-- 3. ANALÍTICA DE JUEGO (Estructura Agnóstica Jerárquica)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.matches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid REFERENCES public.orgs(org_id) ON DELETE CASCADE NOT NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  sport_type text NOT NULL DEFAULT 'volleyball',
  opponent_name text NOT NULL,
  date timestamptz NOT NULL DEFAULT now(),
  competition_type text,
  location text,
  match_metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.match_segments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id uuid REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  segment_type text NOT NULL,
  number integer NOT NULL,
  score_us integer DEFAULT 0,
  score_them integer DEFAULT 0,
  segment_metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.match_subsegments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  segment_id uuid REFERENCES public.match_segments(id) ON DELETE CASCADE NOT NULL,
  subsegment_type text NOT NULL,
  number integer,
  subsegment_metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.actions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id uuid REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  subsegment_id uuid REFERENCES public.match_subsegments(id) ON DELETE CASCADE,
  player_id uuid REFERENCES public.global_players(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  speed_kmh decimal(5,2),
  x decimal(5,2),
  y decimal(5,2),
  action_details jsonb,
  ts timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. ENTRENAMIENTOS Y PRUEBAS FÍSICAS (Esquema Rediseñado en Producción)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.player_tests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid REFERENCES public.orgs(org_id) ON DELETE CASCADE NOT NULL,
  player_id     uuid REFERENCES public.global_players(id) ON DELETE CASCADE NOT NULL,
  date          date NOT NULL,
  created_by    uuid REFERENCES auth.users(id),
  source        text DEFAULT 'official_coach',
  notes         text,
  cmj           decimal(6,2),
  sj            decimal(6,2),
  abordaje      decimal(6,2),
  vel_5m        decimal(6,3),
  vel_10m       decimal(6,3),
  t_test        decimal(6,3),
  spike_speed   decimal(6,2),
  serve_speed   decimal(6,2),
  reaction_time decimal(6,3),
  shoulder_rom  decimal(6,2),
  ankle_rom     decimal(6,2),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_player_tests_player_date ON public.player_tests(player_id, date);
CREATE INDEX IF NOT EXISTS idx_player_tests_org         ON public.player_tests(org_id);

CREATE TABLE IF NOT EXISTS public.drills (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid REFERENCES public.orgs(org_id) ON DELETE CASCADE NOT NULL,
  sport_type text NOT NULL DEFAULT 'volleyball',
  name text NOT NULL,
  goal text,
  metric text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.drill_results (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  drill_id uuid REFERENCES public.drills(id) ON DELETE CASCADE NOT NULL,
  player_id uuid REFERENCES public.global_players(id) ON DELETE CASCADE NOT NULL,
  source text CHECK (source IN ('official_coach', 'self_reported')) NOT NULL DEFAULT 'official_coach',
  date date NOT NULL DEFAULT CURRENT_DATE,
  metric_value decimal(8,2) NOT NULL,
  unit text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 5. SEGURIDAD (RLS - Row Level Security)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_member_of_org(check_org uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members WHERE org_id = check_org AND user_id = auth.uid() AND activo = true
  );
$$;

-- Global Players: Solo el propio jugador o miembros de un club que lo tenga en club_roster
ALTER TABLE public.global_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Jugador o miembros de su club ven el pasaporte" ON public.global_players
  FOR SELECT
  USING (
    auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.club_roster cr
      JOIN public.org_members om ON om.org_id = cr.org_id
      WHERE cr.player_id = global_players.id
        AND om.user_id = auth.uid()
        AND om.activo = true
    )
  );

CREATE POLICY "Solo el dueño puede editar su pasaporte" ON public.global_players
  FOR UPDATE USING (auth_user_id = auth.uid());

CREATE POLICY "Miembros del club pueden editar jugadores ghost de su roster" ON public.global_players
  FOR UPDATE
  USING (
    auth_user_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.club_roster cr
      JOIN public.org_members om ON om.org_id = cr.org_id
      WHERE cr.player_id = global_players.id
        AND om.user_id = auth.uid()
        AND om.activo = true
    )
  )
  WITH CHECK (
    auth_user_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.club_roster cr
      JOIN public.org_members om ON om.org_id = cr.org_id
      WHERE cr.player_id = global_players.id
        AND om.user_id = auth.uid()
        AND om.activo = true
    )
  );

-- RPC para buscar jugador por global_athlete_id exacto (devuelve solo id y name)
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

-- Orgs, Org Members & Pre-registros
ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_registros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Miembros ven su org" ON public.orgs FOR SELECT USING (public.is_member_of_org(org_id));
CREATE POLICY "Miembros ven miembros de su org" ON public.org_members FOR SELECT USING (public.is_member_of_org(org_id));
CREATE POLICY "Admins pueden ver y crear pre-registros" ON public.pre_registros
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_members.org_id = pre_registros.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.rol = 'admin'
        AND org_members.activo = true
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_members.org_id = pre_registros.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.rol = 'admin'
        AND org_members.activo = true
    )
  );

-- Teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Aislamiento de equipos" ON public.teams FOR ALL USING (public.is_member_of_org(org_id));

-- Club Roster
ALTER TABLE public.club_roster ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Aislamiento de roster" ON public.club_roster FOR ALL USING (public.is_member_of_org(org_id));

-- Partidos (Matches)
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Aislamiento de partidos" ON public.matches FOR ALL USING (public.is_member_of_org(org_id));

-- Tests Físicos
ALTER TABLE public.player_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Player tests isolation by org" ON public.player_tests
  FOR ALL
  USING (public.is_member_of_org(org_id))
  WITH CHECK (public.is_member_of_org(org_id));

-- ============================================================================
-- 6. TRIGGER ÚNICO EN auth.users (Pasaporte + Invitación u Org propia)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_athlete_id() RETURNS text AS $$
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

CREATE OR REPLACE FUNCTION public.on_auth_user_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_athlete_id text;
  user_name      text;
  org_name       text;
  new_org_id     uuid;
  pre_reg        record;
BEGIN
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  IF NOT EXISTS (SELECT 1 FROM public.global_players WHERE auth_user_id = NEW.id) THEN
    new_athlete_id := public.generate_athlete_id();
    INSERT INTO public.global_players (auth_user_id, global_athlete_id, name)
    VALUES (NEW.id, new_athlete_id, user_name);
  END IF;

  SELECT * INTO pre_reg FROM public.pre_registros WHERE LOWER(email) = LOWER(NEW.email) LIMIT 1;

  IF FOUND THEN
    INSERT INTO public.org_members (org_id, user_id, rol, activo)
    VALUES (pre_reg.org_id, NEW.id, pre_reg.rol, true)
    ON CONFLICT (org_id, user_id) DO UPDATE SET rol = EXCLUDED.rol, activo = true;

    DELETE FROM public.pre_registros WHERE id = pre_reg.id;
  ELSE
    org_name := COALESCE(
      NEW.raw_user_meta_data->>'org_name',
      'Club de ' || user_name
    );

    INSERT INTO public.orgs (nombre, descripcion)
    VALUES (org_name, 'Organización creada automáticamente al registrarse')
    RETURNING org_id INTO new_org_id;

    INSERT INTO public.org_members (org_id, user_id, rol, activo)
    VALUES (new_org_id, NEW.id, 'admin', true);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_trigger ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.on_auth_user_created();
