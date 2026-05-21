// Global Supabase Client - Single instance to prevent multiple GoTrueClient warnings
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

// Using real Supabase credentials
const supabaseUrl = `https://${projectId}.supabase.co`;
const supabaseKey = publicAnonKey;

// Create single global instance
const globalSupabaseClient = createSupabaseClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Export the single instance
export { globalSupabaseClient as supabase };

// Also export createClient for backward compatibility
export const createClient = () => globalSupabaseClient;