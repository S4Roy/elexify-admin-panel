import { inject } from '@angular/core';
import { ExportDialogComponent } from '../../../includes/export-dialog/export-dialog.component';
import { ExportDownloadService } from 'app/core/services/export-download.service';
import { NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import PaginationOptions from 'app/core/models/PaginationOptions';
import { MasterService } from 'app/core/services/master.service';
import { PaginationComponent } from 'app/layout/home-layout/includes/pagination/pagination.component';
import { ToastrService } from 'ngx-toastr';
import { MenuComponent } from 'app/layout/home-layout/includes/menu/menu.component';
import * as Global from 'app/global';
import { NewCategoryComponent } from './new-category/new-category.component';
import { InventoryService } from 'app/core/services/inventory.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import FilterOptions from 'app/core/models/FilterOptions';
import { MatIconModule } from '@angular/material/icon';
import { HelpersService } from 'app/core/services/helpers.service';
import { Subject, combineLatest, takeUntil } from 'rxjs';
import { DialogService } from 'app/core/services/dialog.service';
import { ConfirmDialogData } from 'app/layout/home-layout/includes/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../includes/empty-state/empty-state.component';
import { FilterFieldDef } from 'app/core/models/FilterFieldDef';
import { FilterDrawerComponent } from '../../../includes/filter-drawer/filter-drawer.component';
import {
  CdkDropList,
  CdkDrag,
  CdkDragDrop,
  moveItemInArray,
} from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-categories',
  imports: [
    EmptyStateComponent,
    NgFor,
    NgIf,
    PaginationComponent,
    MenuComponent,
    RouterLink,
    MatIconModule,
    CdkDropList,
    CdkDrag,
  ],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.scss',
})
export class CategoriesComponent {
  Global = Global;
  item_list: any = [];
  paginationOption: PaginationOptions;
  filterOption: FilterOptions;
  filterValues: Record<string, any> = {
    status: [],
  };
  private destroy$ = new Subject<void>();

  // Tree/Table toggle only makes sense at the top-level "all categories"
  // view — a drill-down into one parent's children (the `:slug` route) is
  // already a single flat level, so it stays a plain table.
  viewMode: 'tree' | 'table' = 'tree';
  isDrillDown = false;
  treeNodes: any[] = [];
  expandedIds = new Set<string>();

