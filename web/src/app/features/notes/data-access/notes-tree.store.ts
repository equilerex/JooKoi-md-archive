import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { finalize, retry, timer } from 'rxjs';
import { SearchResult, TreeNode } from '@shared/models';
import { TreeStateNode } from '../models/notes.models';
import { NotesApiService } from './notes-api.service';

@Injectable({ providedIn: 'root' })
export class NotesTreeStore {
  private static readonly STORAGE_KEY = 'jo-expanded-ids';

  private readonly api = inject(NotesApiService);
  private readonly treeState = signal<TreeStateNode[]>([]);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly selectedNodeIdState = signal<string | null>(null);
  private readonly activeFolderIdState = signal<string | null>(null);
  private readonly searchResultsState = signal<SearchResult[]>([]);
  private readonly sortByState = signal<'name' | 'date'>('name');

  readonly tree = this.treeState.asReadonly();
  readonly visibleTree = computed(() => {
    const results = this.searchResultsState();
    let tree = results.length ? this.filterTree(this.treeState(), new Set(results.map((result) => result.id)), new Set(results.map((result) => result.parentId).filter((parentId): parentId is string => !!parentId))) : this.treeState();
    return this.sortTree(tree, this.sortByState());
  });
  readonly sortBy = this.sortByState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly selectedNodeId = this.selectedNodeIdState.asReadonly();
  readonly activeFolderId = this.activeFolderIdState.asReadonly();
  readonly isEmpty = computed(
    () => !this.loadingState() && !this.errorState() && this.visibleTree().length === 0,
  );

  loadTree(afterLoad?: () => void, quiet = false): void {
    const expandedIds = this.getSavedExpandedIds();

    if (!quiet) {
      this.loadingState.set(true);
    }
    this.errorState.set(null);

    this.api
      .getTree()
      .pipe(
        retry({
          count: 5,
          delay: (_error, retryCount) => timer(retryCount * 250),
        }),
        finalize(() => {
          if (!quiet) {
            this.loadingState.set(false);
          }
        }),
      )
      .subscribe({
        next: (tree) => {
          this.treeState.set(this.markExpanded(tree, expandedIds, expandedIds.size > 0));
          afterLoad?.();
        },
        error: (error) => this.errorState.set(this.getErrorMessage(error)),
      });
  }

  setSelectedNodeId(id: string | null): void {
    this.selectedNodeIdState.set(id);
  }

  setActiveFolderId(id: string | null): void {
    this.activeFolderIdState.set(id);
  }

  clearSelection(): void {
    this.selectedNodeIdState.set(null);
    this.activeFolderIdState.set(null);
  }

  reset(): void {
    this.treeState.set([]);
    this.searchResultsState.set([]);
    this.loadingState.set(false);
    this.errorState.set(null);
    this.clearSelection();
  }

  setSearchResults(results: SearchResult[]): void {
    this.searchResultsState.set(results);
  }

  toggleFolder(nodeId: string): void {
    this.treeState.update((nodes) => {
      const nextNodes = this.toggleFolderInTree(nodes, nodeId);
      this.saveExpandedIds(nextNodes);
      return nextNodes;
    });
  }

  expandParents(parentId: string | null): void {
    if (!parentId) {
      return;
    }

    this.treeState.update((nodes) => {
      const result = this.expandParentsInTree(nodes, parentId);
      this.saveExpandedIds(result.nodes);
      return result.nodes;
    });
  }

  findNodeById(id: string | null): TreeStateNode | null {
    if (!id) {
      return null;
    }

    return this.findNodeByIdInTree(id, this.treeState());
  }

  setSortBy(sortBy: 'name' | 'date'): void {
    this.sortByState.set(sortBy);
  }

  private getNodeUpdatedDate(node: TreeStateNode): number {
    return new Date(node.updatedAt).getTime();
  }

  private getMaxChildUpdatedDate(node: TreeStateNode): number {
    if (node.type === 'document' || !node.children?.length) {
      return this.getNodeUpdatedDate(node);
    }

    let maxDate = this.getNodeUpdatedDate(node);
    for (const child of node.children) {
      const childDate = this.getMaxChildUpdatedDate(child);
      if (childDate > maxDate) {
        maxDate = childDate;
      }
    }
    return maxDate;
  }

