import { CurrencyPipe, DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
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
import { OrderDetailsComponent } from './order-details/order-details.component';
import { HelpersService } from 'app/core/services/helpers.service';
import { Subject, combineLatest, takeUntil } from 'rxjs';
import { OrderShippingComponent } from './order-shipping/order-shipping.component';
import { EmptyStateComponent } from '../../../includes/empty-state/empty-state.component';
import { FilterDrawerComponent } from '../../../includes/filter-drawer/filter-drawer.component';

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
  // Note: order_status is intentionally NOT included here — it's already
  // driven by the /inventory/orders/:order_status route (status tiles /
  // sidebar links), so a drawer filter for it would just duplicate that nav.
  filterValues: Record<string, any> = {
    payment_status: [],
    payment_method: [],
    from_date: null,
    to_date: null,
  };
  private destroy$ = new Subject<void>();
  customerId: string | null = null;
  customerContext: any = null;
  customerSummary: any = null;

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
        this.filterOption.customer_id = this.customerId;
        this.filterOption.order_status =
          params.get('order_status') || queryParams.get('order_status');
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
  addItem(data: any = null) {}
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
  fetchOrderList() {
    let params = new URLSearchParams({
      sort_by: this.sortKey,
      sort_order: this.sortDirection === 'asc' ? '1' : '-1',
    });
    if (this.paginationOption.limit) {
      params.set('limit', String(this.paginationOption.limit));
    }
    if (this.paginationOption.page) {
      params.set('page', String(this.paginationOption.page));
    }
    if (this.filterOption.category) {
      params.set('category', this.filterOption.category);
    }
    if (this.filterOption.search_key) {
      params.set('search_key', this.filterOption.search_key);
    }
    if (this.filterOption.order_status) {
      params.set('order_status', this.filterOption.order_status);
    }
    if (this.filterOption.customer_id) {
      params.set('customer_id', this.filterOption.customer_id);
    }
    if (this.filterOption.payment_status) {
      params.set('payment_status', this.filterOption.payment_status);
    }
    if (this.filterOption.payment_method) {
      params.set('payment_method', this.filterOption.payment_method);
    }
    if (this.filterOption.from_date) {
      params.set('from_date', this.filterOption.from_date);
    }
    if (this.filterOption.to_date) {
      params.set('to_date', this.filterOption.to_date);
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
        width: '900px',
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
    this.helperService.clearFilterButton();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
