import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner@2.0.3';
import { supabase } from './supabase/globalClient';

export interface UserProfile {
  name: string;
  role: string;
  initials: string;
  avatarUrl: string | null;
  lastUpdated?: string;
}

interface UseUserProfileReturn {
  userProfile: UserProfile;
  isLoading: boolean;
  isInitialized: boolean;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const DEFAULT_PROFILE: UserProfile = {
  name: 'Usuario',
  role: 'Miembro',
  initials: 'US',
  avatarUrl: null
};

export function useUserProfile(): UseUserProfileReturn {
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUserProfile(DEFAULT_PROFILE);
        return;
      }

      // Obtener rol del club actual
      const currentOrgId = localStorage.getItem('currentOrgId');
      let role = 'Usuario';
      
      if (currentOrgId) {
        const { data: memberData } = await supabase
          .from('org_members')
          .select('rol')
          .eq('user_id', user.id)
          .eq('org_id', currentOrgId)
          .single();
        if (memberData) role = memberData.rol;
      }

      const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario';
      const initials = name.substring(0, 2).toUpperCase();

      setUserProfile({
        name,
        role,
        initials,
        avatarUrl: user.user_metadata?.avatar_url || null,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching profile from Supabase:', error);
      setUserProfile(DEFAULT_PROFILE);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: updates.name !== undefined ? updates.name : userProfile.name,
          avatar_url: updates.avatarUrl !== undefined ? updates.avatarUrl : userProfile.avatarUrl,
        }
      });

      if (error) throw error;
      
      setUserProfile(prev => ({ ...prev, ...updates }));
      toast.success('Perfil actualizado correctamente');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Error al guardar el perfil');
      throw error;
    }
  }, [userProfile]);

  const refreshProfile = useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return {
    userProfile,
    isLoading,
    isInitialized,
    updateProfile,
    refreshProfile
  };
}