# Resumen de Mejoras — Netflix_Design_Doc.md

> **Estado:** PENDIENTE DE CONFIRMACIÓN  
> **Alcance:** Estandarización de nombres de entidades, query params y body fields a inglés

---

## Categorías de Cambios

### 1. API — Query Parameters (español → inglés)

| Ubicación | Actual | Propuesto |
|-----------|--------|-----------|
| `GET /v1/movies` | `?genero=` | `?genre=` |
| `GET /v1/movies` | `?anio=` | `?year=` |
| Diagrama de secuencia (flujo buscar) | `GET /v1/movies?genero=Accion` | `GET /v1/movies?genre=Action` |
| DynamoDB query en diagrama | `genero-index (genero = "Accion")` | `genre-index (genre = "Action")` |

---

### 2. API — Body Fields (español → inglés)

| Endpoint | Actual | Propuesto |
|----------|--------|-----------|
| `POST /v1/movies` body | `{ titulo, sinopsis, genero, director, anio, duracion, posterUrl }` | `{ title, synopsis, genre, director, year, duration, posterUrl }` |
| `PUT /v1/movies/{movieId}` body | `{ titulo?, sinopsis?, genero?, director?, anio?, duracion?, posterUrl? }` | `{ title?, synopsis?, genre?, director?, year?, duration?, posterUrl? }` |

---

### 3. DynamoDB — Nombres de Índices GSI (español → inglés)

| Tabla | Actual | Propuesto |
|-------|--------|-----------|
| `movies` | `genero-index` | `genre-index` |
| `movies` | `anio-index` | `year-index` |
| `movies` atributo GSI-PK | `GSI-PK (genero-index)` | `GSI-PK (genre-index)` |
| `movies` atributo GSI-PK | `GSI-PK (anio-index)` | `GSI-PK (year-index)` |

---

### 4. Diagrama ER — Relaciones (labels en español → inglés)

| Relación | Actual | Propuesto |
|----------|--------|-----------|
| User → UserList | `"tiene"` | `"has"` |
| User → WatchHistory | `"registra"` | `"records"` |
| User → StreamSession | `"inicia"` | `"starts"` |
| Movie → VideoAsset | `"tiene calidades"` | `"has qualities"` |
| Movie → UserList | `"aparece en"` | `"appears in"` |
| Movie → WatchHistory | `"fue vista"` | `"was watched"` |
| Movie → StreamSession | `"se reproduce"` | `"is streamed"` |
| Genre → Movie | `"clasifica"` | `"classifies"` |

---

### 5. Diagrama de Componentes (flowchart) — Labels en español → inglés

| Elemento | Actual | Propuesto |
|----------|--------|-----------|
| Subgraph clientes | `subgraph Clientes` | `subgraph Clients` |
| Subgraph auth | `subgraph Auth["Autenticación (Auth0)"]` | `subgraph Auth["Authentication (Auth0)"]` |
| Subgraph catálogo | `subgraph CatalogFns["Catálogo"]` | `subgraph CatalogFns["Catalog"]` |
| Subgraph usuario | `subgraph UserFns["Usuario"]` | `subgraph UserFns["User"]` |
| Subgraph persistencia | `subgraph Data["Persistencia"]` | `subgraph Data["Persistence"]` |
| Nodo DynamoDB películas | `DDB1[(DynamoDB - peliculas)]` | `DDB1[(DynamoDB - movies)]` |
| Nodo OpenSearch | `OS[(OpenSearch - búsqueda texto)]` | `OS[(OpenSearch - text search)]` |
| Edge label búsqueda | `L1 -.->|"búsqueda texto"| OS` | `L1 -.->|"text search"| OS` |

---

### 6. Diagramas de Secuencia (Mermaid) — Actores y mensajes en español → inglés

#### Flujo: Buscar Películas
| Actual | Propuesto |
|--------|-----------|
| `actor Usuario` | `actor User` |
| `Usuario->>Cliente: Buscar "Acción"` | `User->>Client: Search "Action"` |
| `participant Cliente as Cliente Web` | `participant Client as Web Client` |
| `Cliente-->>Usuario: Mostrar resultados` | `Client-->>User: Show results` |
| `Lambda->>DDB: Query genero-index (genero = "Accion")` | `Lambda->>DDB: Query genre-index (genre = "Action")` |

