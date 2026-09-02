# AGENTS.md

## What this repo is

A single-user markdown-note archive. Angular frontend (`web/`), NestJS backend (`api/`), shared DTOs (`shared/`), SQLite for storage. Full shape and reasoning: [_architecture/architecture.md](_architecture/architecture.md). User-facing behavior: [README.md](README.md).

## Repo-specific conventions

- `web/` and `api/` are independent npm workspaces (`"workspaces": ["web", "api"]`), not an Nx monorepo. Each owns its own deps, lint, and test config.
- `angular.json` lives at repo root, not inside `web/`. The Angular CLI resolves paths relative to that file, so it can't move.
- `shared/src/models.d.ts` is a `.d.ts` on purpose (type declarations only, zero runtime exports). Keeps `tsc`'s inferred common source root from drifting to repo root when `api` resolves `@shared/models`.
- Data access in `api/` is raw `node:sqlite` (`database.provider.ts` + `notes.service.ts`), no ORM. Requires Node `>=23.4`, or `--experimental-sqlite` below that.
- Folder and document names can't collide with a sibling under the same parent (folder `foo` vs document `foo.md`). This is what keeps path-based deep links deterministic. Full edge-case spec: [_architecture/API_EDGE_CASES.md](_architecture/API_EDGE_CASES.md).
- `data/notes.sqlite` is the live database file. Production needs a writable `data/` directory at runtime.

## Working notes

- Decisions made and rejected: `_architecture/plans/decisions/`.
- Live task list: `_architecture/backlog.md`.
- This repo uses the `jookoi-paper-trail` convention: update `_architecture/architecture.md` when structure or key decisions change, don't let it drift.

## Graphify

This repo has a Graphify knowledge graph (`graphify-out/`). For architecture or cross-module questions, read `graphify-out/GRAPH_REPORT.md` first. For targeted lookups use `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` instead of grepping the whole tree. After editing code, run `graphify update .` to keep the graph current (AST-only, no API cost).

`graphify-out/` and `.tokensave/` are gitignored. Both are local LLM-tooling caches (Graphify's graph dump, TokenSave's code index), cheap to regenerate from source and not needed by a fresh clone. Run `graphify update .` / let TokenSave reindex to rebuild them.
