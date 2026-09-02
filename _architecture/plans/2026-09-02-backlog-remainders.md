# backlog remainders

Session: 2026-09-02. Status: build order steps 1-3 and 6 done; 4, 5 and 7 still open. See Implementation deviations.

## Context

`backlog.md` carried seven OPEN items written before the Nx-removal refactor. Reading the
current code against them, most are not open at all — four are substantially or fully built
and the entries were never updated. Planning them as greenfield work would have meant
rebuilding working code.

This plan re-states each item as the delta between what exists now and what the entry asked
for, so the remaining work is the actual remaining work. Two entries are closed outright, four
shrink to bug-fix or polish scope, and one (the create-file flow) is the only genuinely
unbuilt feature left.

## Current state per backlog entry

**Encrypt folder/file names in URL — built.** `CryptoService` (`web/src/app/core/services/crypto.service.ts`)
XORs against the username and base64s, prefixing `e:`. Applied in `NotesPage.navigateToNode`
and in `TreeNode.nodeHref`, decoded in `toPathSegments`. Two defects, not absences:

- Standard base64 emits `/` and `+`. A `/` inside a path segment splits the route and the URL
  resolves to the wrong node, or to nothing. Names long enough to produce one are common.
- The key is the username, so this is obfuscation, not encryption. That satisfies the stated
  goal (browser history stops showing readable names) but the entry's wording overpromises.

**Drag-and-drop move — built, backend included.** The entry says "backend move endpoints
aren't implemented yet"; they are. `NotesService.moveFolder` / `moveDocument`
(`api/src/app/notes.service.ts:161-211`) enforce every semantic `API_EDGE_CASES.md` §11–12
asks for: self-move, descendant-move, sibling name collision, and folder/document path-name
collision, all inside a transaction. `NotesController` exposes both as `PATCH .../move`. The
frontend is wired end to end through `TreeNode`'s HTML5 drag handlers into
`NotesPage.handleDrop`. Remaining gaps are UX, listed under Build order.

**Sticky header — built by layout.** `.jo-workspace` is a flex column; `.jo-toolbar` and
`.jo-breadcrumbs` are `flex-shrink: 0` and scrolling happens inside `MarkdownPreview`'s host
(`overflow-y: auto`) and the textarea. The header cannot scroll away. No `position: sticky`
needed; confirm on a real device rather than adding one.

**Clickable breadcrumbs — built, incomplete.** `focusBreadcrumb` navigates to the folder,
which routes through `selectFolder` and expands ancestors. What the entry also asked for —
the tree visibly revealing the target — does not happen: nothing scrolls the tree panel, and
on mobile the drawer stays shut, so the effect is invisible.

**Mobile UX pass — mostly built.** The Android text-field fix is in `reset.scss:129-150`
(explicit `background-color` + `color` on every text input type, plus autofill overrides). The
drawer exists: `.jo-sidebar--mobile` is a fixed off-canvas panel with a backdrop and a toolbar
toggle. What is missing is `<meta name="color-scheme" content="light">` in `web/src/index.html`
— without it Android Chrome force-dark still inverts every surface the reset does not name.

