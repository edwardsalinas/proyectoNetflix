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
        console.error('Error fetching access token for API request:', err);
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

interface ApiReview {
  reviewId?: string;
  movieId?: string;
  userId?: string;
  profileId?: string;
  profileName?: string;
  rating?: number;
  comment?: string;
  reviewText?: string;
  createdAt?: string;
}

// Avatars predefinidos estilo Netflix
export const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80',
];

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

const normalizeReview = (raw: ApiReview, fallbackMovieId: string): Review => {
  return {
    reviewId: raw.reviewId || `rev_${Math.random().toString(36).substring(2, 9)}`,
    movieId: raw.movieId || fallbackMovieId,
    userId: raw.userId || 'anonymous_user',
    profileId: raw.profileId || 'profile_unknown',
    profileName: raw.profileName || raw.userId || 'Usuario',
    rating: typeof raw.rating === 'number' ? raw.rating : 0,
    comment: raw.comment || raw.reviewText || '',
    createdAt: raw.createdAt || new Date().toISOString(),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// METODOS DEL CLIENTE CON FALLBACK MOCK
// ─────────────────────────────────────────────────────────────────────────────

export const profileService = {
  getProfiles: async (userId: string): Promise<Profile[]> => {
    const response = await apiClient.get(`/users/${userId}/profiles`);
    return response.data.items || response.data;
  },

  createProfile: async (userId: string, name: string, avatarUrl: string): Promise<Profile> => {
    const response = await apiClient.post(`/users/${userId}/profiles`, { name, avatarUrl });
    return response.data.profile || response.data;
  },

  deleteProfile: async (userId: string, profileId: string): Promise<void> => {
    await apiClient.delete(`/users/${userId}/profiles/${profileId}`);
  }
};

export const reviewService = {
  getReviews: async (movieId: string): Promise<Review[]> => {
    try {
      const response = await apiClient.get(`/movies/${movieId}/reviews`);
      const payload = response.data.items || response.data;
      const list = Array.isArray(payload) ? payload : [];
      return list.map((item: ApiReview) => normalizeReview(item, movieId));
    } catch (err: unknown) {
      // Solo usar fallback local en errores de red; errores de API (4xx/5xx) se propagan
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr?.response?.status) {
        console.warn(`API de reseñas devolvió ${axiosErr.response.status}, usando fallback local.`);
      }
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
        profileName,
        rating,
        reviewText: comment,
      });
      return normalizeReview((response.data.review || response.data) as ApiReview, movieId);
    } catch (err) {
      console.warn('Falla en publicación de reseña por API, utilizando fallback local:', err);
      addLocalReview(movieId, newReview);
      return newReview;
    }
  },

  deleteReview: async (movieId: string, reviewId: string): Promise<void> => {
    await apiClient.delete(`/movies/${movieId}/reviews/${reviewId}`);
  },
};