  public sortKey: string = 'sort_order';
  public sortDirection: 'asc' | 'desc' = 'asc';
  constructor(
    private dialog: MatDialog,
    private inventoryService: InventoryService,
    private helperService: HelpersService,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private router: Router,
    private dialogService: DialogService
  ) {
    this.paginationOption = Global.resetPaginationOptions();
    this.filterOption = Global.resetTableFilterOptions();
    combineLatest([
      this.route.paramMap,
      this.helperService.searchKey$,
    ]).subscribe(([params, searchKey]) => {
      this.filterOption = Global.resetTableFilterOptions();
      this.filterOption.slug = params.get('slug');
      this.filterOption.search_key = searchKey;
      this.isDrillDown = !!this.filterOption.slug;
      if (this.isDrillDown) this.viewMode = 'table';
      this.paginationOption.page = 1;
      this.updateViewToggle();
      this.refetch();
    });
  }
  updateViewToggle(): void {
    if (this.isDrillDown) {
      this.helperService.clearViewToggle();
      return;
    }
    this.helperService.setViewToggle({
      active: this.viewMode,
      options: [
        { value: 'tree', label: 'Tree View', icon: 'account_tree' },
        { value: 'table', label: 'Table View', icon: 'table_rows' },
      ],
      extraActions:
        this.viewMode === 'tree'
          ? [
              { key: 'expand-all', label: 'Expand all', icon: 'unfold_more' },
              { key: 'collapse-all', label: 'Collapse all', icon: 'unfold_less' },
            ]
          : undefined,
    });
  }
  setViewMode(mode: 'tree' | 'table'): void {
    if (this.viewMode === mode) return;
    this.viewMode = mode;
    this.updateViewToggle();
    this.refetch();
  }
  refetch(): void {
    if (this.viewMode === 'tree' && !this.isDrillDown) {
      this.fetchCategoryTree();
    } else {
      this.fetchCategoryList();
    }
  }
  isExpanded(id: string): boolean {
    return this.expandedIds.has(id);
  }
  toggleExpand(id: string): void {
    if (this.expandedIds.has(id)) {
      this.expandedIds.delete(id);
    } else {
      this.expandedIds.add(id);
    }
  }
  expandAll(): void {
    this.treeNodes.forEach((node) => this.expandedIds.add(node._id));
  }
  collapseAll(): void {
    this.expandedIds.clear();
  }
  fetchCategoryTree(): void {
    this.selectedIds.clear();
    const params = this.buildFilterParams();
    params.set('limit', '1000');
    params.set('page', '1');
    this.inventoryService.categoryList(params).subscribe({
      next: (res: any) => {
        const allItems: any[] = res?.data?.docs ?? [];
        const roots = allItems.filter((item) => !item?.parent_category?._id);
        this.treeNodes = roots.map((root) => ({
          ...root,
          children: allItems.filter(
            (item) => item?.parent_category?._id === root._id
          ),
        }));
      },
      error: (err) => {},
    });
  }
  getSortIcon(field: string): string {
    if (this.sortKey !== field) return 'sort-icon';
    return this.sortDirection === 'asc' ? 'sort-icon-up' : 'sort-icon-down';
  }
  sort(field: string): void {
    this.paginationOption = Global.resetPaginationOptions();

    if (this.sortKey === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = field;
      this.sortDirection = 'asc';
    }

    // Emit or trigger sorting logic (API call or client-side)
    this.refetch();
  }
  ngOnInit(): void {
    this.helperService.setExportAction({ label: 'Export', icon: 'download' });
    this.helperService.exportActionClick$.pipe(takeUntil(this.destroy$)).subscribe(() => this.openExportDialog());
    if (this.permissions.includes('add')) {
      this.helperService.setActionButton({ label: 'Add New', icon: 'add' });
    }
    this.helperService.actionButtonClick$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.addItem());
    this.helperService.filterButtonClick$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.openFilters());
    this.updateFilterButton();
    this.helperService.viewToggleChange$
      .pipe(takeUntil(this.destroy$))
      .subscribe((value) => this.setViewMode(value as 'tree' | 'table'));
    this.helperService.viewToggleAction$
      .pipe(takeUntil(this.destroy$))
      .subscribe((key) => {
        if (key === 'expand-all') this.expandAll();
        if (key === 'collapse-all') this.collapseAll();
      });
  }
  get filterFields(): FilterFieldDef[] {
    return [
      {
        key: 'status',
        label: 'Status',
        type: 'multiselect',
        options: Global.STATUS_OPTIONS,
      },
    ];
  }
  filterCount(): number {
    let count = 0;
    if (this.filterValues['status']?.length) count++;
    return count;
  }
  updateFilterButton(): void {
    this.helperService.setFilterButton(this.filterCount());
  }
  openFilters(): void {
    this.dialog
      .open(FilterDrawerComponent, {
        data: { fields: this.filterFields, values: { ...this.filterValues } },
      })
      .afterClosed()
      .subscribe((result: Record<string, any> | undefined) => {
        if (!result) return;
        this.filterValues = result;
        this.filterOption.status = this.filterValues['status']?.length
          ? this.filterValues['status'].join(',')
          : null;
        this.paginationOption.page = 1;
        this.refetch();
        this.updateFilterButton();
      });
  }
  addItem(data: any = null) {
    this.router.navigateByUrl(
      `/inventory/categories/${data ? 'update/' + data?._id : 'add'}`
    );
    // this.dialog
    //   .open(NewCategoryComponent, {
    //     data: { ...data, type: this.type },
    //     disableClose: true,
    //   })
    //   .afterClosed()
    //   .subscribe((res: any) => {
    //     if (res) {
    //       this.fetchCategoryList();
    //     }
    //   });
  }
  selectedIds = new Set<string>();
  toggleSelect(id: string): void { this.selectedIds.has(id) ? this.selectedIds.delete(id) : this.selectedIds.add(id); }
  private exportDownload = inject(ExportDownloadService);
  exporting = false;
  openExportDialog(): void {
    if (this.exporting) return;
    this.dialog.open(ExportDialogComponent, { width: '480px', maxWidth: '96vw',
      data: { entity: 'categories', filterCount: this.filterCount(), searchKey: this.filterOption.search_key, selectionCount: this.selectedIds.size },
    }).afterClosed().subscribe(result => {
      if (!result?.scope || this.exporting) return;
      const params = this.buildFilterParams();
      if (result.scope === 'selected') params.set('category_ids', [...this.selectedIds].join(','));
      this.exporting = true;
      this.exportDownload.download(this.inventoryService.exportCategories(params), 'categories', () => this.exporting = false);
    });
  }
  private buildFilterParams(): URLSearchParams {
    let params = new URLSearchParams({
      sort_by: this.sortKey,
      sort_order: this.sortDirection === 'asc' ? '1' : '-1',
    });
    if (this.filterOption.slug) {
      params.set('slug', this.filterOption.slug);
    }
    if (this.filterOption.search_key) {
      params.set('search_key', this.filterOption.search_key);
    }
    if (this.filterOption.status) {
      params.set('status', this.filterOption.status);
    }
    return params;
  }
  fetchCategoryList() {
    this.selectedIds.clear();
    const params = this.buildFilterParams();
    params.set('page', String(this.paginationOption.page || 1));
    params.set('limit', String(this.paginationOption.limit || 20));
    this.inventoryService.categoryList(params).subscribe({
      next: (res: any) => {
        this.item_list = res?.data?.docs ?? [];
        this.paginationOption = {
          ...res?.data,
        };
      },
      error: (err) => {},
    });
  }
  deleteItem(item: any) {
    this.inventoryService.deleteCategory({ _id: item._id }).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.body?.message);
        this.refetch();
      },
      error: (err: any) => {},
    });
  }
  onPageChange(data: any) {
    this.paginationOption.page = data;
    this.fetchCategoryList();
  }
  permissions: any = ['add', 'edit', 'delete'];
  checkPermission() {
    // this.settingService.checkPermission({ sec: 'award' }).subscribe({
    //   next: (res: any) => {
    //     const { permissions } = res?.results[0];
    //     this.permissions = permissions;
    //   },
    // });
  }
  ngOnDestroy(): void {
    this.helperService.clearExportAction();
    this.helperService.clearActionButton();
    this.helperService.clearFilterButton();
    this.helperService.clearViewToggle();
    this.destroy$.next();
    this.destroy$.complete();
  }
  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.item_list, event.previousIndex, event.currentIndex);
    const payload = this.helperService.makeSortPayload(
      this.item_list,
      this.paginationOption
    );
    this.updateSortOrder(payload);
  }
  updateSortOrder(payload: any[]) {
    this.inventoryService.updateCategoryOrder({ items: payload }).subscribe({
      next: (res) => {
        this.toastr.success(res?.message);
      },
    });
  }
  updateStatus(item: any) {
    const currentStatus = item?.status;
    if (!item?._id || !currentStatus) {
      this.toastr.error('Invalid category data');
      return;
    }

    // Toggle status
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    const dialogData: ConfirmDialogData = {
      title: 'Are you sure?',
      message: `Do you want to ${
        newStatus === 'active' ? 'activate' : 'deactivate'
      } the category ${item?.name ?? ''}?`,
      cancelText: 'Cancel',
      saveText: 'Confirm',
    };

    this.dialogService.confirmDialog(dialogData).subscribe((result: any) => {
      if (result?.confirm) {
        this.inventoryService
          .submitCategory({ _id: item._id, status: newStatus })
          .subscribe({
            next: (res: any) => {
              this.toastr.success(
                `Category ${
                  newStatus === 'active' ? 'activated' : 'deactivated'
                } successfully`
              );
              this.refetch();
            },
            error: (err: any) => {},
          });
      }
    });
  }
}
