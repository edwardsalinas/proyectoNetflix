import { apiClient } from './client';
import type { Movie } from './client';

interface RecommendationItem {
  movieId: string;
  title: string;
  posterUrl: string;
  genreId: string;
  director: string;
  durationMinutes: number;
}

function toMovie(item: RecommendationItem, genreMap: Record<string, string>): Movie {
  return {
    movieId: item.movieId,
    title: item.title,
    description: item.director || '',
    rating: 0,
    duration: `${item.durationMinutes} min`,
    genre: genreMap[item.genreId] || item.genreId || '',
    poster: item.posterUrl || null,
  };
}

export async function getRecommendations(
  userId: string,
  profileId: string,
  genreMap: Record<string, string>
): Promise<Movie[]> {
  const response = await apiClient.get<
    { items: RecommendationItem[] }
  >(`/users/${userId}/profiles/${profileId}/recommendations`);
  return (response.data.items || []).map(item => toMovie(item, genreMap));
}
