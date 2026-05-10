# Netflix Clone — Documento de Diseño Técnico

**ESTADO DEL DOCUMENTO:** EN REVISIÓN

**Equipo:** Edward Salinas, Richard Berna, Jorge Siles, Estiven Salinas
**Sistema Elegido:** Netflix — Plataforma de Streaming de Video
**Fecha de Entrega:** Mayo 2026
**Curso:** Diseño e Implementación de Sistemas

---

## Resumen

Netflix Clone es una **plataforma de streaming de video bajo demanda (VOD)** que permite a los usuarios explorar un catálogo de películas y series, reproducir contenido multimedia en tiempo real mediante streaming adaptativo (HLS/DASH), gestionar listas personalizadas y retomar la reproducción donde la dejaron ("Continuar Viendo"). El sistema está diseñado como una arquitectura serverless sobre AWS, utilizando API Gateway, Lambda, DynamoDB, S3, CloudFront y AWS Elemental MediaConvert como componentes centrales.

El objetivo principal es ofrecer una experiencia de streaming fluida y de baja latencia, con entrega de contenido global vía CDN, autenticación segura mediante OIDC/SSO, y un modelo de autorización basado en roles (RBAC) que diferencia entre espectadores gratuitos, usuarios premium con acceso a contenido HD/4K, y administradores de contenido.

## Supuestos

1. La infraestructura se despliega exclusivamente en AWS (us-east-1, con CDN global).
2. El contenido de video se almacena en S3, se transcodifica con AWS Elemental MediaConvert a múltiples calidades (480p, 720p, 1080p, 4K) en formato HLS, y se distribuye mediante CloudFront con URLs firmadas.
3. Los usuarios acceden a la plataforma desde navegadores web (HTML5 Video Player) y aplicaciones móviles.
4. Se utiliza Auth0 como proveedor de identidad (IdP) para SSO/OIDC.
5. El catálogo inicial contiene aproximadamente 10,000 títulos con contenido de video asociado.
6. El streaming utiliza protocolo HLS (HTTP Live Streaming) para compatibilidad multiplataforma con bitrate adaptativo (ABR).

## Alcance y Fases

**Fase 1 (Parte 1 — Actual):**
- Diseño del sistema completo y documento técnico
- Definición de API REST con Smithy
- Diseño de AuthN (OIDC) y AuthZ (RBAC)

**Fase 2:**
- Implementación del backend serverless (Lambda + DynamoDB)
- Integración con Auth0
- Pipeline de ingesta de video (S3 + MediaConvert)

**Fase 3:**
- Frontend web con video player (HLS.js) + CloudFront
- Sistema de "Continuar Viendo" y Historial
- Sistema de recomendaciones básico

**Fuera del alcance:**
- Streaming en vivo (Live Streaming)
- Sistema de pagos/suscripciones (billing)
- Chat en vivo / comentarios
- Descarga offline de contenido

---

## 1. Requerimientos

### 1.1 Requerimientos Funcionales

> **Prioridad P0 = Crítico | P1 = Importante | P2 = Deseable**

1. **[P0] Reproducir contenido en streaming:** Los usuarios deben poder reproducir películas y series en streaming con calidad adaptativa (480p/720p/1080p/4K según su plan y ancho de banda), para consumir contenido de video bajo demanda desde cualquier dispositivo.

2. **[P0] Explorar y buscar catálogo:** Los usuarios deben poder explorar el catálogo de películas y buscar por título, género, director o año de lanzamiento, para descubrir contenido relevante según sus preferencias.

3. **[P0] Continuar viendo y gestionar Mi Lista:** Los usuarios autenticados deben poder retomar la reproducción desde donde la dejaron ("Continuar Viendo"), y agregar/eliminar películas de su lista personal ("Mi Lista"), para una experiencia de consumo continua y personalizada.

4. **[P1] Administrar catálogo y contenido:** Los administradores de contenido deben poder crear, actualizar y eliminar películas del catálogo, incluyendo la carga de archivos de video que se transcodifican automáticamente a múltiples calidades para streaming.

### 1.2 Requerimientos No Funcionales

1. **Disponibilidad (CAP):** El sistema debe priorizar disponibilidad sobre consistencia fuerte (AP), garantizando un uptime de **99.9%** (≤ 8.76 horas de downtime/año). Justificación: un usuario que ve datos ligeramente desactualizados es preferible a un sistema caído.

2. **Latencia:** La búsqueda en el catálogo debe responder en **< 500 ms** (p99). El inicio de reproducción de video (time-to-first-byte) debe ser **< 3 segundos**. La carga de la página principal debe completarse en **< 2 segundos**.

3. **Escalabilidad:** El sistema debe soportar **100,000 DAU** (Usuarios Activos Diarios) con hasta **10,000 streams concurrentes**. Proporción lectura:escritura de **100:1** en la API. Debe escalar horizontalmente hasta 500K DAU sin cambios de arquitectura.

