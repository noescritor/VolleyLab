import { projectId, publicAnonKey } from './supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-08892534`;

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Players API
  async getPlayers(): Promise<any[]> {
    const response = await this.request<{ players: any[] }>('/players');
    return response.players;
  }

  async createPlayer(playerData: any): Promise<any> {
    const response = await this.request<{ player: any }>('/players', {
      method: 'POST',
      body: JSON.stringify(playerData),
    });
    return response.player;
  }

  async updatePlayer(playerId: string, playerData: any): Promise<any> {
    const response = await this.request<{ player: any }>(`/players/${playerId}`, {
      method: 'PUT',
      body: JSON.stringify(playerData),
    });
    return response.player;
  }

  async deletePlayer(playerId: string): Promise<void> {
    await this.request(`/players/${playerId}`, {
      method: 'DELETE',
    });
  }

  // Matches API
  async getMatches(): Promise<any[]> {
    const response = await this.request<{ matches: any[] }>('/matches');
    return response.matches;
  }

  async createMatch(matchData: any): Promise<any> {
    const response = await this.request<{ match: any }>('/matches', {
      method: 'POST',
      body: JSON.stringify(matchData),
    });
    return response.match;
  }

  async updateMatch(matchId: string, matchData: any): Promise<any> {
    const response = await this.request<{ match: any }>(`/matches/${matchId}`, {
      method: 'PUT',
      body: JSON.stringify(matchData),
    });
    return response.match;
  }

  async deleteMatch(matchId: string): Promise<void> {
    await this.request(`/matches/${matchId}`, {
      method: 'DELETE',
    });
  }

  // Physical Tests API
  async getPhysicalTests(): Promise<any[]> {
    const response = await this.request<{ tests: any[] }>('/physical-tests');
    return response.tests;
  }

  async createPhysicalTest(testData: any): Promise<any> {
    const response = await this.request<{ test: any }>('/physical-tests', {
      method: 'POST',
      body: JSON.stringify(testData),
    });
    return response.test;
  }

  async updatePhysicalTest(testId: string, testData: any): Promise<any> {
    const response = await this.request<{ test: any }>(`/physical-tests/${testId}`, {
      method: 'PUT',
      body: JSON.stringify(testData),
    });
    return response.test;
  }

  async deletePhysicalTest(testId: string): Promise<void> {
    await this.request(`/physical-tests/${testId}`, {
      method: 'DELETE',
    });
  }

  // Initialize sample data
  async initializeSampleData(): Promise<{ players: any[], matches: any[] }> {
    const response = await this.request<{ players: any[], matches: any[] }>('/init-sample-data', {
      method: 'POST',
    });
    return response;
  }
}

export const apiService = new ApiService();