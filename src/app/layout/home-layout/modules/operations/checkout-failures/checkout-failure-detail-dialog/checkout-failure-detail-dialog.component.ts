import { DatePipe, JsonPipe, NgIf } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';

export const STAGE_LABELS: Record<string, string> = {
  place_order: 'Place Order',
  verify_payment: 'Verify Payment',
};

export interface CheckoutFailureDetailDialogData {
  entry: any;
}

@Component({
  selector: 'app-checkout-failure-detail-dialog',
  imports: [MatDialogModule, NgIf, DatePipe, JsonPipe],
  templateUrl: './checkout-failure-detail-dialog.component.html',
  styleUrl: './checkout-failure-detail-dialog.component.scss',
})
export class CheckoutFailureDetailDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: CheckoutFailureDetailDialogData) {}

  get entry(): any {
    return this.data?.entry ?? {};
  }

  get stageLabel(): string {
    return STAGE_LABELS[this.entry?.stage] ?? this.entry?.stage ?? '—';
  }

  get customerMobile(): string {
    const c = this.entry?.customer;
    return c?.mobile ? [c.phone_code, c.mobile].filter(Boolean).join(' ') : '—';
  }

  get hasContext(): boolean {
    return !!this.entry?.context && Object.keys(this.entry.context).length > 0;
  }
}
