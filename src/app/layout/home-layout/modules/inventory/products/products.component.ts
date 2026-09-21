import { inject } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ExportDialogComponent } from '../../../includes/export-dialog/export-dialog.component';
import { ExportDownloadService } from 'app/core/services/export-download.service';
import { CommonModule, CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import PaginationOptions from 'app/core/models/PaginationOptions';
import { MasterService } from 'app/core/services/master.service';
import { PaginationComponent } from 'app/layout/home-layout/includes/pagination/pagination.component';
import { ToastrService } from 'ngx-toastr';
import { MenuComponent } from 'app/layout/home-layout/includes/menu/menu.component';
import * as Global from 'app/global';
import { InventoryService } from 'app/core/services/inventory.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import FilterOptions from 'app/core/models/FilterOptions';
import { FilterFieldDef } from 'app/core/models/FilterFieldDef';
import { NewProductComponent } from './new-product/new-product.component';
import { StocksComponent } from './stocks/stocks.component';
import { MatIconModule } from '@angular/material/icon';
import { Subject, combineLatest, takeUntil } from 'rxjs';
import { HelpersService } from 'app/core/services/helpers.service';
import { DialogService } from 'app/core/services/dialog.service';
import { ConfirmDialogData } from 'app/layout/home-layout/includes/confirm-dialog/confirm-dialog.component';
import { SpecialButtonComponent } from 'app/layout/home-layout/includes/special-button/special-button.component';
import { A11yModule } from '@angular/cdk/a11y';
import { TruncateListDirective } from 'app/core/directives/truncate-list.directive';
import { EmptyStateComponent } from '../../../includes/empty-state/empty-state.component';
import { FilterDrawerComponent } from '../../../includes/filter-drawer/filter-drawer.component';
@Component({
  selector: 'app-products',
  imports: [
    MatCheckboxModule,
    MatMenuModule,
    EmptyStateComponent,
    NgFor,
    NgIf,
    PaginationComponent,
    MenuComponent,
    RouterLink,
    MatIconModule,
    CurrencyPipe,
    CommonModule,
    SpecialButtonComponent,
    A11yModule,
    TruncateListDirective,
  ],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',
})
export class ProductsComponent {
  Global = Global;
  item_list: any = [];
  expanded = new Set<string>();

  paginationOption: PaginationOptions;
  filterOption: FilterOptions;
  public sortKey: string = 'created_at';
  public sortDirection: 'asc' | 'desc' = 'desc';
  // Working filter values, keyed to match filterFields below — handed to the
  // shared filter drawer and read back from it. Category/tags/classifications/
  // stock_status are also kept in sync with route/query params so links from
  // elsewhere (e.g. a category tree, a "Low Stock" dashboard link) still work.
  filterValues: Record<string, any> = {
    category: [],
    brand: [],
    status: null,
    stock_status: null,
    type: null,
    tags: [],
    classifications: [],
    min_price: null,
    max_price: null,
  };
  categoryOptions: { value: string; label: string }[] = [];
  brandOptions: { value: string; label: string }[] = [];
  tagOptions: { value: string; label: string }[] = [];
  classificationOptions: { value: string; label: string }[] = [];
  private destroy$ = new Subject<void>();
  constructor(
    private dialog: MatDialog,
    private inventoryService: InventoryService,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private router: Router,
    private helperService: HelpersService,
    private dialogService: DialogService
  ) {
    this.paginationOption = Global.resetPaginationOptions();
    this.filterOption = Global.resetTableFilterOptions();
    // this.checkPermission();
  }
  ngOnInit(): void {
    this.helperService.setExportAction({ label: 'Export', icon: 'download' });
    this.helperService.exportActionClick$.pipe(takeUntil(this.destroy$)).subscribe(() => this.openExportDialog());
    if (this.permissions.includes('add')) {
      this.helperService.setActionButton({
        label: 'Add New Product',
        icon: 'add',
      });
    }
    this.helperService.actionButtonClick$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.addItem());
    this.helperService.filterButtonClick$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.openFilters());
    // Only active rows — a truncated, unfiltered page can silently miss
    // every active row if inactive ones happen to sort first.
    this.inventoryService
      .categoryList(new URLSearchParams({ all: 'true', status: 'active' }))
      .subscribe({
        next: (res: any) => {
          this.categoryOptions = (Array.isArray(res?.data) ? res.data : []).map(
            (c: any) => ({ value: c.slug, label: c.name })
          );
        },
        error: () => {},
      });
    this.inventoryService
      .brandList(new URLSearchParams({ all: 'true' }))
      .subscribe({
        next: (res: any) => {
          this.brandOptions = (Array.isArray(res?.data) ? res.data : []).map(
            (b: any) => ({ value: b.slug, label: b.name })
          );
        },
        error: () => {},
      });
    this.inventoryService
      .tagList(new URLSearchParams({ limit: '200', status: 'active' }))
      .subscribe({
        next: (res: any) => {
          this.tagOptions = (res?.data?.docs ?? []).map((t: any) => ({
            value: t.slug,
            label: t.name,
          }));
        },
        error: () => {},
      });
    this.inventoryService
      .classificationList(
        new URLSearchParams({ limit: '200', status: 'active' })
      )
      .subscribe({
        next: (res: any) => {
          this.classificationOptions = (res?.data?.docs ?? []).map(
            (c: any) => ({ value: c.slug, label: c.name })
          );
        },
        error: () => {},
      });
    combineLatest([
      this.route.paramMap,
      this.route.queryParamMap,
      this.helperService.searchKey$,
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([params, queryParam, searchKey]) => {
        this.filterOption = Global.resetTableFilterOptions();
        this.filterOption.category = params.get('slug');
        this.filterOption.stock_status = queryParam.get('stock_status');
        this.filterOption.tags = queryParam.get('tags');
        this.filterOption.classifications = queryParam.get('classifications');
        this.filterOption.search_key = searchKey;
        // Keep the filter drawer in sync when category/tags/classifications/
        // stock_status arrive via a route or query-param link rather than
        // via the drawer itself.
        this.filterValues = {
          ...this.filterValues,
          category: this.filterOption.category
            ? [this.filterOption.category]
            : [],
          tags: this.filterOption.tags ? this.filterOption.tags.split(',') : [],
          classifications: this.filterOption.classifications
            ? this.filterOption.classifications.split(',')
            : [],
          stock_status: this.filterOption.stock_status || null,
        };
        this.paginationOption.page = 1;
        this.fetchProductList();
        this.updateFilterButton();
      });
  }
  get filterFields(): FilterFieldDef[] {
    return [
      {
        key: 'category',
        label: 'Category',
        type: 'multiselect',
        options: this.categoryOptions,
      },
      {
        key: 'brand',
        label: 'Brand',
        type: 'multiselect',
        options: this.brandOptions,
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: Global.STATUS_OPTIONS,
      },
      {
        key: 'stock_status',
        label: 'Stock Status',
        type: 'select',
        options: [
          { value: 'in_stock', label: 'In Stock' },
          { value: 'low_stock', label: 'Low Stock' },
          { value: 'out_of_stock', label: 'Out of Stock' },
        ],
      },
      {
        key: 'type',
        label: 'Product Type',
        type: 'select',
        options: [
          { value: 'simple', label: 'Simple' },
          { value: 'variable', label: 'Variable' },
        ],
      },
      {
        key: 'tags',
        label: 'Tags',
        type: 'multiselect',
        options: this.tagOptions,
      },
      {
        key: 'classifications',
        label: 'Classification',
        type: 'multiselect',
        options: this.classificationOptions,
      },
      {
        key: 'price',
        label: 'Price Range',
        type: 'number-range',
        fromKey: 'min_price',
        toKey: 'max_price',
      },
    ];
  }
  filterCount(): number {
    let count = 0;
    if (this.filterValues['category']?.length) count++;
    if (this.filterValues['brand']?.length) count++;
    if (this.filterValues['status']) count++;
    if (this.filterValues['stock_status']) count++;
    if (this.filterValues['type']) count++;
    if (this.filterValues['tags']?.length) count++;
    if (this.filterValues['classifications']?.length) count++;
    if (this.filterValues['min_price'] || this.filterValues['max_price'])
      count++;
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
        this.filterOption.category = this.filterValues['category']?.length
          ? this.filterValues['category'].join(',')
          : null;
        this.filterOption.brand = this.filterValues['brand']?.length
          ? this.filterValues['brand'].join(',')
          : null;
        this.filterOption.status = this.filterValues['status'] || null;
        this.filterOption.stock_status =
          this.filterValues['stock_status'] || null;
        this.filterOption.type = this.filterValues['type'] || null;
        this.filterOption.tags = this.filterValues['tags']?.length
          ? this.filterValues['tags'].join(',')
          : null;
        this.filterOption.classifications = this.filterValues[
          'classifications'
        ]?.length
          ? this.filterValues['classifications'].join(',')
          : null;
        this.filterOption.min_price = this.filterValues['min_price'] || null;
        this.filterOption.max_price = this.filterValues['max_price'] || null;
        this.paginationOption.page = 1;
        this.fetchProductList();
        this.updateFilterButton();
      });
  }
  ngOnDestroy(): void {
    this.helperService.clearExportAction();
    this.helperService.clearActionButton();
    this.helperService.clearFilterButton();
    this.destroy$.next();
    this.destroy$.complete();
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
    this.fetchProductList();
  }
  getSortIcon(field: string): string {
    if (this.sortKey !== field) return 'sort-icon';
    return this.sortDirection === 'asc' ? 'sort-icon-up' : 'sort-icon-down';
  }
  addItem(data: any = null) {
    this.router.navigateByUrl(
      `/inventory/products/${data ? 'update/' + data?._id : 'add'}`
    );
    // this.dialog
    //   .open(NewProductComponent, {
    //     data: data,
    //     disableClose: true,
    //   })
    //   .afterClosed()
    //   .subscribe((res: any) => {
    //     if (res) {
    //       this.fetchProductList();
    //     }
    //   });
  }
  stockItem(data: any = null) {
    this.dialog
      .open(StocksComponent, {
        data: data,
        disableClose: true,
      })
      .afterClosed()
      .subscribe((res: any) => {
        if (res) {
          this.fetchProductList();
        }
      });
  }
  selectedIds = new Set<string>();
  get allSelected(): boolean { return this.item_list.length > 0 && this.item_list.every((item: any) => this.selectedIds.has(item._id)); }
  toggleSelect(id: string): void { this.selectedIds.has(id) ? this.selectedIds.delete(id) : this.selectedIds.add(id); }
  toggleSelectAll(): void {
    if (this.allSelected) this.selectedIds.clear();
    else this.item_list.forEach((item: any) => this.selectedIds.add(item._id));
  }
  private exportDownload = inject(ExportDownloadService);
  exporting = false;
  openExportDialog(): void {
    this.dialog.open(ExportDialogComponent, {
      width: '480px', maxWidth: '96vw',
      data: { entity: 'products',
        filterCount: this.filterCount(),
        searchKey: this.filterOption.search_key,
        selectionCount: this.selectedIds.size,
      },
    }).afterClosed().subscribe((result: any) => {
      if (!result?.scope || this.exporting) return;
      const params = this.buildFilterParams();
      if (result.scope === 'selected') params.set('product_ids', Array.from(this.selectedIds).join(','));
      this.exporting = true;
      this.exportDownload.download(this.inventoryService.exportProducts(params), 'products', () => this.exporting = false);
    });
  }
  private buildFilterParams(): URLSearchParams {
    let params = new URLSearchParams({
      sort_by: this.sortKey,
      sort_order: this.sortDirection === 'asc' ? '1' : '-1',
    });
    if (this.filterOption.category) {
      params.set('category', this.filterOption.category);
    }
    if (this.filterOption.stock_status) {
      params.set('stock_status', this.filterOption.stock_status);
    }
    if (this.filterOption.search_key) {
      params.set('search_key', this.filterOption.search_key);
    }
    if (this.filterOption.tags) {
      params.set('tags', this.filterOption.tags);
    }
    if (this.filterOption.classifications) {
      params.set('classifications', this.filterOption.classifications);
    }
    if (this.filterOption.brand) {
      params.set('brand', this.filterOption.brand);
    }
    if (this.filterOption.status) {
      params.set('status', this.filterOption.status);
    }
    if (this.filterOption.type) {
      params.set('type', this.filterOption.type);
    }
    if (this.filterOption.min_price) {
      params.set('min_price', this.filterOption.min_price);
    }
    if (this.filterOption.max_price) {
      params.set('max_price', this.filterOption.max_price);
    }
    return params;
  }
  fetchProductList() {
    this.selectedIds.clear();
    const params = this.buildFilterParams();
    if (this.paginationOption.page) params.set('page', String(this.paginationOption.page));
    this.inventoryService.productList(params).subscribe({
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
    this.inventoryService.deleteProduct({ _id: item._id }).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.body?.message);
        this.fetchProductList();
      },
      error: (err: any) => {},
    });
  }
  onPageChange(data: any) {
    this.paginationOption.page = data;
    this.fetchProductList();
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
  updateStatus(item: any) {
    const currentStatus = item?.status;
    if (!item?._id || !currentStatus) {
      this.toastr.error('Invalid product data');
      return;
    }

    // Toggle status
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    const dialogData: ConfirmDialogData = {
      title: 'Are you sure?',
      message: `Do you want to ${
        newStatus === 'active' ? 'activate' : 'deactivate'
      } the product ${item?.name ?? ''}?`,
      cancelText: 'Cancel',
      saveText: 'Confirm',
    };

    this.dialogService.confirmDialog(dialogData).subscribe((result: any) => {
      if (result?.confirm) {
        this.inventoryService
          .updateProductStatus({ _id: item._id, status: newStatus })
          .subscribe({
            next: (res: any) => {
              this.toastr.success(
                `Product ${
                  newStatus === 'active' ? 'activated' : 'deactivated'
                } successfully`
              );
              this.fetchProductList();
            },
            error: (err: any) => {},
          });
      }
    });
  }
  toggleExpand(productId: string | number | undefined) {
    if (!productId) return;
    const id = String(productId);
    if (this.expanded.has(id)) this.expanded.delete(id);
    else this.expanded.add(id);
    // trigger change detection if needed (usually not required)
  }

  isExpanded(productId: string | number | undefined): boolean {
    if (!productId) return false;
    return this.expanded.has(String(productId));
  }

  trackByVariant(index: number, variant: any) {
    return variant?._id || variant?.id || index;
  }
}