#### Flujo: Reproducir Película
| Actual | Propuesto |
|--------|-----------|
| `actor Usuario` | `actor User` |
| `participant Cliente as Cliente Web (HLS.js Player)` | `participant Client as Web Client (HLS.js Player)` |
| `Usuario->>Cliente: Click "Reproducir"` | `User->>Client: Click "Play"` |
| `Lambda->>DDB: Verificar película existe y videoStatus=ready` | `Lambda->>DDB: Verify movie exists and videoStatus=ready` |
| `Lambda->>DDB: Obtener maxQuality del usuario` | `Lambda->>DDB: Get user maxQuality` |
| `CF->>S3: Fetch HLS playlist` | (ya en inglés ✅) |
| `CF-->>Cliente: HLS manifest (calidades disponibles)` | `CF-->>Client: HLS manifest (available qualities)` |
| `loop Cada segmento de video` | `loop Each video segment` |
| `loop Cada 30 segundos` | `loop Every 30 seconds` |
| `Usuario->>Cliente: Pausa / Cierra` | `User->>Client: Pause / Close` |

#### Flujo: Agregar a Mi Lista
| Actual | Propuesto |
|--------|-----------|
| `actor Usuario` | `actor User` |
| `participant Cliente as Cliente Web` | `participant Client as Web Client` |
| `Usuario->>Cliente: Click "Agregar a Mi Lista"` | `User->>Client: Click "Add to My List"` |
| `APIGW->>APIGW: Validar JWT, extraer userId del token` | `APIGW->>APIGW: Validate JWT, extract userId from token` |
| `Lambda->>DDB: GetItem (verificar que la película existe)` | `Lambda->>DDB: GetItem (verify movie exists)` |
| `DDB-->>Lambda: Movie encontrada` | `DDB-->>Lambda: Movie found` |
| `Cliente-->>Usuario: Confirmación visual` | `Client-->>User: Visual confirmation` |

#### Flujo: Autenticación OIDC (Login)
| Actual | Propuesto |
|--------|-----------|
| `actor Usuario` | `actor User` |
| `participant Cliente as Cliente Web/Móvil` | `participant Client as Web/Mobile Client` |
| `participant APIGW as API Gateway (Resource Server)` | (ya en inglés ✅) |
| `Usuario->>Cliente: Click "Iniciar Sesión"` | `User->>Client: Click "Sign In"` |
| `Auth0->>Usuario: 2. Pantalla de Login (Auth0 Universal Login)` | `Auth0->>User: 2. Login Screen (Auth0 Universal Login)` |
| `Usuario->>Auth0: 3. Credenciales (email + password) o SSO (Google, GitHub)` | `User->>Auth0: 3. Credentials (email + password) or SSO (Google, GitHub)` |
| `Auth0-->>Cliente: 4. Authorization Code (redirect con ?code=...)` | `Auth0-->>Client: 4. Authorization Code (redirect with ?code=...)` |
| `Auth0-->>Cliente: 6. Tokens (ID Token + Access Token + Refresh Token)` | `Auth0-->>Client: 6. Tokens (ID Token + Access Token + Refresh Token)` |
| `Cliente->>Cliente: 7. Almacenar tokens de forma segura` | `Client->>Client: 7. Store tokens securely` |
| `Cliente->>APIGW: 8. API Request con Authorization: Bearer {access_token}` | `Client->>APIGW: 8. API Request with Authorization: Bearer {access_token}` |
| `APIGW->>APIGW: 9. Validar JWT (firma, expiración, audience, issuer)` | `APIGW->>APIGW: 9. Validate JWT (signature, expiry, audience, issuer)` |
| `APIGW-->>Cliente: 10. Respuesta del recurso protegido` | `APIGW-->>Client: 10. Protected resource response` |

---

## Resumen de Conteo de Cambios

| Categoría | # Cambios |
|-----------|-----------|
| Query Parameters | 4 |
| Body Fields | 10 |
| GSI Index Names | 4 |
| ER Diagram Relations | 8 |
| Component Diagram Labels | 8 |
| Sequence Diagram Messages | ~25 |
| **Total estimado** | **~59** |

---

## Elementos que NO requieren cambios (ya en inglés)

- Nombres de entidades: `User`, `Movie`, `VideoAsset`, `UserList`, `WatchHistory`, `StreamSession`, `Genre` ✅
- Nombres de tablas DynamoDB: `movies`, `video_assets`, `genres`, `user_lists`, `watch_history`, `stream_sessions` ✅
- Nombres de campos de entidades (camelCase inglés): `userId`, `movieId`, `genreId`, etc. ✅
- Paths de endpoints: `/v1/movies`, `/v1/genres`, `/v1/users`, `/v1/streaming/sessions` ✅
- Nombres de Lambda functions: `ListMoviesFn`, `GetMovieFn`, etc. ✅
- Roles RBAC: `viewer`, `premium_viewer`, `content_admin`, `super_admin` ✅
- Scopes OAuth2: `catalog:read`, `mylist:write`, `admin:read`, etc. ✅
- Índice GSI `director-index` ✅
- Tecnologías y servicios AWS mencionados ✅

---

*Documento generado para revisión — pendiente de confirmación para aplicar cambios en `Netflix_Design_Doc.md`*
