-- Volleyball Analytics Pro - Complete Database Schema
-- Migración completa para sistema profesional de análisis de voleibol

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Teams table
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    level TEXT CHECK (level IN ('junior', 'senior', 'professional', 'amateur')),
    gender TEXT CHECK (gender IN ('male', 'female', 'mixed')),
    logo_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Players table
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    dorsal INTEGER NOT NULL,
    name TEXT NOT NULL,
    position TEXT CHECK (position IN ('S', 'OH', 'OPP', 'MB', 'L', 'DS')),
    reach_cm INTEGER,
    height_cm INTEGER,
    wingspan_cm INTEGER,
    hand TEXT CHECK (hand IN ('right', 'left', 'both')),
    birth_date DATE,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, dorsal)
);

-- Matches table
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    opponent TEXT NOT NULL,
    date DATE NOT NULL,
    tournament TEXT,
    venue TEXT,
    is_home BOOLEAN DEFAULT TRUE,
    match_type TEXT CHECK (match_type IN ('league', 'cup', 'friendly', 'playoff')),
    status TEXT CHECK (status IN ('scheduled', 'playing', 'finished', 'cancelled')) DEFAULT 'scheduled',
    our_sets_won INTEGER DEFAULT 0,
    opp_sets_won INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sets table
CREATE TABLE sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    number INTEGER NOT NULL CHECK (number BETWEEN 1 AND 5),
    our_score_final INTEGER DEFAULT 0,
    opp_score_final INTEGER DEFAULT 0,
    result TEXT CHECK (result IN ('win', 'loss')),
    duration_minutes INTEGER,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(match_id, number)
);

-- Rotations table - Estado de rotación en cada punto
CREATE TABLE rotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    set_id UUID REFERENCES sets(id) ON DELETE CASCADE,
    point_number INTEGER NOT NULL,
    our_rotation INTEGER CHECK (our_rotation BETWEEN 1 AND 6),
    opp_rotation INTEGER CHECK (opp_rotation BETWEEN 1 AND 6),
    serving_team TEXT CHECK (serving_team IN ('us', 'opp')),
    server_player_id UUID REFERENCES players(id),
    our_score INTEGER DEFAULT 0,
    opp_score INTEGER DEFAULT 0,
    start_ts TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lineups table - Formaciones por set