4. **Durabilidad:** Cero pérdida de datos en el catálogo, archivos de video y listas de usuarios. Los archivos de video se almacenan con redundancia S3 Standard (99.999999999% durabilidad). Respaldos automáticos cada 24 horas.

5. **Seguridad:** Cumplimiento de OWASP Top 10. Cifrado en tránsito (TLS 1.3) y en reposo (AES-256). URLs de streaming firmadas con CloudFront (expiración 4 horas). Tokens JWT con rotación automática. Sin secretos hardcodeados. Protección DRM básica con tokens firmados.

### 1.3 Estimación de Capacidad

```
DAU:          100,000 usuarios
Sesiones/día: 2 por usuario = 200,000 sesiones/día

── API (Metadata) ──────────────────────────────────────────
Lecturas (catálogo + listas + historial):
  200,000 sesiones × 15 requests/sesión = 3,000,000 lecturas/día
  3,000,000 / 86,400 = ~35 QPS (lectura)
  Pico (3x): ~105 QPS

Escrituras (Mi Lista, progreso de reproducción, historial):
  200,000 sesiones × 2 writes/sesión = 400,000 escrituras/día
  400,000 / 86,400 = ~5 QPS
  Pico: ~15 QPS

── Streaming (Video) ───────────────────────────────────────
Streams concurrentes (pico):
  100,000 DAU × 10% concurrente = 10,000 streams simultáneos

Ancho de banda de video:
  10,000 streams × 5 Mbps (promedio 1080p) = 50 Gbps
  Servido por CloudFront CDN (edge locations globales)

── Almacenamiento ──────────────────────────────────────────
DynamoDB:
  10,000 películas × 2 KB = 20 MB (catálogo)
  100,000 usuarios × 50 películas × 100 bytes = 500 MB (listas)
  100,000 usuarios × 200 registros historial × 200 bytes = 4 GB (watch history)
  Total DynamoDB: < 5 GB

S3 (Video):
  10,000 títulos × 3 GB promedio (multi-calidad HLS) = 30 TB
  Costo S3: ~$690/mes (Standard)

Ancho de banda API (sin video):
  105 QPS × 5 KB = 525 KB/s = ~45 GB/día
```

---

## 2. Entidades Principales

- **User** — Usuario registrado en la plataforma
- **Movie** — Película o serie del catálogo con contenido de video asociado
- **VideoAsset** — Archivo de video transcodificado en múltiples calidades (HLS)
- **UserList** — Lista personal de un usuario ("Mi Lista")
- **WatchHistory** — Registro de reproducción con progreso ("Continuar Viendo")
- **StreamSession** — Sesión activa de streaming con URL firmada
- **Genre** — Categoría/género de contenido

### Detalle de Campos

| Entidad | Campo | Tipo | Descripción |
|---------|-------|------|-------------|
| **User** | userId | UUID (string) | Identificador único |
| | email | string | Correo electrónico (único) |
| | displayName | string | Nombre para mostrar |
| | role | enum | `viewer`, `premium_viewer`, `content_admin`, `super_admin` |
| | maxQuality | enum | `480p`, `720p`, `1080p`, `4K` — según plan |
| | createdAt | ISO 8601 timestamp | Fecha de registro |
| **Movie** | id | UUID (string) | Identificador único |
| | titulo | string | Título de la película |
| | sinopsis | string | Descripción del contenido |
| | genero | string | Género principal |
| | director | string | Director |
| | anio | integer | Año de lanzamiento |
| | duracion | integer | Duración en minutos |
| | rating | float | Calificación promedio (0.0–10.0) |
| | posterUrl | string (URL) | URL del poster (CloudFront) |
| | trailerUrl | string (URL) | URL del trailer (CloudFront HLS) |
| | videoStatus | enum | `pending`, `processing`, `ready`, `error` |
| | createdAt | ISO 8601 timestamp | Fecha de creación del registro |
| **VideoAsset** | movieId | UUID (string) | FK → Movie |
| | quality | enum | `480p`, `720p`, `1080p`, `4K` |
| | hlsPlaylistUrl | string (URL) | URL del manifest HLS (.m3u8) en S3 |
| | fileSizeBytes | long | Tamaño del archivo de video |
| | bitrateKbps | integer | Bitrate del stream |
| | createdAt | ISO 8601 timestamp | Fecha de transcodificación |
| **UserList** | userId | UUID (string) | FK → User |
| | movieId | UUID (string) | FK → Movie |
| | addedAt | ISO 8601 timestamp | Fecha en que se agregó |
| | notes | string (opcional) | Notas personales |
| **WatchHistory** | userId | UUID (string) | FK → User |
| | movieId | UUID (string) | FK → Movie |
| | progressSeconds | integer | Segundo de reproducción actual |
| | completed | boolean | Si terminó de ver el contenido |
| | lastWatchedAt | ISO 8601 timestamp | Última vez que reprodujo |
| **StreamSession** | sessionId | UUID (string) | ID de sesión de streaming |
| | userId | UUID (string) | FK → User |
| | movieId | UUID (string) | FK → Movie |
| | signedUrl | string (URL) | URL firmada de CloudFront (expira en 4h) |
| | quality | enum | Calidad seleccionada/máxima permitida |
| | expiresAt | ISO 8601 timestamp | Expiración de la URL firmada |
| | createdAt | ISO 8601 timestamp | Inicio de sesión de streaming |
| **Genre** | genreId | string | Identificador del género |
| | name | string | Nombre del género |
| | description | string | Descripción |

