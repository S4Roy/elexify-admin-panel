import {
  CurrencyPipe,
  DatePipe,
  NgClass,
  NgFor,
  NgIf,
  TitleCasePipe,
} from '@angular/common';
import { Component, Inject, Optional } from '@angular/core';
import {
  MatDialog,
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import FilterOptions from 'app/core/models/FilterOptions';
import { InventoryService } from 'app/core/services/inventory.service';
import * as Global from 'app/global';
import { CancelOrderDialogComponent } from './cancel-order-dialog/cancel-order-dialog.component';
import { ForceCancelOrderDialogComponent } from './force-cancel-order-dialog/force-cancel-order-dialog.component';
import { ReopenOrderDialogComponent } from './reopen-order-dialog/reopen-order-dialog.component';
import { HelpersService } from 'app/core/services/helpers.service';
import { OrderShippingComponent } from '../order-shipping/order-shipping.component';
import { OrderStatusDialogComponent } from './order-status-dialog/order-status-dialog.component';

// Mirrors the backend's default admin_cancellation_statuses policy
// (elexify-backend/src/services/settings/shipping/model.js) — the backend is
// the real enforcer of this rule; this only controls whether the button is
// shown. Includes "packed" since a packed order without courier details
// attached is still normally cancellable; if courier details are already
// attached the backend rejects with "already handed to the courier" and the
// superadmin-only Force Cancel button (see canForceCancel) is the fallback.
const CANCELLABLE_STATUSES = ['pending', 'confirmed', 'processing', 'packed'];

// The one status where a normal cancel can plausibly be blocked by
// already-attached courier details — mirrors
// FORCE_CANCELLABLE_ORDER_STATUSES in the backend
// (elexify-backend/src/constants/orderStatus.js), scoped down to just
// "packed" here since pending/confirmed/processing never have courier
// details and are already covered by the normal Cancel Order button.
const FORCE_CANCEL_STATUSES = ['packed'];

// Mirrors INVOICE_ELIGIBLE_STATUSES / canGenerateInvoice in the backend
// (elexify-backend/src/constants/orderStatus.js) — the backend is the real
// enforcer; this only controls whether the button is shown.
const INVOICE_ELIGIBLE_STATUSES = [
  'confirmed',
  'processing',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
  'partially_shipped',
  'partially_delivered',
];

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  packed: 'Packed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  failed: 'Failed',
  cancelled: 'Cancelled',
  return_requested: 'Return Requested',
  returned: 'Returned',
  partially_shipped: 'Partially Shipped',
  partially_delivered: 'Partially Delivered',
};

const ORDER_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-blue-100 text-blue-800',
  packed: 'bg-blue-100 text-blue-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  out_for_delivery: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-red-100 text-red-800',
  return_requested: 'bg-gray-100 text-gray-700',
  returned: 'bg-gray-100 text-gray-700',
  partially_shipped: 'bg-sky-100 text-sky-800',
  partially_delivered: 'bg-cyan-100 text-cyan-800',
};

// package.status -> display label/style for the Packages & Tracking card.
const PACKAGE_STATUS_LABELS: Record<string, string> = {
  packed: 'Packed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  return_requested: 'Return Requested',
  returned: 'Returned',
  failed: 'Failed — needs retry',
};

