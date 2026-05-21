-- Funciones SQL avanzadas para analítica de voleibol
-- Estas funciones se ejecutan en el servidor para optimizar rendimiento

-- 1. Función para obtener clutch performance
CREATE OR REPLACE FUNCTION get_clutch_performance()
RETURNS TABLE (
    player_id UUID,
    player_name TEXT,
    clutch_situations INTEGER,
    clutch_success INTEGER,
    clutch_percentage DECIMAL,
    normal_success INTEGER,
    normal_percentage DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH clutch_moments AS (
        -- Momentos clutch: diferencia <= 2 puntos en últimos 10 puntos del set
        SELECT r.id as rally_id, 
               rot.our_score, 
               rot.opp_score,
               GREATEST(rot.our_score, rot.opp_score) >= 15 as late_set -- 15+ puntos
        FROM rallies r
        JOIN rotations rot ON rot.set_id = r.set_id AND rot.point_number = r.point_number
        WHERE ABS(rot.our_score - rot.opp_score) <= 2
        AND GREATEST(rot.our_score, rot.opp_score) >= 15
    ),
    player_performance AS (
        SELECT 
            a.player_id,
            p.name as player_name,
            -- Clutch performance
            COUNT(CASE WHEN cm.rally_id IS NOT NULL THEN 1 END) as clutch_sits,
            COUNT(CASE WHEN cm.rally_id IS NOT NULL AND a.result IN ('success', 'point_us') THEN 1 END) as clutch_succ,
            -- Normal performance  
            COUNT(CASE WHEN cm.rally_id IS NULL THEN 1 END) as normal_sits,
            COUNT(CASE WHEN cm.rally_id IS NULL AND a.result IN ('success', 'point_us') THEN 1 END) as normal_succ
        FROM actions a
        JOIN players p ON p.id = a.player_id
        LEFT JOIN clutch_moments cm ON cm.rally_id = a.rally_id
        WHERE a.team = 'us' 
        AND a.action_type IN ('attack', 'serve', 'set')
        GROUP BY a.player_id, p.name
        HAVING COUNT(*) >= 10 -- Mínimo 10 acciones
    )
    SELECT 
        pp.player_id,
        pp.player_name,
        pp.clutch_sits::INTEGER,
        pp.clutch_succ::INTEGER,
        CASE WHEN pp.clutch_sits > 0 THEN ROUND((pp.clutch_succ::DECIMAL / pp.clutch_sits) * 100, 1) ELSE 0 END,
        pp.normal_succ::INTEGER,
        CASE WHEN pp.normal_sits > 0 THEN ROUND((pp.normal_succ::DECIMAL / pp.normal_sits) * 100, 1) ELSE 0 END
    FROM player_performance pp
    ORDER BY CASE WHEN pp.clutch_sits > 0 THEN (pp.clutch_succ::DECIMAL / pp.clutch_sits) ELSE 0 END DESC;
END;
$$ LANGUAGE plpgsql;

-- 2. Función para recomendaciones de jugadas
CREATE OR REPLACE FUNCTION get_play_recommendations(
    p_rotation INTEGER,
    p_setter_id UUID,
    p_available_players UUID[],
    p_score_diff INTEGER,
    p_set_number INTEGER
)
RETURNS TABLE (
    action_type TEXT,
    subtype TEXT,
    target_zone TEXT,
    expected_value DECIMAL,
    success_probability DECIMAL,
    sample_size INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH play_analysis AS (
        SELECT 
            a.action_type,
            a.subtype,
            a.target_zone,
            COUNT(*) as total_plays,
            AVG(CASE 
                WHEN a.result = 'point_us' THEN 1
                WHEN a.result = 'fail' THEN -1
                ELSE 0
            END) as ev,
            AVG(CASE WHEN a.result IN ('success', 'point_us') THEN 1 ELSE 0 END) as success_rate
        FROM actions a
        JOIN rallies r ON r.id = a.rally_id
        JOIN rotations rot ON rot.set_id = r.set_id AND rot.point_number = r.point_number
        WHERE a.team = 'us'
        AND a.action_type IN ('attack', 'serve')
        AND rot.our_rotation = p_rotation
        AND a.player_id = ANY(p_available_players)
        -- Filtrar por contexto de juego similar
        AND ABS((rot.our_score - rot.opp_score) - p_score_diff) <= 3
        GROUP BY a.action_type, a.subtype, a.target_zone
        HAVING COUNT(*) >= 3 -- Mínimo 3 muestras
    )
    SELECT 
        pa.action_type,
        COALESCE(pa.subtype, 'standard'),
        COALESCE(pa.target_zone, 'any'),
        ROUND(pa.ev, 3),
        ROUND(pa.success_rate, 3),
        pa.total_plays::INTEGER
    FROM play_analysis pa
    ORDER BY pa.ev DESC, pa.success_rate DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- 3. Función para calcular probabilidad de punto después del saque
CREATE OR REPLACE FUNCTION get_subsequent_point_win_rate(p_target_zone TEXT)
RETURNS DECIMAL AS $$
DECLARE
    win_rate DECIMAL;
BEGIN
    WITH serve_rallies AS (
        SELECT r.id, r.won_by
        FROM rallies r
        JOIN actions a ON a.rally_id = r.id
        WHERE a.action_type = 'serve' 
        AND a.team = 'us'
        AND a.target_zone = p_target_zone
        AND a.seq = 1 -- Primer acción del rally
    )
    SELECT AVG(CASE WHEN won_by = 'us' THEN 1 ELSE 0 END)
    INTO win_rate
    FROM serve_rallies;
    
    RETURN COALESCE(win_rate, 0.5);
END;
$$ LANGUAGE plpgsql;

-- 4. Función para consistencia del jugador
CREATE OR REPLACE FUNCTION get_player_consistency(
    p_player_id UUID,
    p_action_type TEXT
)
RETURNS TABLE (
    player_name TEXT,
    avg_performance DECIMAL,
    variance DECIMAL,
    matches_analyzed INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH player_match_performance AS (
        SELECT 
            s.match_id,
            AVG(CASE 
                WHEN a.result = 'point_us' THEN 1
                WHEN a.result = 'success' THEN 0.5
                WHEN a.result = 'fail' THEN 0
                ELSE 0.25
            END) as match_performance
        FROM actions a
        JOIN rallies r ON r.id = a.rally_id
        JOIN sets s ON s.id = r.set_id
        WHERE a.player_id = p_player_id
        AND a.action_type = p_action_type
        AND a.team = 'us'
        GROUP BY s.match_id
        HAVING COUNT(*) >= 5 -- Mínimo 5 acciones por partido
    ),
    performance_stats AS (
        SELECT 
            AVG(match_performance) as avg_perf,
            VAR_POP(match_performance) as variance,
            COUNT(*) as matches
        FROM player_match_performance
    )
    SELECT 
        p.name,
        ROUND(ps.avg_perf, 3),
        ROUND(ps.variance, 4),
        ps.matches::INTEGER
    FROM performance_stats ps
    CROSS JOIN players p
    WHERE p.id = p_player_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Función para análisis de zonas calientes/frías
CREATE OR REPLACE FUNCTION get_zone_analysis(p_match_id UUID DEFAULT NULL)
RETURNS TABLE (
    target_zone TEXT,
    total_actions INTEGER,
    success_rate DECIMAL,
    expected_value DECIMAL,
    temperature TEXT -- 'hot', 'warm', 'cold'
) AS $$
BEGIN
    RETURN QUERY
    WITH zone_stats AS (
        SELECT 
            a.target_zone,
            COUNT(*) as total,
            AVG(CASE WHEN a.result IN ('success', 'point_us') THEN 1 ELSE 0 END) as success_rate,
            AVG(CASE 
                WHEN a.result = 'point_us' THEN 1
                WHEN a.result = 'fail' THEN -1
                ELSE 0
            END) as ev
        FROM actions a
        JOIN rallies r ON r.id = a.rally_id
        JOIN sets s ON s.id = r.set_id
        WHERE a.team = 'us'
        AND a.target_zone IS NOT NULL
        AND a.action_type IN ('attack', 'serve')
        AND (p_match_id IS NULL OR s.match_id = p_match_id)
        GROUP BY a.target_zone
        HAVING COUNT(*) >= 5
    ),
    zone_percentiles AS (
        SELECT 
            target_zone,
            total,
            success_rate,
            ev,
            PERCENT_RANK() OVER (ORDER BY ev) as ev_percentile
        FROM zone_stats
    )
    SELECT 
        zp.target_zone,
        zp.total::INTEGER,
        ROUND(zp.success_rate, 3),
        ROUND(zp.ev, 3),
        CASE 
            WHEN zp.ev_percentile >= 0.7 THEN 'hot'
            WHEN zp.ev_percentile >= 0.3 THEN 'warm'
            ELSE 'cold'
        END
    FROM zone_percentiles zp
    ORDER BY zp.ev DESC;
END;
$$ LANGUAGE plpgsql;

-- 6. Función para momentum del partido
CREATE OR REPLACE FUNCTION get_match_momentum(p_set_id UUID, p_window_size INTEGER DEFAULT 5)
RETURNS TABLE (
    momentum_score DECIMAL,
    momentum_direction TEXT,
    recent_points TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    WITH recent_rallies AS (
        SELECT 
            won_by,
            point_number,
            LAG(won_by, 1) OVER (ORDER BY point_number) as prev_winner,
            LAG(won_by, 2) OVER (ORDER BY point_number) as prev2_winner
        FROM rallies
        WHERE set_id = p_set_id
        ORDER BY point_number DESC
        LIMIT p_window_size
    ),
    momentum_calc AS (
        SELECT 
            -- Peso mayor a puntos más recientes
            SUM(CASE 
                WHEN won_by = 'us' THEN 1.0 + (ROW_NUMBER() OVER (ORDER BY point_number DESC) - 1) * 0.2
                ELSE -1.0 - (ROW_NUMBER() OVER (ORDER BY point_number DESC) - 1) * 0.2
            END) / p_window_size as momentum,
            ARRAY_AGG(won_by ORDER BY point_number DESC) as points
        FROM recent_rallies
    )
    SELECT 
        ROUND(mc.momentum, 2),
        CASE 
            WHEN mc.momentum > 0.5 THEN 'strong_us'
            WHEN mc.momentum > 0.1 THEN 'slight_us'
            WHEN mc.momentum > -0.1 THEN 'neutral'
            WHEN mc.momentum > -0.5 THEN 'slight_opp'
            ELSE 'strong_opp'
        END,
        mc.points
    FROM momentum_calc mc;
END;
$$ LANGUAGE plpgsql;

-- 7. Función para predicción de rotación óptima
CREATE OR REPLACE FUNCTION get_optimal_rotation_prediction(
    p_team_id UUID,
    p_opponent TEXT,
    p_set_number INTEGER
)
RETURNS TABLE (
    rotation_number INTEGER,
    predicted_sideout DECIMAL,
    confidence DECIMAL,
    key_matchups TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    WITH historical_performance AS (
        SELECT 
            r.our_rotation,
            AVG(CASE WHEN ra.won_by = 'us' THEN 1 ELSE 0 END) as sideout_rate,
            COUNT(*) as sample_size
        FROM rotations r
        JOIN rallies ra ON ra.set_id = r.set_id AND ra.point_number = r.point_number
        JOIN sets s ON s.id = r.set_id
        JOIN matches m ON m.id = s.match_id
        WHERE m.team_id = p_team_id
        AND (p_opponent IS NULL OR m.opponent = p_opponent)
        AND r.serving_team = 'opp'
        AND s.number = p_set_number
        GROUP BY r.our_rotation
    )
    SELECT 
        hp.our_rotation::INTEGER,
        ROUND(hp.sideout_rate, 3),
        ROUND(LEAST(1.0, hp.sample_size / 20.0), 2), -- Confianza basada en tamaño de muestra
        ARRAY['matchup_1', 'matchup_2']::TEXT[] -- Placeholder para matchups clave
    FROM historical_performance hp
    WHERE hp.sample_size >= 3
    ORDER BY hp.sideout_rate DESC;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger para auto-refresh de vistas materializadas
CREATE OR REPLACE FUNCTION refresh_analytics_on_action_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo refrescar cada 10 acciones para evitar sobrecarga
    IF (SELECT COUNT(*) FROM actions WHERE created_at > NOW() - INTERVAL '5 minutes') % 10 = 0 THEN
        PERFORM refresh_analytics_views();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_refresh_analytics
    AFTER INSERT ON actions
    FOR EACH ROW
    EXECUTE FUNCTION refresh_analytics_on_action_insert();

-- 9. Función para limpiar datos antiguos (mantenimiento)
CREATE OR REPLACE FUNCTION cleanup_old_analytics_data()
RETURNS void AS $$
BEGIN
    -- Limpiar caché expirado
    DELETE FROM analytics_cache WHERE expires_at < NOW();
    
    -- Archivar datos muy antiguos (opcional)
    -- DELETE FROM actions WHERE created_at < NOW() - INTERVAL '2 years';
    
    -- Log de limpieza
    INSERT INTO analytics_cache (cache_key, data, expires_at)
    VALUES ('last_cleanup', '{"timestamp": "' || NOW() || '"}', NOW() + INTERVAL '1 day');
END;
$$ LANGUAGE plpgsql;

-- Programar limpieza automática (requiere pg_cron extensión)
-- SELECT cron.schedule('cleanup-analytics', '0 2 * * *', 'SELECT cleanup_old_analytics_data();');

-- Comentarios de documentación
COMMENT ON FUNCTION get_clutch_performance() IS 'Analiza rendimiento en momentos decisivos vs situaciones normales';
COMMENT ON FUNCTION get_play_recommendations(INTEGER, UUID, UUID[], INTEGER, INTEGER) IS 'Recomienda jugadas basado en EV histórico y contexto actual';
COMMENT ON FUNCTION get_subsequent_point_win_rate(TEXT) IS 'Probabilidad de ganar el punto después de servir a una zona específica';
COMMENT ON FUNCTION get_player_consistency(UUID, TEXT) IS 'Mide consistencia del jugador usando varianza del rendimiento';
COMMENT ON FUNCTION get_zone_analysis(UUID) IS 'Identifica zonas calientes y frías para ataque/saque';
COMMENT ON FUNCTION get_match_momentum(UUID, INTEGER) IS 'Calcula momentum del partido basado en puntos recientes';
COMMENT ON FUNCTION get_optimal_rotation_prediction(UUID, TEXT, INTEGER) IS 'Predice rotaciones óptimas basado en historial';