# JooKoi md archive

A markdown notes archive with a folder tree, inline editing, search, and path-based deep links. Angular 21 (standalone components) frontend, NestJS 11 backend, SQLite storage.

## What it does

Folders and documents live in SQLite. The Nest API handles tree, document, folder, rename, delete, and search operations. The Angular UI browses and edits the tree, with deep links into any folder or document and a minimal single-user login gate.

## URLs

Frontend routes live under `/notes/...`:

- `/notes` opens the default folder
- `/notes/folder/subfolder` opens a nested folder
- `/notes/folder/subfolder/docname` opens a document (no `.md` suffix in the URL)

A folder matches by exact name, a document by filename minus `.md`. To keep that resolution unambiguous, the backend blocks a folder and a document from sharing a name in the same parent (folder `foo` next to document `foo.md` isn't allowed).

## Default folder

The app treats a folder named `A bucket` as the landing folder. If you open the app with no deeper path and `A bucket` doesn't exist yet, the frontend creates it.

## Auth

Single hardcoded user, verified server-side (`user` / `pass`). The frontend stores the returned token in `localStorage`, so login persists across reloads until logout or invalidation. This is POC-grade auth, not multi-user or production-grade.

## Project structure

- `web/` Angular frontend
- `api/` NestJS backend
- `shared/` shared request/response types
- `data/` SQLite database and local runtime data
- `DEPLOYMENT.md` production deployment notes

Key frontend files:

- `web/src/app/app.ts` login shell, `router-outlet`
- `web/src/app/app.routes.ts` route setup
- `web/src/app/notes-page.component.ts` main workspace UI, route-driven selection
- `web/src/app/notes-tree.store.ts` signal-based tree state
- `web/src/app/auth.service.ts` token storage, login request
- `web/src/app/auth.interceptor.ts` bearer token injection

Key backend files:

- `api/src/app/notes.controller.ts` protected notes endpoints
- `api/src/app/notes.service.ts` tree/document/folder logic, path collision checks
- `api/src/app/auth.controller.ts` login endpoint
- `api/src/app/auth.service.ts` token generation and verification
- `api/src/app/auth.guard.ts` route protection

Full architecture and reasoning: [_architecture/architecture.md](_architecture/architecture.md).

## Local development

```bash
npm install
npm run start:api   # http://localhost:3000/api
npm run start:web   # http://localhost:4200
```

## Build

```bash
npm run build              # everything
npm run build:web:prod
npm run build:api:prod
```

## Production

The production frontend build is configured for deployment under `/test/`, so `[base]/notes/...` for routes and `[base]/api` for the API. Server setup: [DEPLOYMENT.md](DEPLOYMENT.md).

## Data storage

SQLite at `data/notes.sqlite`. The API runtime directory needs a writable `data/` folder in production.

## Search

Backend-driven. The UI sends the query to the API and filters the visible tree down to matching items plus their ancestor folders.

## Current POC constraints

- Single hardcoded user, no multi-user ownership model
- SQLite only, no production-grade concurrent access
- No robust production auth/session management
- No slug/history versioning for renamed paths
- Path uniqueness depends entirely on the backend's collision rules
