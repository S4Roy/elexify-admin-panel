import { CurrencyPipe, NgIf } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface SendCartReminderDialogData {
  items: any[];
}

// Confirms a manual reminder (single or bulk) with an optional coupon code
// shown in the email. Customers who haven't opted in are skipped server-side.
@Component({
  selector: 'app-send-cart-reminder-dialog',
  imports: [MatDialogModule, NgIf, CurrencyPipe, FormsModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Send cart reminder</h2>
    <mat-dialog-content>
      <p class="text-sm text-gray-700 mb-3" *ngIf="data.items.length === 1">
        Remind <strong>{{ data.items[0]?.customer?.name || 'this customer' }}</strong> about their cart worth
        <strong>{{ data.items[0]?.cart_value | currency : 'INR' }}</strong>.
      </p>
      <p class="text-sm text-gray-700 mb-3" *ngIf="data.items.length > 1">
        Remind <strong>{{ data.items.length }}</strong> customers about their carts.
      </p>
      <p class="text-xs text-gray-500 mb-4">
        Sent by email, WhatsApp and app push — only on channels each customer has opted into.
        Customers reminded in the last hour are skipped.
      </p>
      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Coupon code (optional)</mat-label>
        <input matInput [(ngModel)]="couponCode" maxlength="40" placeholder="e.g. COMEBACK10" />
        <mat-hint>Shown in the email. Make sure the coupon exists and is active.</mat-hint>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-dialog-close type="button"
        class="inline-flex justify-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50">
        Cancel
      </button>
      <button type="button" (click)="confirm()"
        class="ml-2 inline-flex justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90">
        Send reminder
      </button>
    </mat-dialog-actions>
  `,
})
export class SendCartReminderDialogComponent {
  couponCode = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: SendCartReminderDialogData,
    private dialogRef: MatDialogRef<SendCartReminderDialogComponent>,
  ) {}

  confirm(): void {
    this.dialogRef.close({ coupon_code: this.couponCode.trim().toUpperCase() || null });
  }
}
