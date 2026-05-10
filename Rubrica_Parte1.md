# Rúbrica — Parte 1: Diseño de Sistema + AuthZ/AuthN + Smithy

**Curso:** Diseño e Implementación de Sistemas
**Entregable:** Parte 1 de 3
**Puntaje:** 20 puntos (20% de la nota final)
**Equipo:** _______________________________________________
**Sistema Elegido:** _______________________________________________
**Fecha de Entrega:** _______________________________________________
**Evaluador:** _______________________________________________

---

## Entregables Requeridos

> Marque cada ítem como recibido antes de comenzar la evaluación.

- [ ] Documento de diseño técnico (usando la plantilla del curso, estado: **EN REVISIÓN** o **REVISADO**)
- [ ] Definiciones de modelo Smithy (`.smithy`) con al menos una operación por recurso principal
- [ ] Proyecto Smithy que genera código (build funciona sin errores)
- [ ] Diagrama de flujo de autenticación (AuthN) con OIDC/SSO
- [ ] Diagrama de modelo de autorización (AuthZ) con roles y scopes
- [ ] Repositorio o carpeta entregada con historial de contribuciones visible

---

## Sección A — Documento de Diseño de Sistema *(8 puntos)*

### A1 · Requisitos Funcionales *(2 puntos)*

*Referencia en la plantilla: §1.1 Requisitos Funcionales*

| Nivel | Descripción | Puntos |
|---|---|---|
| **Excelente** | 3 requisitos bien definidos, priorizados y formulados como historias de usuario ("Los usuarios deben poder..."). Cada uno identifica claramente quién es el actor, qué objetivo tiene y por qué. Los requisitos son específicos al sistema elegido y abarcan los casos de uso más importantes. | 2.0 |
| **Bueno** | 3 requisitos presentes con formulación adecuada; uno de ellos puede ser genérico o con priorización implícita. | 1.7 |
| **Suficiente** | Requisitos incompletos (menos de 3), mal formulados o sin priorización clara. El lector puede inferir de qué trata el sistema pero con esfuerzo. | 1.3 |
| **Insuficiente** | Requisitos ausentes, triviales o incoherentes con el sistema elegido. Lista copiada sin adaptación. | < 1.2 |

**Puntos obtenidos:** _____ / 2  
**Comentarios:**

---

### A2 · Requisitos No Funcionales *(2 puntos)*

*Referencia en la plantilla: §1.2 Requisitos No Funcionales*

| Nivel | Descripción | Puntos |
|---|---|---|
| **Excelente** | 3–5 RNF cuantificados y contextualizados al sistema concreto. Cubren al menos 3 de las 8 dimensiones de la plantilla (CAP, Escalabilidad, Latencia, Durabilidad, Seguridad, Tolerancia a Fallos, Cumplimiento, Entorno). Cada RNF tiene un valor medible (e.g., "< 500 ms", "99.9% uptime", "100k DAU"). | 2.0 |
| **Bueno** | 3–5 RNF presentes; al menos 2 cuantificados; 2 o más dimensiones cubiertas. | 1.7 |
| **Suficiente** | 1–2 RNF o todos formulados de forma genérica sin métricas (e.g., "el sistema debe ser rápido") sin justificación. | 1.3 |
| **Insuficiente** | RNF ausentes, copiados textualmente de la plantilla o sin ninguna relación con el sistema elegido. | < 1.2 |

**Puntos obtenidos:** _____ / 2  
**Comentarios:**

---

### A3 · Entidades Principales y Modelo de Datos *(2 puntos)*

*Referencia en la plantilla: §2 Entidades Principales + §6.1 Esquema de Base de Datos*

| Nivel | Descripción | Puntos |
|---|---|---|
| **Excelente** | Entidades correctamente identificadas (todos los sustantivos/recursos clave del sistema). Cada entidad incluye campos relevantes con tipos. Relaciones entre entidades explicadas (diagrama ER o tabla). Hay coherencia entre las entidades definidas y la API diseñada. | 2.0 |
| **Bueno** | Entidades presentes con campos; relaciones implícitas o diagrama ER incompleto (faltan 1–2 relaciones importantes). | 1.7 |
| **Suficiente** | Entidades identificadas sin campos o con tipos incompletos; sin relaciones ni diagrama. El equipo enumera entidades pero no las desarrolla. | 1.3 |
| **Insuficiente** | Entidades ausentes, incorrectas para el sistema descrito, o sin ninguna coherencia con los requisitos. | < 1.2 |