const PACKAGE_STATUS_STYLES: Record<string, string> = {
  packed: 'bg-blue-100 text-blue-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  out_for_delivery: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-700',
  return_requested: 'bg-gray-100 text-gray-700',
  returned: 'bg-gray-100 text-gray-700',
  failed: 'bg-red-100 text-red-800',
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

@Component({
  selector: 'app-order-details',
  imports: [
    MatDialogModule,
    DatePipe,
    NgFor,
    NgIf,
    NgClass,
    CurrencyPipe,
    TitleCasePipe,
  ],
  templateUrl: './order-details.component.html',
  styleUrl: './order-details.component.scss',
})
export class OrderDetailsComponent {
  Global = Global;
  filterOption: FilterOptions;
  cancelling = false;
  forceCancelling = false;
  reopening = false;
  updatingStatus = false;
  retryingRefund = false;
  downloadingInvoice = false;
  syncingZohoInvoice = false;
  zohoInvoice: any = null;

  constructor(
    @Optional() public dialogRef: MatDialogRef<OrderDetailsComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any,
    private route: ActivatedRoute,
    private inventoryService: InventoryService,
    private dialog: MatDialog,
    private toastr: ToastrService,
    private helpersService: HelpersService
  ) {
    this.filterOption = Global.resetTableFilterOptions();
  }
  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.filterOption._id = params.get('_id');
      if (this.filterOption._id) {
        this.fetchOrderList();
      }
    });
  }
  onConfirm(): void {
    this.dialogRef.close({ confirm: true });
  }

  onCancel(): void {
    this.dialogRef.close({ discard: true });
  }
  closeModal() {
    this.dialogRef.close(false);
  }
  fetchOrderList() {
    const orderId = this.filterOption._id || this.data?._id;
    if (!orderId) return;
    let params = new URLSearchParams();
    params.set('_id', String(orderId));
    this.inventoryService.orderList(params).subscribe({
      next: (res: any) => {
        this.data = res?.data;
        this.fetchZohoInvoiceStatus();
      },
      error: (err) => {},
    });
  }

  fetchZohoInvoiceStatus(): void {
    if (!this.data?._id) return;
    this.inventoryService.zohoInvoiceStatus(this.data._id).subscribe({
      next: (res: any) => { this.zohoInvoice = res?.data ?? null; },
      error: () => { this.zohoInvoice = null; },
    });
  }

  syncZoho(): void {
    if (!this.data?._id || this.syncingZohoInvoice) return;
    this.syncingZohoInvoice = true;
    this.inventoryService.syncZohoInvoice(this.data._id).subscribe({
      next: (res: any) => {
        this.syncingZohoInvoice = false;
        this.zohoInvoice = res?.data ?? null;
        this.toastr.success('Invoice synchronized with Zoho Books');
        this.fetchOrderList();
      },
      error: () => {
        this.syncingZohoInvoice = false;
        this.fetchZohoInvoiceStatus();
      },
    });
  }

  zohoStatusLabel(status: string): string {
    return ({ not_synced: 'Not synced', syncing: 'Syncing', synced: 'Synced', failed: 'Failed' } as Record<string, string>)[status] ?? status;
  }

  get isCancellable(): boolean {
    return (
      !!this.data?.order_status &&
      CANCELLABLE_STATUSES.includes(this.data.order_status)
    );
  }

  // Backend also refuses this if a refund already went through — this only
  // controls whether the button is shown.
  get canReopen(): boolean {
    return (
      ['superadmin', 'manager'].includes(this.helpersService.role()) &&
      this.data?.order_status === 'cancelled'
    );
  }

  get canForceCancel(): boolean {
    return (
      this.helpersService.role() === 'superadmin' &&
      !!this.data?.order_status &&
      FORCE_CANCEL_STATUSES.includes(this.data.order_status)
    );
  }

  get canRetryRefund(): boolean {
    return this.data?.payment_status === 'refund_failed';
  }

  get canDownloadInvoice(): boolean {
    return (
      !!this.data?.invoice?.generated ||
      INVOICE_ELIGIBLE_STATUSES.includes(this.data?.order_status)
    );
  }

  get canManageZohoInvoice(): boolean {
    return ['superadmin', 'manager'].includes(this.helpersService.role());
  }

  get canManageOrderStatus(): boolean {
    return ['superadmin', 'manager'].includes(this.helpersService.role());
  }

  openStatusDialog(): void {
    if (!this.data?._id || this.updatingStatus) return;
    const currentStatus = this.data.order_status;
    this.dialog.open(OrderStatusDialogComponent, {
      width: '560px', maxWidth: '96vw', disableClose: true,
      data: { orderNumber: this.data.id, currentStatus },
    }).afterClosed().subscribe((result: any) => {
      if (!result?.status || !result?.reason) return;
      this.updatingStatus = true;
      this.inventoryService.updateOrderStatus({
        order_id: this.data._id,
        expected_status: currentStatus,
        status: result.status,
        reason: result.reason,
      }).subscribe({
        next: () => {
          this.updatingStatus = false;
          this.toastr.success('Order status updated');
          this.fetchOrderList();
        },
        error: () => { this.updatingStatus = false; this.fetchOrderList(); },
      });
    });
  }

  get canManagePackages(): boolean {
    return !['cancelled', 'returned', 'return_requested', 'delivered', 'failed'].includes(
      this.data?.order_status,
    );
  }

  get packages(): any[] {
    return this.data?.packages ?? [];
  }

  packageQuantity(pkg: any): number {
    return (pkg.items ?? []).reduce(
      (total: number, line: any) => total + Number(line.quantity || 0), 0,
    );
  }

  orderItemFor(id: string): any {
    return (this.data?.order_items ?? []).find((item: any) => String(item._id) === String(id));
  }

  packageStatusLabel(status: string): string {
    return PACKAGE_STATUS_LABELS[status] ?? status;
  }

  packageStatusClass(status: string): string {
    return PACKAGE_STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700';
  }

  openManagePackages(): void {
    this.dialog
      .open(OrderShippingComponent, {
        width: '1440px',
        maxWidth: '98vw',
        maxHeight: '94vh',
        data: { item: this.data },
      })
      .afterClosed()
      .subscribe((res: any) => {
        if (res) this.fetchOrderList();
      });
  }

  orderStatusLabel(status: string): string {
    return ORDER_STATUS_LABELS[status] ?? status;
  }

  orderStatusClass(status: string): string {
    return ORDER_STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700';
  }

  paymentStatusLabel(status: string): string {
    return PAYMENT_STATUS_LABELS[status] ?? status;
  }

  paymentStatusClass(status: string): string {
    return PAYMENT_STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700';
  }

  // Percentage is derived from the order's own stored amounts, not the live
  // admin-configured setting, so it always reflects what was actually
  // charged even if the percentage changes later.
  get partialCodLabel(): string | null {
    if (!this.data?.is_partial_cod || !this.data?.grand_total) return null;
    const advancePercent = Math.round((this.data.advance_amount / this.data.grand_total) * 100);
    return `Partial COD – ${advancePercent}% Paid, ${100 - advancePercent}% Due on Delivery`;
  }

  // Mirrors the MRP/discount breakdown shown on the customer order-detail
  // page (elexify.online account/orders/[id]) so admin sees the same math.
  get actualItemCount(): number {
    return (this.data?.order_items ?? []).reduce(
      (sum: number, item: any) => sum + (Number(item?.quantity) || 0),
      0
    );
  }

  get itemsPayable(): number {
    return (this.data?.order_items ?? []).reduce(
      (sum: number, item: any) => sum + (Number(item?.total_price) || 0),
      0
    );
  }

  itemRate(item: any): number {
    const regular = Number(item?.regular_price);
    const quantity = Number(item?.quantity) || 0;
    const netRate = quantity > 0
      ? Number(item?.total_price ?? 0) / quantity
      : Number(item?.unit_price ?? 0);
    return Number.isFinite(regular) && regular > 0
      ? Math.max(regular, netRate)
      : netRate;
  }

  itemProductDiscount(item: any): number {
    return Math.max(0, Number((
      this.itemRate(item) * (Number(item?.quantity) || 0) -
      Number(item?.total_price ?? 0)
    ).toFixed(2)));
  }

  get mrpSubtotal(): number {
    if (!this.data?.order_items?.length) return Number(this.data?.total_amount || 0);
    return Number(this.data.order_items.reduce((sum: number, item: any) =>
      sum + this.itemRate(item) * (Number(item?.quantity) || 0), 0
    ).toFixed(2));
  }

  get productDiscount(): number {
    return Number((this.data?.order_items ?? []).reduce(
      (sum: number, item: any) => sum + this.itemProductDiscount(item), 0
    ).toFixed(2));
  }

  get totalSavings(): number {
    return this.productDiscount + Number(this.data?.discount || 0);
  }

  openCancelDialog() {
    const ref = this.dialog.open(CancelOrderDialogComponent, {
      width: '480px',
      disableClose: true,
      data: { orderNumber: this.data?.id },
    });

    ref.afterClosed().subscribe((result: any) => {
      if (!result?.confirm) return;
      this.cancelling = true;
      this.inventoryService
        .cancelOrder({
          order_id: this.data?._id,
          reason: result.reason,
          comment: result.comment,
        })
        .subscribe({
          next: (res: any) => {
            this.cancelling = false;
            this.data = {
              ...this.data,
              order_status: res?.data?.order_status ?? 'cancelled',
              payment_status:
                res?.data?.payment_status ?? this.data.payment_status,
              cancellation: res?.data?.cancellation ?? this.data.cancellation,
              refund: res?.data?.refund ?? this.data.refund,
            };
            this.toastr.success('Order cancelled successfully');
          },
          error: () => {
            this.cancelling = false;
          },
        });
    });
  }

  openForceCancelDialog() {
    const ref = this.dialog.open(ForceCancelOrderDialogComponent, {
      width: '480px',
      disableClose: true,
      data: { orderNumber: this.data?.id, orderStatus: this.orderStatusLabel(this.data?.order_status) },
    });

    ref.afterClosed().subscribe((result: any) => {
      if (!result?.confirm) return;
      this.forceCancelling = true;
      this.inventoryService
        .forceCancelOrder({
          order_id: this.data?._id,
          reason: result.reason,
        })
        .subscribe({
          next: (res: any) => {
            this.forceCancelling = false;
            this.data = {
              ...this.data,
              order_status: res?.data?.order_status ?? 'cancelled',
              payment_status:
                res?.data?.payment_status ?? this.data.payment_status,
              cancellation: res?.data?.cancellation ?? this.data.cancellation,
              refund: res?.data?.refund ?? this.data.refund,
            };
            this.toastr.success('Order force-cancelled successfully');
          },
          error: () => {
            this.forceCancelling = false;
          },
        });
    });
  }

  openReopenDialog() {
    const ref = this.dialog.open(ReopenOrderDialogComponent, {
      width: '480px',
      disableClose: true,
      data: { orderNumber: this.data?.id },
    });

    ref.afterClosed().subscribe((result: any) => {
      if (!result?.confirm) return;
      this.reopening = true;
      this.inventoryService
        .reopenOrder({
          order_id: this.data?._id,
          reason: result.reason,
        })
        .subscribe({
          next: () => {
            this.reopening = false;
            this.toastr.success('Order reopened successfully');
            this.fetchOrderList();
          },
          error: () => {
            this.reopening = false;
          },
        });
    });
  }

  downloadInvoice() {
    if (this.downloadingInvoice) return;
    this.downloadingInvoice = true;
    this.inventoryService.downloadInvoice(this.data?._id).subscribe({
      next: (res: any) => {
        const blob: Blob = res;
        this.downloadingInvoice = false;
        const filename = this.data?.invoice?.invoice_number
          ? `Invoice-${this.data.invoice.invoice_number.replace(/\//g, '-')}.pdf`
          : `Invoice-${this.data?.id}.pdf`;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        this.toastr.success('Invoice downloaded successfully');
        // Picks up invoice.invoice_number/invoice_date on first generation
        // — the blob response itself carries no metadata to patch locally.
        this.fetchOrderList();
      },
      error: () => {
        this.downloadingInvoice = false;
        this.toastr.error('Unable to download invoice. Please try again.');
      },
    });
  }

  retryRefund() {
    this.retryingRefund = true;
    this.inventoryService
      .retryRefund({ order_id: this.data?._id })
      .subscribe({
        next: (res: any) => {
          this.retryingRefund = false;
          this.data = {
            ...this.data,
            payment_status:
              res?.data?.payment_status ?? this.data.payment_status,
            refund: res?.data?.refund ?? this.data.refund,
          };
          this.toastr.success('Refund retry initiated');
        },
        error: () => {
          this.retryingRefund = false;
        },
      });
  }
}