**MDX + Mermaid — rendering built, controls absent.** `.mdx` is accepted everywhere (the
`\.(md|mdx)$/i` regexes on both sides, and the API's `ensureMarkdownName`). Mermaid renders via
`MarkdownService.renderMermaid`, re-run on every content change from `NotesPage`'s effect. The
diagram interaction the entry asks for — direction flip, graph type, theme, download, zoom/pan
— is entirely unbuilt.

**Collapse and sort state — genuinely broken, two independent causes.** Detailed below.

**Create-file flow — genuinely unbuilt.** The only entry that needs building from nothing.

## Build order

Ordered by cost-to-value. 1–3 are small and unblock trust in the rest.

### 1. base64url in path segments

`CryptoService.encrypt` / `decrypt`: translate `+/` to `-_` and strip `=` on the way out,
reverse on the way in. Contained to that one file; every caller keeps its signature.

Existing URLs stop resolving. That is acceptable for a single-user archive with no external
links, but it is a real break — bookmarks die. If that matters, keep `decrypt` tolerant of both
alphabets and only emit the new one.

### 2. `color-scheme` meta

One line in `web/src/index.html`. Verify on the Android device that prompted the entry; if
force-dark still bites, the next step is `color-scheme: light` on `:root` in `styles.scss`,
not more per-element colour patches.

### 3. Collapse and sort persistence

Three separate fixes in `NotesTreeStore`:

- **Sort is not persisted at all.** `sortByState` is a bare signal. Add it to `localStorage`
  alongside the expanded-ids key, read in the field initialiser.
- **Collapsing every root folder resets them all open.** `markExpanded` derives
  `hasSavedState` from `expandedIds.size > 0`, so an empty saved set is indistinguishable
  from "never saved" and the `parentId === null` default re-expands. Persist an explicit
  "has state" marker, or store the whole `{ expandedIds, sortBy }` object and test for the
  object's presence rather than the set's size.
- **Opening a document re-expands ancestors you collapsed.** `expandParents` both expands and
  persists on every `openDocument`. Expanding to reveal the open document is right; writing
  that back to storage as the user's preference is not. Separate the two — expand in memory,
  persist only user-initiated `toggleFolder`.

Fixing sort alone will look like a fix and leave the confusing half in place, so do all three.

### 4. Drag-and-drop polish

- `TreeNode.isDropTarget` returns true for *every* folder while a drag is active, so the whole
  tree lights up and nothing indicates the actual target. Track hover state from
  `dragover`/`dragleave` locally instead.
- No root drop zone — a nested item cannot be dragged back out to root. The API already
  accepts `null`; add a droppable strip at the top of `.jo-tree-panel`.
- Every drop triggers a full `loadTree`. Fine at current scale; note it against the
  `getTree` scaling risk already recorded in `ARCHITECTURE.md`.
- Touch does not fire HTML5 drag events, so this is desktop-only. The Move menu item covers
  mobile — leave it, don't build a touch drag layer for a single-user archive.

### 5. Breadcrumb reveal

Give the tree panel a scroll-into-view for the selected node, and open the drawer on mobile
when a breadcrumb is clicked. Needs a handle on the selected node's element — either a
`viewChild` query from `NotesPage` down through `TreeNode`, or a `data-node-id` attribute and
a `querySelector` on the panel. The attribute is less machinery for the same result.

### 6. Create-file flow

The largest behavioural change. Today `createDocument` opens a name modal and POSTs
immediately, so an unnamed empty file exists before anything is typed. Target:

1. "New file" opens the editor on an unsaved draft — no modal, no server call.
2. Draft content is seeded from `navigator.clipboard.readText()`. This needs a permission
   prompt and fails silently in insecure contexts; treat an empty read as "start blank"
   rather than an error.
3. The filename derives from the first `# heading` in the draft. `MarkdownService` already
   has `extractTitle` and `sanitizeFilename` for exactly this and neither is called anywhere
   — wire them up rather than writing new ones. `sanitizeFilename` currently lowercases and
   strips to `[a-z0-9-]`, which drops emoji as the entry wants but also destroys any non-ASCII
   name; widen it if that matters.
4. The derived name stays editable before save.
5. Save POSTs to `createDocument`, then transitions the page to editing the real document.

The state model is the hard part, not the UI: `NotesPage` currently keys everything off
`selectedDocument()` being non-null, and `isDirty` compares against `selectedDocument().content`.
An unsaved draft has no document. Add an explicit draft mode rather than faking a
`DocumentDetail` with a placeholder id — a fake id will leak into `navigateToNode`,
`treeStore.findNodeById`, and the save path.

Name collisions surface only at save time. `ensureDocumentNameAvailableSync` returns a 400;
show it against the filename field and keep the draft alive.

### 7. Mermaid controls

Genuinely new surface, and the only item with no existing foothold. Split it:

- **Zoom/pan** — smallest and most useful. Mermaid emits an SVG with a viewBox; wheel and
  drag handlers over it are self-contained.
- **Download** — serialise the rendered SVG to a blob. PNG needs a canvas round-trip; SVG
  alone probably suffices.
- **Direction / graph type / theme editing** — this rewrites the user's markdown source, not
  just the rendering. Direction is a token swap in the diagram's first line (`graph TD` →
  `graph LR`); graph type is not (`graph` → `sequenceDiagram` invalidates every following
  line). Scope this to direction and theme only, and leave graph type out.

Theme is `mermaid.initialize({ theme })` — global, set once at construction. Per-diagram theme
means re-initialising before each run, which is a bigger change than it looks.

## Unrelated defect found while reading

`notes-page.html:27` uses `routerLink="/"` but `NotesPage`'s `imports` array has no
`RouterLink`. The attribute is inert — the sidebar brand does not navigate. One import fixes it.

## Implementation deviations

**Build order was not followed.** Steps 1-3 went first as planned, then step 6 (create-file
flow) jumped the queue because the user asked for it directly. Steps 4, 5 and 7 are untouched.

**Step 1 had a consequence the plan missed.** `encrypt-util.html` at repo root implements the
same algorithm and had to change in lockstep. The plan treated `CryptoService` as self-contained
because nothing imports the util — it is a standalone offline page, invisible to the dependency
graph. Pasted note ciphertext still round-tripped (decode is alphabet-tolerant), but decoding a
URL segment copied from the browser broke until the util was updated.

**`isLikelyEncrypted` turned out to be load-bearing, not vestigial.** The plan flagged it as a
sniff worth replacing. Reading the call sites showed the app never encrypts at all: ciphertext
is produced offline and pasted in, so that sniff was the only way a document was ever marked
encrypted. Removing it needed a replacement in the same change, not a follow-up. Recorded as
decision 001; the encryption model is now in `architecture.md`, which had said nothing about it.

**Step 6 shipped in a different shape than specified.** The plan described a modal-free "New
file" button seeding from the clipboard. What was built instead: selecting a folder leaves the
editor live, and saving a non-empty draft creates the file in that folder. Same underlying state
model, and the plan's warning about placeholder document ids held — draft mode is the absence of
`selectedDocument()` plus non-empty content. Clipboard seeding was dropped; the sidebar modal
still exists, so there are now two ways to create a file and it is worth deciding whether the
modal earns its place. Filename derivation landed as planned via the previously-dead
`extractTitle` / `sanitizeFilename`, with `sanitizeFilename` extended to strip diacritics rather
than turn every one into a separator — the plan noted it "destroys any non-ASCII name" but
treated widening it as optional, which it is not for Estonian headings.

**One defect found mid-build that the plan never anticipated.** Every tree row click did a full
page reload. The row is an `<a href>` wrapping a div, and the div's `stopPropagation` stopped the
event reaching the anchor handler that called `preventDefault` — stopping propagation does not
cancel a link's default navigation. This was the most visible bug in the app and no backlog
entry described it, because the entries were written from intent rather than from use.

**Draft mode created a data-loss path that needed guarding in five places, not two.** Every
route that ends in `loadTree(() => navigateToNode(...))` discards an unsaved draft: tree
selection, breadcrumbs, create folder, create document, drag-drop, rename, move.
