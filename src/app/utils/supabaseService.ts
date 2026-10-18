import { supabase } from './supabase/globalClient';
import { projectId, publicAnonKey } from './supabase/info';
import { UUID } from './match-types';

const supabaseUrl = `https://${projectId}.supabase.co`;

class SupabaseService {
  // Exposed publicly so AppContext can use it directly when needed
  public supabase = supabase;

  // Authentication & Context
  async getCurrentUser() {
    const { data: { user } } = await this.supabase.auth.getUser();
    return user;
  }

  async getUserOrg(): Promise<UUID | null> {
    const user = await this.getCurrentUser();
    if (!user) return null;

    const storedOrgId = typeof window !== 'undefined' ? localStorage.getItem('currentOrgId') : null;
    if (storedOrgId) {
      const { data: validMember } = await this.supabase
        .from('org_members')
        .select('org_id')
        .eq('user_id', user.id)
        .eq('org_id', storedOrgId)
        .eq('activo', true)
        .maybeSingle();

      if (validMember?.org_id) {
        return validMember.org_id;
      }
      if (typeof window !== 'undefined') {
        localStorage.removeItem('currentOrgId');
      }
    }

    const { data } = await this.supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .eq('activo', true)
      .limit(1)
      .maybeSingle();

    if (data?.org_id && typeof window !== 'undefined') {
      localStorage.setItem('currentOrgId', data.org_id);
    }

    return data?.org_id || null;
  }

  async getUserOrgs(): Promise<any[]> {
    const user = await this.getCurrentUser();
    if (!user) return [];

    const { data } = await this.supabase
      .from('org_members')
      .select('org_id, rol, orgs(nombre, logo_url)')
      .eq('user_id', user.id)
      .eq('activo', true);

    return data || [];
  }

