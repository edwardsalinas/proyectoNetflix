export interface NetflixService {
    version: string;
}
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
export interface Genre {
    genreId: GenreId;
    name: GenreName;
}
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
export interface CreateMovieInput {
    title: MovieTitle;
    synopsis: Synopsis;
    genreId: GenreId;
    director: DirectorName;
    releaseYear: ReleaseYear;
    durationMinutes: DurationMinutes;
    rating?: Rating;
}
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
export interface ListMoviesInput {
    nextToken?: PaginationToken;
    maxResults?: MaxResults;
}
export interface ListMoviesOutput {
    movies: Movie[];
    nextToken?: PaginationToken;
}
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
export interface ApiResponse<T> {
    data?: T;
    error?: ValidationError | UnauthorizedError | ForbiddenError | InternalServerError;
    statusCode: number;
}
//# sourceMappingURL=types.d.ts.map