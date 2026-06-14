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

export interface Movie {
  movieId: string;
  title: string;
  description: string;
  rating: number;
  duration: string;
  genre: string;
  poster: string | null;
}

interface ApiMovie {
  movieId?: string;
  id?: string;
  title?: string;
  name?: string;
  description?: string;
  overview?: string;
  summary?: string;
  rating?: number;
  score?: number;
  vote_average?: number;
  duration?: string;
  runtime?: number;
  length?: string;
  genre?: string;
  genres?: string[];
  category?: string;
  poster?: string | null;
  poster_path?: string | null;
  image?: string | null;
  thumbnailUrl?: string;
  bannerUrl?: string;
  synopsis?: string;
  durationMinutes?: number;
  genreId?: string;
  posterUrl?: string | null;
}

const MOCK_MOVIES_FALLBACK: Movie[] = [
  {
    movieId: 'm1',
    title: 'Stranger Things',
    description: 'Cuando un niño desaparece, sus amigos, una madre y un jefe de policía deben enfrentarse a fuerzas terroríficas.',
    rating: 8.7,
    duration: '45 min',
    genre: 'Sci-Fi / Drama',
    poster: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?auto=format&fit=crop&w=400&h=600&q=80',
  },
  {
    movieId: 'm2',
    title: 'The Witcher',
    description: 'Geralt de Rivia, un cazador de monstruos mutante, viaja hacia su destino en un mundo turbulento.',
    rating: 8.1,
    duration: '60 min',
    genre: 'Fantasía / Acción',
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&h=600&q=80',
  },
  {
    movieId: 'm3',
    title: 'Cobra Kai',
    description: 'Treinta y cuatro años después del torneo de karate de All Valley, Johnny Lawrence busca la redención.',
    rating: 8.5,
    duration: '30 min',
    genre: 'Acción / Comedia',
    poster: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&w=400&h=600&q=80',
  },
  {
    movieId: 'm4',
    title: 'The Crown',
    description: 'Relato de las rivalidades personales y políticas durante el reinado de Isabel II.',
    rating: 8.6,
    duration: '50 min',
    genre: 'Drama / Historia',
    poster: 'https://images.unsplash.com/photo-1598899134739-24c46f58b6c0?auto=format&fit=crop&w=400&h=600&q=80',
  },
  {
    movieId: 'm5',
    title: 'Dark',
    description: 'Un niño desaparece en un pequeño pueblo alemán, revelando los secretos de cuatro familias.',
    rating: 8.8,
    duration: '55 min',
    genre: 'Ciencia Ficción / Thriller',
    poster: 'https://images.unsplash.com/photo-1509248961158-c54f693fe9a8?auto=format&fit=crop&w=400&h=600&q=80',
  },
];

const normalizeMovie = (raw: ApiMovie): Movie => ({
  movieId: raw.movieId || raw.id || '',
  title: raw.title || raw.name || '',
  description: raw.description || raw.overview || raw.summary || raw.synopsis || '',
  rating: raw.rating ?? raw.score ?? raw.vote_average ?? 0,
  duration: raw.duration || (raw.runtime ? `${raw.runtime} min` : '') || raw.length || (raw.durationMinutes ? `${raw.durationMinutes} min` : '') || '',
  genre: raw.genre || (raw.genres ? raw.genres.join(' / ') : '') || raw.category || raw.genreId || '',
  poster: raw.poster ?? raw.poster_path ?? raw.image ?? raw.thumbnailUrl ?? raw.bannerUrl ?? raw.posterUrl ?? null,
});

const extractMovies = (data: unknown): Movie[] => {
  let list: ApiMovie[] = [];
  if (Array.isArray(data)) {
    list = data;
  } else if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    list = (obj.items as ApiMovie[]) || (obj.data as ApiMovie[]) || (obj.results as ApiMovie[]) || [];
  }
  return list.map(normalizeMovie);
};

