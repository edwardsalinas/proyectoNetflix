$version: "2"

metadata validators = [
    {
        name: "EmitEachSelector"
        id: "OperationInputOutputValidation"
        configuration: {
            selector: "operation :not(-[input]-> *)"
            messageTemplate: "Every operation must have an input shape."
        }
    }
]

namespace com.netflix.api

use aws.protocols#restJson1
use aws.auth#sigv4

/// Netflix Clone — API REST para gestión de catálogo de películas y listas de usuario.
/// Autenticación vía Bearer Token JWT (OIDC/Auth0).
@restJson1
@httpBearerAuth
@title("Netflix Clone API")
@paginated(inputToken: "nextToken", outputToken: "nextToken", pageSize: "maxResults")
service NetflixService {
    version: "2026-05-09"
    resources: [
        MovieResource
        GenreResource
        UserListResource
        WatchHistoryResource
        StreamSessionResource
    ]
    errors: [
        ValidationError
        UnauthorizedError
        ForbiddenError
        InternalServerError
    ]
}

// ─────────────────────────────────────────────────────────────────────────────
// RECURSO: Movie (Película)
// ─────────────────────────────────────────────────────────────────────────────

resource MovieResource {
    identifiers: { movieId: MovieId }
    create: CreateMovie
    read: GetMovie
    update: UpdateMovie
    delete: DeleteMovie
    list: ListMovies
}

// ── Tipos comunes ────────────────────────────────────────────────────────────

/// Identificador único de una película (UUID v4)
@pattern("^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")
@length(min: 36, max: 36)
string MovieId

/// Título de la película
@length(min: 1, max: 200)
string MovieTitle

/// Sinopsis o descripción de la película
@length(min: 0, max: 2000)
string Synopsis

/// Nombre del director
@length(min: 1, max: 100)
string DirectorName

