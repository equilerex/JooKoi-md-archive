# Backlog — logged, not yet scoped

<!-- Unordered. Promote to TODO.md's Checklist when an item gets a real slot. See AGENTS.md. -->

## Mobile UX pass

Status: OPEN

On Android, text-field color renders white/near-invisible against the background (needs explicit color — see reset.scss fix, [reset.scss](../web/src/app/reset.scss)). File tree should become a drawer/bottom-sheet on mobile with a sticky toggle button.

## Sticky header + clickable breadcrumbs

Status: OPEN

Header (filename + breadcrumbs) should stay sticky on scroll, both web and mobile. Breadcrumbs should be clickable and focus/open the corresponding folder in the file tree.

## Encrypt folder/file names in URL history

Status: OPEN

Folder/file names in the header/URL should be encrypted so browser history doesn't leak what was viewed.

## MDX + Mermaid rendering

Status: OPEN

Render function should support both `.md` and `.mdx`, and Mermaid diagrams within markdown.

## Drag-and-drop move

Status: OPEN

Drag and drop of files/folders onto folder targets to move them. Backend move endpoints for documents and folders aren't implemented yet — see `API_EDGE_CASES.md` (this folder) sections 11–12 for the required semantics (block moving a folder into itself/its descendant, block sibling name collisions, regenerate route from new path).

## Bug: folder collapse state not retained

Status: OPEN

Some folders don't retain their collapsed/expanded state across reloads; others do. Inconsistent, needs repro.

## Legacy feature parity (pre-rewrite markdown viewer)

Status: OPEN

Gaps against the prior version of this app, not yet covered by the items above: print/PDF-optimized CSS, copy-to-clipboard button on code blocks, unsaved-changes indicator badge, "paste markdown" quick-entry dialog, syncing selected document to a URL query param (`?doc=...`) for deep-linking/back-button support, auto-generated filenames from a document's first heading.
