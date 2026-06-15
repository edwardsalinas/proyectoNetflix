# Netflix Clone — Cloud Architecture Project

**Course:** Diseño e Implementación de Sistemas — Maestría en Cloud Computing  
**Delivery:** May 2026  
**Status:** 🔄 In Review

## About

Academic project that designs a **video-on-demand (VOD) streaming platform** inspired by Netflix. The system is built on a **serverless AWS architecture** using API Gateway, Lambda, DynamoDB, S3, CloudFront, and AWS Elemental MediaConvert, with secure authentication via OIDC/OAuth2 (Auth0) and RBAC-based authorization.

Key capabilities:
- 🎬 Movie & series catalog with adaptive streaming (HLS/DASH)
- 🔐 Authentication via Auth0 (Authorization Code Flow + PKCE)
- 👤 Role-based access control (viewer, premium\_viewer, content\_admin, super\_admin)
- 📋 Personal user lists ("My List") and watch history ("Continue Watching")
- 🌍 Global content delivery via CloudFront CDN
- 📐 REST API modeled with Smithy

## 🌐 Live Demo (Cloud)

La aplicación está desplegada y accesible a nivel mundial mediante la CDN de Amazon CloudFront:
🔗 **[https://d33whrv9c8h9sn.cloudfront.net](https://d33whrv9c8h9sn.cloudfront.net)**
*(Nota: El registro e inicio de sesión están asegurados mediante AWS Cognito)*

---

## Project Documents

| Document | Description |
|----------|-------------|
| [Netflix\_Design\_Doc.md](./Netflix_Design_Doc.md) | Main technical design document — entities, REST API, AWS architecture, DB schema, security design (AuthN/AuthZ), cost estimates |
| [Rubrica\_Parte1.md](./Rubrica_Parte1.md) | Grading rubric for Part 1 — requirements and scoring criteria from the professor |
| [Design\_Doc\_Template.md](./Design_Doc_Template.md) | Original document template provided by the course |
| [smithy/model/netflix.smithy](./smithy/model/netflix.smithy) | Smithy REST API model — all resources, operations, types, and auth traits |
| [smithy/smithy-build.json](./smithy/smithy-build.json) | Smithy build configuration |

---

## Architecture Overview

```
Clients (Web / Mobile)
        │
        ▼
   CloudFront CDN
        │
        ▼
  API Gateway (REST /v1/)
        │
    ┌───┴────────────────────┐
    │                        │
  Auth0              Lambda Functions
  (OIDC/OAuth2)      ├── MovieFns (CRUD)
                     ├── GenreFns (catalog)
                     ├── UserListFns (My List)
                     ├── HistoryFns (watch progress)
                     └── StreamingFns (HLS sessions)
                              │
                         DynamoDB Tables
                         S3 + MediaConvert
```

---

## API Resources

| Resource | Base Path | Scopes |
|----------|-----------|--------|
| Movies | `GET/POST /v1/movies` | `catalog:read`, `catalog:write`, `catalog:delete` |
| Genres | `GET /v1/genres` | `catalog:read` |
| My List | `/v1/users/{userId}/lists` | `mylist:read`, `mylist:write` |
| Watch History | `/v1/users/{userId}/history` | `history:read`, `history:write` |
| Streaming Sessions | `/v1/streaming/sessions` | `catalog:read` |

---

## Team

| Name | Role |
|------|------|
| Edward Salinas | Co-author |
| Richard Berna | Co-author |
| Jorge Siles | Co-author |
| Estiven Salinas | Co-author |

---

## How to Build the Smithy Model

```bash
cd smithy
smithy build
```

> Requires [Smithy CLI](https://smithy.io/2.0/guides/smithy-cli/cli_installation.html) installed.

---

## Frontend Application (SPA)

The frontend is a React Single Page Application (SPA) built with TypeScript and Vite. It is located in the `/frontend` directory.

### Configuration
Create a `.env` file in the `/frontend` directory (using `.env.example` as a template):
```env
VITE_COGNITO_DOMAIN=your-cognito-domain.auth.us-east-1.amazoncognito.com
VITE_COGNITO_CLIENT_ID=your-user-pool-client-id
VITE_COGNITO_REGION=us-east-1
VITE_COGNITO_SCOPES=openid profile email
VITE_API_BASE_URL=https://your-api-gateway-url/prod/v1
```

### Running Locally
To install dependencies and start the local development server:
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

- **Mock Authentication Mode**: If the `VITE_COGNITO_DOMAIN` is not set or points to the placeholder, the application automatically starts in a secure **Mock Mode** using `localStorage` for testing.
- **Cognito Integration Mode**: When configured with valid AWS Cognito credentials, it redirects the user to the Cognito Hosted UI for sign-up and sign-in.
