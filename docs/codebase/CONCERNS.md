# Codebase Concerns

## Core Sections (Required)

### 1) Top Risks (Prioritized)

| Severity | Concern | Evidence | Impact | Suggested action |
|----------|---------|----------|--------|------------------|
| High | Hardcoded POC Credentials | `README.md`, `.env.example` | Potential for accidental leak or weak production setup. | Move to a robust secrets manager or enforce environment-based secrets. |
| Med | Full Tree Loading | `api/src/app/notes.service.ts:27` | Performance degradation as the number of notes increases. | Implement lazy-loading for the tree branches or pagination. |
| Low | Outdated Documentation | `README.md` structure vs actual filesystem | Confusion for new contributors or AI agents. | Update README to reflect feature-based directory structure. |

### 2) Technical Debt

| Debt item | Why it exists | Where | Risk if ignored | Suggested fix |
|-----------|---------------|-------|-----------------|---------------|
| Feature-based Structure Mismatch | Project was refactored but README stayed high-level. | `web/src/app` | Onboarding friction. | Update README's "Project Structure" section. |
| Minimal Error Handling | Focused on happy-path for POC. | `web/src/app/features/notes/pages/notes-page/notes-page.ts` | Poor UX on network or validation failures. | Add global error interceptors or local error states for API calls. |

### 3) Security Concerns

| Risk | OWASP category | Evidence | Current mitigation | Gap |
|------|----------------|----------|--------------------|-----|
| Insecure Auth | A07: Identification and Authentication Failures | `api/src/app/auth.service.ts` | Simple token-based check. | No password hashing or robust session management. |

### 4) Performance and Scaling Concerns

| Concern | Evidence | Current symptom | Scaling risk | Suggested improvement |
|---------|----------|-----------------|-------------|-----------------------|
| Database Concurrency | `data/notes.sqlite` | SQLite write-locks. | Blocking operations under high volume. | Switch to a dedicated RDBMS (PostgreSQL) if multi-user support is added. |
| Large Tree Bloat | `getTree()` loads all nodes. | Slower response times. | Memory exhaustion in frontend. | Implement hierarchical lazy loading. |

### 5) Fragile/High-Churn Areas

| Area | Why fragile | Churn signal | Safe change strategy |
|------|-------------|-------------|----------------------|
| `api/src/app/notes.service.ts` | Contains core logic for path collision and recursive deletions. | High complexity and logical branches. | Ensure full test coverage in `notes.service.spec.ts` before refactoring. |

### 6) `[ASK USER]` Questions

1. [ASK USER] Are there plans to transition from a single-user POC to a multi-user system?
2. [ASK USER] Should we prioritize the lazy-loading of the note tree or is the current volume expected to remain small?

### 7) Evidence

- [README.md](../../README.md)
- [api/src/app/notes.service.ts](../../api/src/app/notes.service.ts)
- [.codebase-scan.txt](./.codebase-scan.txt)
