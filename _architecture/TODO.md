# TODO
<!-- Live working set. `jookoi-paper-trail flush` archives it and resets it. See AGENTS.md. -->

## Context

<!-- Rewritten wholesale whenever stale, never appended to. Present tense. 5-20 lines.
     What a cold session needs to know to avoid re-deriving it. -->

API layer's data access is raw `node:sqlite` (`api/src/app/database.provider.ts` + `notes.service.ts`), not TypeORM — `typeorm`/`@nestjs/typeorm`/`sqlite3` are gone from `package.json`. `@types/node` is `^24`; `engines.node` requires `>=23.4` (node:sqlite needs `--experimental-sqlite` below that). Nx is fully removed — repo is npm workspaces (`"workspaces": ["web","api"]` in root `package.json`), with `web/package.json` and `api/package.json` owning their own deps/scripts. API builds via `@nestjs/cli` (`api/nest-cli.json`, plain `tsc`, no webpack); web builds via a root-level `angular.json` (must stay at repo root — Angular CLI resolves paths relative to that file's own directory). `shared/src/models.ts` was renamed to `shared/src/models.d.ts` (pure types, zero runtime exports) to stop tsc's inferred common source root drifting to the repo root. `api/jest.config.cts` is standalone (no `@nx/jest` preset), explicit `moduleNameMapper` for `@shared/models`. Root `eslint.config.mjs` is `typescript-eslint` + `eslint-config-prettier` (ignores `web/**`); `web/eslint.config.mjs` is `angular-eslint`. `data/notes.sqlite.bak-pre-node-sqlite` is a pre-migration safety backup, safe to delete once confident.

This session migrated the repo's context-file layout from the old `jookoi-doc` convention (`current-state.md`/`next-steps.md`/`progress.md`) to `jookoi-paper-trail` (`TODO.md` + `archive/`). Old session history is now in `archive/2026-09.md`. Also added `.graphifyignore` and `_architecture/graphify/README.md` — this repo's `/graphify` skill is the Windows-Python-backed variant hardcoded to root `graphify-out/`, not the npm `graphify` CLI, so output intentionally stays at repo root rather than `_architecture/graphify/`.

## Checklist

<!-- Hand-maintained: add, check off, remove. Mixes done/in-progress/pending. Persists
     across sessions until flush archives it. -->

- [x] Migrate `_architecture/` from `jookoi-doc` layout to `jookoi-paper-trail` layout
- [x] Consolidate scattered root-level plan/architecture docs into `_architecture/`
- [x] Remove abandoned `mempalace` experiment
- [x] Wire up `_architecture/graphify/` (added `.graphifyignore` + README documenting the output-location deviation)
