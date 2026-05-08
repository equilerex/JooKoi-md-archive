# JooKoi md archive

A simple Markdown knowledge (folder) tree POC built with:

- Angular 21 standalone components
- NestJS 11
- SQLite
- Nx workspace tooling

The app provides a folder and markdown document tree, inline markdown editing, search, and path-based deep links.

## What It Does

- Stores folders and markdown documents in SQLite
- Exposes a Nest API for tree, document, folder, rename, delete, and search operations
- Renders a browser UI for browsing and editing the tree
- Supports deep links to folders and documents
- Uses a simple single-user login flow for protected access

## URL Model

The frontend uses Angular routing under:

- `/notes/...`

Examples:

- `/notes` opens the default folder
- `/notes/folder/subfolder` opens a nested folder
- `/notes/folder/subfolder/docname` opens a document

Document URLs do not include `.md`.

Path resolution rules:

- folders match their exact name
- documents match their filename without the `.md` suffix

To keep path resolution deterministic, the backend blocks same-parent collisions such as:

- folder `foo`
- document `foo.md`

inside the same parent folder.

## Default Folder

The app treats a folder named `A bucket` as the default landing folder.

If the user opens the app without a deeper path and `A bucket` does not exist yet, the frontend creates it automatically.

## Authentication

The app currently uses a minimal single-user server-side login.

Current credentials:

- username: `user`
- password: `pass`

Notes:

- credentials are verified by the API, not the web bundle
- the frontend stores the returned token in `localStorage`
- login persists across browser reloads until logout or invalidation

This is POC-grade authentication, not production-grade multi-user auth.

## Project Structure

Top-level structure:

- `web/` Angular frontend
- `api/` Nest backend
- `shared/` shared request/response models
- `data/` SQLite database and local runtime data
- `DEPLOYMENT.md` production deployment notes

Important frontend files:

- `web/src/app/app.ts`
  Login shell and `router-outlet`
- `web/src/app/app.routes.ts`
  Angular route setup
- `web/src/app/notes-page.component.ts`
  Main notes workspace UI and route-driven selection logic
- `web/src/app/notes-tree.store.ts`
  Signal-based tree state
- `web/src/app/auth.service.ts`
  Token storage and login request
- `web/src/app/auth.interceptor.ts`
  Bearer token injection for API requests

Important backend files:

- `api/src/app/notes.controller.ts`
  Protected notes endpoints
- `api/src/app/notes.service.ts`
  Tree/document/folder logic and path collision validation
- `api/src/app/auth.controller.ts`
  Login endpoint
- `api/src/app/auth.service.ts`
  Token generation and verification
- `api/src/app/auth.guard.ts`
  API route protection

## Local Development

Install dependencies:

```bash
npm install
```

Start the API:

```bash
npm run start:api
```

Start the frontend:

```bash
npm run start:web
```

Typical local URLs:

- frontend: `http://localhost:4200`
- api: `http://localhost:3000/api`

## Build Commands

Build everything:

```bash
npm run build
```

Build production frontend:

```bash
npm run build:web:prod
```

Build production API:

```bash
npm run build:api:prod
```

## Production Notes

The production frontend build is configured for deployment under:

- `/test/`

Production assumptions:

- app URL base: defined by `APP_BASE_HREF` in `.env` (e.g. `/test`)
- frontend route base: `[base]/notes/...`
- API base: `[base]/api`

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the server setup.

## Data Storage

The backend stores data in SQLite.

Local database path:

- `data/notes.sqlite`

For production, the API runtime directory must have a writable `data/` folder.

## Search

Search is backend-driven.

The UI sends the query to the API, and the frontend filters the visible tree based on the returned matching items and their ancestor folders.

## Current POC Constraints

- Single hardcoded user
- SQLite only
- No multi-user ownership model
- No robust production auth/session management
- No slug/history versioning for renamed paths
- Path uniqueness depends on backend name collision rules

## Deployment

Deployment instructions are documented in:

- [DEPLOYMENT.md](.\DEPLOYMENT.md)

 