### Diagrama Entidad-Relación


```mermaid
erDiagram
    User {
        string userId PK
        string email UK
        string displayName
        enum role
        enum maxQuality
        timestamp createdAt
    }

    Movie {
        string id PK
        string titulo
        string sinopsis
        string genero FK
        string director
        int anio
        int duracion
        float rating
        string posterUrl
        string trailerUrl
        enum videoStatus
        timestamp createdAt
    }

    VideoAsset {
        string movieId PK,FK
        enum quality PK
        string hlsPlaylistUrl
        long fileSizeBytes
        int bitrateKbps
        timestamp createdAt
    }

    UserList {
        string userId PK,FK
        string movieId PK,FK
        timestamp addedAt
        string notes
    }

    WatchHistory {
        string userId PK,FK
        string movieId PK,FK
        int progressSeconds
        boolean completed
        timestamp lastWatchedAt
    }

    StreamSession {
        string sessionId PK
        string userId FK
        string movieId FK
        string signedUrl
        enum quality
        timestamp expiresAt
    }

    Genre {
        string genreId PK
        string name
        string description
    }

    User ||--o{ UserList : "tiene"
    User ||--o{ WatchHistory : "registra"
    User ||--o{ StreamSession : "inicia"
    Movie ||--o{ VideoAsset : "tiene calidades"
    Movie ||--o{ UserList : "aparece en"
    Movie ||--o{ WatchHistory : "fue vista"
    Movie ||--o{ StreamSession : "se reproduce"
    Genre ||--o{ Movie : "clasifica"
```

---

## 3. API o Interfaz del Sistema

> Protocolo elegido: **REST** — Es la opción predeterminada para APIs públicas con operaciones CRUD. Ofrece simplicidad, cacheo con HTTP y amplio soporte en clientes.

### Endpoints del Catálogo de Películas

```
GET    /v1/movies                    → Lista películas (con filtros opcionales)
       Query params: ?genero=, ?director=, ?anio=, ?titulo=, ?page=, ?limit=
       Response: 200 OK { items: Movie[], nextToken?: string }

POST   /v1/movies                    → Crear película [content_admin+]
       Body: { titulo, sinopsis, genero, director, anio, duracion, posterUrl }
       Response: 201 Created { movie: Movie }

GET    /v1/movies/{movieId}          → Obtener película por ID
       Response: 200 OK { movie: Movie }

PUT    /v1/movies/{movieId}          → Actualizar película [content_admin+]
       Body: { titulo?, sinopsis?, genero?, director?, anio?, duracion?, posterUrl? }
       Response: 200 OK { movie: Movie }

DELETE /v1/movies/{movieId}          → Eliminar película [super_admin]
       Response: 204 No Content
```

### Endpoints de Streaming y Reproducción

```
POST   /v1/streaming/sessions        → Iniciar sesión de streaming [authenticated]
       Body: { movieId, preferredQuality? }
       Response: 201 Created { sessionId, signedUrl, quality, expiresAt }
       Nota: Genera una URL firmada de CloudFront (4h TTL).
             La calidad máxima depende del plan del usuario (maxQuality).

GET    /v1/streaming/sessions/{sessionId} → Obtener sesión activa
       Response: 200 OK { session: StreamSession }

DELETE /v1/streaming/sessions/{sessionId} → Terminar sesión de streaming
       Response: 204 No Content
```

### Endpoints de Historial y Progreso ("Continuar Viendo")

```
GET    /v1/users/{userId}/history     → Historial de reproducción [owner]
       Query params: ?completed=false (para "Continuar Viendo")
       Response: 200 OK { items: WatchHistoryEntry[] }

PUT    /v1/users/{userId}/history/{movieId} → Actualizar progreso [owner]
       Body: { progressSeconds, completed? }
       Response: 200 OK { entry: WatchHistoryEntry }
       Nota: Se actualiza automáticamente durante la reproducción (cada 30s).

DELETE /v1/users/{userId}/history/{movieId} → Eliminar del historial [owner]
       Response: 204 No Content
```

### Endpoints de Mi Lista