  private sortTree(nodes: TreeStateNode[], sortBy: 'name' | 'date'): TreeStateNode[] {
    const sorted = [...nodes].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        const aDate = this.getMaxChildUpdatedDate(a);
        const bDate = this.getMaxChildUpdatedDate(b);
        return bDate - aDate;
      }
    });

    return sorted.map((node) => ({
      ...node,
      children: node.children ? this.sortTree(node.children, sortBy) : undefined,
    }));
  }

  private markExpanded(nodes: TreeNode[], expandedIds: Set<string>, hasSavedState: boolean): TreeStateNode[] {
    return nodes.map((node) => ({
      ...node,
      expanded: expandedIds.has(node.id) || (!hasSavedState && node.parentId === null),
      children: node.children ? this.markExpanded(node.children, expandedIds, hasSavedState) : undefined,
    }));
  }

  private getSavedExpandedIds(): Set<string> {
    const saved = localStorage.getItem(NotesTreeStore.STORAGE_KEY);
    if (!saved) {
      return new Set();
    }

    try {
      return new Set(JSON.parse(saved) as string[]);
    } catch {
      return new Set();
    }
  }

  private saveExpandedIds(nodes: TreeStateNode[]): void {
    const ids = this.collectExpandedIds(nodes);
    localStorage.setItem(NotesTreeStore.STORAGE_KEY, JSON.stringify(ids));
  }

  private collectExpandedIds(nodes: TreeStateNode[]): string[] {
    const ids: string[] = [];

    for (const node of nodes) {
      if (node.expanded) {
        ids.push(node.id);
      }

      if (node.children?.length) {
        ids.push(...this.collectExpandedIds(node.children));
      }
    }

    return ids;
  }

  private toggleFolderInTree(nodes: TreeStateNode[], nodeId: string): TreeStateNode[] {
    return nodes.map((node) => {
      if (node.id === nodeId && node.type === 'folder') {
        return { ...node, expanded: !node.expanded };
      }

      if (node.children?.length) {
        return {
          ...node,
          children: this.toggleFolderInTree(node.children, nodeId),
        };
      }

      return node;
    });
  }

  private expandParentsInTree(
    nodes: TreeStateNode[],
    parentId: string,
  ): { nodes: TreeStateNode[]; found: boolean } {
    let found = false;

    const nextNodes = nodes.map((node) => {
      if (node.id === parentId) {
        found = true;
        return { ...node, expanded: true };
      }

      if (node.children?.length) {
        const result = this.expandParentsInTree(node.children, parentId);
        if (result.found) {
          found = true;
        }

        return {
          ...node,
          expanded: result.found ? true : node.expanded,
          children: result.nodes,
        };
      }

      return node;
    });

    return { nodes: nextNodes, found };
  }

  private findNodeByIdInTree(id: string, nodes: TreeStateNode[]): TreeStateNode | null {
    for (const node of nodes) {
      if (node.id === id) {
        return node;
      }

      if (node.children?.length) {
        const match = this.findNodeByIdInTree(id, node.children);
        if (match) {
          return match;
        }
      }
    }

    return null;
  }

  private filterTree(
    nodes: TreeStateNode[],
    matchingIds: Set<string>,
    parentIds: Set<string>,
  ): TreeStateNode[] {
    const filteredNodes: TreeStateNode[] = [];

    for (const node of nodes) {
      const filteredChildren = node.children?.length
        ? this.filterTree(node.children, matchingIds, parentIds)
        : undefined;
      const matchesSelf = matchingIds.has(node.id);
      const isDirectParent = parentIds.has(node.id);
      const hasVisibleChildren = !!filteredChildren?.length;

      if (!matchesSelf && !isDirectParent && !hasVisibleChildren) {
        continue;
      }

      filteredNodes.push({
        ...node,
        expanded: hasVisibleChildren ? true : node.expanded,
        children: filteredChildren,
      });
    }

    return filteredNodes;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const message =
        (error.error as { message?: string | string[] } | null)?.message ?? error.message;
      return Array.isArray(message) ? message.join(', ') : message;
    }

    return 'Unexpected error';
  }
}
