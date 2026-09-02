# Graphify wiring

This repo runs graphify via the `.claude/skills/graphify` slash-command skill (Windows-Python backed, hardcoded to `graphify-out/` at repo root for every step), not the standalone `graphify` npm CLI. The personal convention of redirecting `--out` to `_architecture/graphify/graphify-out/` doesn't apply here — the skill's step scripts don't take an `--out` flag.

- Output lives at repo-root `graphify-out/` (graph.json, GRAPH_REPORT.md, graph.html, manifest, cache). Committed as source, not `_generated/` — extraction is LLM-expensive, not cheaply rebuildable.
- `.graphifyignore` (repo root) excludes `node_modules/`, `graphify-out/` itself, and `_jookoi-*` private notes from re-ingestion.
- Refresh after code changes: `graphify update .` (AST-only, no LLM cost) or invoke `/graphify` for a full rebuild.

If this repo ever switches to the real `graphify` CLI, re-point `--out` at this folder and update `.claude/CLAUDE.md`'s `graphify-out/` paths to match — see `utility-scripts/jookoi-graphify-setup` in `JooKoi-developer-stack` for that setup.
