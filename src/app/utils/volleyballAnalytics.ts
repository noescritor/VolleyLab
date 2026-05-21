// Volleyball Analytics - Advanced Data Science Functions
// Funciones de ciencia de datos para análisis táctico en tiempo real

import { supabase } from './supabase/globalClient';

// Interfaces para tipos de datos
export interface SideOutAnalysis {
  rotation: number;
  totalRallies: number;
  sideouts: number;
  percentage: number;
  trend: 'improving' | 'declining' | 'stable';
}

export interface AttackEfficiency {
  playerId: string;
  playerName: string;
  position: string;
  zone: string;
  totalAttacks: number;
  kills: number;
  errors: number;
  expectedValue: number;
  killPercentage: number;
  errorPercentage: number;
  avgQuality: number;
}

export interface ServeHeatmap {
  zone: string;
  totalServes: number;
  aces: number;
  acePercentage: number;
  avgSpeed: number;
  avgQuality: number;
  subsequentPointWin: number; // Probabilidad de ganar el punto después del saque
}

export interface ReceptionQuality {
  rotation: number;
  playerId: string;
  playerName: string;
  totalReceptions: number;
  avgQuality: number;
  perfectReceptions: number;
  perfectPercentage: number;
  passingOptions: number; // Opciones de ataque disponibles promedio
}

export interface ClutchPerformance {
  playerId: string;
  playerName: string;
  clutchSituations: number;
  clutchSuccess: number;
  clutchPercentage: number;
  normalSuccess: number;
  normalPercentage: number;
  clutchIndex: number; // Diferencia entre clutch y normal
}

export interface PlayRecommendation {
  playType: string;
  subtype: string;
  targetZone: string;
  expectedValue: number;
  successProbability: number;
  confidence: number;
  reasoning: string;
}

