import { inject } from '@angular/core';
import { ExportDialogComponent } from '../../../includes/export-dialog/export-dialog.component';
import { ExportDownloadService } from 'app/core/services/export-download.service';
import { CreateOrderComponent } from './create-order/create-order.component';
import { CurrencyPipe, DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import PaginationOptions from 'app/core/models/PaginationOptions';
import { MasterService } from 'app/core/services/master.service';
import { PaginationComponent } from 'app/layout/home-layout/includes/pagination/pagination.component';
import { ToastrService } from 'ngx-toastr';
import { MenuComponent } from 'app/layout/home-layout/includes/menu/menu.component';
import * as Global from 'app/global';
import { InventoryService } from 'app/core/services/inventory.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import FilterOptions from 'app/core/models/FilterOptions';
import { FilterFieldDef, FilterFieldOption } from 'app/core/models/FilterFieldDef';
import { OrderDetailsComponent } from './order-details/order-details.component';
import { HelpersService } from 'app/core/services/helpers.service';
import { Observable, Subject, combineLatest, takeUntil } from 'rxjs';
import { map } from 'rxjs/operators';
import { OrderShippingComponent } from './order-shipping/order-shipping.component';
import { EmptyStateComponent } from '../../../includes/empty-state/empty-state.component';
import { FilterDrawerComponent } from '../../../includes/filter-drawer/filter-drawer.component';
import { BulkOrderStatusDialogComponent } from './bulk-order-status-dialog/bulk-order-status-dialog.component';
import { BulkOrderStatusResultDialogComponent } from './bulk-order-status-result-dialog/bulk-order-status-result-dialog.component';

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  paid: 'bg-green-100 text-green-800',
  advance_paid: 'bg-blue-100 text-blue-800',
  pending: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800',
  refund_pending: 'bg-yellow-100 text-yellow-800',
  partially_refunded: 'bg-yellow-100 text-yellow-800',
  refunded: 'bg-green-100 text-green-800',
  refund_failed: 'bg-red-100 text-red-800',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: 'Paid',
  advance_paid: 'Advance Paid',
  pending: 'Pending',
  failed: 'Failed',
  refund_pending: 'Refund Pending',
  partially_refunded: 'Partially Refunded',
  refunded: 'Refunded',
  refund_failed: 'Refund Failed',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: 'Cash on Delivery',
  razorpay: 'Razorpay',
};

@Component({
  selector: 'app-orders',
  imports: [
    EmptyStateComponent,
    NgFor,
    NgIf,
    NgClass,
    PaginationComponent,
    DatePipe,
    CurrencyPipe,
    RouterLink,
    MenuComponent,
    MatCheckboxModule,
  ],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss',
})
export class OrdersComponent {
  Global = Global;
  item_list: any = [];
  paginationOption: PaginationOptions;
  filterOption: FilterOptions;
  // Working filter values, keyed to match filterFields below — this is what
  // gets handed to the (page-agnostic) filter drawer and read back from it.
  filterValues: Record<string, any> = {
    import_source: null,
    customer: null,
    order_status: [],
    payment_status: [],
    payment_method: [],
    from_date: null,
    to_date: null,
  };
  private destroy$ = new Subject<void>();
  customerId: string | null = null;
  customerContext: any = null;
  customerSummary: any = null;
  // The /inventory/orders/:order_status route (status tiles/sidebar links)
  // always wins over the drawer's Status filter when present — same
  // precedence as customer_id above. Tracked separately from
  // filterOption.order_status since that field gets overwritten on every
  // route change by resetTableFilterOptions() and needs re-deriving.
  private routeOrderStatus: string | null = null;
  private statusFilterInitialized = false;

