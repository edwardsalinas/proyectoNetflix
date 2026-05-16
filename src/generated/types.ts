// Netflix API - Generated TypeScript Types
// Auto-generated from Smithy model. Do not edit manually.

// Service Definition
export interface NetflixService {
  version: string;
}

// Movie Types
export type MovieId = string;
export type MovieTitle = string;
export type Synopsis = string;
export type DirectorName = string;
export type GenreId = string;
export type GenreName = string;
export type ReleaseYear = number;
export type DurationMinutes = number;
export type Rating = number;
export type PosterUrl = string;
export type PaginationToken = string;
export type MaxResults = number;

// Genre Types
export interface Genre {
  genreId: GenreId;
  name: GenreName;
}

// Movie Details
export interface Movie {
  movieId: MovieId;
  title: MovieTitle;
  synopsis: Synopsis;
  genreId: GenreId;
  director: DirectorName;
  releaseYear: ReleaseYear;
  durationMinutes: DurationMinutes;
  rating?: Rating;
  posterUrl?: PosterUrl;
  createdAt?: Date;
  updatedAt?: Date;
}

// Create Movie Input
export interface CreateMovieInput {
  title: MovieTitle;
  synopsis: Synopsis;
  genreId: GenreId;
  director: DirectorName;
  releaseYear: ReleaseYear;
  durationMinutes: DurationMinutes;
  rating?: Rating;
}

// Update Movie Input
export interface UpdateMovieInput {
  title?: MovieTitle;
  synopsis?: Synopsis;
  genreId?: GenreId;
  director?: DirectorName;
  releaseYear?: ReleaseYear;
  durationMinutes?: DurationMinutes;
  rating?: Rating;
  posterUrl?: PosterUrl;
}

// List Movies Input
export interface ListMoviesInput {
  nextToken?: PaginationToken;
  maxResults?: MaxResults;
}

// List Movies Output
export interface ListMoviesOutput {
  movies: Movie[];
  nextToken?: PaginationToken;
}

// User List Types
export type UserListId = string;
export type UserListName = string;

export interface UserList {
  userListId: UserListId;
  name: UserListName;
  movies: MovieId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserListInput {
  name: UserListName;
}

export interface UpdateUserListInput {
  name?: UserListName;
  movies?: MovieId[];
}

// Watch History
export interface WatchHistoryEntry {
  movieId: MovieId;
  watchedAt: Date;
  durationWatched?: DurationMinutes;
}

export interface ListWatchHistoryInput {
  nextToken?: PaginationToken;
  maxResults?: MaxResults;
}

export interface ListWatchHistoryOutput {
  entries: WatchHistoryEntry[];
  nextToken?: PaginationToken;
}

// Stream Session
export type SessionId = string;
export type StreamSessionToken = string;

export interface StreamSession {
  sessionId: SessionId;
  movieId: MovieId;
  token: StreamSessionToken;
  expiresAt: Date;
}

export interface InitiateStreamInput {
  movieId: MovieId;
}

// Error Types
export interface ValidationError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface UnauthorizedError {
  code: string;
  message: string;
}

export interface ForbiddenError {
  code: string;
  message: string;
}

export interface InternalServerError {
  code: string;
  message: string;
}

// API Response Wrapper
export interface ApiResponse<T> {
  data?: T;
  error?: ValidationError | UnauthorizedError | ForbiddenError | InternalServerError;
  statusCode: number;
}