**Puntos obtenidos:** _____ / 2  
**Comentarios:**

---

### A4 · Diseño de Alto Nivel y Diagramas *(2 puntos)*

*Referencia en la plantilla: §5 Diseño de Alto Nivel + §4 Flujo de Datos*

| Nivel | Descripción | Puntos |
|---|---|---|
| **Excelente** | Diagrama de componentes claro que muestra todos los servicios, bases de datos y sus interacciones. Se incluye al menos un diagrama de secuencia que muestra un flujo principal end-to-end. Las decisiones de diseño clave están justificadas (sección de Temas de Discusión con pros/contras). Diagrama coherente con los requisitos y la API definida. | 2.0 |
| **Bueno** | Diagrama de componentes presente y correcto; flujo de secuencia básico incluido; falta justificación de 1–2 decisiones de diseño. | 1.7 |
| **Suficiente** | Diagrama muy básico (cajas sin flechas descriptivas o sin base de datos); sin flujo de secuencia. El diseño es reconocible pero incompleto. | 1.3 |
| **Insuficiente** | Sin diagrama, diagrama incoherente con el diseño descrito, o diagrama copiado de internet sin adaptación al sistema. | < 1.2 |

**Puntos obtenidos:** _____ / 2  
**Comentarios:**

---

**SUBTOTAL A — Documento de Diseño:** _____ / 8

---

## Sección B — AuthZ/AuthN con OIDC/SSO *(6 puntos)*

### B1 · Flujo de Autenticación — AuthN con OIDC *(2 puntos)*

*Referencia en la plantilla: §6.4 Seguridad*

| Nivel | Descripción | Puntos |
|---|---|---|
| **Excelente** | Flujo OIDC correcto y completo documentado. Incluye: (1) tipo de flujo elegido (Authorization Code Flow preferentemente) con justificación, (2) diagrama de secuencia mostrando todos los participantes (usuario, cliente, Authorization Server, Resource Server), (3) descripción del contenido del ID Token y Access Token (claims relevantes). | 2.0 |
| **Bueno** | Flujo OIDC correcto con diagrama de secuencia; falta justificación del tipo de flujo o descripción de claims del token. | 1.7 |
| **Suficiente** | Flujo OIDC descrito textualmente (sin diagrama) o con errores menores en el flujo. El equipo entiende el concepto pero no lo documenta con precisión. | 1.3 |
| **Insuficiente** | Flujo ausente; descripción incorrecta (e.g., confunde OIDC con OAuth 2.0 puro, o confunde AuthN con AuthZ); flujo copiado sin adaptación al sistema. | < 1.2 |

**Puntos obtenidos:** _____ / 2  
**Comentarios:**

---

### B2 · Modelo de Autorización — AuthZ *(2 puntos)*

*Referencia en la plantilla: §6.4 Seguridad*

| Nivel | Descripción | Puntos |
|---|---|---|
| **Excelente** | Modelo de autorización claramente definido para el sistema (RBAC, ABAC, o justificación de otro modelo). Roles y/o permisos explicitados en una tabla o diagrama. Scopes de OAuth 2.0 definidos y mapeados a operaciones de la API. Se explica qué puede hacer cada rol en el sistema. | 2.0 |
| **Bueno** | Modelo de autorización presente con roles definidos; scopes especificados con algunas omisiones; mapeo a operaciones parcial. | 1.7 |
| **Suficiente** | Autorización mencionada con roles genéricos (e.g., "admin" y "usuario") sin definir permisos ni scopes. Sin mapeo a operaciones de la API. | 1.3 |
| **Insuficiente** | Autorización ausente; confusión entre AuthN y AuthZ; roles listados sin ningún contexto del sistema. | < 1.2 |

