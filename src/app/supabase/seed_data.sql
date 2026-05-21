-- Volleyball Analytics - Datos de prueba
-- Ejecutar después de crear el esquema principal

-- Limpiar datos existentes (cuidado en producción)
TRUNCATE TABLE action_tags, tags, drill_results, drill_sessions, drills, player_tests, actions, rallies, lineups, rotations, sets, matches, players, teams CASCADE;

-- 1. Equipos de prueba
INSERT INTO teams (id, name, level, gender) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Búfalos Volley', 'senior', 'male'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Tigres Unidos', 'senior', 'male');

-- 2. Jugadores del equipo principal (Búfalos)
INSERT INTO players (id, team_id, dorsal, name, position, height_cm, reach_cm, hand, is_active) VALUES
  -- Armadores
  ('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440001', 1, 'Carlos Méndez', 'S', 180, 305, 'right', true),
  ('550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440001', 12, 'Luis Vargas', 'S', 175, 300, 'left', true),
  
  -- Puntas (Opuestos)
  ('550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440001', 2, 'Miguel Torres', 'OPP', 195, 330, 'right', true),
  ('550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440001', 13, 'David Rojas', 'OPP', 192, 325, 'right', true),
  
  -- Atacadores exteriores
  ('550e8400-e29b-41d4-a716-446655440105', '550e8400-e29b-41d4-a716-446655440001', 3, 'Alejandro Silva', 'OH', 188, 320, 'right', true),
  ('550e8400-e29b-41d4-a716-446655440106', '550e8400-e29b-41d4-a716-446655440001', 4, 'Ricardo López', 'OH', 190, 322, 'left', true),
  ('550e8400-e29b-41d4-a716-446655440107', '550e8400-e29b-41d4-a716-446655440001', 14, 'Fernando Castro', 'OH', 186, 315, 'right', true),
  
  -- Centrales
  ('550e8400-e29b-41d4-a716-446655440108', '550e8400-e29b-41d4-a716-446655440001', 5, 'Juan Morales', 'MB', 200, 340, 'right', true),
  ('550e8400-e29b-41d4-a716-446655440109', '550e8400-e29b-41d4-a716-446655440001', 6, 'Pedro Herrera', 'MB', 198, 335, 'right', true),
  ('550e8400-e29b-41d4-a716-446655440110', '550e8400-e29b-41d4-a716-446655440001', 15, 'Roberto Díaz', 'MB', 201, 342, 'right', true),
  
  -- Líberos
  ('550e8400-e29b-41d4-a716-446655440111', '550e8400-e29b-41d4-a716-446655440001', 7, 'Andrés Jiménez', 'L', 172, 285, 'right', true),
  ('550e8400-e29b-41d4-a716-446655440112', '550e8400-e29b-41d4-a716-446655440001', 16, 'Sergio Ruiz', 'L', 170, 280, 'right', true);

-- 3. Partido de ejemplo
INSERT INTO matches (id, team_id, opponent, date, tournament, venue, is_home, status) VALUES
  ('550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440001', 'Tigres Unidos', '2024-01-15', 'Liga Nacional', 'Gimnasio Central', true, 'finished');