```
GET    /v1/users/{userId}/lists      → Obtener Mi Lista [owner o admin]
       Response: 200 OK { items: UserListEntry[] }

POST   /v1/users/{userId}/lists      → Agregar película a Mi Lista [owner]
       Body: { movieId, notes? }
       Response: 201 Created { entry: UserListEntry }

DELETE /v1/users/{userId}/lists/{movieId} → Eliminar de Mi Lista [owner]
       Response: 204 No Content
```

### Códigos de Error

| Código | Significado | Cuándo |
|--------|-------------|--------|
| 400 | Bad Request | Validación fallida (campos faltantes, formatos inválidos) |
| 401 | Unauthorized | Token ausente o expirado |
| 403 | Forbidden | Token válido pero sin permisos suficientes |
| 404 | Not Found | Recurso no existe |
| 409 | Conflict | Película ya existe en Mi Lista |
| 500 | Internal Server Error | Error inesperado del servidor |

---

## 4. Flujo de Datos

### Flujo Principal: Buscar Películas

```mermaid
sequenceDiagram
    actor Usuario
    participant Cliente as Cliente Web
    participant APIGW as API Gateway
    participant Lambda as Lambda Function
    participant DDB as DynamoDB

    Usuario->>Cliente: Buscar "Acción"
    Cliente->>APIGW: GET /v1/movies?genero=Accion
    APIGW->>APIGW: Validar token JWT (Authorization header)
    APIGW->>Lambda: Invocar ListMoviesFn
    Lambda->>DDB: Query genero-index (genero = "Accion")
    DDB-->>Lambda: Items[]
    Lambda-->>APIGW: 200 OK { items: Movie[] }
    APIGW-->>Cliente: JSON Response
    Cliente-->>Usuario: Mostrar resultados
```

### Flujo: Reproducir Película (Streaming)

```mermaid
sequenceDiagram
    actor Usuario
    participant Cliente as Cliente Web (HLS.js Player)
    participant APIGW as API Gateway
    participant Lambda as Lambda Function
    participant DDB as DynamoDB
    participant CF as CloudFront CDN
    participant S3 as S3 (Video HLS)

    Usuario->>Cliente: Click "Reproducir"
    Cliente->>APIGW: POST /v1/streaming/sessions (Bearer token)
    APIGW->>Lambda: Invocar CreateStreamSessionFn
    Lambda->>DDB: Verificar película existe y videoStatus=ready
    Lambda->>DDB: Obtener maxQuality del usuario
    Lambda->>Lambda: Generar CloudFront Signed URL (4h TTL)
    Lambda->>DDB: PutItem (StreamSession)
    Lambda-->>APIGW: 201 { signedUrl, quality, expiresAt }
    APIGW-->>Cliente: StreamSession con URL firmada
    Cliente->>CF: GET manifest.m3u8 (URL firmada)
    CF->>S3: Fetch HLS playlist
    S3-->>CF: .m3u8 manifest
    CF-->>Cliente: HLS manifest (calidades disponibles)
    loop Cada segmento de video
        Cliente->>CF: GET segmento.ts (URL firmada)
        CF-->>Cliente: Video segment (cached at edge)
    end
    loop Cada 30 segundos
        Cliente->>APIGW: PUT /v1/users/{userId}/history/{movieId}
        APIGW->>Lambda: Actualizar progreso
        Lambda->>DDB: UpdateItem (progressSeconds)
    end
    Usuario->>Cliente: Pausa / Cierra
    Cliente->>APIGW: DELETE /v1/streaming/sessions/{sessionId}
```

### Flujo: Agregar Película a Mi Lista

```mermaid
sequenceDiagram
    actor Usuario
    participant Cliente as Cliente Web
    participant APIGW as API Gateway
    participant Lambda as Lambda Function
    participant DDB as DynamoDB

    Usuario->>Cliente: Click "Agregar a Mi Lista"
    Cliente->>APIGW: POST /v1/users/{userId}/lists (Bearer token)
    APIGW->>APIGW: Validar JWT, extraer userId del token
    APIGW->>Lambda: Invocar AddToListFn
    Lambda->>DDB: GetItem (verificar que la película existe)
    DDB-->>Lambda: Movie encontrada
    Lambda->>DDB: PutItem (UserList entry)
    DDB-->>Lambda: OK
    Lambda-->>APIGW: 201 Created
    APIGW-->>Cliente: { entry: UserListEntry }
    Cliente-->>Usuario: Confirmación visual
```

### Flujo: Autenticación OIDC (Login)

