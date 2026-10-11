import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { InventoryService } from 'app/core/services/inventory.service';

// Own-rider delivery / store pickup — see elexify-backend
// services/orderService/packages/manualFulfillment.js.
export type ManualFulfillmentAction = 'dispatch' | 'deliver' | 'attempt' | 'return';

export interface ManualFulfillmentDialogData {
  action: ManualFulfillmentAction;
  orderNumber: string;
  mode?: 'self_delivery' | 'store_pickup';
  agentName?: string;
  otpSent?: boolean;
  codDue: number;
  currency: string;
}

const TITLES: Record<ManualFulfillmentAction, string> = {
  dispatch: 'Fulfil manually',
  deliver: 'Mark delivered',
  attempt: 'Record failed delivery attempt',
  return: 'Return to store',
};

// datetime-local wants local "YYYY-MM-DDTHH:mm".
const localNow = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

@Component({
  selector: 'app-manual-fulfillment-dialog',
  imports: [CurrencyPipe, NgIf, NgFor, FormsModule, MatDialogModule],
  template: `
    <form #form="ngForm" (ngSubmit)="submit()" class="p-6 space-y-4">
      <h2 class="text-xl font-bold">{{ title }} · {{ data.orderNumber }}</h2>

      <ng-container *ngIf="data.action === 'dispatch'">
        <p class="rounded-lg bg-amber-50 p-3 text-sm">For orders delivered by our own staff or collected from the store — not for courier shipments. Use this only once the goods are packed.</p>
        <fieldset class="space-y-2">
          <label class="flex gap-2"><input type="radio" name="mode" value="self_delivery" [(ngModel)]="mode"> Own delivery (rider leaves now — order becomes "Out for delivery")</label>
          <label class="flex gap-2"><input type="radio" name="mode" value="store_pickup" [(ngModel)]="mode"> Store pickup (order becomes "Ready for pickup")</label>
        </fieldset>
        <label *ngIf="mode === 'self_delivery'" class="block">Delivery staff
          <select name="agentUserId" [(ngModel)]="agentUserId" class="mt-1 w-full rounded border p-2">
            <option *ngFor="let s of staff" [value]="s._id">{{ s.name }}<ng-container *ngIf="s.mobile"> · {{ s.mobile }}</ng-container></option>
            <option value="">Someone else (no staff login)</option>
          </select>
          <span *ngIf="!staff.length" class="mt-1 block text-xs text-gray-500">No staff have the Delivery Staff role yet. Give a staff account that role so the delivery appears on their phone.</span>
          <span *ngIf="agentUserId" class="mt-1 block text-xs text-gray-500">They'll see it under My Deliveries and mark it delivered themselves.</span>
        </label>
        <label *ngIf="!agentUserId || mode !== 'self_delivery'" class="block">{{ mode === 'self_delivery' ? 'Rider name' : 'Staff at pickup counter' }}
          <input name="agentName" [(ngModel)]="agentName" required minlength="2" maxlength="100" class="mt-1 w-full rounded border p-2">
        </label>
        <label *ngIf="mode === 'self_delivery' && !agentUserId" class="block">Rider phone (optional, shown to the customer while out for delivery)
          <input name="agentPhone" [(ngModel)]="agentPhone" pattern="[0-9+\\- ]{7,20}" class="mt-1 w-full rounded border p-2">
        </label>
        <label class="block">{{ mode === 'self_delivery' ? 'Left the store at' : 'Ready since' }}
          <input name="dispatchedAt" type="datetime-local" [(ngModel)]="dispatchedAt" [max]="maxDate" required class="mt-1 w-full rounded border p-2">
        </label>
      </ng-container>

      <ng-container *ngIf="data.action === 'deliver'">
        <label class="block">{{ data.mode === 'store_pickup' ? 'Collected at' : 'Handed over at' }}
          <input name="deliveredAt" type="datetime-local" [(ngModel)]="deliveredAt" [max]="maxDate" required class="mt-1 w-full rounded border p-2">
        </label>
        <p class="-mt-2 text-xs text-gray-500">The actual handover time. The return window starts from here.</p>
        <label *ngIf="data.otpSent" class="block">Delivery code from the customer's SMS (optional)
          <input name="otp" [(ngModel)]="otp" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="one-time-code"
            class="mt-1 w-32 rounded border p-2 tracking-widest">
          <span class="mt-1 block text-xs text-gray-500">Entering it marks the handover as OTP-verified. Leave blank if the customer doesn't have it.</span>
        </label>
        <label class="block">Received by
          <input name="receiverName" [(ngModel)]="receiverName" required minlength="2" maxlength="100" class="mt-1 w-full rounded border p-2">
        </label>
        <label class="block">Relation to customer (optional)
          <input name="receiverRelation" [(ngModel)]="receiverRelation" maxlength="50" placeholder="Self, family, security guard…" class="mt-1 w-full rounded border p-2">
        </label>
        <label class="block">Proof photo URL (optional)
          <input name="photoUrl" type="url" [(ngModel)]="photoUrl" maxlength="1000" placeholder="Upload in Media, paste the link" class="mt-1 w-full rounded border p-2">
        </label>
        <div *ngIf="data.codDue > 0" class="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <p class="text-sm">Collect <strong>{{ data.codDue | currency:data.currency }}</strong> from the customer.</p>
          <label class="block">Collected via
            <select name="codMethod" [(ngModel)]="codMethod" required class="mt-1 w-full rounded border p-2">
              <option value="cash">Cash</option><option value="upi">UPI</option>
            </select>
          </label>
          <label class="block">Amount collected ({{ data.currency }})
            <input name="codAmount" type="number" [(ngModel)]="codAmount" required min="0.01" step="0.01" class="mt-1 w-full rounded border p-2">
          </label>
          <p *ngIf="!codAmountMatches" class="text-sm text-red-700">Enter the exact amount due.</p>
          <label class="block">{{ codMethod === 'upi' ? 'UPI transaction reference' : 'Cash receipt number (optional)' }}
            <input name="codReference" [(ngModel)]="codReference" [required]="codMethod === 'upi'" maxlength="100" class="mt-1 w-full rounded border p-2">
          </label>
        </div>
        <label class="block">Notes (optional)
          <textarea name="notes" [(ngModel)]="notes" maxlength="500" rows="2" class="mt-1 w-full rounded border p-2"></textarea>
        </label>
      </ng-container>

      <ng-container *ngIf="data.action === 'return'">
        <p class="rounded-lg bg-amber-50 p-3 text-sm">Use when the parcel is physically back at the store. The order goes back to "Processing" so you can dispatch it again or cancel it.</p>
      </ng-container>

      <label *ngIf="data.action !== 'deliver'" class="block">{{ data.action === 'attempt' ? 'Why delivery failed' : 'Reason' }}
        <textarea name="reason" [(ngModel)]="reason" required minlength="5" maxlength="500" rows="2" class="mt-1 w-full rounded border p-2"
          [placeholder]="data.action === 'attempt' ? 'Customer not reachable, refused, wrong address…' : ''"></textarea>
      </label>

      <div class="flex justify-end gap-3">
        <button type="button" (click)="dialogRef.close()" class="rounded border px-4 py-2">Cancel</button>
        <button type="submit" [disabled]="form.invalid || !valid" class="rounded bg-primary px-4 py-2 text-white disabled:opacity-50">{{ title }}</button>
      </div>
    </form>
  `,
})
export class ManualFulfillmentDialogComponent implements OnInit {
  mode: 'self_delivery' | 'store_pickup' = 'self_delivery';
  staff: { _id: string; name: string; mobile: string | null }[] = [];
  agentUserId = '';
  agentName = '';
  agentPhone = '';
  dispatchedAt = localNow();
  deliveredAt = localNow();
  receiverName = '';
  receiverRelation = '';
  photoUrl = '';
  notes = '';
  codMethod: 'cash' | 'upi' = 'cash';
  codAmount: number;
  codReference = '';
  otp = '';
  reason = '';
  readonly maxDate = localNow();

