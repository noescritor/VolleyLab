-- ============================================================
-- 008: Cerrar RLS de global_players y RPC de búsqueda por ID (Hallazgo 1.1)
-- Ejecutar en: Supabase Dashboard -> SQL Editor
-- ============================================================

-- 1. Eliminar la política pública abierta
DROP POLICY IF EXISTS "Cualquiera puede buscar jugadores por ID" ON global_players;

-- 2. Permitir SELECT solo al propio jugador o a miembros activos de un club que lo tenga en club_roster
DROP POLICY IF EXISTS "Jugador o miembros de su club ven el pasaporte" ON global_players;
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

-- 3. Función RPC SECURITY DEFINER para buscar un jugador por global_athlete_id exacto
-- Devuelve únicamente id y name (para vincular un jugador existente a un club sin exponer todo el catálogo)
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
