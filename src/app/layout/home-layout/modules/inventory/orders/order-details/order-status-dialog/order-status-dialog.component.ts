import { NgFor } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

const STATUSES = [
  ['pending', 'Pending'], ['confirmed', 'Confirmed'], ['processing', 'Processing'],
  ['packed', 'Packed'], ['shipped', 'Shipped'], ['out_for_delivery', 'Out for Delivery'],
  ['delivered', 'Delivered'], ['failed', 'Failed'],
];

@Component({
  selector: 'app-order-status-dialog',
  imports: [NgFor, FormsModule, MatDialogModule],
  template: `
    <div class="p-6 sm:p-8">
      <h2 class="text-xl font-bold text-gray-900">Correct order status</h2>
      <p class="mt-2 text-sm text-gray-600">Order #{{ data.orderNumber }} is currently <strong>{{ data.currentStatus }}</strong>.</p>
      <p class="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
        This updates the fulfillment label and is recorded in the order history. It does not charge, refund, cancel, or book a courier shipment.
      </p>
      <label for="order-status-target" class="mt-5 block text-sm font-semibold text-gray-800">New status</label>
      <select id="order-status-target" [(ngModel)]="status"
        class="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm focus:border-primary focus:outline-none">
        <option value="">Select a status</option>
        <option *ngFor="let option of statuses" [value]="option[0]" [disabled]="option[0] === data.currentStatus">{{ option[1] }}</option>
      </select>
      <label for="order-status-reason" class="mt-5 block text-sm font-semibold text-gray-800">Reason for correction</label>
      <textarea id="order-status-reason" [(ngModel)]="reason" rows="3" maxlength="500"
        placeholder="Explain why this status needs to change (at least 10 characters)"
        class="mt-2 w-full resize-none rounded-lg border border-gray-300 px-3 py-3 text-sm focus:border-primary focus:outline-none"></textarea>
      <div class="mt-6 flex justify-end gap-3">
        <button type="button" (click)="dialogRef.close()" class="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700">Keep current status</button>
        <button type="button" (click)="confirm()" [disabled]="!status || status === data.currentStatus || reason.trim().length < 10"
          class="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Confirm change</button>
      </div>
    </div>
  `,
})
export class OrderStatusDialogComponent {
  statuses = STATUSES;
  status = '';
  reason = '';

  constructor(
    public dialogRef: MatDialogRef<OrderStatusDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { orderNumber: string; currentStatus: string },
  ) {}

  confirm(): void {
    if (!this.status || this.status === this.data.currentStatus || this.reason.trim().length < 10) return;
    this.dialogRef.close({ status: this.status, reason: this.reason.trim() });
  }
}