-- 4. Sets del partido
INSERT INTO sets (id, match_id, number, our_score_final, opp_score_final, result, duration_minutes, started_at, ended_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440201', 1, 25, 22, 'win', 28, '2024-01-15 19:00:00', '2024-01-15 19:28:00'),
  ('550e8400-e29b-41d4-a716-446655440302', '550e8400-e29b-41d4-a716-446655440201', 2, 23, 25, 'loss', 32, '2024-01-15 19:35:00', '2024-01-15 20:07:00'),
  ('550e8400-e29b-41d4-a716-446655440303', '550e8400-e29b-41d4-a716-446655440201', 3, 25, 20, 'win', 25, '2024-01-15 20:15:00', '2024-01-15 20:40:00');

-- 5. Rotaciones de ejemplo (Set 1)
INSERT INTO rotations (id, set_id, point_number, our_rotation, opp_rotation, serving_team, server_player_id, our_score, opp_score) VALUES
  -- Inicio del set
  ('550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440301', 1, 1, 1, 'us', '550e8400-e29b-41d4-a716-446655440105', 0, 0),
  ('550e8400-e29b-41d4-a716-446655440402', '550e8400-e29b-41d4-a716-446655440301', 2, 1, 1, 'us', '550e8400-e29b-41d4-a716-446655440105', 1, 0),
  ('550e8400-e29b-41d4-a716-446655440403', '550e8400-e29b-41d4-a716-446655440301', 3, 2, 1, 'us', '550e8400-e29b-41d4-a716-446655440101', 2, 0),
  ('550e8400-e29b-41d4-a716-446655440404', '550e8400-e29b-41d4-a716-446655440301', 4, 2, 2, 'opp', null, 2, 1),
  ('550e8400-e29b-41d4-a716-446655440405', '550e8400-e29b-41d4-a716-446655440301', 5, 2, 2, 'us', '550e8400-e29b-41d4-a716-446655440101', 3, 1);

-- 6. Rallies de ejemplo
INSERT INTO rallies (id, set_id, point_number, won_by, duration_s, rally_type) VALUES
  ('550e8400-e29b-41d4-a716-446655440501', '550e8400-e29b-41d4-a716-446655440301', 1, 'us', 8, 'breakpoint'),
  ('550e8400-e29b-41d4-a716-446655440502', '550e8400-e29b-41d4-a716-446655440301', 2, 'us', 12, 'breakpoint'),
  ('550e8400-e29b-41d4-a716-446655440503', '550e8400-e29b-41d4-a716-446655440301', 3, 'us', 15, 'breakpoint'),
  ('550e8400-e29b-41d4-a716-446655440504', '550e8400-e29b-41d4-a716-446655440301', 4, 'opp', 22, 'sideout'),
  ('550e8400-e29b-41d4-a716-446655440505', '550e8400-e29b-41d4-a716-446655440301', 5, 'us', 18, 'sideout');

-- 7. Acciones detalladas (muestra representativa)
INSERT INTO actions (id, rally_id, seq, team, player_id, action_type, subtype, origin_zone, target_zone, result, quality_0_3, x, y) VALUES
  -- Rally 1: Saque ace de Alejandro
  ('550e8400-e29b-41d4-a716-446655440601', '550e8400-e29b-41d4-a716-446655440501', 1, 'us', '550e8400-e29b-41d4-a716-446655440105', 'serve', 'jump_serve', '1', '5', 'point_us', 3, 1.0, 1.0),
  
  -- Rally 2: Saque, recepción, ataque ganador
  ('550e8400-e29b-41d4-a716-446655440602', '550e8400-e29b-41d4-a716-446655440502', 1, 'us', '550e8400-e29b-41d4-a716-446655440105', 'serve', 'float_serve', '1', '6', 'success', 2, 1.0, 1.0),
  ('550e8400-e29b-41d4-a716-446655440603', '550e8400-e29b-41d4-a716-446655440502', 2, 'opp', null, 'receive', 'overhead', '6', '3', 'success', 2, 6.0, 3.0),
  ('550e8400-e29b-41d4-a716-446655440604', '550e8400-e29b-41d4-a716-446655440502', 3, 'opp', null, 'set', 'high_set', '3', '4', 'success', 3, 3.0, 3.0),
  ('550e8400-e29b-41d4-a716-446655440605', '550e8400-e29b-41d4-a716-446655440502', 4, 'opp', null, 'attack', 'spike', '4', '1', 'fail', 1, 4.0, 4.0),
  ('550e8400-e29b-41d4-a716-446655440606', '550e8400-e29b-41d4-a716-446655440502', 5, 'us', '550e8400-e29b-41d4-a716-446655440108', 'block', 'double_block', '4', '4', 'point_us', 3, 4.0, 3.5),
  
  -- Rally 3: Intercambio largo con punto nuestro
  ('550e8400-e29b-41d4-a716-446655440607', '550e8400-e29b-41d4-a716-446655440503', 1, 'us', '550e8400-e29b-41d4-a716-446655440101', 'serve', 'topspin', '1', '1', 'success', 2, 1.0, 1.0),
  ('550e8400-e29b-41d4-a716-446655440608', '550e8400-e29b-41d4-a716-446655440503', 2, 'opp', null, 'receive', 'overhead', '1', '3', 'success', 3, 1.0, 3.0),
  ('550e8400-e29b-41d4-a716-446655440609', '550e8400-e29b-41d4-a716-446655440503', 3, 'opp', null, 'set', 'quick_set', '3', '3', 'success', 3, 3.0, 3.0),
  ('550e8400-e29b-41d4-a716-446655440610', '550e8400-e29b-41d4-a716-446655440503', 4, 'opp', null, 'attack', 'quick_attack', '3', '6', 'success', 2, 3.0, 6.0),
  ('550e8400-e29b-41d4-a716-446655440611', '550e8400-e29b-41d4-a716-446655440503', 5, 'us', '550e8400-e29b-41d4-a716-446655440111', 'dig', 'sprawl', '6', '1', 'success', 2, 6.0, 1.0),
  ('550e8400-e29b-41d4-a716-446655440612', '550e8400-e29b-41d4-a716-446655440503', 6, 'us', '550e8400-e29b-41d4-a716-446655440101', 'set', 'back_set', '1', '2', 'success', 3, 1.0, 2.0),
  ('550e8400-e29b-41d4-a716-446655440613', '550e8400-e29b-41d4-a716-446655440503', 7, 'us', '550e8400-e29b-41d4-a716-446655440103', 'attack', 'spike', '2', '5', 'point_us', 3, 2.0, 5.0);

-- 8. Tests físicos de ejemplo
INSERT INTO player_tests (id, player_id, date, test_type, value, unit, conditions) VALUES
  -- Salto vertical
  ('550e8400-e29b-41d4-a716-446655440701', '550e8400-e29b-41d4-a716-446655440103', '2024-01-10', 'vertical_jump', 75, 'cm', 'calentado'),
  ('550e8400-e29b-41d4-a716-446655440702', '550e8400-e29b-41d4-a716-446655440105', '2024-01-10', 'vertical_jump', 68, 'cm', 'calentado'),
  ('550e8400-e29b-41d4-a716-446655440703', '550e8400-e29b-41d4-a716-446655440108', '2024-01-10', 'vertical_jump', 72, 'cm', 'calentado'),
  
  -- Sprint 20m
  ('550e8400-e29b-41d4-a716-446655440704', '550e8400-e29b-41d4-a716-446655440103', '2024-01-10', 'sprint_20m', 3.1, 'seconds', 'calentado'),
  ('550e8400-e29b-41d4-a716-446655440705', '550e8400-e29b-41d4-a716-446655440105', '2024-01-10', 'sprint_20m', 3.3, 'seconds', 'calentado'),
  ('550e8400-e29b-41d4-a716-446655440706', '550e8400-e29b-41d4-a716-446655440111', '2024-01-10', 'sprint_20m', 3.8, 'seconds', 'calentado');

-- 9. Catálogo de drills
INSERT INTO drills (id, name, goal, description, metric, difficulty, position_focus, equipment) VALUES
  ('550e8400-e29b-41d4-a716-446655440801', 'Pepsi Challenge', 'Precisión de ataque', 'Atacar a zonas específicas marcadas', 'puntos_sobre_10', 'intermediate', 'OH', 'Conos, balones'),
  ('550e8400-e29b-41d4-a716-446655440802', 'Recepción bajo presión', 'Calidad de pase', 'Recibir saques consecutivos', 'promedio_calidad', 'advanced', 'L', 'Máquina de saques'),
  ('550e8400-e29b-41d4-a716-446655440803', 'Bloqueo reactivo', 'Velocidad de reacción', 'Bloques ante ataques sorpresa', 'tiempo_reaccion', 'intermediate', 'MB', 'Cronómetro, balones');

-- 10. Sesión de entrenamiento ejemplo
INSERT INTO drill_sessions (id, date, team_id, drill_id, duration_minutes, intensity) VALUES
  ('550e8400-e29b-41d4-a716-446655440901', '2024-01-12', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440801', 20, 'high'),
  ('550e8400-e29b-41d4-a716-446655440902', '2024-01-12', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440802', 15, 'medium');

-- 11. Resultados de drills
INSERT INTO drill_results (id, drill_session_id, player_id, metric_value, unit, attempts) VALUES
  ('550e8400-e29b-41d4-a716-446655440a01', '550e8400-e29b-41d4-a716-446655440901', '550e8400-e29b-41d4-a716-446655440103', 8.5, 'puntos', 10),
  ('550e8400-e29b-41d4-a716-446655440a02', '550e8400-e29b-41d4-a716-446655440901', '550e8400-e29b-41d4-a716-446655440105', 7.2, 'puntos', 10),
  ('550e8400-e29b-41d4-a716-446655440a03', '550e8400-e29b-41d4-a716-446655440902', '550e8400-e29b-41d4-a716-446655440111', 2.8, 'calidad_promedio', 15);

-- 12. Tags para análisis
INSERT INTO tags (name, color, description) VALUES
  ('clutch', '#ff6b6b', 'Jugadas en momentos decisivos'),
  ('pressure', '#ffd93d', 'Bajo presión del marcador'),
  ('perfect', '#6bcf7f', 'Ejecución perfecta'),
  ('error', '#ff8787', 'Error no forzado'),
  ('tactical', '#74c0fc', 'Jugada táctica'),
  ('power', '#ff922b', 'Jugada de potencia');

-- 13. Asociar tags a algunas acciones
INSERT INTO action_tags (action_id, tag_id) VALUES
  ('550e8400-e29b-41d4-a716-446655440601', (SELECT id FROM tags WHERE name = 'perfect')),
  ('550e8400-e29b-41d4-a716-446655440613', (SELECT id FROM tags WHERE name = 'power')),
  ('550e8400-e29b-41d4-a716-446655440606', (SELECT id FROM tags WHERE name = 'tactical'));

-- 14. Datos adicionales para más sets y análisis
-- Generar más datos para set 2 y 3 (simplificado)
DO $$
DECLARE
    rally_count INTEGER := 0;
    action_count INTEGER := 0;
    set_rec RECORD;
    rally_id UUID;
    action_id UUID;
BEGIN
    -- Para cada set adicional, crear rallies básicos
    FOR set_rec IN SELECT id, number FROM sets WHERE number IN (2, 3) LOOP
        FOR rally_count IN 1..30 LOOP
            rally_id := uuid_generate_v4();
            
            INSERT INTO rallies (id, set_id, point_number, won_by, duration_s, rally_type) VALUES
            (rally_id, set_rec.id, rally_count, 
             CASE WHEN random() > 0.5 THEN 'us' ELSE 'opp' END,
             8 + floor(random() * 20)::int,
             CASE WHEN random() > 0.7 THEN 'breakpoint' ELSE 'sideout' END);
            
            -- Crear algunas acciones por rally
            FOR action_count IN 1..floor(1 + random() * 8)::int LOOP
                action_id := uuid_generate_v4();
                
                INSERT INTO actions (id, rally_id, seq, team, player_id, action_type, subtype, target_zone, result, quality_0_3) VALUES
                (action_id, rally_id, action_count,
                 CASE WHEN random() > 0.5 THEN 'us' ELSE 'opp' END,
                 (SELECT id FROM players WHERE team_id = '550e8400-e29b-41d4-a716-446655440001' ORDER BY random() LIMIT 1),
                 (ARRAY['serve', 'receive', 'attack', 'set', 'block', 'dig'])[floor(random() * 6) + 1],
                 'standard',
                 floor(random() * 6 + 1)::text,
                 (ARRAY['success', 'fail', 'point_us', 'point_opp'])[floor(random() * 4) + 1],
                 floor(random() * 4)::int);
            END LOOP;
        END LOOP;
    END LOOP;
END $$;

-- 15. Refrescar vistas materializadas
REFRESH MATERIALIZED VIEW vw_sideout_by_rotation;
REFRESH MATERIALIZED VIEW vw_player_attack_efficiency;
REFRESH MATERIALIZED VIEW vw_serve_heatmap;
REFRESH MATERIALIZED VIEW vw_reception_quality;

-- 16. Verificar datos insertados
SELECT 
    'Teams' as entity, COUNT(*) as count FROM teams
UNION ALL SELECT 'Players', COUNT(*) FROM players  
UNION ALL SELECT 'Matches', COUNT(*) FROM matches
UNION ALL SELECT 'Sets', COUNT(*) FROM sets
UNION ALL SELECT 'Rallies', COUNT(*) FROM rallies
UNION ALL SELECT 'Actions', COUNT(*) FROM actions
UNION ALL SELECT 'Player Tests', COUNT(*) FROM player_tests
UNION ALL SELECT 'Drills', COUNT(*) FROM drills
ORDER BY entity;

-- Mostrar ejemplo de analítica calculada
SELECT 
    our_rotation as "Rotación",
    sideout_percentage as "Side-out %",
    total_rallies as "Total Rallies"
FROM vw_sideout_by_rotation 
ORDER BY our_rotation;

COMMENT ON SCRIPT IS 'Datos de prueba completos para el sistema de análisis de voleibol - incluye partido real con métricas calculadas';