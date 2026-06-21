import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router, UrlSegment } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DocumentDetail } from '@shared/models';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { CryptoService } from '../../../../core/services/crypto.service';
import { MarkdownService } from '../../../../core/services/markdown.service';
import { getHttpErrorMessage } from '../../../../shared/utils/http-error-message';
import { MarkdownPreview } from '../../components/markdown-preview/markdown-preview';
import { TreeNode } from '../../components/tree-node/tree-node';
import { NotesApiService } from '../../data-access/notes-api.service';
import { NotesTreeStore } from '../../data-access/notes-tree.store';
import { BreadcrumbItem, TreeStateNode } from '../../models/notes.models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MarkdownPreview,
    TreeNode,
    MatButtonModule,
    MatButtonToggleModule,
    MatChipsModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatSelectModule,
    MatSidenavModule,
    MatToolbarModule,
    MatTooltipModule,
    DatePipe,
  ],
  selector: 'jo-notes-page',
  templateUrl: './notes-page.html',
  styleUrl: './notes-page.scss',
})
export class NotesPage {
  private static readonly defaultFolderName = 'A bucket';

  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(NotesApiService);
  private readonly authService = inject(AuthService);
  private readonly markdown = inject(MarkdownService);
  private readonly crypto = inject(CryptoService);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly treeStore = inject(NotesTreeStore);
  private readonly previewComponent = viewChild(MarkdownPreview);
  private readonly breakpointObserver = inject(BreakpointObserver);

  protected readonly saving = signal(false);
  protected readonly drawerOpen = signal(false);
  protected readonly isMobile = signal(false);
  protected readonly mobileView = signal<'edit' | 'preview'>('edit');
  protected readonly searchQuery = signal('');
  protected readonly pageError = signal<string | null>(null);
  protected readonly selectedDocument = signal<DocumentDetail | null>(null);
  protected readonly documentLoading = signal(false);
  protected readonly draftContent = signal('');
  protected readonly showScrollTop = signal(false);
  protected readonly draggedNodeId = signal<string | null>(null);
  protected readonly modal = signal<{
    mode: 'folder' | 'document' | 'rename' | 'move';
    label: string;
    placeholder: string;
    value: string;
    confirm: (value: string) => void;
  } | null>(null);
  protected readonly renderedContent = computed<SafeHtml | string>(() => {
    const doc = this.selectedDocument();
    let content = this.draftContent();
    if (!content) {
      return '';
    }

    if (doc?.encrypted) {
      content = this.crypto.decrypt(content);
    }

    const html = this.markdown.parse(content);
    return this.sanitizer.bypassSecurityTrustHtml(html);
  });
  protected readonly breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const nodeId = this.selectedNodeId();
    if (!nodeId) {
      return [];
    }

    const pathNodes = this.findPathNodesByNodeId(nodeId, this.treeStore.tree());
    if (!pathNodes?.length) {
      return [];
    }

    const crumbs: BreadcrumbItem[] = [{ name: 'Home', kind: 'home' }];

    for (let index = 0; index < pathNodes.length - 1; index += 1) {
      crumbs.push({ name: pathNodes[index].name, kind: 'folder', folderId: pathNodes[index].id });
    }

    const last = pathNodes[pathNodes.length - 1];
    crumbs.push({
      name: last.name,
      kind: last.type === 'document' ? 'document' : 'folder',
      folderId: last.type === 'folder' ? last.id : undefined,
      current: true,
    });

