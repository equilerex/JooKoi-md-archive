import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateDocumentRequest,
  CreateFolderRequest,
  DocumentDetail,
  SearchResult,
  TreeNode,
} from '@shared/models';
import { SqliteDb, nowUtc, parseUtc, withTransaction } from './database.provider';

interface FolderRow {
  id: string;
  userId: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DocumentRow {
  id: string;
  userId: string;
  name: string;
  folderId: string | null;
  content: string;
  encrypted: 0 | 1;
  createdAt: string;
  updatedAt: string;
}

function newId(): string {
  return crypto.randomUUID();
}

@Injectable()
export class NotesService {
  constructor(private readonly db: SqliteDb) {}

  async getTree(userId: string): Promise<TreeNode[]> {
    return this.getTreeSync(userId);
  }

  async getDocument(id: string, userId: string): Promise<DocumentDetail> {
    const document = this.findDocumentById(id, userId);
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return this.toDocumentDetail(document);
  }

  async createFolder(input: CreateFolderRequest, userId: string): Promise<TreeNode> {
    return withTransaction(this.db.conn, () => {
      const name = input.name.trim();
      const parentId = input.parentId ?? null;
      this.ensureParentFolderExistsSync(parentId, userId);
      this.ensureFolderNameAvailableSync(parentId, name, undefined, userId);
      this.ensureFolderPathNameAvailableSync(parentId, name, undefined, userId);

      const now = nowUtc();
      const folder: FolderRow = {
        id: newId(),
        userId,
        name,
        parentId,
        createdAt: now,
        updatedAt: now,
      };

      this.db.conn
        .prepare(
          'INSERT INTO folders (id, userId, name, parentId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run(folder.id, folder.userId, folder.name, folder.parentId, folder.createdAt, folder.updatedAt);

      return this.toFolderTreeNode(folder);
    });
  }

  async createDocument(input: CreateDocumentRequest, userId: string): Promise<DocumentDetail> {
    return withTransaction(this.db.conn, () => {
      const name = input.name.trim();
      this.ensureMarkdownName(name);
      const folderId = input.folderId ?? null;
      this.ensureParentFolderExistsSync(folderId, userId);
      this.ensureDocumentNameAvailableSync(folderId, name, undefined, userId);
      this.ensureDocumentPathNameAvailableSync(folderId, name, undefined, userId);

      const now = nowUtc();
      const document: DocumentRow = {
        id: newId(),
        userId,
        name,
        folderId,
        content: input.content ?? '',
        encrypted: input.encrypted ? 1 : 0,
        createdAt: now,
        updatedAt: now,
      };

      this.db.conn
        .prepare(
          'INSERT INTO documents (id, userId, name, folderId, content, encrypted, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .run(
          document.id,
          document.userId,
          document.name,
          document.folderId,
          document.content,
          document.encrypted,
          document.createdAt,
          document.updatedAt,
        );

      return this.toDocumentDetail(document);
    });
  }

  async renameFolder(id: string, name: string, userId: string): Promise<TreeNode> {
    return withTransaction(this.db.conn, () => {
      const folder = this.findFolderById(id, userId);
      if (!folder) {
        throw new NotFoundException('Folder not found');
      }

      const nextName = name.trim();
      this.ensureFolderNameAvailableSync(folder.parentId, nextName, folder.id, userId);
      this.ensureFolderPathNameAvailableSync(folder.parentId, nextName, folder.id, userId);

      const updatedAt = nowUtc();
      this.db.conn
        .prepare('UPDATE folders SET name = ?, updatedAt = ? WHERE id = ? AND userId = ?')
        .run(nextName, updatedAt, id, userId);

      return this.toFolderTreeNode({ ...folder, name: nextName, updatedAt });
    });
  }

  async renameDocument(id: string, name: string, userId: string): Promise<DocumentDetail> {
    return withTransaction(this.db.conn, () => {
      const document = this.findDocumentById(id, userId);
      if (!document) {
        throw new NotFoundException('Document not found');
      }

      const nextName = name.trim();
      this.ensureMarkdownName(nextName);
      this.ensureDocumentNameAvailableSync(document.folderId, nextName, document.id, userId);
      this.ensureDocumentPathNameAvailableSync(document.folderId, nextName, document.id, userId);

      const updatedAt = nowUtc();
      this.db.conn
        .prepare('UPDATE documents SET name = ?, updatedAt = ? WHERE id = ? AND userId = ?')
        .run(nextName, updatedAt, id, userId);

      return this.toDocumentDetail({ ...document, name: nextName, updatedAt });
    });
  }

  async moveFolder(id: string, parentId: string | null, userId: string): Promise<TreeNode> {
    return withTransaction(this.db.conn, () => {
      const folder = this.findFolderById(id, userId);
      if (!folder) {
        throw new NotFoundException('Folder not found');
      }

      if (parentId === id) {
        throw new BadRequestException('Cannot move a folder into itself');
      }

      this.ensureParentFolderExistsSync(parentId, userId);

      if (parentId) {
        const descendantIds = this.collectFolderIdsSync(id, userId);
        if (descendantIds.includes(parentId)) {
          throw new BadRequestException('Cannot move a folder into its own descendant');
        }
      }

      this.ensureFolderNameAvailableSync(parentId, folder.name, folder.id, userId);
      this.ensureFolderPathNameAvailableSync(parentId, folder.name, undefined, userId);

      const updatedAt = nowUtc();
      this.db.conn
        .prepare('UPDATE folders SET parentId = ?, updatedAt = ? WHERE id = ? AND userId = ?')
        .run(parentId, updatedAt, id, userId);

      return this.toFolderTreeNode({ ...folder, parentId, updatedAt });
    });
  }

  async moveDocument(id: string, folderId: string | null, userId: string): Promise<DocumentDetail> {
    return withTransaction(this.db.conn, () => {
      const document = this.findDocumentById(id, userId);
      if (!document) {
        throw new NotFoundException('Document not found');
      }

      this.ensureParentFolderExistsSync(folderId, userId);
      this.ensureDocumentNameAvailableSync(folderId, document.name, document.id, userId);
      this.ensureDocumentPathNameAvailableSync(folderId, document.name, undefined, userId);

      const updatedAt = nowUtc();
      this.db.conn
        .prepare('UPDATE documents SET folderId = ?, updatedAt = ? WHERE id = ? AND userId = ?')
        .run(folderId, updatedAt, id, userId);

      return this.toDocumentDetail({ ...document, folderId, updatedAt });
    });
  }

  async updateDocument(
    id: string,
    content: string,
    userId: string,
    encrypted?: boolean,
  ): Promise<DocumentDetail> {
    return withTransaction(this.db.conn, () => {
      const document = this.findDocumentById(id, userId);
      if (!document) {
        throw new NotFoundException('Document not found');
      }

      const nextEncrypted = encrypted !== undefined ? (encrypted ? 1 : 0) : document.encrypted;
      const updatedAt = nowUtc();
      this.db.conn
        .prepare('UPDATE documents SET content = ?, encrypted = ?, updatedAt = ? WHERE id = ? AND userId = ?')
        .run(content, nextEncrypted, updatedAt, id, userId);

      return this.toDocumentDetail({ ...document, content, encrypted: nextEncrypted, updatedAt });
    });
  }

  async deleteDocument(id: string, userId: string): Promise<void> {
    withTransaction(this.db.conn, () => {
      const result = this.db.conn.prepare('DELETE FROM documents WHERE id = ? AND userId = ?').run(id, userId);
      if (!result.changes) {
        throw new NotFoundException('Document not found');
      }
    });
  }

  async deleteFolder(id: string, userId: string): Promise<void> {
    withTransaction(this.db.conn, () => {
      const folder = this.findFolderById(id, userId);
      if (!folder) {
        throw new NotFoundException('Folder not found');
      }

      const folderIds = this.collectFolderIdsSync(id, userId);
      const placeholders = folderIds.map(() => '?').join(', ');

      this.db.conn
        .prepare(`DELETE FROM documents WHERE userId = ? AND folderId IN (${placeholders})`)
        .run(userId, ...folderIds);

      this.db.conn
        .prepare(`DELETE FROM folders WHERE userId = ? AND id IN (${placeholders})`)
        .run(userId, ...folderIds);
    });
  }

  async search(query: string, userId: string): Promise<SearchResult[]> {
    const term = query.trim();
    if (!term) {
      return [];
    }

    const like = `%${term}%`;

    const folders = this.db.conn
      .prepare(
        'SELECT * FROM folders WHERE userId = ? AND LOWER(name) LIKE LOWER(?) ORDER BY name ASC LIMIT 10',
      )
      .all(userId, like) as unknown as FolderRow[];

    const documents = this.db.conn
      .prepare(
        'SELECT * FROM documents WHERE userId = ? AND (LOWER(name) LIKE LOWER(?) OR LOWER(content) LIKE LOWER(?)) ORDER BY updatedAt DESC LIMIT 10',
      )
      .all(userId, like, like) as unknown as DocumentRow[];

    return [
      ...folders.map<SearchResult>((folder) => ({
        id: folder.id,
        name: folder.name,
        type: 'folder',
        parentId: folder.parentId,
      })),
      ...documents.map<SearchResult>((document) => ({
        id: document.id,
        name: document.name,
        type: 'document',
        parentId: document.folderId,
        snippet: this.createSnippet(document.content, term),
      })),
    ];
  }

  private getTreeSync(userId: string): TreeNode[] {
    const folders = this.db.conn
      .prepare('SELECT * FROM folders WHERE userId = ? ORDER BY name ASC')
      .all(userId) as unknown as FolderRow[];
    const documents = this.db.conn
      .prepare('SELECT * FROM documents WHERE userId = ? ORDER BY name ASC')
      .all(userId) as unknown as DocumentRow[];

    const nodes = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    for (const folder of folders) {
      nodes.set(folder.id, {
        id: folder.id,
        name: folder.name,
        type: 'folder',
        parentId: folder.parentId,
        createdAt: parseUtc(folder.createdAt),
        updatedAt: parseUtc(folder.updatedAt),
        children: [],
      });
    }

    for (const folderNode of nodes.values()) {
      if (folderNode.parentId && nodes.has(folderNode.parentId)) {
        nodes.get(folderNode.parentId)!.children!.push(folderNode);
      } else {
        roots.push(folderNode);
      }
    }

    for (const document of documents) {
      const node: TreeNode = {
        id: document.id,
        name: document.name,
        type: 'document',
        parentId: document.folderId,
        createdAt: parseUtc(document.createdAt),
        updatedAt: parseUtc(document.updatedAt),
      };

      if (document.folderId && nodes.has(document.folderId)) {
        nodes.get(document.folderId)!.children!.push(node);
      } else {
        roots.push(node);
      }
    }

    this.sortTree(roots);
    return roots;
  }

  private ensureParentFolderExistsSync(parentId: string | null, userId: string): void {
    if (!parentId) {
      return;
    }

    const folder = this.findFolderById(parentId, userId);
    if (!folder) {
      throw new NotFoundException('Parent folder not found');
    }
  }

  private ensureFolderNameAvailableSync(
    parentId: string | null,
    name: string,
    excludeId: string | undefined,
    userId: string,
  ): void {
    const existing = this.findFolderByParentAndName(parentId, name, userId);
    if (existing && existing.id !== excludeId) {
      throw new BadRequestException('A folder with this name already exists here');
    }
  }

  private ensureDocumentNameAvailableSync(
    folderId: string | null,
    name: string,
    excludeId: string | undefined,
    userId: string,
  ): void {
    const existing = this.findDocumentByFolderAndName(folderId, name, userId);
    if (existing && existing.id !== excludeId) {
      throw new BadRequestException('A document with this name already exists here');
    }
  }

  private ensureMarkdownName(name: string): void {
    if (!/\.(md|mdx)$/i.test(name)) {
      throw new BadRequestException('Document name must end with .md or .mdx');
    }
  }

  private ensureFolderPathNameAvailableSync(
    parentId: string | null,
    name: string,
    excludeDocumentId: string | undefined,
    userId: string,
  ): void {
    const existingDocument = this.findDocumentByFolderAndName(parentId, `${name}.md`, userId);
    if (existingDocument && existingDocument.id !== excludeDocumentId) {
      throw new BadRequestException('A document with the same path name already exists here');
    }
  }

  private ensureDocumentPathNameAvailableSync(
    folderId: string | null,
    name: string,
    excludeFolderId: string | undefined,
    userId: string,
  ): void {
    const existingFolder = this.findFolderByParentAndName(
      folderId,
      this.toDocumentPathSegment(name),
      userId,
    );
    if (existingFolder && existingFolder.id !== excludeFolderId) {
      throw new BadRequestException('A folder with the same path name already exists here');
    }
  }

  private collectFolderIdsSync(rootId: string, userId: string): string[] {
    const folders = this.db.conn
      .prepare('SELECT * FROM folders WHERE userId = ?')
      .all(userId) as unknown as FolderRow[];
    const childrenByParent = new Map<string | null, string[]>();

    for (const folder of folders) {
      const ids = childrenByParent.get(folder.parentId) ?? [];
      ids.push(folder.id);
      childrenByParent.set(folder.parentId, ids);
    }

    const pending = [rootId];
    const result: string[] = [];

    while (pending.length > 0) {
      const current = pending.shift()!;
      result.push(current);
      pending.push(...(childrenByParent.get(current) ?? []));
    }

    return result;
  }

  private findFolderById(id: string, userId: string): FolderRow | null {
    return (
      (this.db.conn.prepare('SELECT * FROM folders WHERE id = ? AND userId = ?').get(id, userId) as
        | FolderRow
        | undefined) ?? null
    );
  }

  private findDocumentById(id: string, userId: string): DocumentRow | null {
    return (
      (this.db.conn.prepare('SELECT * FROM documents WHERE id = ? AND userId = ?').get(id, userId) as
        | DocumentRow
        | undefined) ?? null
    );
  }

  private findFolderByParentAndName(
    parentId: string | null,
    name: string,
    userId: string,
  ): FolderRow | null {
    const row =
      parentId === null
        ? this.db.conn
            .prepare('SELECT * FROM folders WHERE userId = ? AND parentId IS NULL AND name = ?')
            .get(userId, name)
        : this.db.conn
            .prepare('SELECT * FROM folders WHERE userId = ? AND parentId = ? AND name = ?')
            .get(userId, parentId, name);

    return (row as FolderRow | undefined) ?? null;
  }

  private findDocumentByFolderAndName(
    folderId: string | null,
    name: string,
    userId: string,
  ): DocumentRow | null {
    const row =
      folderId === null
        ? this.db.conn
            .prepare('SELECT * FROM documents WHERE userId = ? AND folderId IS NULL AND name = ?')
            .get(userId, name)
        : this.db.conn
            .prepare('SELECT * FROM documents WHERE userId = ? AND folderId = ? AND name = ?')
            .get(userId, folderId, name);

    return (row as DocumentRow | undefined) ?? null;
  }

  private toFolderTreeNode(folder: FolderRow): TreeNode {
    return {
      id: folder.id,
      name: folder.name,
      type: 'folder',
      parentId: folder.parentId,
      createdAt: parseUtc(folder.createdAt),
      updatedAt: parseUtc(folder.updatedAt),
      children: [],
    };
  }

  private toDocumentDetail(document: DocumentRow): DocumentDetail {
    return {
      id: document.id,
      name: document.name,
      folderId: document.folderId,
      content: document.content,
      encrypted: !!document.encrypted,
      createdAt: parseUtc(document.createdAt),
      updatedAt: parseUtc(document.updatedAt),
    };
  }

  private createSnippet(content: string, query: string): string | undefined {
    const index = content.toLowerCase().indexOf(query.toLowerCase());
    if (index < 0) {
      return undefined;
    }

    const start = Math.max(0, index - 30);
    const end = Math.min(content.length, index + query.length + 50);
    return content.slice(start, end).replace(/\s+/g, ' ').trim();
  }

  private toDocumentPathSegment(name: string): string {
    return name.replace(/\.(md|mdx)$/i, '');
  }

  private sortTree(nodes: TreeNode[]): void {
    nodes.sort((left, right) => {
      if (left.type !== right.type) {
        return left.type === 'folder' ? -1 : 1;
      }

      return left.name.localeCompare(right.name);
    });

    for (const node of nodes) {
      if (node.children) {
        this.sortTree(node.children);
      }
    }
  }
}
