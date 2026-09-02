# Backlog — logged, not yet scoped

<!-- Unordered. Promote to TODO.md's Checklist when an item gets a real slot. See AGENTS.md. -->

Entries here were re-read against the code on 2026-09-02, and the ones that shipped that day were
removed rather than left sitting as stale OPEN items. Scope and build order live in
[plans/2026-09-02-backlog-remainders.md](plans/2026-09-02-backlog-remainders.md); its
*Implementation deviations* section records what actually shipped versus what was planned.

Write entries from what the code does, not from intent. The seven that were here before that
re-read had drifted far enough that four described finished work, and the app's most visible
defect had no entry at all.

## Breadcrumb click should reveal the target in the tree

Status: DESIGNED

Breadcrumbs already navigate and expand ancestors, but nothing scrolls the tree panel, so on a long tree the effect is invisible. Remaining: scroll the target node into view, and open the drawer on mobile. Simplest handle is a `data-node-id` attribute on the row plus a `querySelector` on the panel, rather than threading a `viewChild` query down through `TreeNode`.

## Drag-and-drop move

Status: DESIGNED

Backend move endpoints exist with full `API_EDGE_CASES.md` §11–12 semantics; the frontend is wired end to end. Remaining: drop-target highlight fires on every folder instead of the hovered one, and there's no root-level drop zone.

## MDX + Mermaid rendering

Status: DESIGNED

`.md`/`.mdx` and Mermaid all render today. Remaining: zoom/pan over the diagram, SVG download, and direction/theme switching. Graph-type switching is out of scope — it invalidates the diagram body.

## Retire the manual encrypt/decrypt round trip

Status: OPEN

Encrypting a note today means leaving the app, using `encrypt-util.html`, and pasting ciphertext back in. Doing it in-app on save would remove that round trip without giving the server plaintext, which is the property worth keeping (see `plans/decisions/001-encrypted-flag-declared-not-sniffed.md`). Deferred there as a bigger change than the flag bug required. Not the same thing as replacing the XOR algorithm, which was declined on threat model — the key is the login name, so this is obfuscation either way.

## Tree/rename/move operations refetch the entire tree

Status: OPEN

Every mutation path in `NotesPage` - `handleDrop`, `renameSelected`, `moveSelected`, `createFolder`, `createDocument` - finishes with `treeStore.loadTree(...)`, which refetches the whole archive from `GET /notes/tree`. Not a page reload, so no white flash, but it will stutter visibly once the archive grows. Compounds the `getTree` scaling risk already recorded in architecture.md: the endpoint serialises every folder and document in one response. Fix is optimistic local tree mutation for the node that changed, falling back to a refetch only on error.
