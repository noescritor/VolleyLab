-- ============================================================
-- 007: Rediseñar player_tests para soportar múltiples métricas
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- Eliminar la tabla vieja (si tiene datos, hacer backup primero)
DROP TABLE IF EXISTS player_tests CASCADE;

-- Crear la nueva tabla con columnas por métrica
CREATE TABLE player_tests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES orgs(org_id) ON DELETE CASCADE NOT NULL,
  player_id   UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  date        DATE NOT NULL,
  created_by  UUID REFERENCES auth.users(id),
  source      TEXT DEFAULT 'official_coach',
  notes       TEXT,

  -- Salto
  cmj         DECIMAL(6,2),  -- cm
  sj          DECIMAL(6,2),  -- cm
  abordaje    DECIMAL(6,2),  -- cm

  -- Velocidad
  vel_5m      DECIMAL(6,3),  -- segundos
  vel_10m     DECIMAL(6,3),  -- segundos
  t_test      DECIMAL(6,3),  -- segundos

  -- Potencia
  spike_speed DECIMAL(6,2),  -- km/h
  serve_speed DECIMAL(6,2),  -- km/h

  -- Reacción / Movilidad
  reaction_time DECIMAL(6,3), -- segundos
  shoulder_rom  DECIMAL(6,2), -- grados
  ankle_rom     DECIMAL(6,2), -- grados

  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_player_tests_player_date ON player_tests(player_id, date);
CREATE INDEX idx_player_tests_org        ON player_tests(org_id);

-- RLS
ALTER TABLE player_tests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Player tests isolation by org" ON player_tests;
CREATE POLICY "Player tests isolation by org" ON player_tests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = player_tests.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.activo = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = player_tests.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.activo = true
    )
  );