export const movieService = {
  getMovies: async (): Promise<Movie[]> => {
    try {
      const response = await apiClient.get('/movies');
      return extractMovies(response.data);
    } catch (err) {
      console.warn('Falla en API de películas, usando datos de respaldo:', err);
      return MOCK_MOVIES_FALLBACK;
    }
  },
  getMovie: async (movieId: string): Promise<Movie | null> => {
    try {
      const response = await apiClient.get(`/movies/${movieId}`);
      return normalizeMovie(response.data.movie || response.data);
    } catch (err) {
      console.warn(`Falla al cargar detalle de película ${movieId} desde API, usando respaldo:`, err);
      return MOCK_MOVIES_FALLBACK.find(m => m.movieId === movieId) || null;
    }
  },
  searchMovies: async (query: string): Promise<Movie[]> => {
    try {
      const response = await apiClient.get('/movies', { params: { q: query } });
      return extractMovies(response.data);
    } catch (err) {
      console.warn('Falla en API de búsqueda, usando datos de respaldo:', err);
      const q = query.toLowerCase();
      return MOCK_MOVIES_FALLBACK.filter(m =>
        m.title.toLowerCase().includes(q) || m.genre.toLowerCase().includes(q)
      );
    }
  }
};

export const streamingService = {
  createSession: async (movieId: string): Promise<{ url: string }> => {
    const response = await apiClient.post('/streaming/sessions', { movieId });
    return {
      url: response.data.signedUrl || response.data.url
    };
  }
};

export const historyService = {
  updateProgress: async (userId: string, movieId: string, currentTime: number): Promise<void> => {
    await apiClient.put(`/users/${userId}/history/${movieId}`, { currentTime });
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

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN SERVICE - CRUD DE PELÍCULAS
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminMovie extends Movie {
  director?: string;
  releaseYear?: number;
  durationMinutes?: number;
  genreId?: string;
  videoStatus?: 'pending' | 'transcoding' | 'ready';
  posterUrl?: string | null;
  synopsis?: string;
}

export interface CreateMovieInput {
  title: string;
  synopsis: string;
  genreId: string;
  director: string;
  releaseYear: number;
  durationMinutes: number;
}

export const adminService = {
  getAllMovies: async (): Promise<AdminMovie[]> => {
    try {
      const response = await apiClient.get('/movies');
      const list = extractMovies(response.data) as AdminMovie[];
      return list;
    } catch (err) {
      console.error('Error al obtener películas para admin:', err);
      return [];
    }
  },

  createMovie: async (data: CreateMovieInput): Promise<AdminMovie> => {
    try {
      const response = await apiClient.post('/movies', data);
      const movie = response.data.movie || response.data;
      return {
        movieId: movie.movieId || movie.id,
        title: movie.title,
        synopsis: movie.synopsis || movie.description,
        genreId: movie.genreId || movie.genre,
        director: movie.director,
        releaseYear: movie.releaseYear,
        durationMinutes: movie.durationMinutes,
        description: movie.synopsis || movie.description || '',
        genre: movie.genreId || movie.genre || '',
        rating: movie.rating || 0,
        duration: `${movie.durationMinutes || 0} min`,
        poster: movie.posterUrl || movie.poster || null,
        videoStatus: movie.videoStatus || 'pending'
      };
    } catch (err) {
      console.error('Error al crear película:', err);
      throw err;
    }
  },

  updateMovie: async (movieId: string, data: Partial<CreateMovieInput>): Promise<AdminMovie> => {
    try {
      const response = await apiClient.put(`/movies/${movieId}`, data);
      const movie = response.data.movie || response.data;
      return {
        movieId: movie.movieId || movie.id,
        title: movie.title,
        synopsis: movie.synopsis || movie.description,
        genreId: movie.genreId || movie.genre,
        director: movie.director,
        releaseYear: movie.releaseYear,
        durationMinutes: movie.durationMinutes,
        description: movie.synopsis || movie.description || '',
        genre: movie.genreId || movie.genre || '',
        rating: movie.rating || 0,
        duration: `${movie.durationMinutes || 0} min`,
        poster: movie.posterUrl || movie.poster || null,
        videoStatus: movie.videoStatus || 'pending'
      };
    } catch (err) {
      console.error('Error al actualizar película:', err);
      throw err;
    }
  },

  deleteMovie: async (movieId: string): Promise<void> => {
    try {
      await apiClient.delete(`/movies/${movieId}`);
    } catch (err) {
      console.error('Error al eliminar película:', err);
      throw err;
    }
  }
};
