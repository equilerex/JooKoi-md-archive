# Codebase Structure

## Core Sections (Required)

### 1) Top-Level Map

| Path | Purpose | Evidence |
|------|---------|----------|
| api/ | NestJS Backend application | `api/project.json` |
| web/ | Angular Frontend application | `web/project.json` |
| shared/ | Shared TypeScript models and interfaces | `shared/src/models.ts` |
| data/ | SQLite database storage and runtime data | `README.md` |
| docs/codebase/ | AI-optimized codebase documentation | Created by skill |

### 2) Entry Points

- Main runtime entry: `api/src/main.ts` (Backend), `web/src/main.ts` (Frontend)
- Secondary entry points: None
- How entry is selected: Nx scripts in `package.json` (`npm run start:api`, `npm run start:web`)

### 3) Module Boundaries

| Boundary | What belongs here | What must not be here |
|----------|-------------------|------------------------|
| api/ | Server-side logic, database access, auth verification | Browser APIs, UI components |
| web/ | UI components, client-side state, API orchestration | Direct SQL queries, file system access |
| shared/ | Pure types, interfaces, DTOs | Runtime logic, platform-specific code |

### 4) Naming and Organization Rules

- File naming pattern: kebab-case (e.g., `notes-page.component.ts`, `app.module.ts`)
- Directory organization pattern: Feature-based (e.g., `web/src/app/features/notes/`)
- Import aliasing: Nx workspace standard paths (e.g., `import { ... } from '@jokoivi/shared'`)

### 5) Evidence

- [.codebase-scan.txt](./.codebase-scan.txt)
- [package.json](../../package.json)
- [api/src/main.ts](../../api/src/main.ts)
- [web/src/main.ts](../../web/src/main.ts)
