-- ============================================================================
-- 009: Unificar Trigger en auth.users y Política UPDATE para Ghost Players
-- (Hallazgos 1.4 y Sección 3)
-- Ejecutar en: Supabase Dashboard -> SQL Editor
-- ============================================================================

-- 1. Asegurar que exista la tabla de invitaciones (pre_registros)
CREATE TABLE IF NOT EXISTS public.pre_registros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  org_id uuid NOT NULL REFERENCES public.orgs(org_id) ON DELETE CASCADE,
  rol text CHECK (rol IN ('admin','coach','analista','scouter')) NOT NULL DEFAULT 'coach',
  invitado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pre_registros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins pueden ver y crear pre-registros" ON public.pre_registros;
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

-- 2. Eliminar TODOS los triggers duplicados anteriores en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_trigger ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_signup() CASCADE;

-- 3. Única función de registro:
--    a) Crea el pasaporte en global_players
--    b) Si hay invitación en pre_registros para su email, une al usuario a ese org
--    c) Si no hay invitación, crea una org propia y lo une como admin
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

  -- a) Crear pasaporte global en global_players (idempotente por auth_user_id)
  IF NOT EXISTS (SELECT 1 FROM public.global_players WHERE auth_user_id = NEW.id) THEN
    new_athlete_id := public.generate_athlete_id();
    INSERT INTO public.global_players (auth_user_id, global_athlete_id, name)
    VALUES (NEW.id, new_athlete_id, user_name);
  END IF;

  -- b) Revisar si existe invitación en pre_registros
  SELECT * INTO pre_reg FROM public.pre_registros WHERE LOWER(email) = LOWER(NEW.email) LIMIT 1;

  IF FOUND THEN
    INSERT INTO public.org_members (org_id, user_id, rol, activo)
    VALUES (pre_reg.org_id, NEW.id, pre_reg.rol, true)
    ON CONFLICT (org_id, user_id) DO UPDATE SET rol = EXCLUDED.rol, activo = true;

    DELETE FROM public.pre_registros WHERE id = pre_reg.id;
  ELSE
    -- c) Crear organización propia como admin
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

-- Crear el único trigger en auth.users
CREATE TRIGGER on_auth_user_created_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.on_auth_user_created();

-- 4. Política UPDATE en global_players para permitir que los miembros del club
--    editen los perfiles ghost (auth_user_id IS NULL) que estén en su club_roster
DROP POLICY IF EXISTS "Miembros del club pueden editar jugadores ghost de su roster" ON public.global_players;
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
