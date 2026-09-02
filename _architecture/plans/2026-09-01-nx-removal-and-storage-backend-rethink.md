# nx-removal-and-storage-backend-rethink

Session: 2026-09-01. Status: planning, not started.

## Context

Repo's been test-driven a while, now looking at two structural changes before more feature work lands:

1. **Nx is a liability for lockdown environments.** Nx pulls a native binary (the Nx daemon), plugin packages (`@nx/*` ×8), and its own cache/graph machinery. Anywhere binaries are blocked or dependencies are tightly audited, this breaks. Goal: drop Nx, keep the two-app (web/api) structure working with something that has no daemon and no native binary of its own.
2. **Storage backend rethink.** Currently NestJS + TypeORM + `sqlite3` (native binary, compiled via node-gyp). Preference is flat `.md` files per entry for local use, but that loses fast structured search. Need to confirm the trade-off and pick a replacement that's pure JS / zero-binary.

Constraint across both: no binary installs, no Docker, no Linux-specific bits. Has to run in locked-down environments.

## Decision 1 — drop Nx

**What Nx buys today:** `nx run-many`, `nx serve`, cached builds, the daemon. Repo has exactly two projects (web, api) — this is a small win for a large dependency bill.

**Replacement: npm workspaces + plain scripts.** No daemon, no native binary, nothing to compile.

- Confirmed via research: npm workspaces alone doesn't do dependency-graph task ordering or caching — for a 2-project repo that's not needed, plain `npm run build --workspace=web && npm run build --workspace=api` covers it.
- Turborepo was the obvious "lightweight alternative" candidate, but it ships its own Rust binary — fails the zero-binary requirement. Ruled out.
- Angular CLI's own build path still pulls in `esbuild`/`@swc/core`, both native binaries, regardless of Nx. **This is not solvable by dropping Nx alone** — if a truly binary-free build matters, that's a separate, bigger call about whether Angular's tolerable here at all. Flagging it now so it's not "discovered" mid-migration.

**Scope of the removal:**
- Delete `nx.json`, `.nx/`, `@nx/*` deps, `nx` itself from `package.json`.
- Replace `package.json` scripts (`build`, `start:web`, `start:api`, `test`, `watch`) with direct calls into each project's own tooling (`ng build`, `ng serve`, `jest`/`vitest` directly) via npm workspaces.
- Verify `web/` and `api/` each has its own `package.json` addressable as a workspace, or restructure minimally so they do.
- Confirm test runner story post-Nx: `@nx/jest` plugin currently owns `test` target wiring — needs a plain `jest.config.ts` per project instead.

## Decision 2 — storage backend

**Is flat-MD-plus-search a real option, or does it lose search for good?** Confirmed: it's a real option. Search loss is not inherent to flat files — it's inherent to *not having an index*. A pure-JS full-text index built over the flat files gets equivalent search without a database process.

- **[MiniSearch](https://github.com/lucaong/minisearch)** — recommended default. No dependencies, small footprint, runs in Node or browser, good enough for exact/fuzzy match and autosuggest. Rebuild the index from the `.md` tree on startup (or incrementally on file change) and keep it in memory — no persistence layer needed at this repo's scale.
- **FlexSearch** — faster at 100k+ documents with more tuning knobs, but heavier API. Overkill unless the archive grows far past what one person's notes look like.
- Both are pure JS, zero native deps — satisfies the constraint either way.

**If a DB is still wanted instead of flat files:** `node:sqlite` (built into Node since 22.5, stable candidate on 22.13+, fully stable on 26) replaces `sqlite3`/`better-sqlite3` with zero install and zero native compile — same SQL, no binary. Worth knowing as a fallback if flat-file search turns out to be insufficient in practice, but the flat-MD + MiniSearch path is the one that matches the stated preference and should be tried first.

**Recommended direction:** flat `.md` files as source of truth, MiniSearch index built in-process for search, drop TypeORM + `sqlite3` + the DB layer entirely. This also shrinks the NestJS surface — less ORM wiring, fewer entities, no migrations to maintain.

## Build order

1. Nx removal first — it's self-contained, doesn't touch data/search, lower risk, and de-risks the repo for lockdown environments immediately.
   - Swap `package.json` scripts to npm-workspaces-native equivalents.
   - Remove `nx.json`, `.nx/`, `@nx/*` packages.
   - Re-verify `build`, `test`, `serve` all still work per-project.
2. Storage backend second, once Nx is out of the way and doesn't complicate the migration:
   - Spike MiniSearch against the current `data/` markdown tree — confirm search quality (filename, heading, full-text) matches or beats current DB-backed search.
   - Design the flat-file layout (one `.md` per entry — confirm current `data/` shape already matches this or needs restructuring).
   - Strip TypeORM entities/migrations, replace with a file-read + in-memory-index API layer in `api/`.
   - Migrate existing sqlite data (if any live data exists beyond POC) to `.md` files — one-time export script.
3. Re-test end to end. Existing test suite should mostly transfer for the web layer; API tests need rewriting around the new file+index layer instead of TypeORM repositories.

## Implementation deviations

<!-- Added once the build diverges from what this plan said. Future reads reconcile
     against this section, not just the sections above. -->

**2026-09-01 — sequencing, and DB choice within Decision 2.** Decision 2 (storage backend) was implemented before Decision 1 (Nx removal), reversing this plan's stated Build order — see `plans/decisions/` if a decision record was filed, otherwise the reasoning: it was self-contained and lower-risk to validate node:sqlite against the real data first. Within Decision 2, `node:sqlite` was chosen over the recommended flat-MD + MiniSearch path — user's explicit call ("test out node:sqlite first since its closer to what we have built already"), not a rejection of the flat-file direction. Flat-MD + MiniSearch remains the documented option above if node:sqlite proves insufficient later. Full implementation plan: `C:\Users\Joosep\.claude\plans\fancy-sauteeing-puzzle.md`. Nx removal (Decision 1) is unstarted.
