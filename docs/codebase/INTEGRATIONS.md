# External Integrations

## Core Sections (Required)

### 1) Integration Inventory

| System | Type | Purpose | Auth model | Criticality | Evidence |
|--------|------|---------|------------|-------------|----------|
| SQLite | Database | Primary data storage for notes and folders | File-based access | High | `api/src/app/app.module.ts` |
| NestJS API | internal API | Communication between frontend and backend | Bearer Token (JWT-like) | High | `api/src/app/auth.service.ts` |

### 2) Data Stores

| Store | Role | Access layer | Key risk | Evidence |
|-------|------|--------------|----------|----------|
| SQLite | Primary Persistence | TypeORM (Entities) | Concurrent write locks; Data loss if `data/` volume isn't backed up. | `api/src/app/notes.service.ts` |

### 3) Secrets and Credentials Handling

- Credential sources: `.env` file (loaded via NestJS/Node).
- Hardcoding checks: Credentials for the POC (`user`/`pass`) are mentioned in `README.md` but should be managed via `.env` in production.
- Rotation or lifecycle notes: No automated rotation implemented.

### 4) Reliability and Failure Behavior

- Retry/backoff behavior: None implemented in the current POC.
- Timeout policy: Standard HTTP timeouts apply.
- Circuit-breaker or fallback behavior: None.

### 5) Observability for Integrations

- Logging around external calls: NestJS `Logger` logs startup and application errors.
- Metrics/tracing coverage: None.
- Missing visibility gaps: No performance monitoring or error tracking (e.g., Sentry) currently configured.

### 6) Evidence

- [api/src/app/app.module.ts](../../api/src/app/app.module.ts)
- [.env.example](../../.env.example)
 
