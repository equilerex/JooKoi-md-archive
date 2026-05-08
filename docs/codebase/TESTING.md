# Testing Patterns

## Core Sections (Required)

### 1) Test Stack and Commands

- Primary test framework: Jest (v30.0.2)
- Assertion/mocking tools: Jest, `@nestjs/testing`
- Commands:

```bash
npm run test         # Run all tests via Nx
nx test api          # Run backend tests
nx test web          # Run frontend tests
```

### 2) Test Layout

- Test file placement pattern: Co-located with the source file (e.g., `api/src/app/notes.service.spec.ts`).
- Naming convention: `*.spec.ts`.
- Setup files: `jest.preset.js` and `jest.config.ts` in root and project directories.

### 3) Test Scope Matrix

| Scope | Covered? | Typical target | Notes |
|-------|----------|----------------|-------|
| Unit | Yes | Services, Controllers, Components | Tests logic in isolation or with minimal dependencies. |
| Integration | Yes | API and DB boundaries | Uses in-memory SQLite for full-flow tests of services. |
| E2E | [TODO] | User flows | Playwright/Cypress not yet configured in this POC. |

### 4) Mocking and Isolation Strategy

- Main mocking approach: 
    - **Backend**: Uses `TypeOrmModule.forRoot({ database: ':memory:' })` for true integration isolation without side effects on the local DB file.
    - **Frontend**: Standard Angular testing with `TestBed`.
- Isolation guarantees: Each test suite in `notes.service.spec.ts` creates a fresh in-memory database in `beforeEach`.

### 5) Coverage and Quality Signals

- Coverage tool: Built-in Jest coverage reporting.
- Current reported coverage: [TODO]
- Known gaps: E2E testing and coverage of edge cases in path resolution logic.

### 6) Evidence

- [jest.config.ts](../../jest.config.ts)
- [api/src/app/notes.service.spec.ts](../../api/src/app/notes.service.spec.ts)
- [web/src/app/app.spec.ts](../../web/src/app/app.spec.ts)