```mermaid
sequenceDiagram
    actor Usuario
    participant Cliente as Cliente Web/Móvil
    participant Auth0 as Auth0 (Authorization Server)
    participant APIGW as API Gateway (Resource Server)

    Usuario->>Cliente: Click "Iniciar Sesión"
    Cliente->>Auth0: 1. Authorization Request (Authorization Code Flow + PKCE)
    Note right of Cliente: GET /authorize?response_type=code&client_id=...&redirect_uri=...&scope=openid profile email&code_challenge=...
    Auth0->>Usuario: 2. Pantalla de Login (Auth0 Universal Login)
    Usuario->>Auth0: 3. Credenciales (email + password) o SSO (Google, GitHub)
    Auth0-->>Cliente: 4. Authorization Code (redirect con ?code=...)
    Cliente->>Auth0: 5. Token Request (POST /oauth/token)
    Note right of Cliente: code + code_verifier + client_id + redirect_uri
    Auth0-->>Cliente: 6. Tokens (ID Token + Access Token + Refresh Token)
    Cliente->>Cliente: 7. Almacenar tokens de forma segura
    Cliente->>APIGW: 8. API Request con Authorization: Bearer {access_token}
    APIGW->>APIGW: 9. Validar JWT (firma, expiración, audience, issuer)
    APIGW-->>Cliente: 10. Respuesta del recurso protegido
```

---

## 5. Diseño de Alto Nivel

### Diagrama de Componentes

```mermaid
flowchart TD
    subgraph Clientes
        WEB["Cliente Web - React/SPA + HLS.js Video Player"]
        MOB[Cliente Móvil]
    end

    subgraph Auth["Autenticación (Auth0)"]
        IDP[Auth0 IdP]
        JWKS[JWKS Endpoint]
    end

    subgraph AWS["AWS Cloud (us-east-1)"]
        CF["CloudFront CDN (URLs Firmadas)"]
        S3WEB[S3 - Static Web Assets]
        S3VID["S3 - Video Storage (HLS segments)"]
        MC["AWS Elemental MediaConvert"]
        APIGW[API Gateway REST]

        subgraph Lambdas["Lambda Functions"]
            subgraph CatalogFns["Catálogo"]
                L1[ListMoviesFn]
                L2[GetMovieFn]
                L3[CreateMovieFn]
                L4[UpdateMovieFn]
                L5[DeleteMovieFn]
            end
            subgraph StreamFns["Streaming"]
                L9[CreateStreamSessionFn]
                L10[GetStreamSessionFn]
                L11[EndStreamSessionFn]
            end
            subgraph UserFns["Usuario"]
                L6[GetUserListFn]
                L7[AddToListFn]
                L8[RemoveFromListFn]
                L12[GetWatchHistoryFn]
                L13[UpdateProgressFn]
            end
        end

        subgraph Data["Persistencia"]
            DDB1[(DynamoDB - peliculas)]
            DDB2[(DynamoDB - user_lists)]
            DDB3[(DynamoDB - watch_history)]
            DDB4[(DynamoDB - stream_sessions)]
        end
    end

    WEB --> CF
    MOB --> APIGW
    CF --> S3WEB
    CF --> S3VID
    CF --> APIGW
    WEB --> IDP
    MOB --> IDP
    APIGW --> JWKS
    APIGW --> L1 & L2 & L3 & L4 & L5
    APIGW --> L6 & L7 & L8 & L12 & L13
    APIGW --> L9 & L10 & L11
    L1 & L2 --> DDB1
    L3 --> DDB1
    L3 -.->|"trigger transcode"| MC
    MC --> S3VID
    L9 --> DDB1
    L9 --> DDB4
    L9 -.->|"generate signed URL"| CF
    L12 & L13 --> DDB3
    L6 & L7 & L8 --> DDB2
```

### Decisiones de Diseño Clave

Las decisiones técnicas principales se documentan en la sección **Temas de Discusión** al final de este documento.

---

## 6. Inmersiones Profundas

### 6.1 Esquema de Base de Datos

#### Tabla: `peliculas` (DynamoDB)

| Atributo | Tipo | Key | Descripción |
|----------|------|-----|-------------|
| id | S (String) | PK | UUID del título |
| titulo | S | — | Título de la película |
| sinopsis | S | — | Descripción |
| genero | S | GSI-PK (genero-index) | Género principal |
| director | S | GSI-PK (director-index) | Director |
| anio | N (Number) | GSI-PK (anio-index) | Año de lanzamiento |
| duracion | N | — | Duración en minutos |
| rating | N | — | Calificación (0.0–10.0) |
| posterUrl | S | — | URL del poster (CloudFront) |
| trailerUrl | S | — | URL del trailer HLS (CloudFront) |
| videoStatus | S | — | `pending`, `processing`, `ready`, `error` |
| createdAt | S | — | ISO 8601 timestamp |
| updatedAt | S | — | ISO 8601 timestamp |

#### Tabla: `video_assets` (DynamoDB)

| Atributo | Tipo | Key | Descripción |
|----------|------|-----|-------------|
| movieId | S (String) | PK | FK → peliculas.id |
| quality | S (String) | SK | `480p`, `720p`, `1080p`, `4K` |
| hlsPlaylistUrl | S | — | URL del manifest HLS (.m3u8) en S3 |
| fileSizeBytes | N | — | Tamaño del archivo |
| bitrateKbps | N | — | Bitrate del stream |
| createdAt | S | — | ISO 8601 timestamp |

