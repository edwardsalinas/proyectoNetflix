import { apiClient } from './client';
import type { Movie } from './client';

export interface GenreInfo {
  genreId: string;
  name: string;
}

interface ApiGenre {
  genreId: string;
  name: string;
}

interface ApiMovieItem {
  movieId: string;
  title: string;
  posterUrl: string;
  genreId: string;
}

let cachedItems: ApiGenre[] | null = null;

async function fetchGenres(): Promise<ApiGenre[]> {
  if (cachedItems) return cachedItems;
  const response = await apiClient.get<{ items: ApiGenre[] }>('/genres');
  cachedItems = response.data.items || [];
  return cachedItems;
}

export async function getGenres(): Promise<Record<string, string>> {
  const items = await fetchGenres();
  const map: Record<string, string> = {};
  for (const g of items) {
    map[g.genreId] = g.name;
  }
  return map;
}

export async function getGenreList(): Promise<GenreInfo[]> {
  const items = await fetchGenres();
  return items.map(g => ({ genreId: g.genreId, name: g.name }));
}

export async function getMoviesByGenre(genreId: string): Promise<Movie[]> {
  const response = await apiClient.get<{ items: ApiMovieItem[] }>(`/genres/${genreId}/movies`);
  const items = response.data.items || [];
  return items.map(item => ({
    movieId: item.movieId,
    title: item.title,
    description: '',
    rating: 0,
    duration: '',
    genre: item.genreId || '',
    poster: item.posterUrl || null,
  }));
}

export function clearGenresCache(): void {
  cachedItems = null;
}