CREATE TABLE lineups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    set_id UUID REFERENCES sets(id) ON DELETE CASCADE,
    start_point_number INTEGER DEFAULT 1,
    p1 UUID REFERENCES players(id), -- Position 1
    p2 UUID REFERENCES players(id), -- Position 2
    p3 UUID REFERENCES players(id), -- Position 3
    p4 UUID REFERENCES players(id), -- Position 4
    p5 UUID REFERENCES players(id), -- Position 5
    p6 UUID REFERENCES players(id), -- Position 6
    libero_id UUID REFERENCES players(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rallies table - Cada rally individual
CREATE TABLE rallies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    set_id UUID REFERENCES sets(id) ON DELETE CASCADE,
    point_number INTEGER NOT NULL,
    won_by TEXT CHECK (won_by IN ('us', 'opp')) NOT NULL,
    duration_s INTEGER,
    rally_type TEXT CHECK (rally_type IN ('sideout', 'breakpoint', 'neutral')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Actions table - Cada acción individual en el juego
CREATE TABLE actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rally_id UUID REFERENCES rallies(id) ON DELETE CASCADE,
    seq INTEGER NOT NULL, -- Secuencia en el rally
    team TEXT CHECK (team IN ('us', 'opp')) NOT NULL,
    player_id UUID REFERENCES players(id),
    action_type TEXT CHECK (action_type IN ('serve', 'receive', 'set', 'attack', 'block', 'dig', 'freeball', 'error', 'substitution', 'timeout')) NOT NULL,
    subtype TEXT, -- Específico por acción (ej: 'jump_serve', 'quick_attack')
    origin_zone TEXT, -- Zona de origen (1-6, A-D)
    target_zone TEXT, -- Zona objetivo
    speed_kmh DECIMAL(5,2),
    quality_0_3 INTEGER CHECK (quality_0_3 BETWEEN 0 AND 3),
    result TEXT CHECK (result IN ('success', 'fail', 'neutral', 'point_us', 'point_opp')),
    x DECIMAL(5,2), -- Coordenada X en cancha
    y DECIMAL(5,2), -- Coordenada Y en cancha
    ts TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player tests table - Pruebas físicas
CREATE TABLE player_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    test_type TEXT CHECK (test_type IN ('vertical_jump', 'horizontal_jump', 'sprint_20m', 'agility', 'reach', 'reaction_time', 'vo2_max')) NOT NULL,
    value DECIMAL(8,2) NOT NULL,
    unit TEXT NOT NULL,
    conditions TEXT, -- Condiciones del test (calentado, frío, etc.)
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drills table - Catálogo de ejercicios
CREATE TABLE drills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    goal TEXT NOT NULL,
    description TEXT,
    metric TEXT, -- Qué se mide (tiempo, repeticiones, precisión)
    difficulty TEXT CHECK (difficulty IN ('basic', 'intermediate', 'advanced')),
    position_focus TEXT, -- Posición específica o 'all'
    equipment TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drill sessions table - Sesiones de entrenamiento
CREATE TABLE drill_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    drill_id UUID REFERENCES drills(id) ON DELETE CASCADE,
    duration_minutes INTEGER,
    intensity TEXT CHECK (intensity IN ('low', 'medium', 'high', 'maximum')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drill results table - Resultados individuales por jugador
CREATE TABLE drill_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drill_session_id UUID REFERENCES drill_sessions(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    metric_value DECIMAL(8,2) NOT NULL,
    unit TEXT NOT NULL,
    attempts INTEGER DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tags table - Etiquetas para clasificar acciones
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#gray',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Action tags table - Relación muchos a muchos
CREATE TABLE action_tags (
    action_id UUID REFERENCES actions(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (action_id, tag_id)
);

-- Performance analytics cache table
CREATE TABLE analytics_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cache_key TEXT NOT NULL UNIQUE,
    data JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX idx_actions_rally_seq ON actions(rally_id, seq);
CREATE INDEX idx_actions_player_type ON actions(player_id, action_type);
CREATE INDEX idx_actions_team_type ON actions(team, action_type);
CREATE INDEX idx_rotations_set_point ON rotations(set_id, point_number);
CREATE INDEX idx_rallies_set_point ON rallies(set_id, point_number);
CREATE INDEX idx_player_tests_player_date ON player_tests(player_id, date);
CREATE INDEX idx_drill_results_session_player ON drill_results(drill_session_id, player_id);
CREATE INDEX idx_actions_coords ON actions(x, y) WHERE x IS NOT NULL AND y IS NOT NULL;
CREATE INDEX idx_actions_result ON actions(result);
CREATE INDEX idx_actions_quality ON actions(quality_0_3);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Vistas materializadas para analítica rápida
CREATE MATERIALIZED VIEW vw_sideout_by_rotation AS
SELECT 
    s.match_id,
    r.our_rotation,
    COUNT(*) as total_rallies,
    SUM(CASE WHEN ra.won_by = 'us' THEN 1 ELSE 0 END) as sideouts,
    ROUND(AVG(CASE WHEN ra.won_by = 'us' THEN 1 ELSE 0 END) * 100, 1) as sideout_percentage
FROM rotations r
JOIN rallies ra ON ra.set_id = r.set_id AND ra.point_number = r.point_number
JOIN sets s ON s.id = r.set_id
WHERE r.serving_team = 'opp' -- Solo cuando el oponente sirve
GROUP BY s.match_id, r.our_rotation;

CREATE MATERIALIZED VIEW vw_player_attack_efficiency AS
SELECT 
    a.player_id,
    p.name as player_name,
    p.position,
    a.target_zone,
    COUNT(*) as total_attacks,
    SUM(CASE WHEN a.result = 'point_us' THEN 1 ELSE 0 END) as kills,
    SUM(CASE WHEN a.result = 'fail' THEN 1 ELSE 0 END) as errors,
    ROUND(AVG(CASE WHEN a.result = 'point_us' THEN 1 WHEN a.result = 'fail' THEN -1 ELSE 0 END), 3) as attack_ev,
    ROUND(AVG(CASE WHEN a.result = 'point_us' THEN 1 ELSE 0 END) * 100, 1) as kill_percentage,
    ROUND(AVG(CASE WHEN a.result = 'fail' THEN 1 ELSE 0 END) * 100, 1) as error_percentage,
    ROUND(AVG(COALESCE(a.quality_0_3, 0)), 2) as avg_quality
FROM actions a
JOIN players p ON p.id = a.player_id
WHERE a.action_type = 'attack' AND a.team = 'us'
GROUP BY a.player_id, p.name, p.position, a.target_zone;

CREATE MATERIALIZED VIEW vw_serve_heatmap AS
SELECT 
    a.target_zone,
    COUNT(*) as total_serves,
    SUM(CASE WHEN a.result = 'point_us' THEN 1 ELSE 0 END) as aces,
    ROUND(AVG(CASE WHEN a.result = 'point_us' THEN 1 ELSE 0 END) * 100, 1) as ace_percentage,
    ROUND(AVG(COALESCE(a.speed_kmh, 0)), 1) as avg_speed_kmh,
    ROUND(AVG(COALESCE(a.quality_0_3, 0)), 2) as avg_quality
FROM actions a
WHERE a.action_type = 'serve' AND a.team = 'us' AND a.target_zone IS NOT NULL
GROUP BY a.target_zone;

CREATE MATERIALIZED VIEW vw_reception_quality AS
SELECT 
    r.our_rotation,
    a.player_id,
    p.name as player_name,
    COUNT(*) as total_receptions,
    AVG(COALESCE(a.quality_0_3, 0)) as avg_quality,
    SUM(CASE WHEN a.quality_0_3 >= 3 THEN 1 ELSE 0 END) as perfect_receptions,
    ROUND(AVG(CASE WHEN a.quality_0_3 >= 3 THEN 1 ELSE 0 END) * 100, 1) as perfect_percentage
FROM actions a
JOIN players p ON p.id = a.player_id
JOIN rallies ra ON ra.id = a.rally_id
JOIN rotations r ON r.set_id = ra.set_id AND r.point_number = ra.point_number
WHERE a.action_type = 'receive' AND a.team = 'us'
GROUP BY r.our_rotation, a.player_id, p.name;

-- Índices en vistas materializadas
CREATE INDEX idx_vw_sideout_match_rotation ON vw_sideout_by_rotation(match_id, our_rotation);
CREATE INDEX idx_vw_attack_player_zone ON vw_player_attack_efficiency(player_id, target_zone);

-- Función para refrescar todas las vistas materializadas
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW vw_sideout_by_rotation;
    REFRESH MATERIALIZED VIEW vw_player_attack_efficiency;
    REFRESH MATERIALIZED VIEW vw_serve_heatmap;
    REFRESH MATERIALIZED VIEW vw_reception_quality;
    
    -- Limpiar caché expirado
    DELETE FROM analytics_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) básico
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (ajustar según necesidades de autenticación)
CREATE POLICY "Allow public read access" ON teams FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON players FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON matches FOR SELECT USING (true);

-- Insertar datos básicos
INSERT INTO tags (name, color, description) VALUES
('clutch', '#ff6b6b', 'Jugadas en momentos decisivos'),
('pressure', '#ffd93d', 'Bajo presión del marcador'),
('perfect', '#6bcf7f', 'Ejecución perfecta'),
('error', '#ff8787', 'Error no forzado'),
('tactical', '#74c0fc', 'Jugada táctica'),
('power', '#ff922b', 'Jugada de potencia');

-- Función para obtener Expected Value por jugada
CREATE OR REPLACE FUNCTION get_play_expected_value(
    p_action_type TEXT,
    p_subtype TEXT DEFAULT NULL,
    p_target_zone TEXT DEFAULT NULL,
    p_rotation INTEGER DEFAULT NULL
)
RETURNS DECIMAL AS $$
DECLARE
    ev_result DECIMAL;
BEGIN
    SELECT AVG(
        CASE 
            WHEN result = 'point_us' THEN 1
            WHEN result = 'fail' THEN -1
            ELSE 0
        END
    ) INTO ev_result
    FROM actions a
    JOIN rallies r ON r.id = a.rally_id
    LEFT JOIN rotations rot ON rot.set_id = r.set_id AND rot.point_number = r.point_number
    WHERE a.action_type = p_action_type
    AND a.team = 'us'
    AND (p_subtype IS NULL OR a.subtype = p_subtype)
    AND (p_target_zone IS NULL OR a.target_zone = p_target_zone)
    AND (p_rotation IS NULL OR rot.our_rotation = p_rotation);
    
    RETURN COALESCE(ev_result, 0);
END;
$$ LANGUAGE plpgsql;

-- Comentarios para documentación
COMMENT ON TABLE teams IS 'Equipos en el sistema';
COMMENT ON TABLE players IS 'Jugadores por equipo con datos físicos';
COMMENT ON TABLE matches IS 'Partidos programados y jugados';
COMMENT ON TABLE actions IS 'Cada acción individual registrada durante el juego';
COMMENT ON COLUMN actions.seq IS 'Orden secuencial de la acción en el rally';
COMMENT ON COLUMN actions.quality_0_3 IS 'Calidad de la acción: 0=error, 1=malo, 2=bueno, 3=perfecto';
COMMENT ON MATERIALIZED VIEW vw_sideout_by_rotation IS 'Side-out percentage por rotación para análisis táctico';