#### Tabla: `user_lists` (DynamoDB)

| Atributo | Tipo | Key | Descripción |
|----------|------|-----|-------------|
| userId | S (String) | PK | UUID del usuario (derivado del JWT `sub` claim) |
| movieId | S (String) | SK | UUID de la película |
| addedAt | S | — | ISO 8601 timestamp |
| notes | S | — | Notas personales (opcional) |

> **Patrón de acceso principal:** `userId` (PK) + `movieId` (SK) permite: (1) obtener toda la lista de un usuario con Query por PK, y (2) verificar/eliminar un ítem específico con GetItem por PK+SK.

#### Tabla: `watch_history` (DynamoDB)

| Atributo | Tipo | Key | Descripción |
|----------|------|-----|-------------|
| userId | S (String) | PK | UUID del usuario (derivado del JWT `sub` claim) |
| movieId | S (String) | SK | UUID de la película |
| progressSeconds | N (Number) | — | Segundo actual de reproducción |
| completed | BOOL | — | Si terminó de ver el contenido |
| lastWatchedAt | S | GSI-PK (recent-index) | Última vez que reprodujo |

> **Patrón de acceso:** Query por `userId` con `ScanIndexForward=false` en `recent-index` para obtener "Continuar Viendo" (últimas vistas, `completed=false`).

#### Tabla: `stream_sessions` (DynamoDB)

| Atributo | Tipo | Key | Descripción |
|----------|------|-----|-------------|
| sessionId | S (String) | PK | UUID de la sesión de streaming |
| userId | S (String) | GSI-PK (user-index) | UUID del usuario |
| movieId | S (String) | — | UUID de la película |
| signedUrl | S | — | URL firmada de CloudFront |
| quality | S | — | Calidad del stream (`480p`, `720p`, `1080p`, `4K`) |
| expiresAt | S | — | Expiración de la URL firmada (TTL) |
| createdAt | S | — | Inicio de la sesión |

> **TTL habilitado** en `expiresAt` para limpieza automática de sesiones expiradas.

### 6.2 Escalabilidad e Infraestructura

- **DynamoDB on-demand**: Escala automáticamente según la demanda; sin necesidad de provisionar capacidad.
- **Lambda**: Escala horizontalmente con concurrencia automática (hasta 1000 instancias concurrentes por defecto).
- **CloudFront**: CDN global con 400+ edge locations para entrega de video con baja latencia. URLs firmadas para protección de contenido.
- **S3**: Almacenamiento de video con redundancia 11 9's. Lifecycle policies para mover contenido poco accedido a S3 Infrequent Access.
- **MediaConvert**: Transcodificación serverless a múltiples calidades HLS. Se activa mediante evento S3 al subir video fuente.
- **API Gateway**: Throttling configurable (10,000 RPS por defecto), WAF para protección DDoS.

**Estimación de costos mensuales (100K DAU):**

```
Lambda:       105 QPS × 0.5s × 128MB = ~$25/mes
DynamoDB:     35 RPS lectura + 15 RPS escritura (on-demand) = ~$20/mes
API GW:       3M requests/mes = ~$10/mes
S3 Video:     30 TB storage = ~$690/mes
CloudFront:   50 Gbps pico × pricing por TB = ~$2,500/mes (video delivery)
MediaConvert: 10,000 títulos × $0.024/min × 90 min = ~$21,600 (one-time)
Auth0:        Free tier (7,000 MAU) o $23/mes (Essential)
Total estimado: ~$3,270/mes (operación) + one-time transcoding
```

### 6.3 Métricas y Monitoreo

| Servicio | Métrica | Alarma | Acción |
|----------|---------|--------|--------|
| API Gateway | Latency p99 | > 750 ms | Revisar Lambda cold starts |
| API Gateway | 5XXError rate | > 1% | Investigar logs de Lambda |
| Lambda | Duration | > 3000 ms | Optimizar queries DynamoDB |
| Lambda | Errors | > 5/min | Revisar CloudWatch Logs |
| DynamoDB | ThrottledRequests | > 0 | Considerar cambiar a provisioned |
| Auth0 | Failed Logins | > 100/hora | Verificar posible ataque de fuerza bruta |

### 6.4 Seguridad

#### 6.4.1 Autenticación — AuthN con OIDC (B1)

**Flujo elegido: Authorization Code Flow con PKCE**

**Justificación:** Es el flujo más seguro para SPAs y aplicaciones móviles. PKCE (Proof Key for Code Exchange) previene ataques de interceptación del código de autorización, eliminando la necesidad de un client secret en el lado del cliente.

**Participantes:**
- **Usuario** — Persona que desea autenticarse
- **Cliente** — SPA (React) o aplicación móvil
- **Authorization Server** — Auth0 (issuer: `https://netflix-clone.auth0.com/`)
- **Resource Server** — API Gateway + Lambda

