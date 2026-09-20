import { NgFor } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

// Kept in sync with elexify-backend MANUAL_ORDER_STATUSES
// (controllers/admin/inventory/order/updateStatus.js) and the single-order
// OrderStatusDialogComponent's list.
const STATUSES = [
  ['pending', 'Pending'], ['confirmed', 'Confirmed'], ['processing', 'Processing'],
  ['packed', 'Packed'], ['shipped', 'Shipped'], ['out_for_delivery', 'Out for Delivery'],
  ['delivered', 'Delivered'], ['failed', 'Failed'],
];

// Matches BULK_ORDER_STATUS_LIMIT in
// elexify-backend/src/controllers/admin/inventory/order/bulkUpdateStatus.js
const BULK_LIMIT = 100;

// Order.id (elexify-backend models/Order.js) — the human-readable order
// number shown in the Orders table's ID column (e.g. "ORD-010708"), not
// the Mongo _id. Kept loose since older/imported orders may not follow the
// current "ORD-######" format; this only rules out obviously-bad input,
// matching the backend's own validation in routes/admin/inventory/order.js.
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

@Component({
  selector: 'app-bulk-order-status-dialog',
  imports: [NgFor, FormsModule, MatDialogModule],
  template: `
    <div class="p-6 sm:p-8">
      <h2 class="text-xl font-bold text-gray-900">Bulk update order status</h2>
      <p class="mt-2 text-sm text-gray-600">
        Paste or edit a comma-separated list of order IDs, pick the new status, and apply it to all of them at once.
        Each order is checked independently — orders that aren't eligible (cancelled, returned, unpaid, etc.) are skipped and reported, not silently failed.
        For an order already split into packages, only Packed/Shipped/Out for Delivery/Delivered/Failed are allowed — applying one of these updates every one of its packages too.
        An order with no package yet can't be bulk-moved to any of those statuses — each one needs a verified Shiprocket reference, entered one order at a time from its details page.
      </p>

      <label for="bulk-order-ids" class="mt-5 block text-sm font-semibold text-gray-800">Order IDs (comma-separated)</label>
      <textarea id="bulk-order-ids" [(ngModel)]="orderIdsText" rows="3" maxlength="4000"
        placeholder="ORD-010708, ORD-010712, ..."
        class="mt-2 w-full resize-none rounded-lg border border-gray-300 px-3 py-3 text-sm font-mono focus:border-primary focus:outline-none"></textarea>
      <div class="mt-1 flex justify-between text-xs">
        <span [class]="idCount > BULK_LIMIT ? 'text-red-600' : 'text-gray-500'">
          {{ idCount }} order{{ idCount === 1 ? '' : 's' }} entered (max {{ BULK_LIMIT }})
        </span>
      </div>

      <label for="bulk-order-status-target" class="mt-4 block text-sm font-semibold text-gray-800">New status</label>
      <select id="bulk-order-status-target" [(ngModel)]="status"
        class="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm focus:border-primary focus:outline-none">
        <option value="">Select a status</option>
        <option *ngFor="let option of statuses" [value]="option[0]">{{ option[1] }}</option>
      </select>

      <label for="bulk-order-status-reason" class="mt-5 block text-sm font-semibold text-gray-800">Reason for correction</label>
      <textarea id="bulk-order-status-reason" [(ngModel)]="reason" rows="3" maxlength="500"
        placeholder="Explain why these orders need to change (at least 10 characters)"
        class="mt-2 w-full resize-none rounded-lg border border-gray-300 px-3 py-3 text-sm focus:border-primary focus:outline-none"></textarea>

      <div class="mt-6 flex justify-end gap-3">
        <button type="button" (click)="dialogRef.close()" class="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700">Cancel</button>
        <button type="button" (click)="confirm()" [disabled]="!canConfirm"
          class="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Apply to {{ idCount }} order{{ idCount === 1 ? '' : 's' }}</button>
      </div>
    </div>
  `,
})
export class BulkOrderStatusDialogComponent {
  statuses = STATUSES;
  BULK_LIMIT = BULK_LIMIT;
  orderIdsText = '';
  status = '';
  reason = '';

  constructor(
    public dialogRef: MatDialogRef<BulkOrderStatusDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { orderIds?: string[] },
  ) {
    if (data?.orderIds?.length) this.orderIdsText = data.orderIds.join(', ');
  }

  get parsedIds(): string[] {
    return this.orderIdsText.split(',').map((id) => id.trim()).filter(Boolean);
  }

  get idCount(): number {
    return this.parsedIds.length;
  }

  get canConfirm(): boolean {
    const ids = this.parsedIds;
    return ids.length > 0 && ids.length <= BULK_LIMIT &&
      ids.every((id) => ID_PATTERN.test(id)) &&
      !!this.status && this.reason.trim().length >= 10;
  }

  confirm(): void {
    if (!this.canConfirm) return;
    this.dialogRef.close({ orderIds: this.parsedIds, status: this.status, reason: this.reason.trim() });
  }
}
