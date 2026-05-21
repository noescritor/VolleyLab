// Live Match API - Ultra-fast action capture and synchronization

import { supabase } from './supabase/globalClient';
import type { 
  ActionEvent, 
  Rally, 
  Substitution, 
  Timeout, 
  LiveMatchState,
  QueuedAction,
  ActionResponse,
  RallyResponse 
} from './live-match-types';

class LiveMatchAPI {
  private matchId: string | null = null;
  private currentRallyId: string | null = null;

  setMatch(matchId: string) {
    this.matchId = matchId;
  }

  // Rally management
  async startRally(data: Partial<Rally>): Promise<RallyResponse> {
    if (!this.matchId) throw new Error('No match set');

    try {
      const rally: Partial<Rally> = {
        id: `rally-${Date.now()}`,
        set_id: data.set_id || `set-${this.matchId}-1`,
        point_number: data.point_number || 1,
        serving_team: data.serving_team || 'us',
        serving_player_id: data.serving_player_id,
        actions_count: 0,
        touches_us: 0,
        touches_opp: 0,
        started_at: new Date().toISOString()
      };

      const { data: created, error } = await supabase
        .from('rallies')
        .insert(rally)
        .select()
        .single();

      if (error) throw error;

      this.currentRallyId = created.id;

      return {
        success: true,
        rally_id: created.id
      };
    } catch (error) {
      console.error('Error starting rally:', error);
      return {
        success: false,
        rally_id: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async endRally(rallyId: string, data: {
    won_by: 'us' | 'opp';
    end_cause: 'point' | 'error' | 'timeout';
    duration_ms?: number;
  }): Promise<RallyResponse> {
    try {
      const updateData = {
        won_by: data.won_by,
        end_cause: data.end_cause,
        duration_ms: data.duration_ms,
        ended_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('rallies')
        .update(updateData)
        .eq('id', rallyId);

      if (error) throw error;

      this.currentRallyId = null;

      return {
        success: true,
        rally_id: rallyId
      };
    } catch (error) {
      console.error('Error ending rally:', error);
      return {
        success: false,
        rally_id: rallyId,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Action capture
  async addAction(action: Partial<ActionEvent>): Promise<ActionResponse> {
    try {
      const actionData: Partial<ActionEvent> = {
        id: `action-${Date.now()}`,
        rally_id: this.currentRallyId || '',
        sequence: action.sequence || 1,
        action_type: action.action_type,
        team: action.team,
        landing_zone: action.landing_zone,
        landing_x: action.landing_x,
        landing_y: action.landing_y,
        opp_attack_zone: action.opp_attack_zone,
        block_touch: action.block_touch,
        net_touch: action.net_touch,
        tempo: action.tempo,
        trajectory: action.trajectory,
        error_cause: action.error_cause,
        serve_type: action.serve_type,
        serve_speed: action.serve_speed,
        reception_quality: action.reception_quality,
        block_type: action.block_type,
        player_id: action.player_id,
        timestamp: new Date().toISOString()
      };

      const { data: created, error } = await supabase
        .from('actions')
        .insert(actionData)
        .select()
        .single();

      if (error) throw error;

      // Update rally stats
      if (this.currentRallyId) {
        await this.updateRallyStats(this.currentRallyId, action.team);
      }

      return {
        success: true,
        action_id: created.id,
        rally_updated: true
      };
    } catch (error) {
      console.error('Error adding action:', error);
      return {
        success: false,
        action_id: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async updateRallyStats(rallyId: string, team?: 'us' | 'opp' | 'neutral') {
    try {
      const { data: rally } = await supabase
        .from('rallies')
        .select('actions_count, touches_us, touches_opp')
        .eq('id', rallyId)
        .single();

      if (!rally) return;

      const updates: any = {
        actions_count: rally.actions_count + 1
      };

      if (team === 'us') {
        updates.touches_us = rally.touches_us + 1;
      } else if (team === 'opp') {
        updates.touches_opp = rally.touches_opp + 1;
      }

      await supabase
        .from('rallies')
        .update(updates)
        .eq('id', rallyId);
    } catch (error) {
      console.error('Error updating rally stats:', error);
    }
  }

  // Substitution management
  async addSubstitution(substitution: Partial<Substitution>): Promise<ActionResponse> {
    try {
      const subData: Partial<Substitution> = {
        id: `sub-${Date.now()}`,
        set_id: substitution.set_id || `set-${this.matchId}-1`,
        point_number: substitution.point_number || 1,
        team: substitution.team || 'us',
        from_player_id: substitution.from_player_id,
        to_player_id: substitution.to_player_id,
        position: substitution.position,
        is_libero: substitution.is_libero || false,
        reason: substitution.reason,
        created_at: new Date().toISOString()
      };

      const { data: created, error } = await supabase
        .from('substitutions')
        .insert(subData)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        action_id: created.id
      };
    } catch (error) {
      console.error('Error adding substitution:', error);
      return {
        success: false,
        action_id: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Timeout management
  async addTimeout(timeout: Partial<Timeout>): Promise<ActionResponse> {
    try {
      const timeoutData: Partial<Timeout> = {
        id: `timeout-${Date.now()}`,
        set_id: timeout.set_id || `set-${this.matchId}-1`,
        point_number: timeout.point_number || 1,
        by_team: timeout.by_team || 'us',
        type: timeout.type || 'tactical',
        start_ts: new Date().toISOString(),
        duration_s: timeout.duration_s || 60,
        reason: timeout.reason
      };

      const { data: created, error } = await supabase
        .from('timeouts')
        .insert(timeoutData)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        action_id: created.id
      };
    } catch (error) {
      console.error('Error adding timeout:', error);
      return {
        success: false,
        action_id: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Batch sync for offline queue
  async syncActions(queuedActions: QueuedAction[]): Promise<{ successful: string[], failed: string[] }> {
    const successful: string[] = [];
    const failed: string[] = [];

    for (const queued of queuedActions) {
      try {
        let result: ActionResponse;

        switch (queued.type) {
          case 'action':
            result = await this.addAction(queued.data);
            break;
          case 'rally_start':
            const rallyResult = await this.startRally(queued.data);
            result = { success: rallyResult.success, action_id: rallyResult.rally_id, error: rallyResult.error };
            break;
          case 'rally_end':
            const endResult = await this.endRally(queued.data.rally_id, queued.data);
            result = { success: endResult.success, action_id: endResult.rally_id, error: endResult.error };
            break;
          case 'substitution':
            result = await this.addSubstitution(queued.data);
            break;
          case 'timeout':
            result = await this.addTimeout(queued.data);
            break;
          default:
            throw new Error(`Unknown action type: ${queued.type}`);
        }

        if (result.success) {
          successful.push(queued.id);
        } else {
          failed.push(queued.id);
          console.error(`Failed to sync ${queued.type}:`, result.error);
        }
      } catch (error) {
        failed.push(queued.id);
        console.error(`Error syncing ${queued.type}:`, error);
      }
    }

    return { successful, failed };
  }

  // Live match state
  async getMatchState(matchId: string): Promise<LiveMatchState | null> {
    try {
      // This would normally come from a materialized view or aggregated query
      const { data, error } = await supabase
        .from('live_match_state')
        .select('*')
        .eq('match_id', matchId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return data || {
        match_id: matchId,
        current_set: 1,
        score_us: 0,
        score_opp: 0,
        sets_us: 0,
        sets_opp: 0,
        rotation_us: 1,
        rotation_opp: 1,
        serving_team: 'us',
        rally_active: false,
        sideout_percentage: 0,
        current_streak: { team: 'us', count: 0 },
        substitutions_left_us: 6,
        substitutions_left_opp: 6,
        timeouts_left_us: 2,
        timeouts_left_opp: 2,
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting match state:', error);
      return null;
    }
  }

  async updateMatchState(matchId: string, updates: Partial<LiveMatchState>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('live_match_state')
        .upsert({
          match_id: matchId,
          ...updates,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating match state:', error);
      return false;
    }
  }

  // Live analytics
  async getLiveInsights(matchId: string) {
    try {
      // Side-out percentage for current rotation
      const { data: sideOutData } = await supabase
        .rpc('get_live_sideout_percentage', { match_id: matchId });

      // Current streak
      const { data: streakData } = await supabase
        .rpc('get_current_streak', { match_id: matchId });

      // Server efficiency
      const { data: serverData } = await supabase
        .rpc('get_server_efficiency', { match_id: matchId });

      return {
        sideOut: sideOutData?.[0] || 0,
        streak: streakData?.[0] || { team: 'us', count: 0 },
        serverStats: serverData?.[0] || { serves: 0, aces: 0, errors: 0 }
      };
    } catch (error) {
      console.error('Error getting live insights:', error);
      return {
        sideOut: 0,
        streak: { team: 'us', count: 0 },
        serverStats: { serves: 0, aces: 0, errors: 0 }
      };
    }
  }

  // Undo last action
  async undoLastAction(rallyId: string): Promise<boolean> {
    try {
      // Get the last action
      const { data: lastAction } = await supabase
        .from('actions')
        .select('*')
        .eq('rally_id', rallyId)
        .order('sequence', { ascending: false })
        .limit(1)
        .single();

      if (!lastAction) return false;

      // Soft delete the action
      const { error } = await supabase
        .from('actions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', lastAction.id);

      if (error) throw error;

      // Update rally stats
      await this.updateRallyStats(rallyId);

      return true;
    } catch (error) {
      console.error('Error undoing last action:', error);
      return false;
    }
  }
}

// Export singleton instance
export const liveMatchAPI = new LiveMatchAPI();

// Export for testing/mocking
export default LiveMatchAPI;