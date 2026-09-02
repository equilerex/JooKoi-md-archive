import { Injectable, OnModuleDestroy, Optional } from '@nestjs/common';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';

// DDL copied verbatim from `PRAGMA sqlite_master` on the real data/notes.sqlite
// file (originally created by TypeORM's `synchronize: true`). Keep exact column
// constraints, the FK, and index names in sync with that file so this is a true
// no-op against it — see _architecture/plans/2026-09-01-nx-removal-and-storage-backend-rethink.md.
const SCHEMA_DDL = `
CREATE TABLE IF NOT EXISTS "folders" (
  "id" varchar PRIMARY KEY NOT NULL,
  "userId" varchar NOT NULL,
  "name" varchar NOT NULL,
  "parentId" varchar,
  "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
  "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "documents" (
  "id" varchar PRIMARY KEY NOT NULL,
  "userId" varchar NOT NULL,
  "name" varchar NOT NULL,
  "folderId" varchar,
  "content" text NOT NULL DEFAULT (''),
  "encrypted" boolean NOT NULL DEFAULT (0),
  "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
  "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
  CONSTRAINT "FK_cf0a9fa48053d1f93da40713cc1" FOREIGN KEY ("folderId") REFERENCES "folders" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "IDX_8d8ac467d8e1454aae6338d5e4" ON "folders" ("userId", "parentId", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "IDX_41815440fcd3c26b816c638e40" ON "documents" ("userId", "folderId", "name");
`;

@Injectable()
export class SqliteDb implements OnModuleDestroy {
  readonly conn: DatabaseSync;

  constructor(@Optional() databasePath?: string) {
    this.conn = new DatabaseSync(databasePath ?? join(process.cwd(), 'data', 'notes.sqlite'));
    this.conn.exec(SCHEMA_DDL);
  }

  onModuleDestroy(): void {
    this.conn.close();
  }
}

/** Runs `fn` inside BEGIN/COMMIT. `fn` MUST be fully synchronous — no `await`
 * may occur between BEGIN and COMMIT, or a concurrent request's BEGIN on this
 * same connection throws "cannot start a transaction within a transaction". */
export function withTransaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    if (db.isTransaction) {
      db.exec('ROLLBACK');
    }
    throw err;
  }
}

export function nowUtc(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export function parseUtc(value: string): string {
  return new Date(`${value.replace(' ', 'T')}Z`).toISOString();
}