**Contenido del ID Token (JWT):**

```json
{
  "iss": "https://netflix-clone.auth0.com/",
  "sub": "auth0|abc123def456",
  "aud": "netflix-clone-client-id",
  "exp": 1716940800,
  "iat": 1716937200,
  "email": "usuario@ejemplo.com",
  "name": "Edward Salinas",
  "picture": "https://...",
  "email_verified": true
}
```

**Contenido del Access Token (JWT):**

```json
{
  "iss": "https://netflix-clone.auth0.com/",
  "sub": "auth0|abc123def456",
  "aud": "https://api.netflix-clone.com",
  "exp": 1716938100,
  "iat": 1716937200,
  "scope": "openid profile email catalog:read mylist:read mylist:write",
  "permissions": ["catalog:read", "mylist:read", "mylist:write"],
  "https://netflix-clone.com/roles": ["viewer"]
}
```

#### 6.4.2 Autorización — AuthZ con RBAC (B2)

**Modelo elegido: RBAC (Role-Based Access Control)**

**Justificación:** RBAC es el modelo más apropiado para Netflix Clone porque los permisos se definen claramente por tipo de usuario. No se requiere la complejidad de ABAC dado que las políticas no dependen de atributos dinámicos del contexto.

**Roles del Sistema:**

| Rol | Descripción | Asignación |
|-----|-------------|------------|
| `viewer` | Espectador básico | Registro por defecto |
| `premium_viewer` | Espectador premium | Suscripción premium |
| `content_admin` | Administrador de contenido | Asignado por super_admin |
| `super_admin` | Administrador del sistema | Configuración manual |

**Matriz de Permisos por Rol:**

| Operación | Scope OAuth2 | viewer | premium_viewer | content_admin | super_admin |
|-----------|-------------|--------|----------------|---------------|-------------|
| Listar/buscar películas | `catalog:read` | ✅ | ✅ | ✅ | ✅ |
| Ver detalle de película | `catalog:read` | ✅ | ✅ | ✅ | ✅ |
| Crear película | `catalog:write` | ❌ | ❌ | ✅ | ✅ |
| Actualizar película | `catalog:write` | ❌ | ❌ | ✅ | ✅ |
| Eliminar película | `catalog:delete` | ❌ | ❌ | ❌ | ✅ |
| Ver Mi Lista (propia) | `mylist:read` | ✅ | ✅ | ✅ | ✅ |
| Agregar a Mi Lista | `mylist:write` | ✅ | ✅ | ✅ | ✅ |
| Eliminar de Mi Lista | `mylist:write` | ✅ | ✅ | ✅ | ✅ |
| Ver lista de otro usuario | `admin:read` | ❌ | ❌ | ❌ | ✅ |

**Scopes OAuth 2.0:**

| Scope | Descripción | Endpoints mapeados |
|-------|-------------|-------------------|
| `openid` | Identificación OIDC estándar | — |
| `profile` | Datos de perfil | — |
| `email` | Email del usuario | — |
| `catalog:read` | Lectura del catálogo | `GET /v1/movies`, `GET /v1/movies/{id}` |
| `catalog:write` | Escritura del catálogo | `POST /v1/movies`, `PUT /v1/movies/{id}` |
| `catalog:delete` | Eliminación del catálogo | `DELETE /v1/movies/{id}` |
| `mylist:read` | Lectura de Mi Lista | `GET /v1/users/{userId}/lists` |
| `mylist:write` | Escritura de Mi Lista | `POST /v1/users/{userId}/lists`, `DELETE .../lists/{movieId}` |
| `admin:read` | Lectura administrativa | `GET /v1/users/{userId}/lists` (otro usuario) |

#### 6.4.3 Integración SSO y Seguridad de Tokens (B3)

**Proveedor elegido: Auth0**

**Justificación vs alternativas:**

| Criterio | Auth0 | AWS Cognito | Keycloak |
|----------|-------|-------------|----------|
| Facilidad de integración | ✅ Excelente SDK | ✅ Nativo AWS | ⚠️ Requiere hosting |
| Soporte OIDC completo | ✅ | ✅ | ✅ |
| SSO con Google/GitHub | ✅ Built-in | ✅ Federation | ⚠️ Configuración manual |
| Free tier | 7,000 MAU | 50,000 MAU | Ilimitado (self-hosted) |
| Curva de aprendizaje | Baja | Media | Alta |
| **Decisión** | **✅ Seleccionado** | Viable pero vendor lock-in | Requiere infraestructura |

Auth0 fue seleccionado por su facilidad de integración, soporte nativo de OIDC/OAuth2, y la capacidad de agregar Social Login (Google, GitHub) sin configuración adicional.

**Configuración de Tokens:**

| Token | Tipo | Expiración | Almacenamiento |
|-------|------|------------|----------------|
| Access Token | JWT (RS256) | **15 minutos** | Memoria (no localStorage) |
| Refresh Token | Opaco | **7 días** | httpOnly Cookie (Secure, SameSite=Strict) |
| ID Token | JWT (RS256) | **1 hora** | Memoria |

