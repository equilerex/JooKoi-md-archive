import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { TreeStateNode } from '../../models/notes.models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'jo-tree-node',
  imports: [MatIconModule, MatMenuModule, MatButtonModule],
  template: `
    <a
      [href]="nodeHref()"
      class="jo-tree-node-link"
      (click)="onLinkClick($event)"
    >
    <div
      class="jo-tree-node"
      [class.jo-tree-node--selected]="isSelected()"
      [class.jo-tree-node--dragging]="isDragging()"
      [class.jo-tree-node--drop-target]="isDropTarget()"
      [attr.data-node-type]="node().type"
      [draggable]="true"
      (click)="onItemClick($event)"
      (dragstart)="onDragStart($event)"
      (dragend)="onDragEnd($event)"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
    >
      @if (node().type === 'folder') {
        <mat-icon 
          class="jo-tree-node__chevron"
          [class.jo-tree-node__chevron--expanded]="node().expanded"
          (click)="onToggleClick($event)"
        >chevron_right</mat-icon>
      } @else {
        <span class="jo-tree-node__spacer"></span>
      }

      <mat-icon class="jo-tree-node__icon" [class.jo-tree-node__icon--folder]="node().type === 'folder'">
        {{ node().type === 'folder' ? 'folder' : 'description' }}
      </mat-icon>

      <span class="jo-tree-node__label">{{ formattedName() }}</span>

      <button
        mat-icon-button
        class="jo-tree-node__menu-btn"
        [matMenuTriggerFor]="nodeMenu"
        (click)="$event.stopPropagation()"
        aria-label="Node actions"
      >
        <mat-icon>more_vert</mat-icon>
      </button>

      <mat-menu #nodeMenu>
        <button mat-menu-item (click)="renameNode.emit()">
          <mat-icon>drive_file_rename_outline</mat-icon>Rename
        </button>
        <button mat-menu-item (click)="moveNode.emit()">
          <mat-icon>drive_file_move</mat-icon>Move
        </button>
        <button mat-menu-item class="jo-menu-item--danger" (click)="deleteNode.emit()">
          <mat-icon>delete</mat-icon>Delete
        </button>
      </mat-menu>
    </div>
    </a>

    @if (node().children?.length && node().expanded) {
      <div class="jo-tree-node__group">
        @for (child of node().children; track child.id) {
          <jo-tree-node
            [node]="child"
            [selectedId]="selectedId()"
            [draggedNodeId]="draggedNodeId()"
            [getNodePath]="getNodePath()"
            [encryptSegment]="encryptSegment()"
            (select)="select.emit($event)"
            (toggle)="toggle.emit($event)"
            (dragNode)="dragNode.emit($event)"
            (dragEnd)="dragEnd.emit()"
            (dropNode)="dropNode.emit($event)"
            (renameNode)="renameNode.emit()"
            (moveNode)="moveNode.emit()"
            (deleteNode)="deleteNode.emit()"
          />
        }
      </div>
    }
  `,
  styleUrl: './tree-node.scss',
})
export class TreeNode {
  node = input.required<TreeStateNode>();
  selectedId = input<string | null>(null);
  draggedNodeId = input<string | null>(null);
  getNodePath = input.required<(nodeId: string) => string[] | null>();
  encryptSegment = input.required<(segment: string) => string>();

  select = output<TreeStateNode>();
  toggle = output<TreeStateNode>();
  dragNode = output<TreeStateNode>();
  dragEnd = output<void>();
  dropNode = output<{ sourceId: string; targetId: string }>();
  renameNode = output<void>();
  moveNode = output<void>();
  deleteNode = output<void>();

  protected readonly isSelected = computed(() => this.selectedId() === this.node().id);
  protected readonly isDragging = computed(() => this.draggedNodeId() === this.node().id);
  protected readonly isDropTarget = computed(() => {
    const draggedId = this.draggedNodeId();
    const nodeId = this.node().id;
    return draggedId !== null && draggedId !== nodeId && this.node().type === 'folder';
  });
  protected readonly formattedName = computed(() => this.node().name.replace(/\.(md|mdx)$/i, ''));
  protected readonly nodeHref = computed(() => {
    const pathSegments = this.getNodePath()(this.node().id);
    if (!pathSegments) {
      return '#';
    }
    const encodedSegments = pathSegments.map((seg) => this.encryptSegment()(seg));
    return `/notes/${encodedSegments.join('/')}`;
  });

  protected onLinkClick(event: MouseEvent): void {
    if (event.ctrlKey || event.metaKey || event.button === 1) {
      return;
    }
    event.preventDefault();
  }

  protected onItemClick(event: MouseEvent): void {
    event.stopPropagation();

    if (this.node().type === 'folder') {
      this.toggle.emit(this.node());
    }

    this.select.emit(this.node());
  }

  protected onToggleClick(event: MouseEvent): void {
    event.stopPropagation();
    this.toggle.emit(this.node());
  }

  protected onDragStart(event: DragEvent): void {
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('application/json', JSON.stringify(this.node()));
    }
    this.dragNode.emit(this.node());
  }

  protected onDragEnd(event: DragEvent): void {
    event.stopPropagation();
    this.dragEnd.emit();
  }

  protected onDragOver(event: DragEvent): void {
    if (this.node().type !== 'folder') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  protected onDragLeave(event: DragEvent): void {
    event.stopPropagation();
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.node().type !== 'folder' || !event.dataTransfer) {
      return;
    }

    try {
      const sourceNode = JSON.parse(event.dataTransfer.getData('application/json')) as TreeStateNode;
      if (sourceNode.id !== this.node().id && sourceNode.parentId !== this.node().id) {
        this.dropNode.emit({ sourceId: sourceNode.id, targetId: this.node().id });
      }
    } catch {
      // ignore invalid drag data
    }
  }
}
