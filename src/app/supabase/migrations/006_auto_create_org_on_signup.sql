-- ============================================================
-- AUTO-CREAR ORGANIZACIÓN AL REGISTRARSE
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- Función que se ejecuta automáticamente al crear un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
  user_name  text;
  org_name   text;
BEGIN
  -- Obtener nombre del usuario desde metadata
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Nombre de la organización: "Club de {nombre}" o el que el usuario escribió
  org_name := COALESCE(
    NEW.raw_user_meta_data->>'org_name',
    'Club de ' || user_name
  );

  -- 1. Crear la organización
  INSERT INTO public.orgs (nombre, descripcion)
  VALUES (org_name, 'Organización creada automáticamente al registrarse')
  RETURNING org_id INTO new_org_id;

  -- 2. Añadir al usuario como admin de su organización
  INSERT INTO public.org_members (org_id, user_id, rol, activo)
  VALUES (new_org_id, NEW.id, 'admin', true);

  RETURN NEW;
END;
$$;

-- Eliminar trigger anterior si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Crear el trigger: se dispara en cada INSERT en auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_signup();

-- ============================================================
-- VERIFICACIÓN: lista los triggers activos en auth.users
-- ============================================================
-- SELECT trigger_name, event_manipulation, action_timing
-- FROM information_schema.triggers
-- WHERE event_object_table = 'users'
--   AND event_object_schema = 'auth';