  constructor(
    private dialog: MatDialog,
    private inventoryService: InventoryService,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private router: Router,
    private helperService: HelpersService
  ) {
    this.paginationOption = Global.resetPaginationOptions();
    this.filterOption = Global.resetTableFilterOptions();
    // this.checkPermission();
  }
  public sortKey: string = 'created_at';
  public sortDirection: 'asc' | 'desc' = 'desc';
  ngOnInit(): void {
    if (this.canCreateOrder) this.helperService.setActionButton({ label: 'Create order', icon: 'add' });
    if (this.canManageOrderStatus) this.helperService.secondaryLink.next({ label: 'Reconcile from Shiprocket', icon: 'sync', url: '/inventory/orders/reconciliation' });
    this.helperService.setExportAction({ label: 'Export', icon: 'download' });
    this.helperService.actionButtonClick$.pipe(takeUntil(this.destroy$)).subscribe(() => this.addItem());
    this.helperService.exportActionClick$.pipe(takeUntil(this.destroy$)).subscribe(() => this.openExportDialog());
    this.helperService.selectionActionClick$.pipe(takeUntil(this.destroy$)).subscribe(() => this.openBulkStatusDialog());
    this.helperService.selectionClear$.pipe(takeUntil(this.destroy$)).subscribe(() => this.clearSelection());
    combineLatest([
      this.route.paramMap,
      this.route.queryParamMap,
      this.helperService.searchKey$,
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([params, queryParams, searchKey]) => {
        this.filterOption = Global.resetTableFilterOptions();
        this.filterOption.slug = params.get('slug');
        this.customerId = params.get('customer_id');
        // The route param (customer-context page) wins when present;
        // otherwise fall back to the drawer-selected Customer filter, which
        // must be re-applied here since resetTableFilterOptions() above
        // wipes filterOption back to defaults on every route change (same
        // reasoning as payment_status/payment_method below).
        this.filterOption.customer_id = this.customerId || this.filterValues['customer']?.value || null;
        this.routeOrderStatus = params.get('order_status') || queryParams.get('order_status');
        if (!this.statusFilterInitialized) {
          // Seed the main work queue once so clearing filters remains effective.
          // Customer history and dashboard links keep their original scope.
          if (!this.routeOrderStatus && !this.customerId &&
              !queryParams.get('from_date') && !queryParams.get('to_date')) {
            this.filterValues['order_status'] = ['pending', 'confirmed', 'processing', 'packed'];
          }
          this.statusFilterInitialized = true;
        }
        this.filterOption.order_status = this.routeOrderStatus ||
          (this.filterValues['order_status']?.length ? this.filterValues['order_status'].join(',') : null);
        this.filterOption.search_key = searchKey;
        // Seed the date-range filter from ?from_date=&to_date= if present
        // (e.g. links from the dashboard KPI cards) so it's reflected in
        // both the drawer and the fetched list.
        const queryFromDate = queryParams.get('from_date');
        const queryToDate = queryParams.get('to_date');
        if (queryFromDate) this.filterValues['from_date'] = queryFromDate;
        if (queryToDate) this.filterValues['to_date'] = queryToDate;
        // Re-apply any drawer-selected filters, since resetTableFilterOptions()
        // above wipes filterOption back to defaults on every route change.
        this.filterOption.payment_status = this.filterValues['payment_status']
          ?.length
          ? this.filterValues['payment_status'].join(',')
          : null;
        this.filterOption.payment_method = this.filterValues['payment_method']
          ?.length
          ? this.filterValues['payment_method'].join(',')
          : null;
        this.filterOption.from_date = this.filterValues['from_date'] || null;
        this.filterOption.to_date = this.filterValues['to_date'] || null;
        this.paginationOption.page = 1;
        this.fetchOrderList();
        this.updateFilterButton();
      });
    this.helperService.filterButtonClick$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.openFilters());
    this.updateFilterButton();
  }
  get filterFields(): FilterFieldDef[] {
    return [
      {
        key: 'import_source', label: 'Import source', type: 'select',
        options: [
          { value: '', label: 'All records' },
          { value: 'backup', label: 'WooCommerce backup import' },
          { value: 'other', label: 'Other records' },
        ],
      },
      {
        key: 'customer',
        label: 'Customer',
        type: 'async-select',
        placeholder: 'Search by name, email, or phone',
        searchFn: (term: string): Observable<FilterFieldOption[]> =>
          this.inventoryService.orderCustomerOptions(term).pipe(
            map((res: any) => (res?.data || []).map((c: any) => ({
              value: c._id,
              label: c.name + (c.email || c.mobile ? ` (${c.email || c.mobile})` : ''),
            }))),
          ),
      },
      {
        // Only the app-managed statuses (constants/orderStatus.js
        // ORDER_STATUS on the backend) — legacy/imported orders can carry
        // other free-text carrier statuses (see Global.statusColor's
        // SEMANTIC_STATUS_COLORS comment) that aren't offered here; those
        // are still reachable via search or a direct status-tile link.
        key: 'order_status',
        label: 'Status',
        type: 'multiselect',
        placeholder: 'All statuses',
        showCheckboxes: true,
        options: [
          { value: 'pending', label: 'Pending' },
          { value: 'confirmed', label: 'Confirmed' },
          { value: 'processing', label: 'Processing' },
          { value: 'packed', label: 'Packed' },
          { value: 'shipped', label: 'Shipped' },
          { value: 'partially_shipped', label: 'Partially Shipped' },
          { value: 'out_for_delivery', label: 'Out for Delivery' },
          { value: 'delivered', label: 'Delivered' },
          { value: 'partially_delivered', label: 'Partially Delivered' },
          { value: 'cancel_requested', label: 'Cancel Requested' },
          { value: 'cancelled', label: 'Cancelled' },
          { value: 'return_requested', label: 'Return Requested' },
          { value: 'returned', label: 'Returned' },
          { value: 'failed', label: 'Failed' },
        ],
      },
      {
        key: 'payment_status',
        label: 'Payment Status',
        type: 'multiselect',
        options: [
          { value: 'pending', label: 'Pending' },
          { value: 'paid', label: 'Paid' },
          { value: 'failed', label: 'Failed' },
        ],
      },
      {
        key: 'payment_method',
        label: 'Payment Method',
        type: 'multiselect',
        options: [
          { value: 'cod', label: 'Cash on Delivery' },
          { value: 'razorpay', label: 'Razorpay' },
        ],
      },
      {
        key: 'created_at',
        label: 'Order Date',
        type: 'daterange',
        fromKey: 'from_date',
        toKey: 'to_date',
      },
    ];
  }
  filterCount(): number {
    let count = 0;
    if (this.filterValues['import_source']) count++;
    if (this.filterValues['customer']) count++;
    if (this.filterValues['order_status']?.length) count++;
    if (this.filterValues['payment_status']?.length) count++;
    if (this.filterValues['payment_method']?.length) count++;
    if (this.filterValues['from_date'] || this.filterValues['to_date']) count++;
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
        this.filterOption.customer_id = this.customerId || this.filterValues['customer']?.value || null;
        this.filterOption.order_status = this.routeOrderStatus ||
          (this.filterValues['order_status']?.length ? this.filterValues['order_status'].join(',') : null);
        this.filterOption.payment_status = this.filterValues['payment_status']
          ?.length
          ? this.filterValues['payment_status'].join(',')
          : null;
        this.filterOption.payment_method = this.filterValues['payment_method']
          ?.length
          ? this.filterValues['payment_method'].join(',')
          : null;
        this.filterOption.from_date = this.filterValues['from_date'] || null;
        this.filterOption.to_date = this.filterValues['to_date'] || null;
        this.paginationOption.page = 1;
        this.fetchOrderList();
        this.updateFilterButton();
      });
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
    this.fetchOrderList();
  }
  getSortIcon(field: string): string {
    if (this.sortKey !== field) return 'sort-icon';
    return this.sortDirection === 'asc' ? 'sort-icon-up' : 'sort-icon-down';
  }
  get canCreateOrder(): boolean { return ['superadmin', 'manager'].includes(this.helperService.role()); }
  get canManageOrderStatus(): boolean { return ['superadmin', 'manager'].includes(this.helperService.role()); }

  // Bulk order-status selection — a page of checked rows feeds the
  // comma-separated order_ids the bulk dialog (and backend) expects.
  // Keyed by the human-readable Order.id (e.g. "ORD-010708"), the same
  // identifier shown in the table's ID column and the one the bulk
  // endpoint looks orders up by — not the Mongo _id, which never appears
  // in this UI. Kept per-page rather than across the whole filtered result
  // set, same as most admin table bulk-actions, since selecting "all
  // matching" would need a separate server-side query.
  selectedIds = new Set<string>();

  isSelected(item: any): boolean {
    return this.selectedIds.has(item?.id);
  }
  toggleSelected(item: any, checked: boolean): void {
    if (!item?.id) return;
    if (checked) this.selectedIds.add(item.id);
    else this.selectedIds.delete(item.id);
    this.syncSelectionAction();
  }
  get allOnPageSelected(): boolean {
    return !!this.item_list?.length && this.item_list.every((item: any) => this.selectedIds.has(item?.id));
  }
  toggleSelectAllOnPage(checked: boolean): void {
    for (const item of this.item_list || []) {
      if (checked) this.selectedIds.add(item.id);
      else this.selectedIds.delete(item.id);
    }
    this.syncSelectionAction();
  }
  clearSelection(): void {
    this.selectedIds.clear();
    this.syncSelectionAction();
  }
  // Mirrors the current selection into the shared breadcrumb-bar toolbar
  // (see HelpersService.selectionAction$) so "Update status" renders next
  // to Create order/Filters instead of a separate row under the table.
  private syncSelectionAction(): void {
    if (!this.canManageOrderStatus || !this.selectedIds.size) {
      this.helperService.clearSelectionAction();
      return;
    }
    this.helperService.setSelectionAction({
      count: this.selectedIds.size,
      label: 'Update status',
      icon: 'edit',
    });
  }
  openBulkStatusDialog(): void {
    if (!this.canManageOrderStatus) return;
    this.dialog.open(BulkOrderStatusDialogComponent, {
      width: '640px', maxWidth: '96vw', disableClose: true,
      data: { orderIds: Array.from(this.selectedIds) },
    }).afterClosed().subscribe((result: any) => {
      if (!result?.orderIds?.length || !result?.status || !result?.reason) return;
      this.inventoryService.bulkUpdateOrderStatus({
        order_ids: result.orderIds.join(','),
        status: result.status,
        reason: result.reason,
      }).subscribe({
        next: (res: any) => {
          const summary = res?.data?.summary;
          if (summary?.failed) {
            this.toastr.warning(`${summary.updated} updated, ${summary.failed} skipped`);
          } else {
            this.toastr.success(`${summary?.updated ?? 0} order(s) updated`);
          }
          this.dialog.open(BulkOrderStatusResultDialogComponent, {
            width: '560px', maxWidth: '96vw',
            data: { summary, results: res?.data?.results ?? [] },
          });
          this.clearSelection();
          this.fetchOrderList();
        },
        error: () => {},
      });
    });
  }
  private exportDownload = inject(ExportDownloadService);
  exporting = false;
  openExportDialog(): void {
    this.dialog.open(ExportDialogComponent, {
      width: '480px', maxWidth: '96vw',
      data: { entity: 'orders',
        filterCount: this.filterCount(),
        searchKey: this.filterOption.search_key,
        selectionCount: this.selectedIds.size,
      },
    }).afterClosed().subscribe((result: any) => {
      if (!result?.scope || this.exporting) return;
      const params = this.buildFilterParams();
      if (result.scope === 'selected') params.set('order_ids', Array.from(this.selectedIds).join(','));
      this.exporting = true;
      this.exportDownload.download(this.inventoryService.exportOrders(params), 'orders', () => this.exporting = false);
    });
  }
  addItem(data: any = null) {
    if (!this.canCreateOrder) return;
    this.dialog.open(CreateOrderComponent, { width: '1240px', maxWidth: '96vw', maxHeight: '94vh', autoFocus: 'first-tabbable', ariaLabelledBy: 'create-order-title', data: { customerId: this.customerId } })
      .afterClosed().subscribe(order => { if (order?._id) this.orderDetails(order); });
  }
  stockItem(data: any = null) {}
  paymentStatusClass(status: string): string {
    return PAYMENT_STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700';
  }
  paymentStatusLabel(status: string): string {
    return PAYMENT_STATUS_LABELS[status] ?? status;
  }
  paymentMethodLabel(method: string): string {
    return PAYMENT_METHOD_LABELS[method] ?? method;
  }
  // Percentage is derived from the order's own stored amounts, not the live
  // admin-configured setting, so it always reflects what was actually
  // charged even if the percentage changes later.
  partialCodLabel(item: any): string | null {
    if (!item?.is_partial_cod || !item?.grand_total) return null;
    const advancePercent = Math.round((item.advance_amount / item.grand_total) * 100);
    return `Partial COD – ${advancePercent}% Paid, ${100 - advancePercent}% Due on Delivery`;
  }
  // Shared with exportOrders() below — "export what I'm looking at" must
  // never drift from what the table itself is actually showing.
  private buildFilterParams(): URLSearchParams {
    const params = new URLSearchParams({
      sort_by: this.sortKey,
      sort_order: this.sortDirection === 'asc' ? '1' : '-1',
    });
    if (this.filterValues['import_source']) params.set('import_source', this.filterValues['import_source']);
    if (this.filterOption.category) params.set('category', this.filterOption.category);
    if (this.filterOption.search_key) params.set('search_key', this.filterOption.search_key);
    if (this.filterOption.order_status) params.set('order_status', this.filterOption.order_status);
    if (this.filterOption.customer_id) params.set('customer_id', this.filterOption.customer_id);
    if (this.filterOption.payment_status) params.set('payment_status', this.filterOption.payment_status);
    if (this.filterOption.payment_method) params.set('payment_method', this.filterOption.payment_method);
    if (this.filterOption.from_date) params.set('from_date', this.filterOption.from_date);
    if (this.filterOption.to_date) params.set('to_date', this.filterOption.to_date);
    return params;
  }
  fetchOrderList() {
    this.clearSelection();
    const params = this.buildFilterParams();
    if (this.paginationOption.limit) {
      params.set('limit', String(this.paginationOption.limit));
    }
    if (this.paginationOption.page) {
      params.set('page', String(this.paginationOption.page));
    }

    this.inventoryService.orderList(params).subscribe({
      next: (res: any) => {
        this.item_list = res?.data?.docs ?? [];
        this.paginationOption = {
          ...res?.data,
        };
        this.customerContext = res?.data?.filter_context?.customer ?? null;
        this.customerSummary = res?.data?.filter_context?.summary ?? null;
      },
      error: (err) => {},
    });
  }
  deleteItem(item: any) {
    // this.inventoryService.deleteProduct({ _id: item._id }).subscribe({
    //   next: (res: any) => {
    //     this.toastr.success(res?.body?.message);
    //     this.fetchOrderList();
    //   },
    //   error: (err: any) => {},
    // });
  }
  onPageChange(data: any) {
    this.paginationOption.page = data;
    this.fetchOrderList();
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
  orderDetails(item: any) {
    // if (['processing'].includes(item?.order_status)) {
    //   this.router.navigateByUrl('/inventory/orders/processing/' + item?._id);
    // } else {
    this.router.navigateByUrl('/inventory/orders/details/' + item?._id);
    // }
  }
  customerOrdersUrl(item: any): any[] {
    return ['/inventory/orders/customer', item?.user?._id];
  }
  shipItem(item: any) {
    this.dialog
      .open(OrderShippingComponent, {
        width: '1440px',
        maxWidth: '98vw',
        maxHeight: '94vh',
        data: { item: item },
      })
      .afterClosed()
      .subscribe((res: any) => {
        if (res) {
          this.fetchOrderList();
        }
      });
  }
  ngOnDestroy(): void {
    this.helperService.clearActionButton();
    this.helperService.clearExportAction();
    this.helperService.clearFilterButton();
    this.helperService.clearSelectionAction();
    this.helperService.secondaryLink.next(null);
    this.destroy$.next();
    this.destroy$.complete();
  }
}
