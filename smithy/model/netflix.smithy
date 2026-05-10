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
        UserListResource
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

/// Género de la película
@length(min: 1, max: 50)
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
@pattern("^https?://.*")
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

/// Estructura completa de una película
structure Movie {
    @required
    movieId: MovieId

    @required
    titulo: MovieTitle

    @required
    sinopsis: Synopsis

    @required
    genero: GenreName

    @required
    director: DirectorName

    @required
    anio: ReleaseYear

    @required
    duracion: DurationMinutes

    rating: Rating

    posterUrl: PosterUrl

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
@idempotent
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
    titulo: MovieTitle

    @required
    sinopsis: Synopsis

    @required
    genero: GenreName

    @required
    director: DirectorName

    @required
    anio: ReleaseYear

    @required
    duracion: DurationMinutes

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
    @httpQuery("genero")
    genero: GenreName

    @httpQuery("director")
    director: DirectorName

    @httpQuery("anio")
    anio: ReleaseYear

    @httpQuery("titulo")
    titulo: MovieTitle

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

    titulo: MovieTitle
    sinopsis: Synopsis
    genero: GenreName
    director: DirectorName
    anio: ReleaseYear
    duracion: DurationMinutes
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