**Estrategia de renovación:**
1. El Access Token se renueva automáticamente usando el Refresh Token (Silent Authentication).
2. Si el Refresh Token expira, el usuario debe re-autenticarse.
3. Refresh Token Rotation habilitado: cada uso del refresh token genera uno nuevo e invalida el anterior.

**Header de autorización:**

```
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

> ⚠️ **Importante:** El `userId` **nunca** se toma del body de la solicitud. Siempre se deriva del claim `sub` del Access Token validado. Esto previene ataques de suplantación de identidad.

**Manejo seguro de secretos:**
- Client secrets de Auth0 → **AWS Secrets Manager** (nunca en código ni variables de entorno planas)
- JWKS public keys → Cacheadas en Lambda con TTL de 1 hora
- Variables de configuración (audience, issuer) → Variables de entorno de Lambda (no sensibles)
- **Cero secretos hardcodeados** en el repositorio

**Validación de entradas:**
- Todas las cadenas son escapadas para prevenir inyección
- `@pattern` en Smithy para validar formatos (UUID, email, URLs)
- Content-Type restringido a `application/json`
- Tamaño máximo de body: 256 KB

### 6.5 Metodología de Pruebas

| Tipo | Herramienta | Cobertura |
|------|-------------|-----------|
| Unit Tests | Jest | Lambda handlers, validación de entradas |
| Integration | AWS SAM Local | API Gateway → Lambda → DynamoDB Local |
| E2E | Postman / Newman | Flujos completos contra API desplegada |
| Security | OWASP ZAP | Escaneo de vulnerabilidades |
| Load | Artillery | Pruebas de carga (100 QPS sostenido) |

---

## Temas de Discusión

### Tema 1: Elección de Base de Datos — DynamoDB vs RDS PostgreSQL

**Problema:** Necesitamos elegir entre una base de datos NoSQL (DynamoDB) y una relacional (RDS PostgreSQL) para persistir el catálogo de películas y las listas de usuarios.

- Opción 1 [RECOMENDADA] — DynamoDB (NoSQL)
- Opción 2 — RDS PostgreSQL

#### Opción 1 [RECOMENDADA] — DynamoDB

**Pros:**
- Serverless: sin gestión de servidores, escala automáticamente
- Latencia predecible < 10ms para operaciones por clave
- Modelo de pago por uso (on-demand) ideal para tráfico variable
- Integración nativa con Lambda y API Gateway
- Coherente con la arquitectura serverless existente

**Contras:**
- Queries complejos requieren GSIs adicionales
- Sin joins nativos (denormalización necesaria)
- Costo puede crecer con alto volumen de scans

#### Opción 2 — RDS PostgreSQL

**Pros:**
- Modelo relacional con joins complejos
- Lenguaje SQL familiar
- Transacciones ACID completas

**Contras:**
- Requiere gestión de instancias (no serverless, excepto Aurora Serverless v2)
- Cold starts de conexión desde Lambda (requiere RDS Proxy)
- Mayor costo base (~$30/mes mínimo vs ~$10/mes con DynamoDB)

**Conclusión:** DynamoDB se selecciona porque los patrones de acceso del sistema son simples (clave-valor + queries por GSI), la arquitectura es completamente serverless, y la escalabilidad automática es un requisito. Los queries complejos se resuelven con GSIs dedicados.

### Tema 2: Cómputo — Lambda vs ECS Fargate

- Opción 1 [RECOMENDADA] — Lambda Functions
- Opción 2 — ECS Fargate

#### Opción 1 [RECOMENDADA] — Lambda Functions

**Pros:**
- Pago por invocación (ideal para tráfico variable)
- Escala automática sin configuración
- Integración directa con API Gateway
- Sin gestión de contenedores

**Contras:**
- Cold starts (~200-500ms para Node.js)
- Límite de 15 minutos de ejecución
- Límite de 250 MB para paquete de despliegue

#### Opción 2 — ECS Fargate

**Pros:**
- Sin cold starts (instancias siempre activas)
- Sin límite de tiempo de ejecución
- Más control sobre el entorno de ejecución

**Contras:**
- Costo base constante (incluso sin tráfico)
- Requiere configuración de auto-scaling
- Mayor complejidad operacional

**Conclusión:** Lambda se selecciona por su modelo de pago por invocación, escala automática sin configuración, e integración nativa con el ecosistema serverless (API Gateway + DynamoDB). Los cold starts son aceptables dado que la latencia p99 objetivo es < 500ms.

---

## Contactos

- **Líder Técnico / Autor:** Edward Salinas
- **Equipo:** Richard Berna, Jorge Siles, Estiven Salinas
- **Curso:** Diseño e Implementación de Sistemas — Maestría en Cloud Computing