**Puntos obtenidos:** _____ / 2  
**Comentarios:**

---

### B3 · Integración SSO y Seguridad de Tokens *(2 puntos)*

*Referencia en la plantilla: §6.4 Seguridad + §3 API o Interfaz del Sistema*

| Nivel | Descripción | Puntos |
|---|---|---|
| **Excelente** | Integración SSO diseñada: proveedor de identidad elegido (Keycloak, Auth0, Google, etc.) con justificación. Se documenta: tipo de token (JWT), contenido del header de autorización (`Bearer <token>`), tiempo de expiración (access + refresh token), estrategia de renovación. Se menciona manejo seguro de secretos (variables de entorno, vault, no hardcoded). La API no acepta user IDs en el body; el usuario se deriva del token. | 2.0 |
| **Bueno** | Proveedor SSO elegido; token JWT documentado con expiración; uno o dos puntos de seguridad omitidos (e.g., refresh token o estrategia de secretos). | 1.7 |
| **Suficiente** | SSO mencionado como "usaremos X" sin diseño de integración. Token contemplado pero sin detalles. Consideraciones de seguridad mínimas o genéricas. | 1.3 |
| **Insuficiente** | Sin integración SSO; user IDs tomados del body de la solicitud; secretos hardcodeados o no considerados; sin mención de expiración de tokens. | < 1.2 |

**Puntos obtenidos:** _____ / 2  
**Comentarios:**

---

**SUBTOTAL B — AuthZ/AuthN:** _____ / 6

---

## Sección C — API REST con Smithy *(6 puntos)*

### C1 · Correctitud y Completitud del Modelo Smithy *(2 puntos)*

*Referencia en la plantilla: §3 API o Interfaz del Sistema*

| Nivel | Descripción | Puntos |
|---|---|---|
| **Excelente** | Todos los recursos principales del sistema tienen operaciones definidas en Smithy. Los tipos de entrada (`Input`) y salida (`Output`) son correctos y específicos (no genéricos). Se usan restricciones de validación (`@length`, `@range`, `@pattern`, `@required`, etc.) donde corresponde. El proyecto corre `smithy build` sin errores ni advertencias. Comentarios de documentación en operaciones clave. | 2.0 |
| **Bueno** | Recursos principales definidos; tipos correctos; build funciona sin errores; faltan algunas restricciones de validación o comentarios de documentación. | 1.7 |
| **Suficiente** | Operaciones básicas definidas (al menos CRUD para 1 recurso); tipos incompletos o genéricos (`String` en lugar de tipos específicos); build funciona con advertencias. | 1.3 |
| **Insuficiente** | Definiciones ausentes, incorrectas, o `smithy build` falla con errores que evidencian que no fue probado. | < 1.2 |

**Puntos obtenidos:** _____ / 2  
**Comentarios:**

---

### C2 · Diseño de Recursos REST *(2 puntos)*

*Referencia en la plantilla: §3 API o Interfaz del Sistema*

| Nivel | Descripción | Puntos |
|---|---|---|
| **Excelente** | Recursos nombrados como sustantivos en plural (`/v1/usuarios`, `/v1/pedidos`). Verbos HTTP correctos para cada operación (GET para lecturas, POST para creación, PUT/PATCH para actualización, DELETE para eliminación). Versionado de API incluido (`/v1/`). Identificadores de recursos en la ruta (no en el body). Recursos anidados donde tiene sentido (e.g., `/v1/usuarios/{userId}/pedidos`). | 2.0 |
| **Bueno** | Recursos bien nombrados y versionados; verbos HTTP correctos con 1–2 inconsistencias (e.g., POST para actualizar o GET con body). | 1.7 |
| **Suficiente** | Recursos definidos con algunos errores de nomenclatura (singular en lugar de plural, verbos en la URL) o sin versionado. | 1.3 |
| **Insuficiente** | Diseño REST con errores fundamentales (e.g., todas las operaciones como POST, sin estructura de recursos, sin versionado) o que no sigue el esquema de Smithy. | < 1.2 |

**Puntos obtenidos:** _____ / 2  
**Comentarios:**

---

