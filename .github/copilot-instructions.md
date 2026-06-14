# Copilot instructions for `proyectoNetflix`

## Build, test, and lint commands

Use commands from the correct subdirectory.

| Area | Command | Notes |
|---|---|---|
| Backend unit tests (root) | `npm test` | Runs Jest for `src/**/*.test.ts` (configured in `jest.config.js`). |
| Backend single test file (root) | `npm test -- src/shared/auth.test.ts` | Run one test file. |
| Backend single test case (root) | `npm test -- src/shared/auth.test.ts -t "requireScope allows matched scope"` | Run one named test. |
| Frontend dev server (`frontend/`) | `npm run dev` | Vite local dev server. |
| Frontend build (`frontend/`) | `npm run build` | TypeScript build + Vite production build. |
| Frontend lint (`frontend/`) | `npm run lint` | ESLint flat config (`frontend/eslint.config.js`). |
| Smithy model build (`smithy/`) | `smithy build` | Builds API model from `smithy/model/netflix.smithy`. |
| API flow smoke test (root) | `node test-api.js` | Uses deployed AWS API by default. |
| API flow smoke test against Floci (root) | `node test-api.js --local` | Uses local emulator endpoint. |
| Full VOD ingest/playback E2E (root) | `node test-e2e.js` | Requires AWS CLI access + configured bucket/API values in script. |

## High-level architecture

- This repository is split into a **serverless backend** (root + `src/*` workspaces), a **React/Vite frontend** (`frontend/`), and a **Smithy API contract** (`smithy/`).
- Backend Lambda handlers are grouped by domain workspace:
  - `src/catalog`: movie CRUD + reviews + OpenSearch sync/search.
  - `src/genres`: genre lookups and movie-by-genre listing.
  - `src/user`: profiles, watch list, history, recommendations.
  - `src/streaming`: stream session lifecycle, transcode trigger/callback, signed playback URL generation.
  - `src/shared`: shared DynamoDB client, auth/scope/role checks, response/error formatting.
- Data layer is DynamoDB-first, with optional OpenSearch acceleration for text search:
  - `listMovies` queries OpenSearch when `q` is provided, then batch-loads canonical records from DynamoDB.
  - `syncToOpenSearch` consumes DynamoDB Stream events from movies to maintain index consistency.
- Streaming pipeline is asynchronous:
  1. Movie is created with `videoStatus: "pending"`.
  2. S3 upload event triggers `triggerTranscode` (MediaConvert job; fallback simulation path exists for restricted environments).
  3. `transcodeCallback` marks movie status and writes `TABLE_VIDEO_ASSETS` playlist entries.
  4. `createStreamSession` reads video asset metadata and returns a CloudFront signed URL.
- Frontend API integration is centralized in `frontend/src/api/client.ts`:
  - Axios interceptor injects auth token via `setTokenGetter`.
  - Profiles/reviews include localStorage fallback behavior when backend calls fail.

## Key codebase conventions

- **Auth checks happen at the top of handlers** using `requireScope(...)`, plus `requireRole(...)` or `validateUserOrAdmin(...)` for ownership/admin constraints.
- **Error and response shape is centralized**: user-facing handlers generally return `formatResponse(...)` on success and `handleError(...)` in `catch`; `handleError` maps message patterns (`Unauthorized`, `Forbidden`, `Validation`, `NotFound`, `Conflict`) to status codes.
- **API Gateway body parsing is defensive**: many handlers support both string and already-parsed object payloads with:
  - `typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {}`
- **Env-driven infrastructure wiring**: handlers read table/resource names from environment variables (`TABLE_*`, `OPENSEARCH_ENDPOINT`, CloudFront/Secrets/MediaConvert settings) instead of hardcoding ARNs or table names.
- **Workspace dependency pattern**: domain packages depend on `@netflix-project/shared` for common auth/data/response behavior.

## Work plan and documentation rules

- `work_planIA.md` is the baseline implementation plan. Treat it as **partially implemented through milestone 3.2**.
- Before starting new implementation work, **check current status against `work_planIA.md`** and continue from the next pending milestone/task.
- Any new project specs, analysis docs, or planning documents must be stored under **`docs/`** as Markdown files (`.md`).
