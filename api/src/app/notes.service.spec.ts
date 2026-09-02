import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SqliteDb } from './database.provider';
import { NotesService } from './notes.service';

const USER_ID = 'test-user';

describe('NotesService', () => {
  let service: NotesService;
  let db: SqliteDb;
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'notes-service-spec-'));
    db = new SqliteDb(join(dir, 'notes.sqlite'));
    service = new NotesService(db);
  });

  afterEach(() => {
    db.onModuleDestroy();
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates and updates a markdown document', async () => {
    const folder = await service.createFolder({ name: 'guides', parentId: null }, USER_ID);
    const document = await service.createDocument(
      { name: 'intro.md', folderId: folder.id, content: '# Hello' },
      USER_ID,
    );

    const updated = await service.updateDocument(document.id, '# Updated', USER_ID);

    expect(updated.content).toBe('# Updated');
    expect(updated.folderId).toBe(folder.id);
  });

  it('searches document content', async () => {
    await service.createDocument(
      { name: 'searchable.md', folderId: null, content: 'Find this exact phrase in the saved note.' },
      USER_ID,
    );

    const results = await service.search('exact phrase', USER_ID);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      name: 'searchable.md',
      type: 'document',
    });
  });

  it('deletes folder subtrees recursively, atomically', async () => {
    const parent = await service.createFolder({ name: 'parent', parentId: null }, USER_ID);
    const child = await service.createFolder({ name: 'child', parentId: parent.id }, USER_ID);
    const nested = await service.createDocument(
      { name: 'nested.md', folderId: child.id, content: 'nested' },
      USER_ID,
    );

    await service.deleteFolder(parent.id, USER_ID);

    await expect(service.getTree(USER_ID)).resolves.toEqual([]);
    await expect(service.getDocument(nested.id, USER_ID)).rejects.toThrow('Document not found');
  });
});