### C3 · Seguridad y Manejo de Errores en la API *(2 puntos)*

*Referencia en la plantilla: §3 API o Interfaz del Sistema + §6.4 Seguridad*

| Nivel | Descripción | Puntos |
|---|---|---|
| **Excelente** | Trait de autenticación aplicado en Smithy (`@httpBearerAuth` u otro mecanismo apropiado). El usuario actual se obtiene del token (no de parámetros del request). Errores HTTP documentados como estructuras Smithy (`@error("client")`, `@error("server")`) con códigos HTTP correctos (400, 401, 403, 404, 409, 500). Se menciona validación de entradas para prevenir inyección. | 2.0 |
| **Bueno** | Trait de autenticación presente; errores HTTP documentados para los casos principales; falta algún código de error (e.g., 403 Forbidden vs. 401 Unauthorized). | 1.7 |
| **Suficiente** | Seguridad mencionada en el documento de diseño pero no implementada en el modelo Smithy; errores definidos de forma genérica sin estructura. | 1.3 |
| **Insuficiente** | Sin ningún mecanismo de autenticación en el modelo Smithy; sin manejo de errores; user IDs en el body del request. | < 1.2 |

**Puntos obtenidos:** _____ / 2  
**Comentarios:**

---

**SUBTOTAL C — Smithy REST API:** _____ / 6

---

## Resumen de Calificación — Parte 1

| Sección | Criterio | Puntos Obtenidos | Puntos Posibles |
|---|---|---|---|
| **A — Documento de Diseño** | A1 · Requisitos Funcionales | | 2 |
| | A2 · Requisitos No Funcionales | | 2 |
| | A3 · Entidades Principales y Modelo de Datos | | 2 |
| | A4 · Diseño de Alto Nivel y Diagramas | | 2 |
| **B — AuthZ/AuthN** | B1 · Flujo de Autenticación (OIDC) | | 2 |
| | B2 · Modelo de Autorización (AuthZ) | | 2 |
| | B3 · Integración SSO y Seguridad de Tokens | | 2 |
| **C — Smithy REST API** | C1 · Correctitud y Completitud del Modelo | | 2 |
| | C2 · Diseño de Recursos REST | | 2 |
| | C3 · Seguridad y Manejo de Errores | | 2 |
| | **TOTAL PARTE 1** | | **20** |

**Nota Parte 1:** _____ / 20 &nbsp;&nbsp;&nbsp; **Porcentaje:** _____%

---

## Penalizaciones Aplicadas

| Situación | Penalización | ¿Aplica? | Puntos descontados |
|---|---|---|---|
| Entrega tardía (por día hábil de retraso) | −1 pt / día | | |
| Entrega tardía > 3 días hábiles | No se acepta (0 pts) | | |
| Secretos (passwords, API keys) en el repositorio | −3 pts | | |
| Integrante sin commits visibles en el repositorio | −50% de la nota individual para ese integrante | | |

**Penalización total:** _____ pts  
**Nota Final Parte 1 (con penalizaciones):** _____ / 20

---

## Lista de Verificación Rápida para el Evaluador

Antes de asignar puntaje, confirme:

- [ ] El equipo usó la plantilla del curso (no una plantilla propia o descargada de internet)
- [ ] El sistema elegido es lo suficientemente complejo para requerir las 3 partes del proyecto
- [ ] El modelo Smithy y el documento de diseño describen el **mismo** sistema (coherencia entre entregables)
- [ ] Los diagramas de AuthN y AuthZ son específicos al sistema (no genéricos/copiados)
- [ ] `smithy build` fue ejecutado y genera código sin errores (verifique en el repositorio o en vivo)
- [ ] No hay secretos, passwords ni API keys en el repositorio

---

## Retroalimentación General

**Fortalezas del equipo:**

&nbsp;

&nbsp;

**Áreas de mejora para la Parte 2:**

&nbsp;

&nbsp;

**Recomendaciones específicas:**

&nbsp;

&nbsp;

---

*Rúbrica — Parte 1 · Diseño de Sistema + AuthZ/AuthN + Smithy · Ciclo {{ CICLO }}*
 