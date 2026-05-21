-- 005_auth_trigger.sql
-- Implementa el flujo de pre-registro (invitación) para usuarios trabajadores/analistas.

-- 1. Tabla de usuarios pre-registrados (invitaciones pendientes)
CREATE TABLE IF NOT EXISTS pre_registros (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  org_id uuid not null references orgs(org_id) on delete cascade,
  rol text check (rol in ('admin','coach','analista','scouter')) not null default 'coach',
  invitado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- RLS para pre_registros (Solo los admins de la org pueden invitar/ver)
ALTER TABLE pre_registros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins pueden ver y crear pre-registros" ON pre_registros
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM org_members 
      WHERE org_members.org_id = pre_registros.org_id 
      AND org_members.user_id = auth.uid() 
      AND org_members.rol = 'admin'
      AND org_members.activo = true
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members 
      WHERE org_members.org_id = pre_registros.org_id 
      AND org_members.user_id = auth.uid() 
      AND org_members.rol = 'admin'
      AND org_members.activo = true
    )
  );

-- 2. Función Trigger que se ejecutará al crear un usuario en auth.users
CREATE OR REPLACE FUNCTION on_auth_user_created()
RETURNS TRIGGER AS $$
DECLARE
  pre_reg record;
BEGIN
  -- Buscar si el correo del nuevo usuario está pre-registrado
  SELECT * INTO pre_reg FROM pre_registros WHERE email = NEW.email LIMIT 1;
  
  IF FOUND THEN
    -- Insertar en org_members vinculándolo a la organización
    INSERT INTO org_members (org_id, user_id, rol, activo)
    VALUES (pre_reg.org_id, NEW.id, pre_reg.rol, true);
    
    -- Opcional: Eliminar el pre-registro para que no se use de nuevo
    DELETE FROM pre_registros WHERE id = pre_reg.id;
  ELSE
    -- Comportamiento opcional: si el usuario no fue invitado, crearle una nueva organización propia?
    -- Si es B2B estricto, tal vez solo puedan entrar invitados. 
    -- Si queremos que cualquiera cree su Club al registrarse:
    
    DECLARE
      new_org_id uuid;
    BEGIN
      INSERT INTO orgs (nombre) VALUES ('Club de ' || COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)) RETURNING org_id INTO new_org_id;
      INSERT INTO org_members (org_id, user_id, rol, activo) VALUES (new_org_id, NEW.id, 'admin', true);
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear el Trigger en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_trigger ON auth.users;
CREATE TRIGGER on_auth_user_created_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE on_auth_user_created();
