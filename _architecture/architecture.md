# Architecture: what this repo is and why it's shaped this way

Read this at feature-build/modify time, not every session (that's `AGENTS.md`'s job). Short, non-obvious content only — skip anything a reader gets from the code/structure itself.

## What this repo is

A single-user markdown-note archive: Angular frontend (`web/`) + NestJS backend (`api/`) sharing DTOs (`shared/`), backed by a local SQLite file. `web/` and `api/` are independent npm workspaces, not an Nx monorepo.

## Repo structure

```text
Browser (URL) -> Angular Router -> NotesPageComponent -> NotesTreeStore (Signals) -> NestJS Controller -> NotesService -> node:sqlite -> SQLite
```

- `web/` Angular app, feature-based (`features/notes`, `features/auth`). Root-level `angular.json` (the Angular CLI resolves paths relative to that file's own directory, so it has to live at repo root, not inside `web/`).
- `api/` NestJS app, controller-service pattern. Data access is raw `node:sqlite` (`api/src/app/database.provider.ts` + `notes.service.ts`), not an ORM. Builds via `@nestjs/cli` plus plain `tsc`, no webpack.
- `shared/src/models.d.ts` pure type declarations, zero runtime exports. Deliberately `.d.ts`, not `.ts`, to keep `tsc`'s inferred common source root from drifting to repo root when `api`'s build resolves `@shared/models`.
- `data/notes.sqlite` the actual database file.
- `graphify-out/`, `.tokensave/` gitignored local caches for LLM coding tools (Graphify's graph dump, TokenSave's code index). Regenerated from source, not part of the app.

## Key constraints

- **Path determinism**: folder and document names can't collide with a sibling under the same parent (folder `foo` vs document `foo.md`). That's what keeps deep-linking reliable. See `API_EDGE_CASES.md` (this folder) for the full edge-case spec.
- **Single-user POC**: auth is intentionally minimal.
- **Local persistence**: no external DB service, just a SQLite file on disk via `node:sqlite`. Needs `engines.node >=23.4`, or `--experimental-sqlite` below that.
- **Not Nx**: `package.json` has `"workspaces": ["web", "api"]`. Each workspace owns its own deps, scripts, lint, and test config independently.

## Known risks

- SQLite + local file writes aren't safe under concurrent multi-user access (fine for single-user POC, not fine if that assumption changes).
- `getTree` loads the entire tree into memory/response — will not scale past a moderate archive size.

## Decision records

See `plans/decisions/` for calls made and rejected, with reasoning. See `plans/2026-09-01-nx-removal-and-storage-backend-rethink.md` for the Nx-removal + node:sqlite migration plan (both decisions implemented).
