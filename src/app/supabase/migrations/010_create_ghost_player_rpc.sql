-- ============================================================================
-- 010: Función RPC create_ghost_player (SECURITY DEFINER)
-- Inserta en global_players y club_roster atómicamente validando membresía
-- ============================================================================

-- 1. Nadie puede insertar directo en global_players (se usa el RPC SECURITY DEFINER)
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar jugadores ghost" ON public.global_players;

-- 2. Función RPC SECURITY DEFINER para crear el jugador ghost y agregarlo al roster en una sola transacción
CREATE OR REPLACE FUNCTION public.create_ghost_player(
  p_org_id uuid,
  p_name text,
  p_height_cm numeric DEFAULT NULL,
  p_weight_kg numeric DEFAULT NULL,
  p_global_athlete_id text DEFAULT NULL,
  p_team_id uuid DEFAULT NULL,
  p_number text DEFAULT NULL,
  p_position text DEFAULT NULL,
  p_sport_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_athlete_id text;
  v_player_id uuid;
  v_roster_id uuid;
  v_result jsonb;
BEGIN
  -- Validar que el usuario actual es miembro activo de la organización
  IF NOT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
      AND activo = true
  ) THEN
    RAISE EXCEPTION 'No autorizado: el usuario no es miembro activo de esta organización';
  END IF;

  -- Si p_team_id no es null, validar que pertenezca a p_org_id
  IF p_team_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.teams
    WHERE id = p_team_id
      AND org_id = p_org_id
  ) THEN
    RAISE EXCEPTION 'El equipo especificado no pertenece a esta organización';
  END IF;

  -- Generar athlete_id si no se provee
  IF p_global_athlete_id IS NULL OR trim(p_global_athlete_id) = '' THEN
    v_athlete_id := 'VLL-GHOST-' || gen_random_uuid()::text;
  ELSE
    v_athlete_id := p_global_athlete_id;
  END IF;

  -- Insertar perfil ghost en global_players (auth_user_id IS NULL)
  INSERT INTO public.global_players (
    name,
    height_cm,
    weight_kg,
    global_athlete_id,
    auth_user_id
  ) VALUES (
    p_name,
    p_height_cm,
    p_weight_kg,
    v_athlete_id,
    NULL
  )
  RETURNING id INTO v_player_id;

  -- Insertar en club_roster
  INSERT INTO public.club_roster (
    org_id,
    team_id,
    player_id,
    status,
    number,
    position,
    sport_metadata
  ) VALUES (
    p_org_id,
    p_team_id,
    v_player_id,
    'active',
    p_number,
    p_position,
    p_sport_metadata
  )
  RETURNING id INTO v_roster_id;

  -- Construir y devolver el objeto del jugador completo
  SELECT jsonb_build_object(
    'id', gp.id,
    'name', gp.name,
    'height_cm', gp.height_cm,
    'weight_kg', gp.weight_kg,
    'global_athlete_id', gp.global_athlete_id,
    'auth_user_id', gp.auth_user_id,
    'created_at', gp.created_at,
    'updated_at', gp.updated_at,
    'roster_id', cr.id,
    'org_id', cr.org_id,
    'team_id', cr.team_id,
    'number', cr.number,
    'position', cr.position,
    'status', cr.status,
    'sport_metadata', cr.sport_metadata
  ) INTO v_result
  FROM public.global_players gp
  JOIN public.club_roster cr ON cr.player_id = gp.id
  WHERE gp.id = v_player_id AND cr.id = v_roster_id;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.create_ghost_player(uuid, text, numeric, numeric, text, uuid, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_ghost_player(uuid, text, numeric, numeric, text, uuid, text, text, jsonb) TO authenticated;
