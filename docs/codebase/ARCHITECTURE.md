# Architecture

## Core Sections (Required)

### 1) Architectural Style

- Primary style: Feature-based Layered Architecture
- Why this classification: The project is organized into clear backend (api) and frontend (web) applications. The frontend follows a feature-based structure (`features/notes`, `features/auth`), while the backend uses a classic Controller-Service-Repository pattern.
- Primary constraints:
    - Path Determinism: Prevents same-parent collisions between folders and documents to keep deep-linking reliable.
    - Single-user POC: Auth is intentionally minimal for a proof-of-concept.
    - Local Persistence: Relies on a local SQLite file.

### 2) System Flow

```text
Browser (URL) -> Angular Router -> NotesPageComponent -> NotesTreeStore (Signals) -> NestJS Controller -> NotesService -> TypeORM -> SQLite
```

1. **Routing**: Angular Router detects path changes (e.g., `/notes/my-folder/my-doc`) and activates the `NotesPageComponent`.
2. **State Management**: `NotesTreeStore` uses Signals to manage the hierarchical tree and the currently selected item.
3. **API Call**: The frontend service sends a request to the NestJS `NotesController` (e.g., `GET /api/notes/tree`).
4. **Business Logic**: `NotesService` validates the operation (checking for collisions, verifying parents) and interacts with repositories.
5. **Data Access**: TypeORM executes SQL queries against the `data/notes.sqlite` database.
6. **Response**: Data is returned as shared DTOs and rendered reactively in the tree UI.

### 3) Layer/Module Responsibilities

| Layer or module | Owns | Must not own | Evidence |
|-----------------|------|--------------|----------|
| api/ | Business logic, DB schema, auth verification, path validation | UI state, browser storage | `api/src/app/notes.service.ts` |
| web/ | Tree rendering, inline editing, route-to-item resolution | Direct SQL queries, file system access | `web/src/app/features/notes/pages/notes-page/notes-page.ts` |
| shared/ | Contract definitions (Interfaces, DTOs, Enums) | Implementation logic, framework-specific code | `shared/src/models.ts` |

### 4) Reused Patterns

| Pattern | Where found | Why it exists |
|---------|-------------|---------------|
| Repository | `api/src/app/notes.service.ts` | Abstracts database access via TypeORM. |
| Signal Store | `web/src/app/features/notes/data-access/notes-tree.store.ts` | Provides reactive, efficient state for the hierarchical tree. |
| DTO (Data Transfer Object) | `shared/src/models.ts` | Ensures type safety for data flowing between API and Web. |

### 5) Known Architectural Risks

- **Concurrency**: SQLite and local file writes may have issues under concurrent multi-user access (though designed for single-user POC).
- **Scalability**: The entire tree is currently loaded into memory/sent to frontend (`getTree`), which may slow down as the archive grows.

### 6) Evidence

- [api/src/app/notes.service.ts](../../api/src/app/notes.service.ts)
- [web/src/app/features/notes/pages/notes-page/notes-page.ts](../../web/src/app/features/notes/pages/notes-page/notes-page.ts)
- [shared/src/models.ts](../../shared/src/models.ts)
