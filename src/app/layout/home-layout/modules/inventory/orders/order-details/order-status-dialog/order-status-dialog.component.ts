import { NgFor, NgIf } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

const STATUSES = [
  ['pending', 'Pending'], ['confirmed', 'Confirmed'], ['processing', 'Processing'],
  ['packed', 'Packed'], ['shipped', 'Shipped'], ['out_for_delivery', 'Out for Delivery'],
  ['delivered', 'Delivered'], ['failed', 'Failed'],
];

// Kept in sync with PACKAGE_CASCADE_STATUSES in elexify-backend
// services/orderService/manualOrderStatus.js — the only statuses an order
// that's already been split into packages can move to, since applying one
// cascades the same status onto every one of its packages.
const PACKAGE_CASCADE_STATUSES = new Set(['packed', 'shipped', 'out_for_delivery', 'delivered', 'failed']);

@Component({
  selector: 'app-order-status-dialog',
  imports: [NgFor, NgIf, FormsModule, MatDialogModule],
  template: `
    <div class="p-6 sm:p-8">
      <h2 class="text-xl font-bold text-gray-900">Correct order status</h2>
      <p class="mt-2 text-sm text-gray-600">Order #{{ data.orderNumber }} is currently <strong>{{ data.currentStatus }}</strong>.</p>
      <p class="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
        This updates the fulfillment label and is recorded in the order history. It does not charge, refund, cancel, or book a courier shipment.
      </p>
      <p *ngIf="data.hasPackages" class="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
        This order has already been split into packages, so only shipment-stage statuses are available below — applying one updates every package too.
      </p>
      <label for="order-status-target" class="mt-5 block text-sm font-semibold text-gray-800">New status</label>
      <select id="order-status-target" [(ngModel)]="status"
        class="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm focus:border-primary focus:outline-none">
        <option value="">Select a status</option>
        <option *ngFor="let option of statuses" [value]="option[0]"
          [disabled]="option[0] === data.currentStatus || (data.hasPackages && !isPackageEligible(option[0]))">{{ option[1] }}</option>
      </select>
      <ng-container *ngIf="needsShiprocketReference">
        <p class="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
          This order has no package yet, so "Packed" requires the Shiprocket order it was actually booked under — it's verified live against Shiprocket before anything is saved.
        </p>
        <label for="order-status-shiprocket-id" class="mt-4 block text-sm font-semibold text-gray-800">Shiprocket order ID</label>
        <input id="order-status-shiprocket-id" type="text" inputmode="numeric" [(ngModel)]="shiprocketOrderId"
          placeholder="e.g. 123456789"
          class="mt-2 w-full rounded-lg border border-gray-300 px-3 py-3 text-sm focus:border-primary focus:outline-none" />
      </ng-container>
      <label for="order-status-reason" class="mt-5 block text-sm font-semibold text-gray-800">Reason for correction</label>
      <textarea id="order-status-reason" [(ngModel)]="reason" rows="3" maxlength="500"
        placeholder="Explain why this status needs to change (at least 10 characters)"
        class="mt-2 w-full resize-none rounded-lg border border-gray-300 px-3 py-3 text-sm focus:border-primary focus:outline-none"></textarea>
      <div class="mt-6 flex justify-end gap-3">
        <button type="button" (click)="dialogRef.close()" class="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700">Keep current status</button>
        <button type="button" (click)="confirm()" [disabled]="!canConfirm"
          class="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Confirm change</button>
      </div>
    </div>
  `,
})
export class OrderStatusDialogComponent {
  statuses = STATUSES;
  status = '';
  reason = '';
  shiprocketOrderId = '';

  constructor(
    public dialogRef: MatDialogRef<OrderStatusDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { orderNumber: string; currentStatus: string; hasPackages?: boolean },
  ) {}

  isPackageEligible(status: string): boolean {
    return PACKAGE_CASCADE_STATUSES.has(status);
  }

  // "Packed" on an order with no packages at all needs a verified
  // Shiprocket reference (see registerExternalPackage on the backend) —
  // once it already has packages, correcting back to "packed" is the
  // ordinary cascade path and needs no reference.
  get needsShiprocketReference(): boolean {
    return this.status === 'packed' && !this.data.hasPackages;
  }

  get canConfirm(): boolean {
    if (!this.status || this.status === this.data.currentStatus || this.reason.trim().length < 10) return false;
    if (this.needsShiprocketReference && !/^\d+$/.test(this.shiprocketOrderId.trim())) return false;
    return true;
  }

  confirm(): void {
    if (!this.canConfirm) return;
    this.dialogRef.close({
      status: this.status,
      reason: this.reason.trim(),
      ...(this.needsShiprocketReference ? { shiprocketOrderId: this.shiprocketOrderId.trim() } : {}),
    });
  }
}
