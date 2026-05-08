# Coding Conventions

## Core Sections (Required)

### 1) Naming Rules

| Item | Rule | Example | Evidence |
|------|------|---------|----------|
| Files | kebab-case | `notes-page.ts`, `document.entity.ts` | File tree |
| Functions/methods | camelCase | `getTree()`, `createDocument()` | `notes.service.ts` |
| Types/interfaces | PascalCase | `DocumentDetail`, `TreeNode` | `shared/src/models.ts` |
| Constants/env vars | SCREAMING_SNAKE_CASE | `AUTH_USERNAME`, `TOKEN_SECRET` | `.env.example` |

### 2) Formatting and Linting

- Formatter: Prettier (Config: `.prettierrc`)
- Linter: ESLint (Config: `eslint.config.mjs`)
- Most relevant enforced rules:
    - `@nx/enforce-module-boundaries`: Enforces clean dependencies between apps and libraries.
    - Standard TypeScript/JavaScript flat configs from Nx.
- Run commands: `npm run lint` (via Nx)

### 3) Import and Module Conventions

- Import grouping/order: Framework imports first, then external libs, then internal modules.
- Alias vs relative import policy: Uses Nx workspace aliases (e.g., `@shared/models`) for cross-project imports; relative imports for local feature files.
- Public exports/barrel policy: `shared/src/index.ts` (if it exists) usually acts as the entry point for shared types.

### 4) Error and Logging Conventions

- Error strategy:
    - **Backend**: Uses NestJS `HttpException` variants (e.g., `NotFoundException`, `BadRequestException`) which map to standard HTTP codes.
    - **Frontend**: API errors are caught in components or stores and displayed via UI feedback (e.g., snackbars or error states).
- Logging: Backend uses NestJS `Logger` for application events and startup info.

### 5) Testing Conventions

- Test file naming: `.spec.ts` suffix.
- Location: Adjacent to the file being tested (e.g., `notes.service.spec.ts`).
- Mocking strategy: Uses Jest mocks/spies for services and TypeORM repositories.

### 6) Evidence

- [eslint.config.mjs](../../eslint.config.mjs)
- [.prettierrc](../../.prettierrc)
- [api/src/app/notes.service.ts](../../api/src/app/notes.service.ts)
- [shared/src/models.ts](../../shared/src/models.ts)
