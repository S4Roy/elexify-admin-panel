import { PermissionDirective } from 'app/core/directives/permission.directive';
import { NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDropList,
  DragDropModule,
} from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import * as Global from 'app/global';

export interface MenuNodeDropEvent {
  event: CdkDragDrop<any[]>;
  parent: any;
}

const TYPE_ICONS: Record<string, string> = {
  internal_page: 'description',
  product: 'inventory_2',
  category: 'category',
  collection: 'collections_bookmark',
  blog: 'article',
  custom_url: 'link',
  external_url: 'open_in_new',
  mega_menu: 'view_column',
  dropdown: 'expand_more',
  cta: 'campaign',
};

// A recursive standalone component: it appears in its own template (for
// rendering child nodes), so it imports itself. This is the supported
// Angular pattern for recursive standalone components and works because
// this file's decorator is applied (via __decorate, see
// experimentalDecorators in tsconfig) after the class binding already
// exists.
@Component({
  selector: 'app-menu-tree-node',
  standalone: true,
  imports: [PermissionDirective,
    NgFor,
    NgIf,
    DragDropModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MenuTreeNodeComponent,
  ],
  templateUrl: './menu-tree-node.component.html',
  styleUrl: './menu-tree-node.component.scss',
})
export class MenuTreeNodeComponent {
  @Input({ required: true }) node: any;
  @Input() connectedListIds: string[] = [];

  @Output() editNode = new EventEmitter<any>();
  @Output() addChildNode = new EventEmitter<any>();
  @Output() deleteNode = new EventEmitter<any>();
  @Output() dropped = new EventEmitter<MenuNodeDropEvent>();

  typeIcon(type: string): string {
    return TYPE_ICONS[type] ?? 'link';
  }

  typeLabel(type: string): string {
    return Global.humanize(type ?? '');
  }

  isScheduled(node: any): boolean {
    return !!(node?.schedule?.startAt || node?.schedule?.endAt);
  }

  // Blocks dropping another mega_menu-type node inside a mega_menu node's
  // own children container — nesting mega menus inside mega menus has no
  // meaningful storefront rendering.
  megaMenuEnterPredicate = (drag: CdkDrag<any>, _drop: CdkDropList<any[]>) => {
    if (this.node?.type !== 'mega_menu') return true;
    return drag.data?.type !== 'mega_menu';
  };

  onLocalDrop(event: CdkDragDrop<any[]>) {
    this.dropped.emit({ event, parent: this.node });
  }

  relayDropped(evt: MenuNodeDropEvent) {
    this.dropped.emit(evt);
  }
}
