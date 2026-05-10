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