// 1. Side-out Analysis por rotación
export async function getSideOutAnalysis(matchId?: string, last30Days = false): Promise<SideOutAnalysis[]> {
  let query = supabase
    .from('vw_sideout_by_rotation')
    .select('*');
    
  if (matchId) {
    query = query.eq('match_id', matchId);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  // Calcular tendencias comparando con datos históricos
  const analysisWithTrends = await Promise.all(
    (data || []).map(async (item: any) => {
      const trend = await calculateTrend(item.our_rotation, 'sideout');
      return {
        rotation: item.our_rotation,
        totalRallies: item.total_rallies,
        sideouts: item.sideouts,
        percentage: item.sideout_percentage,
        trend
      };
    })
  );
  
  return analysisWithTrends;
}

// 2. Attack Efficiency con Expected Value
export async function getAttackEfficiency(playerId?: string, rotation?: number): Promise<AttackEfficiency[]> {
  let query = supabase
    .from('vw_player_attack_efficiency')
    .select('*')
    .order('attack_ev', { ascending: false });
    
  if (playerId) {
    query = query.eq('player_id', playerId);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  return (data || []).map((item: any) => ({
    playerId: item.player_id,
    playerName: item.player_name,
    position: item.position,
    zone: item.target_zone,
    totalAttacks: item.total_attacks,
    kills: item.kills,
    errors: item.errors,
    expectedValue: item.attack_ev,
    killPercentage: item.kill_percentage,
    errorPercentage: item.error_percentage,
    avgQuality: item.avg_quality
  }));
}

// 3. Serve Targeting con probabilidad de punto posterior
export async function getServeHeatmap(): Promise<ServeHeatmap[]> {
  const { data, error } = await supabase
    .from('vw_serve_heatmap')
    .select('*');
    
  if (error) throw error;
  
  // Calcular probabilidad de ganar punto después del saque
  const heatmapWithSubsequent = await Promise.all(
    (data || []).map(async (item: any) => {
      const subsequentWin = await getSubsequentPointWinRate(item.target_zone);
      return {
        zone: item.target_zone,
        totalServes: item.total_serves,
        aces: item.aces,
        acePercentage: item.ace_percentage,
        avgSpeed: item.avg_speed_kmh,
        avgQuality: item.avg_quality,
        subsequentPointWin: subsequentWin
      };
    })
  );
  
  return heatmapWithSubsequent;
}

// 4. Reception Quality por rotación
export async function getReceptionQuality(rotation?: number): Promise<ReceptionQuality[]> {
  let query = supabase
    .from('vw_reception_quality')
    .select('*')
    .order('avg_quality', { ascending: false });
    
  if (rotation) {
    query = query.eq('our_rotation', rotation);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  // Calcular opciones de ataque promedio basado en calidad de recepción
  const qualityWithOptions = await Promise.all(
    (data || []).map(async (item: any) => {
      const passingOptions = calculatePassingOptions(item.avg_quality);
      return {
        rotation: item.our_rotation,
        playerId: item.player_id,
        playerName: item.player_name,
        totalReceptions: item.total_receptions,
        avgQuality: item.avg_quality,
        perfectReceptions: item.perfect_receptions,
        perfectPercentage: item.perfect_percentage,
        passingOptions
      };
    })
  );
  
  return qualityWithOptions;
}

// 5. Clutch Performance Analysis
export async function getClutchPerformance(): Promise<ClutchPerformance[]> {
  const { data: clutchData, error: clutchError } = await supabase.rpc('get_clutch_performance');
  
  if (clutchError) throw clutchError;
  
  return (clutchData || []).map((item: any) => ({
    playerId: item.player_id,
    playerName: item.player_name,
    clutchSituations: item.clutch_situations,
    clutchSuccess: item.clutch_success,
    clutchPercentage: item.clutch_percentage,
    normalSuccess: item.normal_success,
    normalPercentage: item.normal_percentage,
    clutchIndex: item.clutch_percentage - item.normal_percentage
  }));
}

// 6. Play Recommender System
export async function getPlayRecommendations(
  currentRotation: number,
  setterId: string,
  availablePlayers: string[],
  currentScore: { us: number, opp: number },
  setNumber: number
): Promise<PlayRecommendation[]> {
  
  // Obtener Expected Values para todas las combinaciones posibles
  const { data: evData, error } = await supabase.rpc('get_play_recommendations', {
    p_rotation: currentRotation,
    p_setter_id: setterId,
    p_available_players: availablePlayers,
    p_score_diff: currentScore.us - currentScore.opp,
    p_set_number: setNumber
  });
  
  if (error) throw error;
  
  // Ordenar por Expected Value y añadir contexto
  const recommendations = (evData || [])
    .sort((a: any, b: any) => b.expected_value - a.expected_value)
    .slice(0, 3) // Top 3 recomendaciones
    .map((item: any, index: number) => ({
      playType: item.action_type,
      subtype: item.subtype,
      targetZone: item.target_zone,
      expectedValue: item.expected_value,
      successProbability: item.success_probability,
      confidence: Math.max(0.6, 1 - (index * 0.15)), // Decrece confianza
      reasoning: generateReasoning(item, currentScore, setNumber)
    }));
  
  return recommendations;
}

// 7. Consistency Analysis (varianza del rendimiento)
export async function getPlayerConsistency(playerId: string, actionType: string): Promise<{
  player: string;
  avgPerformance: number;
  variance: number;
  consistency: 'high' | 'medium' | 'low';
  volatilityIndex: number;
}> {
  const { data, error } = await supabase.rpc('get_player_consistency', {
    p_player_id: playerId,
    p_action_type: actionType
  });
  
  if (error) throw error;
  
  const consistency = data.variance < 0.1 ? 'high' : data.variance < 0.3 ? 'medium' : 'low';
  
  return {
    player: data.player_name,
    avgPerformance: data.avg_performance,
    variance: data.variance,
    consistency,
    volatilityIndex: data.variance / data.avg_performance
  };
}

// 8. Real-time Match Insights
export async function getRealTimeInsights(setId: string): Promise<{
  momentum: 'us' | 'opp' | 'neutral';
  keyRotations: number[];
  weakZones: string[];
  strengths: string[];
  nextPlaySuggestion: PlayRecommendation;
}> {
  
  // Calcular momentum basado en últimos 5 puntos
  const momentum = await calculateMomentum(setId);
  
  // Identificar rotaciones clave (mejor y peor side-out)
  const keyRotations = await getKeyRotations(setId);
  
  // Zonas débiles y fuertes
  const zoneAnalysis = await getZoneAnalysis(setId);
  
  // Sugerencia para próxima jugada (dummy por ahora)
  const nextPlaySuggestion: PlayRecommendation = {
    playType: 'attack',
    subtype: 'quick_middle',
    targetZone: '3',
    expectedValue: 0.65,
    successProbability: 0.75,
    confidence: 0.8,
    reasoning: 'Alto EV en centro con este colocador'
  };
  
  return {
    momentum,
    keyRotations,
    weakZones: zoneAnalysis.weak,
    strengths: zoneAnalysis.strong,
    nextPlaySuggestion
  };
}

// Funciones auxiliares
async function calculateTrend(rotation: number, metric: string): Promise<'improving' | 'declining' | 'stable'> {
  // Simplificado - comparar últimos 3 partidos vs 3 anteriores
  // En producción usar regresión linear o análisis más sofisticado
  return 'stable'; // placeholder
}

async function getSubsequentPointWinRate(targetZone: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_subsequent_point_win_rate', {
    p_target_zone: targetZone
  });
  
  if (error) return 0.5; // Default 50%
  return data || 0.5;
}

function calculatePassingOptions(quality: number): number {
  // Basado en calidad de recepción, estimar opciones de ataque
  if (quality >= 2.5) return 6; // Todas las opciones
  if (quality >= 2.0) return 4; // Opciones limitadas
  if (quality >= 1.5) return 2; // Solo opciones altas
  return 1; // Solo salvar el balón
}

function generateReasoning(play: any, score: any, setNumber: number): string {
  const scoreDiff = score.us - score.opp;
  const isCloseGame = Math.abs(scoreDiff) <= 2;
  const isLateSet = (setNumber === 5 && Math.max(score.us, score.opp) >= 12) || 
                    (setNumber < 5 && Math.max(score.us, score.opp) >= 20);
  
  if (isCloseGame && isLateSet) {
    return `Jugada de alto % en momento decisivo (EV: ${play.expected_value.toFixed(2)})`;
  }
  
  if (play.expected_value > 0.5) {
    return `Excelente EV histórico (${play.expected_value.toFixed(2)}) en esta situación`;
  }
  
  return `Opción sólida con ${(play.success_probability * 100).toFixed(0)}% de éxito`;
}

async function calculateMomentum(setId: string): Promise<'us' | 'opp' | 'neutral'> {
  const { data, error } = await supabase
    .from('rallies')
    .select('won_by')
    .eq('set_id', setId)
    .order('point_number', { ascending: false })
    .limit(5);
    
  if (error || !data?.length) return 'neutral';
  
  const recentWins = data.filter(r => r.won_by === 'us').length;
  
  if (recentWins >= 4) return 'us';
  if (recentWins <= 1) return 'opp';
  return 'neutral';
}

async function getKeyRotations(setId: string): Promise<number[]> {
  const { data, error } = await supabase
    .from('vw_sideout_by_rotation')
    .select('our_rotation, sideout_percentage')
    .order('sideout_percentage', { ascending: false })
    .limit(2);
    
  if (error) return [1, 4]; // Default
  
  return (data || []).map(d => d.our_rotation);
}

async function getZoneAnalysis(setId: string): Promise<{weak: string[], strong: string[]}> {
  // Análisis simplificado de zonas fuertes y débiles
  return {
    weak: ['1', '5'], // Zonas con menor eficiencia
    strong: ['2', '4'] // Zonas con mayor eficiencia
  };
}

// Cache para optimizar consultas frecuentes
const analyticsCache = new Map<string, { data: any; expires: number }>();

export function getCachedAnalytics<T>(key: string, fetcher: () => Promise<T>, ttlMinutes = 5): Promise<T> {
  const cached = analyticsCache.get(key);
  const now = Date.now();
  
  if (cached && now < cached.expires) {
    return Promise.resolve(cached.data);
  }
  
  return fetcher().then(data => {
    analyticsCache.set(key, {
      data,
      expires: now + (ttlMinutes * 60 * 1000)
    });
    return data;
  });
}