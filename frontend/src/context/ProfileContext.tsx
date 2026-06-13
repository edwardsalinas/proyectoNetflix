import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../auth/auth';
import { profileService } from '../api/client';
import type { Profile } from '../api/client';

interface ProfileContextType {
  activeProfile: Profile | null;
  profiles: Profile[];
  selectProfile: (profile: Profile) => void;
  createProfile: (name: string, avatarUrl: string) => Promise<Profile>;
  deleteProfile: (profileId: string) => Promise<void>;
  isLoadingProfiles: boolean;
  clearActiveProfile: () => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState<boolean>(false);

  const userId = user?.sub || 'anonymous_user';

  // Cargar perfiles al autenticarse
  useEffect(() => {
    if (isAuthenticated) {
      const loadProfiles = async () => {
        setIsLoadingProfiles(true);
        try {
          const items = await profileService.getProfiles(userId);
          setProfiles(items);
          
          // Restaurar perfil activo desde local storage si coincide con los perfiles cargados
          const cachedProfile = localStorage.getItem(`netflix_active_profile_${userId}`);
          if (cachedProfile) {
            const parsed = JSON.parse(cachedProfile) as Profile;
            if (items.some(p => p.profileId === parsed.profileId)) {
              setActiveProfile(parsed);
            }
          }
        } catch (err) {
          console.error('Error loading profiles:', err);
        } finally {
          setIsLoadingProfiles(false);
        }
      };
      loadProfiles();
    } else {
      setActiveProfile(null);
      setProfiles([]);
    }
  }, [isAuthenticated, userId]);

  const selectProfile = (profile: Profile) => {
    setActiveProfile(profile);
    localStorage.setItem(`netflix_active_profile_${userId}`, JSON.stringify(profile));
  };

  const createProfile = async (name: string, avatarUrl: string): Promise<Profile> => {
    if (profiles.length >= 5) {
      throw new Error('No puedes crear más de 5 perfiles.');
    }
    const newProfile = await profileService.createProfile(userId, name, avatarUrl);
    setProfiles(prev => [...prev, newProfile]);
    return newProfile;
  };

  const deleteProfile = async (profileId: string): Promise<void> => {
    await profileService.deleteProfile(userId, profileId);
    setProfiles(prev => prev.filter(p => p.profileId !== profileId));
    if (activeProfile?.profileId === profileId) {
      setActiveProfile(null);
      localStorage.removeItem(`netflix_active_profile_${userId}`);
    }
  };

  const clearActiveProfile = () => {
    setActiveProfile(null);
    localStorage.removeItem(`netflix_active_profile_${userId}`);
  };

  return (
    <ProfileContext.Provider value={{
      activeProfile,
      profiles,
      selectProfile,
      createProfile,
      deleteProfile,
      isLoadingProfiles,
      clearActiveProfile
    }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile debe usarse dentro de un ProfileProvider');
  }
  return context;
};