/// Identificador del género (slug: e.g., "action", "drama")
@pattern("^[a-z][a-z0-9_-]{0,49}$")
@length(min: 1, max: 50)
@references([{resource: com.netflix.api#GenreResource}])
string GenreId

/// Nombre para mostrar del género
@length(min: 1, max: 100)
string GenreName

/// Año de lanzamiento
@range(min: 1888, max: 2030)
integer ReleaseYear

/// Duración en minutos
@range(min: 1, max: 1000)
integer DurationMinutes

/// Calificación promedio
@range(min: 0, max: 10)
float Rating

/// URL del poster
@pattern("^https?://.*$")
@length(min: 1, max: 2048)
string PosterUrl

/// Token de paginación
@length(min: 1, max: 1024)
string PaginationToken

/// Máximo de resultados por página
@range(min: 1, max: 100)
integer MaxResults

/// Timestamp ISO 8601
@pattern("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?Z$")
string Timestamp

/// Estado del video en el pipeline de transcodificación
enum VideoStatus {
    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    ERROR = "error"
}

/// Calidad de video disponible
enum VideoQuality {
    Q480P = "480p"
    Q720P = "720p"
    Q1080P = "1080p"
    Q4K = "4K"
}

/// Identificador único de una sesión de streaming (UUID v4)
@pattern("^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")
@length(min: 36, max: 36)
string SessionId

/// Estructura completa de una película
structure Movie {
    @required
    movieId: MovieId

    @required
    title: MovieTitle

    @required
    synopsis: Synopsis

    @required
    genreId: GenreId

    @required
    director: DirectorName

    @required
    releaseYear: ReleaseYear

    @required
    durationMinutes: DurationMinutes

    rating: Rating

    posterUrl: PosterUrl

    videoStatus: VideoStatus

    @required
    createdAt: Timestamp

    updatedAt: Timestamp
}

list MovieList {
    member: Movie
}

// ── Operaciones de Movie ─────────────────────────────────────────────────────

/// Crea una nueva película en el catálogo.
/// Requiere rol: content_admin o super_admin.
/// Scope requerido: catalog:write
@http(method: "POST", uri: "/v1/movies", code: 201)
operation CreateMovie {
    input: CreateMovieInput
    output: CreateMovieOutput
    errors: [
        ValidationError
        UnauthorizedError
        ForbiddenError
        ConflictError
    ]
}

@input
structure CreateMovieInput {
    @required
    title: MovieTitle

    @required
    synopsis: Synopsis

    @required
    genreId: GenreId

    @required
    director: DirectorName

    @required
    releaseYear: ReleaseYear

    @required
    durationMinutes: DurationMinutes

    rating: Rating

    posterUrl: PosterUrl
}

@output
structure CreateMovieOutput {
    @required
    movie: Movie
}

/// Obtiene los detalles de una película por su ID.
/// Scope requerido: catalog:read
@http(method: "GET", uri: "/v1/movies/{movieId}", code: 200)
@readonly
operation GetMovie {
    input: GetMovieInput
    output: GetMovieOutput
    errors: [
        UnauthorizedError
        NotFoundError
    ]
}

@input
structure GetMovieInput {
    @required
    @httpLabel
    movieId: MovieId
}

@output
structure GetMovieOutput {
    @required
    movie: Movie
}

/// Lista todas las películas del catálogo con filtros opcionales.
/// Soporta paginación y filtrado por género, director o año.
/// Scope requerido: catalog:read
@http(method: "GET", uri: "/v1/movies", code: 200)
@readonly
@paginated
operation ListMovies {
    input: ListMoviesInput
    output: ListMoviesOutput
    errors: [
        UnauthorizedError
        ValidationError
    ]
}

@input
structure ListMoviesInput {
    @httpQuery("genre")
    genre: GenreId

    @httpQuery("director")
    director: DirectorName

    @httpQuery("year")
    year: ReleaseYear

    @httpQuery("q")
    q: MovieTitle

    @httpQuery("nextToken")
    nextToken: PaginationToken

    @httpQuery("maxResults")
    maxResults: MaxResults
}

@output
structure ListMoviesOutput {
    @required
    items: MovieList

    nextToken: PaginationToken
}

/// Actualiza los datos de una película existente.
/// Requiere rol: content_admin o super_admin.
/// Scope requerido: catalog:write
@http(method: "PUT", uri: "/v1/movies/{movieId}", code: 200)
@idempotent
operation UpdateMovie {
    input: UpdateMovieInput
    output: UpdateMovieOutput
    errors: [
        ValidationError
        UnauthorizedError
        ForbiddenError
        NotFoundError
    ]
}

@input
structure UpdateMovieInput {
    @required
    @httpLabel
    movieId: MovieId

    title: MovieTitle
    synopsis: Synopsis
    genreId: GenreId
    director: DirectorName
    releaseYear: ReleaseYear
    durationMinutes: DurationMinutes
    rating: Rating
    posterUrl: PosterUrl
}

@output
structure UpdateMovieOutput {
    @required
    movie: Movie
}

/// Elimina una película del catálogo.
/// Requiere rol: super_admin.
/// Scope requerido: catalog:delete
@http(method: "DELETE", uri: "/v1/movies/{movieId}", code: 204)
@idempotent
operation DeleteMovie {
    input: DeleteMovieInput
    output: DeleteMovieOutput
    errors: [
        UnauthorizedError
        ForbiddenError
        NotFoundError
    ]
}

@input
structure DeleteMovieInput {
    @required
    @httpLabel
    movieId: MovieId
}

@output
structure DeleteMovieOutput {}

// ─────────────────────────────────────────────────────────────────────────────
// RECURSO: UserList (Mi Lista)
// ─────────────────────────────────────────────────────────────────────────────

/// Identificador único de usuario (derivado del claim 'sub' del JWT)
@length(min: 1, max: 128)
string UserId

resource UserListResource {
    identifiers: { userId: UserId }
    operations: [
        GetUserList
        AddToUserList
        RemoveFromUserList
    ]
}

/// Entrada en la lista de un usuario
structure UserListEntry {
    @required
    userId: UserId

    @required
    movieId: MovieId

    @required
    addedAt: Timestamp

    @length(min: 0, max: 500)
    notes: String
}

list UserListEntries {
    member: UserListEntry
}

/// Obtiene la lista personal de películas de un usuario.
/// El userId se valida contra el token JWT — solo el propietario o un super_admin puede acceder.
/// Scope requerido: mylist:read
@http(method: "GET", uri: "/v1/users/{userId}/lists", code: 200)
@readonly
operation GetUserList {
    input: GetUserListInput
    output: GetUserListOutput
    errors: [
        UnauthorizedError
        ForbiddenError
    ]
}

@input
structure GetUserListInput {
    @required
    @httpLabel
    userId: UserId
}

@output
structure GetUserListOutput {
    @required
    items: UserListEntries
}

/// Agrega una película a la lista personal del usuario.
/// El userId debe coincidir con el claim 'sub' del JWT.
/// Scope requerido: mylist:write
@http(method: "POST", uri: "/v1/users/{userId}/lists", code: 201)
operation AddToUserList {
    input: AddToUserListInput
    output: AddToUserListOutput
    errors: [
        ValidationError
        UnauthorizedError
        ForbiddenError
        NotFoundError
        ConflictError
    ]
}

@input
structure AddToUserListInput {
    @required
    @httpLabel
    userId: UserId

    @required
    movieId: MovieId

    @length(min: 0, max: 500)
    notes: String
}

@output
structure AddToUserListOutput {
    @required
    entry: UserListEntry
}

/// Elimina una película de la lista personal del usuario.
/// El userId debe coincidir con el claim 'sub' del JWT.
/// Scope requerido: mylist:write
@http(method: "DELETE", uri: "/v1/users/{userId}/lists/{movieId}", code: 204)
@idempotent
operation RemoveFromUserList {
    input: RemoveFromUserListInput
    output: RemoveFromUserListOutput
    errors: [
        UnauthorizedError
        ForbiddenError
        NotFoundError
    ]
}

@input
structure RemoveFromUserListInput {
    @required
    @httpLabel
    userId: UserId

    @required
    @httpLabel
    movieId: MovieId
}

@output
structure RemoveFromUserListOutput {}

// ─────────────────────────────────────────────────────────────────────────────
// ERRORES
// ─────────────────────────────────────────────────────────────────────────────

/// Error de validación de entrada (400 Bad Request)
@error("client")
@httpError(400)
structure ValidationError {
    @required
    message: String

    fieldErrors: FieldErrorList
}

list FieldErrorList {
    member: FieldError
}

structure FieldError {
    @required
    field: String

    @required
    message: String
}

/// Error de autenticación — token ausente, expirado o inválido (401 Unauthorized)
@error("client")
@httpError(401)
structure UnauthorizedError {
    @required
    message: String
}

/// Error de autorización — token válido pero sin permisos suficientes (403 Forbidden)
@error("client")
@httpError(403)
structure ForbiddenError {
    @required
    message: String

    /// El scope o rol requerido para esta operación
    requiredScope: String
}

/// Recurso no encontrado (404 Not Found)
@error("client")
@httpError(404)
structure NotFoundError {
    @required
    message: String

    /// Tipo del recurso no encontrado (e.g., "Movie", "UserList")
    resourceType: String

    /// ID del recurso no encontrado
    resourceId: String
}

/// Conflicto — recurso ya existe (409 Conflict)
@error("client")
@httpError(409)
structure ConflictError {
    @required
    message: String
}

/// Error interno del servidor (500 Internal Server Error)
@error("server")
@httpError(500)
structure InternalServerError {
    @required
    message: String
}

// ─────────────────────────────────────────────────────────────────────────────
// RECURSO: Genre (Géneros del catálogo)
// ─────────────────────────────────────────────────────────────────────────────

resource GenreResource {
    identifiers: { genreId: GenreId }
    read: GetGenre
    list: ListGenres
    operations: [ListMoviesByGenre]
}

/// Estructura de un género de contenido
structure Genre {
    @required
    genreId: GenreId

    @required
    name: GenreName

    description: String

    movieCount: Integer
}

list GenreList {
    member: Genre
}

/// Lista todos los géneros disponibles.
/// Scope requerido: catalog:read
@http(method: "GET", uri: "/v1/genres", code: 200)
@readonly
operation ListGenres {
    input: ListGenresInput
    output: ListGenresOutput
    errors: [
        UnauthorizedError
    ]
}

@input
structure ListGenresInput {}

@output
structure ListGenresOutput {
    @required
    items: GenreList
}

/// Obtiene un género por su ID.
/// Scope requerido: catalog:read
@http(method: "GET", uri: "/v1/genres/{genreId}", code: 200)
@readonly
operation GetGenre {
    input: GetGenreInput
    output: GetGenreOutput
    errors: [
        UnauthorizedError
        NotFoundError
    ]
}

@input
structure GetGenreInput {
    @required
    @httpLabel
    genreId: GenreId
}

@output
structure GetGenreOutput {
    @required
    genre: Genre
}

/// Lista películas filtradas por género.
/// Scope requerido: catalog:read
@http(method: "GET", uri: "/v1/genres/{genreId}/movies", code: 200)
@readonly
@paginated
operation ListMoviesByGenre {
    input: ListMoviesByGenreInput
    output: ListMoviesByGenreOutput
    errors: [
        UnauthorizedError
        NotFoundError
        ValidationError
    ]
}

@input
structure ListMoviesByGenreInput {
    @required
    @httpLabel
    genreId: GenreId

    @httpQuery("nextToken")
    nextToken: PaginationToken

    @httpQuery("maxResults")
    maxResults: MaxResults
}

@output
structure ListMoviesByGenreOutput {
    @required
    items: MovieList

    nextToken: PaginationToken
}

// ─────────────────────────────────────────────────────────────────────────────
// RECURSO: WatchHistory (Historial de reproducción)
// ─────────────────────────────────────────────────────────────────────────────

resource WatchHistoryResource {
    identifiers: { userId: UserId }
    operations: [
        GetWatchHistory
        UpdateWatchProgress
        DeleteWatchHistory
    ]
}

/// Entrada en el historial de visualización del usuario
structure WatchHistoryEntry {
    @required
    userId: UserId

    @required
    movieId: MovieId

    @required
    progressSeconds: Integer

    @required
    completed: Boolean

    @required
    lastWatchedAt: Timestamp
}

list WatchHistoryEntries {
    member: WatchHistoryEntry
}

/// Obtiene el historial de reproducción del usuario.
/// El userId se valida contra el token JWT — solo el propietario o super_admin pueden acceder.
/// Scope requerido: history:read
@http(method: "GET", uri: "/v1/users/{userId}/history", code: 200)
@readonly
operation GetWatchHistory {
    input: GetWatchHistoryInput
    output: GetWatchHistoryOutput
    errors: [
        UnauthorizedError
        ForbiddenError
    ]
}

@input
structure GetWatchHistoryInput {
    @required
    @httpLabel
    userId: UserId

    @httpQuery("completed")
    completed: Boolean

    @httpQuery("nextToken")
    nextToken: PaginationToken

    @httpQuery("maxResults")
    maxResults: MaxResults
}

@output
structure GetWatchHistoryOutput {
    @required
    items: WatchHistoryEntries

    nextToken: PaginationToken
}

/// Actualiza el progreso de reproducción de una película.
/// El userId debe coincidir con el claim 'sub' del JWT.
/// Scope requerido: history:write
@http(method: "PUT", uri: "/v1/users/{userId}/history/{movieId}", code: 200)
@idempotent
operation UpdateWatchProgress {
    input: UpdateWatchProgressInput
    output: UpdateWatchProgressOutput
    errors: [
        ValidationError
        UnauthorizedError
        ForbiddenError
        NotFoundError
    ]
}

@input
structure UpdateWatchProgressInput {
    @required
    @httpLabel
    userId: UserId

    @required
    @httpLabel
    movieId: MovieId

    @required
    @range(min: 0, max: 86400)
    progressSeconds: Integer

    completed: Boolean
}

@output
structure UpdateWatchProgressOutput {
    @required
    entry: WatchHistoryEntry
}

/// Elimina una entrada del historial de reproducción.
/// Scope requerido: history:write
@http(method: "DELETE", uri: "/v1/users/{userId}/history/{movieId}", code: 204)
@idempotent
operation DeleteWatchHistory {
    input: DeleteWatchHistoryInput
    output: DeleteWatchHistoryOutput
    errors: [
        UnauthorizedError
        ForbiddenError
        NotFoundError
    ]
}

@input
structure DeleteWatchHistoryInput {
    @required
    @httpLabel
    userId: UserId

    @required
    @httpLabel
    movieId: MovieId
}

@output
structure DeleteWatchHistoryOutput {}

// ─────────────────────────────────────────────────────────────────────────────
// RECURSO: StreamSession (Sesiones de streaming)
// ─────────────────────────────────────────────────────────────────────────────

resource StreamSessionResource {
    identifiers: { sessionId: SessionId }
    create: CreateStreamSession
    read: GetStreamSession
    delete: DeleteStreamSession
}

/// Sesión activa de streaming con URL firmada de CloudFront
structure StreamSession {
    @required
    sessionId: SessionId

    @required
    userId: UserId

    @required
    movieId: MovieId

    @required
    @length(min: 1, max: 2048)
    signedUrl: String

    @required
    quality: VideoQuality

    @required
    expiresAt: Timestamp

    @required
    createdAt: Timestamp
}

/// Inicia una sesión de streaming generando una URL firmada de CloudFront.
/// La calidad máxima depende del plan del usuario (maxQuality).
/// Scope requerido: catalog:read
@http(method: "POST", uri: "/v1/streaming/sessions", code: 201)
operation CreateStreamSession {
    input: CreateStreamSessionInput
    output: CreateStreamSessionOutput
    errors: [
        ValidationError
        UnauthorizedError
        ForbiddenError
        NotFoundError
    ]
}

@input
structure CreateStreamSessionInput {
    @required
    movieId: MovieId

    preferredQuality: VideoQuality
}

@output
structure CreateStreamSessionOutput {
    @required
    sessionId: SessionId

    @required
    signedUrl: String

    @required
    quality: VideoQuality

    @required
    expiresAt: Timestamp
}

/// Obtiene los detalles de una sesión de streaming activa.
/// Scope requerido: catalog:read
@http(method: "GET", uri: "/v1/streaming/sessions/{sessionId}", code: 200)
@readonly
operation GetStreamSession {
    input: GetStreamSessionInput
    output: GetStreamSessionOutput
    errors: [
        UnauthorizedError
        ForbiddenError
        NotFoundError
    ]
}

@input
structure GetStreamSessionInput {
    @required
    @httpLabel
    sessionId: SessionId
}

@output
structure GetStreamSessionOutput {
    @required
    session: StreamSession
}

/// Termina una sesión de streaming activa.
/// Scope requerido: catalog:read
@http(method: "DELETE", uri: "/v1/streaming/sessions/{sessionId}", code: 204)
@idempotent
operation DeleteStreamSession {
    input: DeleteStreamSessionInput
    output: DeleteStreamSessionOutput
    errors: [
        UnauthorizedError
        ForbiddenError
        NotFoundError
    ]
}

@input
structure DeleteStreamSessionInput {
    @required
    @httpLabel
    sessionId: SessionId
}

@output
structure DeleteStreamSessionOutput {}