    return crumbs;
  });
  protected readonly isDirty = computed(() => {
    const doc = this.selectedDocument();
    if (!doc) return false;
    return doc.content !== this.draftContent();
  });

  protected readonly documentTitle = computed(() => {
    const content = this.draftContent();
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : (this.selectedDocument()?.name?.replace(/\.(md|mdx)$/i, '') ?? null);
  });

  constructor() {
    this.breakpointObserver
      .observe([Breakpoints.Handset, Breakpoints.TabletPortrait])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        this.isMobile.set(result.matches);
        if (result.matches) {
          this.drawerOpen.set(false);
        }
      });

    effect(() => {
      this.renderedContent();
      const container = this.previewComponent()?.container()?.nativeElement;
      if (container) {
        queueMicrotask(() => {
          this.addCopyButtons(container);
          void this.markdown.renderMermaid(container);
        });
      }
    });

    this.route.url.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((segments) => {
      if (!this.authService.isAuthenticated()) {
        return;
      }

      const pathSegments = this.toPathSegments(segments);
      if (this.treeStore.tree().length === 0) {
        this.treeStore.loadTree(() => this.resolveRouteSegments(pathSegments));
      } else {
        this.resolveRouteSegments(pathSegments);
      }
    });
  }

  protected toggleFolder(nodeId: string): void {
    this.treeStore.toggleFolder(nodeId);
  }

  protected selectedNodeId(): string | null {
    return this.treeStore.selectedNodeId();
  }

  protected handleNodeSelection(node: TreeStateNode): void {
    this.drawerOpen.set(false);
    this.navigateToNode(node.id, false);
  }

  protected createFolder(): void {
    this.modal.set({
      mode: 'folder',
      label: 'New folder',
      placeholder: 'Folder name',
      value: '',
      confirm: (name) => {
        this.modal.set(null);
        this.api.createFolder({ name, parentId: this.treeStore.activeFolderId() }).subscribe({
          next: (folder) => this.treeStore.loadTree(() => this.navigateToNode(folder.id, false), true),
          error: (error) => this.setError(error),
        });
      },
    });
  }

  protected createDocument(): void {
    this.modal.set({
      mode: 'document',
      label: 'New document',
      placeholder: 'filename.md',
      value: '',
      confirm: (name) => {
        this.modal.set(null);
        const normalizedName = this.normalizeDocumentName(name);
        if (!normalizedName) return;
        this.api.createDocument({
          name: normalizedName,
          folderId: this.treeStore.activeFolderId(),
          content: '',
        }).subscribe({
          next: (document) => this.treeStore.loadTree(() => this.navigateToNode(document.id, false), true),
          error: (error) => this.setError(error),
        });
      },
    });
  }

  protected renameSelected(): void {
    const current = this.treeStore.findNodeById(this.selectedNodeId());
    if (!current) return;

    this.modal.set({
      mode: 'rename',
      label: `Rename ${current.type}`,
      placeholder: 'New name',
      value: current.name,
      confirm: (nextName) => {
        this.modal.set(null);
        if (!nextName.trim()) return;
        if (current.type === 'folder') {
          this.api.renameFolder(current.id, { name: nextName }).subscribe({
            next: () => this.treeStore.loadTree(() => this.navigateToNode(current.id, true), true),
            error: (error) => this.setError(error),
          });
        } else {
          this.api.renameDocument(current.id, { name: nextName }).subscribe({
            next: () => this.treeStore.loadTree(() => this.navigateToNode(current.id, true), true),
            error: (error) => this.setError(error),
          });
        }
      },
    });
  }

  protected moveSelected(): void {
    const current = this.treeStore.findNodeById(this.selectedNodeId());
    if (!current) return;

    const currentPath = current.parentId ? (this.getParentPath(current.id) ?? '/') : '/';
    this.modal.set({
      mode: 'move',
      label: `Move to folder`,
      placeholder: 'Path or / for root',
      value: currentPath,
      confirm: (destinationInput) => {
        this.modal.set(null);
        const destinationFolder = this.resolveDestinationFolder(destinationInput);
        if (destinationFolder === undefined) {
          this.pageError.set('Destination folder not found');
          return;
        }
        this.pageError.set(null);
        if (current.type === 'folder') {
          this.api.moveFolder(current.id, { parentId: destinationFolder?.id ?? null }).subscribe({
            next: () => this.treeStore.loadTree(() => this.navigateToNode(current.id, true), true),
            error: (error) => this.setError(error),
          });
        } else {
          this.api.moveDocument(current.id, { folderId: destinationFolder?.id ?? null }).subscribe({
            next: () => this.treeStore.loadTree(() => this.navigateToNode(current.id, true), true),
            error: (error) => this.setError(error),
          });
        }
      },
    });
  }

  protected deleteSelected(): void {
    const current = this.treeStore.findNodeById(this.selectedNodeId());
    if (!current) {
      return;
    }

    const confirmed = window.confirm(
      current.type === 'folder'
        ? `Delete folder "${current.name}" and all nested content?`
        : `Delete document "${current.name}"?`,
    );
    if (!confirmed) {
      return;
    }

    const onDelete = (): void => {
      if (current.type === 'document' && this.selectedDocument()?.id === current.id) {
        this.selectedDocument.set(null);
        this.draftContent.set('');
      }

      this.treeStore.reset();
      void this.router.navigateByUrl('/', { replaceUrl: true });
    };

    if (current.type === 'folder') {
      this.api.deleteFolder(current.id).subscribe({
        next: () => onDelete(),
        error: (error) => this.setError(error),
      });
      return;
    }

    this.api.deleteDocument(current.id).subscribe({
      next: () => onDelete(),
      error: (error) => this.setError(error),
    });
  }

  protected saveDocument(): void {
    const selectedDocument = this.selectedDocument();
    if (!selectedDocument) {
      return;
    }

    const isEncrypted = this.crypto.isLikelyEncrypted(this.draftContent());
    const content = this.draftContent();

    this.saving.set(true);
    this.api
      .updateDocument(selectedDocument.id, { content, encrypted: isEncrypted })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (document) => {
          this.selectedDocument.set({ ...document, encrypted: isEncrypted });
          this.draftContent.set(document.content);
        },
        error: (error) => this.setError(error),
      });
  }

  protected runSearch(): void {
    const query = this.searchQuery().trim();
    if (!query) {
      this.treeStore.setSearchResults([]);
      return;
    }

    this.api.search(query).subscribe({
      next: (results) => {
        this.treeStore.setSearchResults(results);
      },
      error: (error) => this.setError(error),
    });
  }

  protected copyToClipboard(): void {
    const text = this.draftContent();
    if (!text) return;
    navigator.clipboard.writeText(text).catch(() => alert('Failed to copy'));
  }

  protected scrollToTop(): void {
    const container = this.previewComponent()?.container()?.nativeElement;
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
      this.showScrollTop.set(false);
    }
  }

  protected onRenderScroll(event: Event): void {
    const target = event.target as HTMLElement;
    this.showScrollTop.set(target.scrollTop > 200);
  }

  protected logout(): void {
    this.authService.logout();
    this.treeStore.reset();
    this.selectedDocument.set(null);
    this.documentLoading.set(false);
    this.draftContent.set('');
    this.searchQuery.set('');
    this.pageError.set(null);
    void this.router.navigate(['/login'], { replaceUrl: true });
  }

  protected printContent(): void {
    window.print();
  }

  protected focusBreadcrumb(folderId: string): void {
    const node = this.treeStore.findNodeById(folderId);
    if (!node || node.type !== 'folder') {
      return;
    }

    this.navigateToNode(folderId, false);
  }

  protected changeSortBy(sortBy: 'name' | 'date'): void {
    this.treeStore.setSortBy(sortBy);
  }

  protected handleDragStart(node: TreeStateNode): void {
    this.draggedNodeId.set(node.id);
  }

  protected handleDragEnd(): void {
    this.draggedNodeId.set(null);
  }

  protected handleDrop(event: { sourceId: string; targetId: string }): void {
    this.draggedNodeId.set(null);

    const sourceNode = this.treeStore.findNodeById(event.sourceId);
    if (!sourceNode) {
      return;
    }

    if (sourceNode.type === 'folder') {
      this.api.moveFolder(event.sourceId, { parentId: event.targetId }).subscribe({
        next: () => this.treeStore.loadTree(() => this.navigateToNode(event.sourceId, true), true),
        error: (error) => this.setError(error),
      });
    } else {
      this.api.moveDocument(event.sourceId, { folderId: event.targetId }).subscribe({
        next: () => this.treeStore.loadTree(() => this.navigateToNode(event.sourceId, true), true),
        error: (error) => this.setError(error),
      });
    }
  }

  private resolveRouteSegments(segments: string[]): void {
    if (segments.length === 0) {
      this.openDefaultFolder();
      return;
    }

    const resolvedNode = this.resolveNodeByPath(segments, this.treeStore.tree());
    if (!resolvedNode) {
      this.pageError.set('Path not found');
      return;
    }

    this.pageError.set(null);
    if (resolvedNode.type === 'folder') {
      this.selectFolder(resolvedNode);
      return;
    }

    this.openDocument(resolvedNode.id);
  }

  private openDefaultFolder(): void {
    const defaultFolder = this.resolveNodeByPath(
      [NotesPage.defaultFolderName],
      this.treeStore.tree(),
    );
    if (defaultFolder?.type === 'folder') {
      this.selectFolder(defaultFolder);
      void this.router.navigate(['notes', this.crypto.encryptSegment(this.toPathSegment(defaultFolder))], {
        replaceUrl: true,
      });
      return;
    }

    this.api.createFolder({ name: NotesPage.defaultFolderName, parentId: null }).subscribe({
      next: () => this.treeStore.loadTree(() => this.openDefaultFolder()),
      error: (error) => this.setError(error),
    });
  }

  private selectFolder(node: TreeStateNode): void {
    this.treeStore.setSelectedNodeId(node.id);
    this.treeStore.setActiveFolderId(node.id);
    this.treeStore.expandParents(node.parentId);
    if (!node.expanded) {
      this.treeStore.toggleFolder(node.id);
    }
    this.selectedDocument.set(null);
    this.draftContent.set('');
  }

  private openDocument(id: string): void {
    this.documentLoading.set(true);
    this.api
      .getDocument(id)
      .pipe(finalize(() => this.documentLoading.set(false)))
      .subscribe({
        next: (document) => {
          this.selectedDocument.set(document);
          this.draftContent.set(document.content);
          this.treeStore.setActiveFolderId(document.folderId);
          this.treeStore.setSelectedNodeId(document.id);
          this.treeStore.expandParents(document.folderId);
        },
        error: (error) => this.setError(error),
      });
  }

  private navigateToNode(nodeId: string, replaceUrl: boolean): void {
    const pathSegments = this.findPathSegmentsByNodeId(nodeId, this.treeStore.tree());
    if (!pathSegments) {
      return;
    }

    const encodedSegments = pathSegments.map((seg) => this.crypto.encryptSegment(seg));
    void this.router.navigate(['notes', ...encodedSegments], { replaceUrl });
  }

  private toPathSegments(segments: UrlSegment[]): string[] {
    return segments.slice(1).map((segment) =>
      this.crypto.decryptSegment(decodeURIComponent(segment.path)),
    );
  }

  private resolveNodeByPath(segments: string[], nodes: TreeStateNode[]): TreeStateNode | null {
    let currentNodes = nodes;
    let currentNode: TreeStateNode | null = null;

    for (const [index, segment] of segments.entries()) {
      const isLast = index === segments.length - 1;
      const nextNode = currentNodes.find((node) => {
        if (node.type === 'folder') {
          return node.name === segment;
        }

        return isLast && this.toDocumentPathSegment(node.name) === segment;
      });
      if (!nextNode) {
        return null;
      }

      if (!isLast && nextNode.type !== 'folder') {
        return null;
      }

      currentNode = nextNode;
      currentNodes = nextNode.children ?? [];
    }

    return currentNode;
  }

  private resolveDestinationFolder(destination: string): TreeStateNode | null | undefined {
    const trimmed = destination.trim();
    if (!trimmed || trimmed === '/') {
      return null;
    }

    const normalizedSegments = trimmed
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean);
    const resolvedNode = this.resolveNodeByPath(normalizedSegments, this.treeStore.tree());
    if (!resolvedNode || resolvedNode.type !== 'folder') {
      return undefined;
    }

    return resolvedNode;
  }

  private findPathNodesByNodeId(
    nodeId: string,
    nodes: TreeStateNode[],
    trail: TreeStateNode[] = [],
  ): TreeStateNode[] | null {
    for (const node of nodes) {
      const nextTrail = [...trail, node];
      if (node.id === nodeId) {
        return nextTrail;
      }

      if (node.children?.length) {
        const match = this.findPathNodesByNodeId(nodeId, node.children, nextTrail);
        if (match) {
          return match;
        }
      }
    }

    return null;
  }

  private findPathSegmentsByNodeId(
    nodeId: string,
    nodes: TreeStateNode[],
    trail: string[] = [],
  ): string[] | null {
    for (const node of nodes) {
      const nextTrail = [...trail, this.toPathSegment(node)];
      if (node.id === nodeId) {
        return nextTrail;
      }

      if (node.children?.length) {
        const match = this.findPathSegmentsByNodeId(nodeId, node.children, nextTrail);
        if (match) {
          return match;
        }
      }
    }

    return null;
  }

  private getParentPath(nodeId: string): string | null {
    const segments = this.findPathSegmentsByNodeId(nodeId, this.treeStore.tree());
    if (!segments || segments.length <= 1) {
      return '/';
    }

    return segments.slice(0, -1).join('/');
  }

  private setError(error: unknown): void {
    this.pageError.set(this.getErrorMessage(error));
  }

  private normalizeDocumentName(name: string | null): string | null {
    const trimmedName = name?.trim();
    if (!trimmedName) {
      return null;
    }

    return /\.(md|mdx)$/i.test(trimmedName) ? trimmedName : `${trimmedName}.md`;
  }

  private addCopyButtons(container: HTMLElement): void {
    const codeBlocks = container.querySelectorAll('pre code');
    codeBlocks.forEach((codeBlock) => {
      const pre = (codeBlock as HTMLElement).parentElement;
      if (!pre || pre.querySelector('.copy-button')) {
        return;
      }

      if (!pre.parentElement?.classList.contains('code-block-wrapper')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';
        pre.parentElement?.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);
      }

      const copyButton = document.createElement('button');
      copyButton.className = 'copy-button';
      copyButton.innerHTML = 'Copy';
      copyButton.title = 'Copy code to clipboard';
      copyButton.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(codeBlock.textContent || '');
          copyButton.innerHTML = 'Copied';
          setTimeout(() => {
            copyButton.innerHTML = 'Copy';
          }, 2000);
        } catch {
          copyButton.innerHTML = 'Failed';
          setTimeout(() => {
            copyButton.innerHTML = 'Copy';
          }, 2000);
        }
      });
      pre.parentElement?.appendChild(copyButton);
    });
  }

  private toPathSegment(node: TreeStateNode): string {
    return node.type === 'document' ? this.toDocumentPathSegment(node.name) : node.name;
  }

  private toDocumentPathSegment(name: string): string {
    return name.replace(/\.(md|mdx)$/i, '');
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      return getHttpErrorMessage(error);
    }

    return 'Unexpected error';
  }
}
