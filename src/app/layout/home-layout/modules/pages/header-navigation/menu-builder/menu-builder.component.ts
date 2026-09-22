import { inject as injectAccess } from '@angular/core';
import { PermissionService } from 'app/core/services/permission.service';
import { PermissionDirective } from 'app/core/directives/permission.directive';
import { NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { AuthService } from 'app/core/services/auth.service';
import { DialogService } from 'app/core/services/dialog.service';
import { NavigationService } from 'app/core/services/navigation.service';
import { ConfirmDialogData } from 'app/layout/home-layout/includes/confirm-dialog/confirm-dialog.component';
import { environment } from '../../../../../../../environments/environment';
import { MenuTreeNodeComponent, MenuNodeDropEvent } from './menu-tree-node/menu-tree-node.component';
import { MenuItemEditorComponent } from './menu-item-editor/menu-item-editor.component';

// Realistic max nesting: top-level -> dropdown -> mega-menu column link.
// Depth is 0-based (root = 0), so index 2 is the third level.
const MAX_DEPTH_INDEX = 2;

@Component({
  selector: 'app-menu-builder',
  standalone: true,
  imports: [PermissionDirective,
    NgFor,
    NgIf,
    DragDropModule,
    RouterLink,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatTooltipModule,
    MenuTreeNodeComponent,
  ],
  templateUrl: './menu-builder.component.html',
  styleUrl: './menu-builder.component.scss',
})
export class MenuBuilderComponent implements OnInit, OnDestroy {
  readonly accessControl = injectAccess(PermissionService);
  storefrontUrl = environment.STOREFRONT_URL ?? '';
  menuId!: string;
  menu: any = null;
  flatItems: any[] = [];
  tree: any[] = [];
  idToNode = new Map<string, any>();
  connectedListIds: string[] = ['list-root'];
  loading = false;

  private reorder$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private toastr: ToastrService,
    private navigationService: NavigationService,
    private dialogService: DialogService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = params.get('menuId');
      if (!id) return;
      this.menuId = id;
      this.fetchMeta();
      this.fetchItems();
    });

    this.reorder$
      .pipe(debounceTime(400), takeUntil(this.destroy$))
      .subscribe(() => this.persistReorder());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  fetchMeta() {
    this.navigationService.previewMenu(this.menuId).subscribe({
      next: (res: any) => {
        this.menu = res?.data?.menu ?? null;
      },
      error: () => {},
    });
  }

  fetchItems() {
    this.loading = true;
    this.navigationService.menuItemList(this.menuId).subscribe({
      next: (res: any) => {
        this.flatItems = res?.data ?? [];
        this.buildTree();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  // ── Tree building ─────────────────────────────────────────────────────
  buildTree() {
    const nodes = new Map<string, any>();
    this.flatItems.forEach((item) => {
      nodes.set(item._id, { ...item, children: [] });
    });
    const roots: any[] = [];
    nodes.forEach((node) => {
      if (node.parent_id && nodes.has(node.parent_id)) {
        nodes.get(node.parent_id).children.push(node);
      } else {
        roots.push(node);
      }
    });
    const sortByOrder = (list: any[]) => {
      list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      list.forEach((n) => sortByOrder(n.children));
    };
    sortByOrder(roots);

    this.idToNode = nodes;
    this.tree = roots;
    this.connectedListIds = [
      'list-root',
      ...Array.from(nodes.keys()).map((id) => `list-${id}`),
    ];
  }

  // ── Depth helpers ─────────────────────────────────────────────────────
  depthOf(node: any): number {
    let depth = 0;
    let current = node;
    while (current?.parent_id) {
      const parent = this.idToNode.get(current.parent_id);
      if (!parent) break;
      depth++;
      current = parent;
    }
    return depth;
  }

  subtreeHeight(node: any): number {
    if (!node?.children?.length) return 0;
    return 1 + Math.max(...node.children.map((c: any) => this.subtreeHeight(c)));
  }

  // ── Add / edit ────────────────────────────────────────────────────────
  addTopLevelItem() {
    this.openEditor(null, null, this.tree.length);
  }

  addChild(parentNode: any) {
    const childDepth = this.depthOf(parentNode) + 1;
    if (childDepth > MAX_DEPTH_INDEX) {
      this.toastr.error('Maximum menu depth reached');
      return;
    }
    this.openEditor(null, parentNode._id, parentNode.children?.length ?? 0);
  }

  editItem(node: any) {
    this.openEditor(node, node.parent_id ?? null);
  }

  openEditor(item: any | null, parentId: string | null, order?: number) {
    this.dialog
      .open(MenuItemEditorComponent, {
        data: { menuId: this.menuId, item, parentId, order },
        width: '700px',
        maxWidth: '95vw',
        disableClose: true,
      })
      .afterClosed()
      .subscribe((res: any) => {
        if (res) this.fetchItems();
      });
  }

  // ── Delete ────────────────────────────────────────────────────────────
  deleteNode(node: any) {
    const dialogData: ConfirmDialogData = {
      title: 'Are you sure?',
      message: `Delete "${node.label}"? Its direct children (if any) will be reparented to its parent.`,
      cancelText: 'Cancel',
      saveText: 'Delete',
    };
    this.dialogService.confirmDialog(dialogData).subscribe((result: any) => {
      if (result?.confirm) {
        this.navigationService.deleteMenuItem(this.menuId, node._id).subscribe({
          next: (res: any) => {
            const body = res?.body ?? res;
            const reparentedCount = body?.data?.reparented_count ?? 0;
            this.toastr.success(
              reparentedCount > 0
                ? `Menu item deleted. ${reparentedCount} child item(s) were reparented.`
                : 'Menu item deleted successfully'
            );
            this.fetchItems();
          },
          error: () => {},
        });
      }
    });
  }

  // ── Drag / drop reorder ───────────────────────────────────────────────
  onDrop(event: CdkDragDrop<any[]>, parentNode: any | null) {
    const movedItem = event.previousContainer.data[event.previousIndex];
    if (!movedItem) return;

    if (event.previousContainer !== event.container) {
      const targetDepth = (parentNode ? this.depthOf(parentNode) + 1 : 0) +
        this.subtreeHeight(movedItem);
      if (targetDepth > MAX_DEPTH_INDEX) {
        this.toastr.error('Maximum menu depth reached');
        return;
      }
    }

    if (event.previousContainer === event.container) {
      if (event.previousIndex === event.currentIndex) return;
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
      movedItem.parent_id = parentNode ? parentNode._id : null;
    }

    this.reorder$.next();
  }

  flattenTree(): { id: string; parent_id: string | null; order: number }[] {
    const result: { id: string; parent_id: string | null; order: number }[] = [];
    const walk = (list: any[], parentId: string | null) => {
      list.forEach((node, index) => {
        result.push({ id: node._id, parent_id: parentId, order: index });
        walk(node.children ?? [], node._id);
      });
    };
    walk(this.tree, null);
    return result;
  }

  persistReorder() {
    const items = this.flattenTree();
    this.navigationService.reorderMenuItems(this.menuId, { items }).subscribe({
      next: () => {},
      error: () => {
        this.toastr.error('Failed to save the new order');
        this.fetchItems();
      },
    });
  }

  // ── Publish / unpublish ───────────────────────────────────────────────
  publish() {
    const dialogData: ConfirmDialogData = {
      title: 'Publish menu?',
      message:
        'This copies the current draft to the live storefront. Visitors will immediately see these changes.',
      cancelText: 'Cancel',
      saveText: 'Publish',
    };
    this.dialogService.confirmDialog(dialogData).subscribe((result: any) => {
      if (result?.confirm) {
        this.navigationService.publishMenu(this.menuId).subscribe({
          next: () => {
            this.toastr.success('Menu published successfully');
            this.fetchMeta();
          },
          error: () => {},
        });
      }
    });
  }

  unpublish() {
    const dialogData: ConfirmDialogData = {
      title: 'Unpublish menu?',
      message: 'The storefront will stop rendering this menu until it is republished.',
      cancelText: 'Cancel',
      saveText: 'Unpublish',
    };
    this.dialogService.confirmDialog(dialogData).subscribe((result: any) => {
      if (result?.confirm) {
        this.navigationService.unpublishMenu(this.menuId).subscribe({
          next: () => {
            this.toastr.success('Menu unpublished');
            this.fetchMeta();
          },
          error: () => {},
        });
      }
    });
  }

  // ── Preview ───────────────────────────────────────────────────────────
  openPreview() {
    const token = this.authService.getUserToken();
    window.open(`${this.storefrontUrl}/preview/navigation?token=${token}`, '_blank');
  }

  onNodeDropped(evt: MenuNodeDropEvent) {
    this.onDrop(evt.event, evt.parent);
  }
}
