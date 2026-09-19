import { CurrencyPipe, NgIf } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-manual-payment-dialog',
  imports: [CurrencyPipe, NgIf, FormsModule, MatDialogModule],
  template: `
    <form #form="ngForm" (ngSubmit)="submit()" class="p-6 space-y-4">
      <h2 class="text-xl font-bold">Record manual payment</h2>
      <p>Amount required: <strong>{{ data.amount | currency:data.currency }}</strong></p>
      <p *ngIf="data.partialCod" class="text-sm">This records the advance only. The remaining balance is due on delivery.</p>
      <p class="rounded-lg bg-amber-50 p-3 text-sm">Use this for money already received by bank transfer, direct UPI or cash. Verify receipt before confirming. This records payment and moves the order to processing. Refunds must use the original payment method.</p>
      <label class="block">Payment method
        <select name="method" [(ngModel)]="method" required class="mt-1 w-full rounded border p-2">
          <option value="bank_transfer">Bank transfer</option><option value="upi">Direct UPI</option><option value="cash">Cash</option>
        </select>
      </label>
      <label class="block">Amount received ({{ data.currency }})
        <input name="amount" type="number" [(ngModel)]="amount" required min="0.01" step="0.01" class="mt-1 w-full rounded border p-2">
      </label>
      <p *ngIf="amount !== data.amount" class="text-sm text-red-700">Enter the exact amount required above.</p>
      <label class="block">Transaction reference / cash receipt number
        <input name="reference" [(ngModel)]="reference" required minlength="3" maxlength="100" class="mt-1 w-full rounded border p-2">
      </label>
      <label class="block">Received at
        <input name="receivedAt" type="datetime-local" [(ngModel)]="receivedAt" required class="mt-1 w-full rounded border p-2">
      </label>
      <label class="block">Reason for manual recording
        <textarea name="reason" [(ngModel)]="reason" required minlength="10" maxlength="500" rows="2" class="mt-1 w-full rounded border p-2"></textarea>
      </label>
      <label class="flex gap-2 text-sm"><input name="confirmed" type="checkbox" [(ngModel)]="confirmed" required> I verified that this payment was received and has not already been recorded.</label>
      <div class="flex justify-end gap-3">
        <button type="button" (click)="dialogRef.close()" class="rounded border px-4 py-2">Cancel</button>
        <button type="submit" [disabled]="form.invalid || !valid" class="rounded bg-primary px-4 py-2 text-white disabled:opacity-50">Confirm payment received</button>
      </div>
    </form>
  `,
})
export class ManualPaymentDialogComponent {
  method = 'bank_transfer';
  amount: number;
  reference = '';
  reason = '';
  confirmed = false;
  receivedAt = '';

  constructor(
    public dialogRef: MatDialogRef<ManualPaymentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { amount: number; currency: string; partialCod: boolean },
  ) { this.amount = data.amount; }

  get valid(): boolean {
    const date = new Date(this.receivedAt).getTime();
    return this.confirmed && this.amount > 0 &&
      Math.round(this.amount * 100) === Math.round(this.data.amount * 100) &&
      this.reference.trim().length >= 3 && this.reason.trim().length >= 10 &&
      Number.isFinite(date) && date <= Date.now();
  }

  submit(): void {
    if (!this.valid) return;
    this.dialogRef.close({ amount: this.amount, currency: this.data.currency,
      method: this.method, reference: this.reference.trim(), reason: this.reason.trim(),
      received_at: new Date(this.receivedAt).toISOString(), confirmed: true });
  }
}
