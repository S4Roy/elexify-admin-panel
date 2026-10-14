import { inject as injectPermissions } from '@angular/core';
import { PermissionService } from 'app/core/services/permission.service';
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
import { Subject, combineLatest, finalize, forkJoin, takeUntil } from 'rxjs';
import { HelpersService } from 'app/core/services/helpers.service';
import { DialogService } from 'app/core/services/dialog.service';
import { ConfirmDialogData } from 'app/layout/home-layout/includes/confirm-dialog/confirm-dialog.component';
import { SpecialButtonComponent } from 'app/layout/home-layout/includes/special-button/special-button.component';
import { A11yModule } from '@angular/cdk/a11y';
import { TruncateListDirective } from 'app/core/directives/truncate-list.directive';
import { EmptyStateComponent } from '../../../includes/empty-state/empty-state.component';
import { FilterDrawerComponent } from '../../../includes/filter-drawer/filter-drawer.component';
import { ZohoSyncDialogComponent, ZohoSyncDialogResult } from './new-product/zoho-sync-dialog/zoho-sync-dialog.component';
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
  loading = false;
  bulkBusy = false;
  // Catalog-wide counts for the summary cards (product stats endpoint).
  stats: any = null;
  siteThreshold = 5;
  readonly skeletonRows = Array.from({ length: 6 });
  readonly statusTabs = [
    { value: null, label: 'All' },
    ...Global.STATUS_OPTIONS,
  ];
  readonly sortOptions: { key: string; dir: 'asc' | 'desc'; label: string }[] = [
    { key: 'created_at', dir: 'desc', label: 'Newest first' },
    { key: 'created_at', dir: 'asc', label: 'Oldest first' },
    { key: 'name', dir: 'asc', label: 'Name A–Z' },
    { key: 'name', dir: 'desc', label: 'Name Z–A' },
  ];
  readonly stockStatusLabels: Record<string, string> = {
    in_stock: 'In stock',
    low_stock: 'Low stock',
    out_of_stock: 'Out of stock',
    on_backorder: 'Backorder',
    untracked: 'Not tracked',
  };

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
    hsn_status: null,
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
    this.helperService.searchPlaceholder.next('Search name, SKU or HSN');
    if (this.helperService.can('products.export')) this.helperService.setExportAction({ label: 'Export', icon: 'download' });
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
    this.fetchStats();
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
        this.filterOption.hsn_status = queryParam.get('hsn_status');
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
          hsn_status: this.filterOption.hsn_status || null,
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
        key: 'hsn_status',
        label: 'HSN Code',
        type: 'select',
        options: [
          { value: 'missing', label: 'Missing HSN' },
          { value: 'present', label: 'Has HSN' },
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
    if (this.filterValues['hsn_status']) count++;
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
        this.applyFilterValues(result);
      });
  }
  // Single path for every filter change — the drawer, status tabs, summary
  // cards and the applied-filter chips — so they all stay in sync.
  applyFilterValues(values: Record<string, any>): void {
    this.filterValues = values;
    this.filterOption.category = this.filterValues['category']?.length
      ? this.filterValues['category'].join(',')
      : null;
    this.filterOption.brand = this.filterValues['brand']?.length
      ? this.filterValues['brand'].join(',')
      : null;
    this.filterOption.status = this.filterValues['status'] || null;
    this.filterOption.stock_status =
      this.filterValues['stock_status'] || null;
    this.filterOption.hsn_status = this.filterValues['hsn_status'] || null;
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
  }
  setStatusTab(status: string | null): void {
    if ((this.filterValues['status'] || null) === status) return;
    this.applyFilterValues({ ...this.filterValues, status });
  }
  // Summary cards toggle their stock filter.
  filterByStock(status: string): void {
    const next = this.filterValues['stock_status'] === status ? null : status;
    this.applyFilterValues({ ...this.filterValues, stock_status: next });
  }
  // Applied filters as chips. Status is left out — the tabs already show it.
  get activeFilters(): { key: string; label: string; value: string }[] {
    const v = this.filterValues;
    const names = (values: string[], options: { value: string; label: string }[]) =>
      values.map((x) => options.find((o) => o.value === x)?.label ?? x).join(', ');
    const optionLabel = (key: string) =>
      this.filterFields.find((f) => f.key === key)?.options?.find((o: any) => o.value === v[key])?.label ?? v[key];
    const chips: { key: string; label: string; value: string }[] = [];
    if (v['category']?.length) chips.push({ key: 'category', label: 'Category', value: names(v['category'], this.categoryOptions) });
    if (v['brand']?.length) chips.push({ key: 'brand', label: 'Brand', value: names(v['brand'], this.brandOptions) });
    if (v['stock_status']) chips.push({ key: 'stock_status', label: 'Stock', value: optionLabel('stock_status') });
    if (v['hsn_status']) chips.push({ key: 'hsn_status', label: 'HSN', value: optionLabel('hsn_status') });
    if (v['type']) chips.push({ key: 'type', label: 'Type', value: optionLabel('type') });
    if (v['tags']?.length) chips.push({ key: 'tags', label: 'Tags', value: names(v['tags'], this.tagOptions) });
    if (v['classifications']?.length) chips.push({ key: 'classifications', label: 'Classification', value: names(v['classifications'], this.classificationOptions) });
    if (v['min_price'] || v['max_price']) {
      const value = v['min_price'] && v['max_price'] ? `₹${v['min_price']} – ₹${v['max_price']}`
        : v['min_price'] ? `from ₹${v['min_price']}` : `up to ₹${v['max_price']}`;
      chips.push({ key: 'price', label: 'Price', value });
    }
    return chips;
  }
  removeFilter(key: string): void {
    const values = { ...this.filterValues };
    if (key === 'price') {
      values['min_price'] = null;
      values['max_price'] = null;
    } else {
      values[key] = Array.isArray(values[key]) ? [] : null;
    }
    this.applyFilterValues(values);
  }
  clearFilters(): void {
    this.applyFilterValues({
      category: [], brand: [], status: null, stock_status: null, hsn_status: null,
      type: null, tags: [], classifications: [], min_price: null, max_price: null,
    });
  }
  // True when an item of this product would ship without an HSN code: no product
  // code, and (for variable products) some variation has none of its own.
  hsnMissing(item: any): boolean {
    if (item?.hsn_sac) return false;
    const variations = item?.type === 'variable' ? item?.variations ?? [] : [];
    return !variations.length || variations.some((v: any) => !v?.hsn_sac);
  }
  ngOnDestroy(): void {
    this.helperService.searchPlaceholder.next(null);
    this.helperService.clearExportAction();
    this.helperService.clearActionButton();
    this.helperService.clearFilterButton();
    this.destroy$.next();
    this.destroy$.complete();
  }
  setSort(key: string, dir: 'asc' | 'desc'): void {
    if (this.isSort(key, dir)) return;
    this.sortKey = key;
    this.sortDirection = dir;
    this.paginationOption = { ...Global.resetPaginationOptions(), limit: this.paginationOption.limit };
    this.fetchProductList();
  }
  isSort(key: string, dir: 'asc' | 'desc'): boolean {
    return this.sortKey === key && this.sortDirection === dir;
  }
  get sortLabel(): string {
    return this.sortOptions.find((o) => this.isSort(o.key, o.dir))?.label ?? 'Sort';
  }
  sort(field: string): void {
    this.paginationOption = { ...Global.resetPaginationOptions(), limit: this.paginationOption.limit };

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
          this.fetchStats();
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
    if (this.filterOption.hsn_status) {
      params.set('hsn_status', this.filterOption.hsn_status);
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
    params.set('limit', String(this.paginationOption.limit));
    if (this.paginationOption.page) params.set('page', String(this.paginationOption.page));
    this.loading = true;
    this.inventoryService.productList(params).pipe(finalize(() => (this.loading = false))).subscribe({
      next: (res: any) => {
        this.item_list = res?.data?.docs ?? [];
        this.paginationOption = {
          ...res?.data,
        };
      },
      error: (err) => {},
    });
  }
  fetchStats() {
    this.inventoryService.productStats(new URLSearchParams()).subscribe({
      next: (res: any) => {
        this.stats = res?.data ?? null;
        this.siteThreshold = Number(res?.data?.low_stock_threshold ?? this.siteThreshold);
      },
      error: () => {},
    });
  }
  // Activate / deactivate the selected products, skipping ones already there.
  bulkSetStatus(status: 'active' | 'inactive') {
    const targets = this.item_list.filter((item: any) => this.selectedIds.has(item._id) && item.status !== status);
    const verb = status === 'active' ? 'activate' : 'deactivate';
    if (!targets.length) {
      this.toastr.info(`The selected products are already ${status}.`);
      return;
    }
    this.dialogService.confirmDialog({
      title: 'Are you sure?',
      message: `Do you want to ${verb} ${targets.length} product${targets.length === 1 ? '' : 's'}?`,
      cancelText: 'Cancel',
      saveText: 'Confirm',
    }).subscribe((result: any) => {
      if (!result?.confirm) return;
      this.bulkBusy = true;
      forkJoin(targets.map((item: any) => this.inventoryService.updateProductStatus({ _id: item._id, status })))
        .pipe(finalize(() => {
          this.bulkBusy = false;
          this.fetchProductList();
        }))
        .subscribe({
          next: () => this.toastr.success(`${targets.length} product${targets.length === 1 ? '' : 's'} ${verb}d`),
          error: () => {},
        });
    });
  }
  deleteItem(item: any) {
    this.inventoryService.deleteProduct({ _id: item._id }).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.body?.message);
        this.fetchProductList();
        this.fetchStats();
      },
      error: (err: any) => {},
    });
  }
  onPageChange(data: any) {
    this.paginationOption.page = data;
    this.fetchProductList();
  }
  private readonly access = injectPermissions(PermissionService);
  get permissions(): string[] { return this.access.actions('products'); }
  readonly zohoActions = [{ label: 'Sync with Zoho', icon: 'sync', action: 'zoho_sync' }];
  get canSyncZoho(): boolean { return this.access.can('zoho_sync.view'); }
  get canViewStock(): boolean { return this.access.can('inventory.view'); }
  get canExport(): boolean { return this.access.can('products.export'); }
  get rangeStart(): number {
    const p = this.paginationOption;
    return p?.totalDocs ? (Number(p.page || 1) - 1) * Number(p.limit || 0) + 1 : 0;
  }
  get rangeEnd(): number {
    return Math.min(this.rangeStart + (this.item_list?.length || 0) - 1, Number(this.paginationOption?.totalDocs || 0));
  }
  // One SKU's selling state. Low uses the SKU's own threshold, else the
  // site's — the same rule as the stock panel.
  private skuStock(sku: any) {
    if (sku?.manage_stock === false) return { tracked: false, available: 0, reserved: 0, status: 'untracked' };
    const reserved = Number(sku?.reserved_quantity ?? 0);
    const available = Number(sku?.available_quantity ?? Number(sku?.stock_quantity ?? 0) - reserved);
    let status = 'in_stock';
    if (available <= 0) status = sku?.allow_backorders ? 'on_backorder' : 'out_of_stock';
    else if (available <= Number(sku?.low_stock_threshold ?? this.siteThreshold)) status = 'low_stock';
    return { tracked: true, available: Math.max(0, available), reserved, status };
  }
  // Inventory cell: a simple product, a single variant, or a variable product
  // rolled up across its variants (worst state wins, but a few sold-out
  // variants read as "low" rather than "out").
  inventoryOf(item: any) {
    const skus = item?.type === 'variable' ? item?.variations ?? [] : [item];
    const states = skus.map((sku: any) => this.skuStock(sku));
    const tracked = states.filter((s: any) => s.tracked);
    const outCount = tracked.filter((s: any) => s.status === 'out_of_stock').length;
    let status = 'untracked';
    if (tracked.length) {
      if (outCount === tracked.length) status = 'out_of_stock';
      else if (tracked.every((s: any) => s.status === 'on_backorder' || s.status === 'out_of_stock')) status = 'on_backorder';
      else if (outCount || tracked.some((s: any) => s.status === 'low_stock')) status = 'low_stock';
      else status = 'in_stock';
    }
    return {
      status,
      tracked: tracked.length > 0,
      available: tracked.reduce((sum: number, s: any) => sum + s.available, 0),
      reserved: tracked.reduce((sum: number, s: any) => sum + s.reserved, 0),
      skus: skus.length,
      outCount: skus.length > 1 && outCount < tracked.length ? outCount : 0,
    };
  }
  // Selling price (sale when it undercuts regular) — a range for variable
  // products, with the struck-through regular price when there's one SKU.
  priceOf(item: any) {
    const skus = item?.type === 'variable' ? item?.variations ?? [] : [item];
    const onSale = (sku: any) => Number(sku?.sale_price) > 0 && Number(sku.sale_price) < Number(sku?.regular_price);
    const prices = skus
      .map((sku: any) => (onSale(sku) ? Number(sku.sale_price) : Number(sku?.regular_price)))
      .filter((n: number) => Number.isFinite(n) && n > 0);
    if (!prices.length) return { min: null, max: null, compareAt: null, discount: 0, anyOnSale: false };
    const single = skus.length === 1 && onSale(skus[0]);
    const compareAt = single ? Number(skus[0].regular_price) : null;
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      compareAt,
      discount: single ? Math.round((1 - Number(skus[0].sale_price) / compareAt!) * 100) : 0,
      anyOnSale: skus.some(onSale),
    };
  }
  // "available (reserved)" — available = on hand minus units held for
  // orders awaiting payment.
  stockText(sku: any): string {
    if (!sku) return '0';
    if (sku.manage_stock === false) return 'Not tracked';
    const onHand = Number(sku.stock_quantity ?? 0);
    const reserved = Number(sku.reserved_quantity ?? 0);
    const available = Math.max(0, onHand - reserved);
    return reserved > 0 ? `${available} available (${reserved} reserved)` : String(available);
  }
  onRowAction(action: string, item: any) {
    if (action === 'zoho_sync') this.openZohoSync(item);
  }
  openZohoSync(item: any) {
    if (!item?._id) return;
    this.dialog.open(ZohoSyncDialogComponent, {
      width: '820px', maxWidth: '96vw', autoFocus: 'dialog',
      data: { productId: item._id, productName: item.name, unsaved: false, canManage: this.access.can('zoho_sync.manage') },
    }).afterClosed().subscribe((result?: ZohoSyncDialogResult) => {
      // Pulled values are saved server-side; refresh so the row shows them.
      if (result?.pulled?.length) this.fetchProductList();
    });
  }
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

  trackByProduct(index: number, item: any) {
    return item?._id || item?.id || index;
  }

  trackByVariant(index: number, variant: any) {
    return variant?._id || variant?.id || index;
  }
}