  // ==========================================
  // DOMAIN: TEAMS
  // ==========================================
  async getTeams(sportType: string = 'volleyball') {
    const orgId = await this.getUserOrg();
    if (!orgId) return [];

    const { data, error } = await this.supabase
      .from('teams')
      .select('*')
      .eq('org_id', orgId)
      .eq('sport_type', sportType)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  async createTeam(teamData: any) {
    const orgId = await this.getUserOrg();
    if (!orgId) throw new Error('User not associated with any organization');

    const { data, error } = await this.supabase
      .from('teams')
      .insert({ ...teamData, org_id: orgId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async ensureDefaultTeam() {
    const orgId = await this.getUserOrg();
    if (!orgId) return null;
    const teams = await this.getTeams();
    if (teams.length > 0) return teams[0];

    const { data, error } = await this.supabase
      .from('teams')
      .insert({
        org_id: orgId,
        sport_type: 'volleyball',
        name: 'Equipo Principal',
        category: 'Primera División',
        gender: 'Mixed'
      })
      .select()
      .single();

    if (error) { console.error('Could not create default team:', error.message); return null; }
    console.log('✅ Default team created:', data.id);
    return data;
  }

  // ==========================================
  // DOMAIN: PLAYERS & ROSTER
  // ==========================================
  async getPlayers() {
    const orgId = await this.getUserOrg();
    if (!orgId) return [];

    const { data, error } = await this.supabase
      .from('club_roster')
      .select(`
        *,
        global_players(*)
      `)
      .eq('org_id', orgId)
      .eq('status', 'active');

    if (error) throw error;
    
    return (data || []).map(item => ({
      ...item.global_players,
      roster_id: item.id,
      number: item.number,
      position: item.position,
      team_id: item.team_id,
      sport_metadata: item.sport_metadata
    }));
  }

  async getPlayersByTeam(teamId: UUID) {
    const { data, error } = await this.supabase
      .from('club_roster')
      .select(`
        *,
        global_players(*)
      `)
      .eq('team_id', teamId)
      .eq('status', 'active');

    if (error) throw error;
    
    return (data || []).map(item => ({
      ...item.global_players,
      roster_id: item.id,
      number: item.number,
      position: item.position,
      sport_metadata: item.sport_metadata
    }));
  }

  async addPlayerToRoster(athleteId: string, rosterData: any) {
    const orgId = await this.getUserOrg();
    if (!orgId) throw new Error('No org context');

    // Find the player via SECURITY DEFINER RPC (returns only id + name)
    const { data: players, error: playerError } = await this.supabase
      .rpc('find_player_by_athlete_id', { target_athlete_id: athleteId });

    const player = Array.isArray(players) ? players[0] : players;
    if (playerError || !player?.id) throw new Error('Jugador no encontrado con ese ID');

    const { data, error } = await this.supabase
      .from('club_roster')
      .upsert({ 
        org_id: orgId,
        player_id: player.id,
        status: 'active',
        ...rosterData 
      }, { onConflict: 'org_id, player_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async createGhostPlayer(playerData: any, rosterData: any) {
    const orgId = await this.getUserOrg();
    if (!orgId) throw new Error('No org context');

    // 1. Create Ghost Profile
    const { data: ghostPlayer, error: gpError } = await this.supabase
      .from('global_players')
      .insert({
        name: playerData.name,
        height_cm: playerData.height_cm,
        weight_kg: playerData.weight_kg,
        global_athlete_id: `VLL-GHOST-${Math.floor(Math.random()*10000)}` // Temporary ghost ID
      })
      .select()
      .single();

    if (gpError || !ghostPlayer) throw gpError;

    // Fetch default team if not provided
    let teamId = rosterData.team_id;
    if (!teamId) {
      const teams = await this.getTeams();
      if (teams.length > 0) teamId = teams[0].id;
    }

    // 2. Add to Roster
    const { data: roster, error: rosterError } = await this.supabase
      .from('club_roster')
      .insert({
        org_id: orgId,
        team_id: teamId,
        player_id: ghostPlayer.id,
        status: 'active',
        ...rosterData
      })
      .select()
      .single();

    if (rosterError) throw rosterError;

    return { ...ghostPlayer, roster_id: roster.id, ...rosterData };
  }

  async updatePlayer(playerId: string, playerData: any, rosterData: any) {
    const orgId = await this.getUserOrg();
    if (!orgId) throw new Error('No org context');
    
    // Update global physical stats
    if (Object.keys(playerData).length > 0) {
      const { error: gpError } = await this.supabase
        .from('global_players')
        .update(playerData)
        .eq('id', playerId);
      if (gpError) throw gpError;
    }
    
    // Update club roster info
    if (Object.keys(rosterData).length > 0) {
      const { error: rosterError } = await this.supabase
        .from('club_roster')
        .update(rosterData)
        .eq('player_id', playerId)
        .eq('org_id', orgId);
      if (rosterError) throw rosterError;
    }
  }

  async removePlayerFromRoster(playerId: string) {
    const orgId = await this.getUserOrg();
    if (!orgId) throw new Error('No org context');
    const { error } = await this.supabase
      .from('club_roster')
      .update({ status: 'transferred' })
      .eq('player_id', playerId)
      .eq('org_id', orgId);
    if (error) throw error;
  }

  async clearAllData() {
    const orgId = await this.getUserOrg();
    if (!orgId) throw new Error('No org context');

    const { error: testsErr } = await this.supabase
      .from('player_tests')
      .delete()
      .eq('org_id', orgId);
    if (testsErr) throw testsErr;

    const { error: matchesErr } = await this.supabase
      .from('matches')
      .delete()
      .eq('org_id', orgId);
    if (matchesErr) throw matchesErr;

    const { error: rosterErr } = await this.supabase
      .from('club_roster')
      .delete()
      .eq('org_id', orgId);
    if (rosterErr) throw rosterErr;
  }

  // ==========================================
  // GAME ANALYTICS (Agnostic Structure)
  // ==========================================
  async getMatches(sportType: string = 'volleyball') {
    const orgId = await this.getUserOrg();
    if (!orgId) return [];

    const { data, error } = await this.supabase
      .from('matches')
      .select(`
        *,
        teams(name)
      `)
      .eq('org_id', orgId)
      .eq('sport_type', sportType)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async createMatch(matchData: any) {
    const orgId = await this.getUserOrg();
    if (!orgId) throw new Error('No org context');
    
    // Fetch default team if not provided in matchData
    let teamId = matchData.team_id;
    if (!teamId) {
      const teams = await this.getTeams();
      if (teams.length > 0) teamId = teams[0].id;
    }

    const { data, error } = await this.supabase
      .from('matches')
      .insert({ ...matchData, org_id: orgId, team_id: teamId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateMatch(matchId: string, matchData: any) {
    const orgId = await this.getUserOrg();
    const { data, error } = await this.supabase
      .from('matches')
      .update(matchData)
      .eq('id', matchId)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteMatch(matchId: string) {
    const orgId = await this.getUserOrg();
    const { error } = await this.supabase
      .from('matches')
      .delete()
      .eq('id', matchId)
      .eq('org_id', orgId);

    if (error) throw error;
  }

  async getMatchWithDetails(matchId: UUID) {
    // Nested query adapted to agnostic structure
    const { data, error } = await this.supabase
      .from('matches')
      .select(`
        *,
        teams(*),
        match_segments(
          *,
          match_subsegments(
            *,
            actions(*)
          )
        )
      `)
      .eq('id', matchId)
      .single();

    if (error) throw error;
    return data;
  }

  async getPhysicalTests(playerId?: UUID) {
    const orgId = await this.getUserOrg();
    if (!orgId) return [];

    let query = this.supabase
      .from('player_tests')
      .select('*')
      .eq('org_id', orgId)
      .order('date', { ascending: false });

    if (playerId) query = query.eq('player_id', playerId);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async createPhysicalTest(formData: any) {
    const orgId = await this.getUserOrg();
    const user  = await this.getCurrentUser();
    
    if (!orgId || !user) throw new Error(`Sin contexto: orgId=${orgId}, userId=${user?.id}`);

    const row = {
      org_id:        orgId,
      player_id:     formData.playerId,
      date:          formData.date,
      created_by:    user.id,
      source:        'official_coach',
      notes:         formData.notes || null,
      cmj:           formData.CMJ        ? parseFloat(formData.CMJ)        : null,
      sj:            formData.SJ         ? parseFloat(formData.SJ)         : null,
      abordaje:      formData.abordaje   ? parseFloat(formData.abordaje)   : null,
      vel_5m:        formData.vel5m      ? parseFloat(formData.vel5m)      : null,
      vel_10m:       formData.vel10m     ? parseFloat(formData.vel10m)     : null,
      t_test:        formData.tTest      ? parseFloat(formData.tTest)      : null,
      spike_speed:   formData.spikeSpeed ? parseFloat(formData.spikeSpeed) : null,
      serve_speed:   formData.serveSpeed ? parseFloat(formData.serveSpeed) : null,
      reaction_time: formData.reactionTime ? parseFloat(formData.reactionTime) : null,
      shoulder_rom:  formData.shoulderROM  ? parseFloat(formData.shoulderROM)  : null,
      ankle_rom:     formData.ankleROM     ? parseFloat(formData.ankleROM)     : null,
    };

    const { data, error } = await this.supabase
      .from('player_tests')
      .insert(row)
      .select()
      .single();

    if (error) {
      throw new Error(`Supabase: ${error.message} (code: ${error.code}, details: ${error.details})`);
    }
    
    return data;
  }

  async updatePhysicalTest(testId: string, formData: any) {
    const orgId = await this.getUserOrg();
    if (!orgId) throw new Error('Sin org');

    const updates: any = { updated_at: new Date().toISOString() };
    if (formData.date)          updates.date          = formData.date;
    if (formData.notes !== undefined) updates.notes   = formData.notes;
    if (formData.CMJ        !== undefined) updates.cmj           = formData.CMJ        ? parseFloat(formData.CMJ)        : null;
    if (formData.SJ         !== undefined) updates.sj            = formData.SJ         ? parseFloat(formData.SJ)         : null;
    if (formData.abordaje   !== undefined) updates.abordaje      = formData.abordaje   ? parseFloat(formData.abordaje)   : null;
    if (formData.vel5m      !== undefined) updates.vel_5m        = formData.vel5m      ? parseFloat(formData.vel5m)      : null;
    if (formData.vel10m     !== undefined) updates.vel_10m       = formData.vel10m     ? parseFloat(formData.vel10m)     : null;
    if (formData.tTest      !== undefined) updates.t_test        = formData.tTest      ? parseFloat(formData.tTest)      : null;
    if (formData.spikeSpeed !== undefined) updates.spike_speed   = formData.spikeSpeed ? parseFloat(formData.spikeSpeed) : null;
    if (formData.serveSpeed !== undefined) updates.serve_speed   = formData.serveSpeed ? parseFloat(formData.serveSpeed) : null;
    if (formData.reactionTime !== undefined) updates.reaction_time = formData.reactionTime ? parseFloat(formData.reactionTime) : null;
    if (formData.shoulderROM  !== undefined) updates.shoulder_rom  = formData.shoulderROM  ? parseFloat(formData.shoulderROM)  : null;
    if (formData.ankleROM     !== undefined) updates.ankle_rom     = formData.ankleROM     ? parseFloat(formData.ankleROM)     : null;

    const { data, error } = await this.supabase
      .from('player_tests')
      .update(updates)
      .eq('id', testId)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deletePhysicalTest(testId: string) {
    const orgId = await this.getUserOrg();
    const { error } = await this.supabase
      .from('player_tests')
      .delete()
      .eq('id', testId)
      .eq('org_id', orgId);
    if (error) throw error;
  }

  // Real-time subscriptions
  subscribeToMatch(matchId: UUID, callback: (payload: any) => void) {
    return this.supabase
      .channel(`match-${matchId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'actions',
        filter: `match_id=eq.${matchId}`
      }, callback)
      .subscribe();
  }
}

export const supabaseService = new SupabaseService();
export default supabaseService;