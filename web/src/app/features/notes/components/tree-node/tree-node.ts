import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TreeStateNode } from '../../models/notes.models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'jo-tree-node',
  template: `
    <div
      class="jo-tree-node"
      [class.jo-tree-node--selected]="isSelected()"
      [attr.data-node-type]="node().type"
      (click)="onItemClick($event)"
    >
      @if (node().type === 'folder') {
        <span
          class="material-icons jo-tree-node__icon jo-tree-node__icon--chevron"
          [class.jo-tree-node__icon--expanded]="node().expanded"
          (click)="onToggleClick($event)"
        >
          chevron_right
        </span>
      } @else {
        <span class="jo-tree-node__icon jo-tree-node__icon--spacer"></span>
      }

      <span class="material-icons jo-tree-node__icon jo-tree-node__icon--type">
        {{ node().type === 'folder' ? 'folder' : 'description' }}
      </span>

      <span class="jo-tree-node__label">{{ formattedName() }}</span>

      @if (isSelected()) {
        <span class="material-icons jo-tree-node__selected-indicator">
          radio_button_checked
        </span>
      }
    </div>

    @if (node().children?.length && node().expanded) {
      <div class="jo-tree-node__group">
        @for (child of node().children; track child.id) {
          <jo-tree-node
            [node]="child"
            [selectedId]="selectedId()"
            (select)="select.emit($event)"
            (toggle)="toggle.emit($event)"
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

  select = output<TreeStateNode>();
  toggle = output<TreeStateNode>();

  protected readonly isSelected = computed(() => this.selectedId() === this.node().id);
  protected readonly formattedName = computed(() => this.node().name.replace(/\.md$/i, ''));

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
}