  constructor(
    public dialogRef: MatDialogRef<ManualFulfillmentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ManualFulfillmentDialogData,
    private inventoryService: InventoryService,
  ) {
    this.codAmount = data.codDue;
  }

  ngOnInit(): void {
    if (this.data.action !== 'dispatch') return;
    this.inventoryService.deliveryStaff().subscribe({
      next: (res: any) => {
        this.staff = res?.data ?? [];
        if (this.staff.length && !this.agentUserId) this.agentUserId = String(this.staff[0]._id);
      },
      error: () => { this.staff = []; },
    });
  }

  private get assignsStaff(): boolean {
    return this.mode === 'self_delivery' && !!this.agentUserId;
  }

  get title(): string {
    return TITLES[this.data.action];
  }

  get codAmountMatches(): boolean {
    return Math.round(this.codAmount * 100) === Math.round(this.data.codDue * 100);
  }

  private isPast(value: string): boolean {
    const t = new Date(value).getTime();
    return Number.isFinite(t) && t <= Date.now();
  }

  get valid(): boolean {
    switch (this.data.action) {
      case 'dispatch':
        return (this.assignsStaff || this.agentName.trim().length >= 2) && this.reason.trim().length >= 5 && this.isPast(this.dispatchedAt);
      case 'deliver':
        return this.receiverName.trim().length >= 2 && this.isPast(this.deliveredAt) && (!this.otp || /^\d{4}$/.test(this.otp)) &&
          (this.data.codDue <= 0 || (this.codAmountMatches && (this.codMethod !== 'upi' || !!this.codReference.trim())));
      default:
        return this.reason.trim().length >= 5;
    }
  }

  submit(): void {
    if (!this.valid) return;
    switch (this.data.action) {
      case 'dispatch':
        this.dialogRef.close({ mode: this.mode,
          ...(this.assignsStaff ? { agent_user_id: this.agentUserId } : { agent_name: this.agentName.trim(), agent_phone: this.agentPhone.trim() || null }),
          dispatched_at: new Date(this.dispatchedAt).toISOString(), reason: this.reason.trim() });
        return;
      case 'deliver':
        this.dialogRef.close({
          delivered_at: new Date(this.deliveredAt).toISOString(), receiver_name: this.receiverName.trim(),
          receiver_relation: this.receiverRelation.trim() || null, photo_url: this.photoUrl.trim() || null,
          notes: this.notes.trim() || null, otp: this.otp || null,
          cod_collection: this.data.codDue > 0
            ? { amount: this.codAmount, method: this.codMethod, reference: this.codReference.trim() || null } : null,
        });
        return;
      default:
        this.dialogRef.close({ reason: this.reason.trim() });
    }
  }
}
