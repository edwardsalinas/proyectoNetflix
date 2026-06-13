import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.netflix-clone.com/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let tokenGetter: (() => Promise<string | null>) | null = null;

export const setTokenGetter = (fn: () => Promise<string | null>) => {
  tokenGetter = fn;
};

apiClient.interceptors.request.use(
  async (config) => {
    if (tokenGetter) {
      try {
        const token = await tokenGetter();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (err) {
        console.error('Error fetching Auth0 token for API request:', err);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─────────────────────────────────────────────────────────────────────────────
// MOCK FALLBACK LAYER FOR PROFILES, REVIEWS, & CATALOG
// ─────────────────────────────────────────────────────────────────────────────

export interface Profile {
  profileId: string;
  name: string;
  avatarUrl: string;
}

export interface Review {
  reviewId: string;
  movieId: string;
  userId: string;
  profileId: string;
  profileName: string;
  rating: number; // 0-10
  comment: string;
  createdAt: string;
}

// Avatars predefinidos estilo Netflix
export const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80',
];

// Iniciar perfiles por defecto en LocalStorage si no existen
const getLocalProfiles = (userId: string): Profile[] => {
  const key = `netflix_profiles_${userId}`;
  const stored = localStorage.getItem(key);
  if (stored) return JSON.parse(stored);

  const defaults: Profile[] = [
    { profileId: 'p1', name: 'Edward', avatarUrl: DEFAULT_AVATARS[0] },
    { profileId: 'p2', name: 'Richard', avatarUrl: DEFAULT_AVATARS[1] },
    { profileId: 'p3', name: 'Jorge', avatarUrl: DEFAULT_AVATARS[2] },
    { profileId: 'p4', name: 'Estiven', avatarUrl: DEFAULT_AVATARS[3] },
  ];
  localStorage.setItem(key, JSON.stringify(defaults));
  return defaults;
};

const saveLocalProfiles = (userId: string, profiles: Profile[]) => {
  localStorage.setItem(`netflix_profiles_${userId}`, JSON.stringify(profiles));
};

const getLocalReviews = (movieId: string): Review[] => {
  const key = `netflix_reviews_${movieId}`;
  const stored = localStorage.getItem(key);
  if (stored) return JSON.parse(stored);

  // Reseñas por defecto ficticias
  const defaults: Review[] = [
    {
      reviewId: 'r1',
      movieId,
      userId: 'user1',
      profileId: 'p1',
      profileName: 'Edward',
      rating: 9,
      comment: '¡Increíble producción cinematográfica! Los efectos visuales son espectaculares.',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      reviewId: 'r2',
      movieId,
      userId: 'user2',
      profileId: 'p2',
      profileName: 'Richard',
      rating: 8,
      comment: 'Muy buena trama y desarrollo de personajes. Totalmente recomendada para el fin de semana.',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    }
  ];
  localStorage.setItem(key, JSON.stringify(defaults));
  return defaults;
};

const addLocalReview = (movieId: string, review: Review) => {
  const reviews = getLocalReviews(movieId);
  reviews.unshift(review);
  localStorage.setItem(`netflix_reviews_${movieId}`, JSON.stringify(reviews));
};

// ─────────────────────────────────────────────────────────────────────────────
// METODOS DEL CLIENTE CON FALLBACK MOCK
// ─────────────────────────────────────────────────────────────────────────────

export const profileService = {
  getProfiles: async (userId: string): Promise<Profile[]> => {
    try {
      const response = await apiClient.get(`/users/${userId}/profiles`);
      return response.data.items || response.data;
    } catch (err) {
      console.warn('Falla en la API de perfiles, utilizando fallback local:', err);
      return getLocalProfiles(userId);
    }
  },

  createProfile: async (userId: string, name: string, avatarUrl: string): Promise<Profile> => {
    const newProfile = { profileId: 'p_' + Math.random().toString(36).substring(2, 9), name, avatarUrl };
    try {
      const response = await apiClient.post(`/users/${userId}/profiles`, { name, avatarUrl });
      return response.data.profile || response.data;
    } catch (err) {
      console.warn('Falla en creación de perfil por API, utilizando fallback local:', err);
      const list = getLocalProfiles(userId);
      if (list.length >= 5) {
        throw new Error('Límite máximo de 5 perfiles alcanzado.');
      }
      list.push(newProfile);
      saveLocalProfiles(userId, list);
      return newProfile;
    }
  },

  deleteProfile: async (userId: string, profileId: string): Promise<void> => {
    try {
      await apiClient.delete(`/users/${userId}/profiles/${profileId}`);
    } catch (err) {
      console.warn('Falla al borrar perfil por API, actualizando fallback local:', err);
      const list = getLocalProfiles(userId);
      const filtered = list.filter(p => p.profileId !== profileId);
      saveLocalProfiles(userId, filtered);
    }
  }
};

export const reviewService = {
  getReviews: async (movieId: string): Promise<Review[]> => {
    try {
      const response = await apiClient.get(`/movies/${movieId}/reviews`);
      return response.data.items || response.data;
    } catch (err) {
      console.warn('Falla en la API de reseñas, utilizando fallback local:', err);
      return getLocalReviews(movieId);
    }
  },

  createReview: async (
    movieId: string, 
    userId: string, 
    profileId: string, 
    profileName: string, 
    rating: number, 
    comment: string
  ): Promise<Review> => {
    const newReview: Review = {
      reviewId: 'rev_' + Math.random().toString(36).substring(2, 9),
      movieId,
      userId,
      profileId,
      profileName,
      rating,
      comment,
      createdAt: new Date().toISOString(),
    };

    try {
      const response = await apiClient.post(`/movies/${movieId}/reviews`, {
        profileId,
        rating,
        comment,
      });
      return response.data.review || response.data;
    } catch (err) {
      console.warn('Falla en publicación de reseña por API, utilizando fallback local:', err);
      addLocalReview(movieId, newReview);
      return newReview;
    }
  }
};
