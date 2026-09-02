# TODO
<!-- Live working set. `jookoi-paper-trail flush` archives it and resets it. See AGENTS.md. -->

## Context

<!-- Rewritten wholesale whenever stale, never appended to. Present tense. 5-20 lines.
     What a cold session needs to know to avoid re-deriving it. -->

Repo shape, the storage backend and the encryption model are in `architecture.md` — read that rather than re-deriving them here.

Everything from the 2026-09-02 session is **uncommitted and unreviewed** in the working tree: nine source files plus this directory. The user commits personally and always does so themselves. `npx ng build web` from repo root is the check that matters (npm workspaces, so no `nx` commands); it passes.

`backlog.md` was written from intent rather than from use, so its entries drifted badly out of step with the code — four of seven described work that was already built, and the single most visible defect in the app (a full page reload on every tree row click) had no entry at all. Re-read entries against the code before scoping them. Current scope and build order: `plans/2026-09-02-backlog-remainders.md`, whose *Implementation deviations* section is the accurate record of what actually shipped.

Three things are built but unverified against a running app, because this session had no way to launch one: the Android `color-scheme` fix, the tree-click reload fix (especially that ctrl-click still opens a new tab), and the draft-save transition landing the user in the newly created file rather than back on its folder.

`data/notes.sqlite.bak-pre-node-sqlite` is a pre-migration safety backup, safe to delete once confident.

## Checklist

<!-- Hand-maintained: add, check off, remove. Mixes done/in-progress/pending. Persists
     across sessions until flush archives it. -->

- [x] Migrate `_architecture/` from `jookoi-doc` layout to `jookoi-paper-trail` layout
- [x] Consolidate scattered root-level plan/architecture docs into `_architecture/`
- [x] Remove abandoned `mempalace` experiment
- [x] Wire up `_architecture/graphify/` (added `.graphifyignore` + README documenting the output-location deviation)
- [x] Re-read `backlog.md`'s seven entries against the code; four were already built and mis-stated. Scoped in `plans/2026-09-02-backlog-remainders.md`
- [x] base64url the URL path segments — standard base64's `/` splits the route and breaks deep links. Decode stays tolerant of the old alphabet, so existing bookmarks survive
- [x] `<meta name="color-scheme" content="light">` so Android force-dark stops inverting unnamed surfaces — needs confirming on the Android device that prompted the entry
- [x] Import `RouterLink` into `NotesPage` — the sidebar brand's `routerLink` is inert without it
- [x] Persist tree collapse + sort state (three causes in `NotesTreeStore`: sort never saved; empty saved set reads as "never saved"; `expandParents` persists auto-expansion as user intent). Storage is now a `{ expandedIds, sortBy }` object under the old key, migrating the legacy bare array. Auto-revealed ids are tracked separately and filtered out at persist time, so an unrelated toggle can't launder them into storage
- [x] Fix full-page reload on every tree row click. The row is an `<a href>` wrapping a div; the div's `stopPropagation` kept the anchor's `preventDefault` from ever running, and stopping propagation does not cancel a link's default navigation. Modified clicks still fall through to real new-tab behaviour
- [x] Replace the sniffed `encrypted` flag with an explicit toolbar toggle; `isLikelyEncrypted` deleted. Note ciphertext still comes from `encrypt-util.html` — the app never encrypts
- [x] Selecting a folder now leaves the editor live; typing and hitting Save creates a file there (or in the first root folder), named from the first `#` heading. Draft mode is the absence of `selectedDocument()` plus non-empty content — deliberately no placeholder document id, which would leak into routing and the save path
- [ ] Breadcrumb click should scroll the target into view in the tree, and open the drawer on mobile
- [ ] Drag-and-drop polish: hover-only drop highlight, root-level drop zone
- [ ] Mermaid controls: zoom/pan, SVG download, direction + theme switching
- [ ] Decide whether the sidebar "New file" modal still earns its place now that a folder-selected draft creates files too
