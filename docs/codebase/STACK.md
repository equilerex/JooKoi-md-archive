# Technology Stack

## Core Sections (Required)

### 1) Runtime Summary

| Area | Value | Evidence |
|------|-------|----------|
| Primary language | TypeScript | `package.json`, `tsconfig.json` |
| Runtime + version | Node.js (Version defined in lockfile) | `package-lock.json` |
| Package manager | npm | `package-lock.json` |
| Module/build system | Nx (with Webpack/Angular Build) | `nx.json`, `package.json` |

### 2) Production Frameworks and Dependencies

| Dependency | Version | Role in system | Evidence |
|------------|---------|----------------|----------|
| @angular/core | ~21.2.0 | Frontend Framework | `package.json` |
| @nestjs/core | ^11.0.0 | Backend Framework | `package.json` |
| typeorm | ^0.3.28 | Database ORM | `package.json` |
| sqlite3 | ^5.1.7 | Database Engine | `package.json` |
| marked | ^18.0.3 | Markdown Parsing | `package.json` |
| highlight.js | ^11.11.1 | Syntax Highlighting | `package.json` |

### 3) Development Toolchain

| Tool | Purpose | Evidence |
|------|---------|----------|
| nx | Workspace & Task Orchestration | `nx.json` |
| jest | Testing Framework | `jest.config.ts` |
| eslint | Linting | `eslint.config.mjs` |
| prettier | Formatting | `.prettierrc` |

### 4) Key Commands

```bash
npm install          # Install dependencies
npm run build        # Build everything via Nx
npm run start:web    # Serve Angular frontend
npm run start:api    # Serve NestJS backend
npm run test         # Run tests for both apps
```

### 5) Environment and Config

- Config sources: `.env`, `.env.example`, `nx.json`, `tsconfig.json`
- Required env vars: `AUTH_USERNAME`, `AUTH_PASSWORD`, `TOKEN_SECRET`
- Deployment/runtime constraints: Requires a writable `data/` directory for the SQLite database.

### 6) Evidence

- [package.json](../../package.json)
- [nx.json](../../nx.json)
- [.env.example](../../.env.example)
- [.codebase-scan.txt](./.codebase-scan.txt)
