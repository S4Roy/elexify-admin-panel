import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, DestroyRef } from '@angular/core';
import { finalize, interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ZohoBooksService } from 'app/core/services/zoho-books.service';
import { HelpersService } from 'app/core/services/helpers.service';

@Component({
  selector: 'app-zoho-salesorder',
  imports: [CommonModule],
  template: `<section class="integration-card" *ngIf="canManage">
    <h3 class="text-lg font-semibold">Customer sync</h3>
    <p *ngIf="state?.customer?.contact_id; else customerSync">Reference ID: <strong class="break-all">{{ state.customer.contact_id }}</strong></p>
    <ng-template #customerSync>
      <p>{{ customerPending ? 'Customer synchronization in progress…' : 'Customer not linked to Zoho yet.' }}</p>
      <p *ngIf="state && !state.enabled">Enable Zoho Books synchronization in settings to sync this customer.</p>
      <button class="rounded bg-slate-900 text-white px-4 py-2 mt-3" [disabled]="customerBusy || customerPending || !state?.enabled" (click)="syncCustomer()">
        {{ customerBusy ? 'Queueing…' : customerPending ? 'Sync queued' : 'Sync customer to Zoho' }}
      </button>
      <p class="text-red-700 mt-2" role="alert" *ngIf="customerError || state?.customer?.job?.last_error">{{ customerError || state?.customer?.job?.last_error }}<br *ngIf="!customerError && state?.customer?.job?.last_error_detail?.message"><span *ngIf="!customerError">{{ state?.customer?.job?.last_error_detail?.message }}</span></p>
    </ng-template>
    <button class="px-4 py-2" [disabled]="customerBusy" (click)="load()">Refresh</button>
    <p class="text-red-700" role="alert" *ngIf="error">{{ error }}</p>
  </section>
  <section class="integration-card" *ngIf="canManage && state">
    <h3 class="text-lg font-semibold">Sales order sync</h3>
    <p>Status: {{ state.job?.status || state.zoho?.sync_status || 'Not synced' }}</p>
    <p>Sales Order: {{ state.zoho?.salesorder_number || '—' }} · ID: {{ state.zoho?.salesorder_id || '—' }}</p>
    <p>Last sync: {{ (state.zoho?.synced_at | date:'medium') || 'Never' }}</p>
    <p class="text-red-700" role="alert" *ngIf="error || state.job?.last_error">{{ error || state.job?.last_error }}<br *ngIf="!error && state.job?.last_error_detail?.message"><span *ngIf="!error">{{ state.job?.last_error_detail?.message }}</span></p>
    <p *ngIf="!state.zoho?.packed_at">Available after packing.</p>
    <button class="rounded bg-slate-900 text-white px-4 py-2 mt-3" [disabled]="busy || !state.enabled || !state.zoho?.packed_at" (click)="sync()">{{ busy ? 'Queueing…' : 'Sync / Re-sync to Zoho' }}</button>
    <button class="px-4 py-2" [disabled]="busy" (click)="load()">Refresh</button>
  </section>`,
  styles: [`
    :host { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 16px; }
    .integration-card { min-width: 0; border: 1px solid var(--border-color, #e2e8f0); border-radius: 12px; padding: 20px; background: var(--bg-surface, white); color: var(--text-primary, #1e293b); }
    h3 { margin: 0 0 12px; font-size: 14px; }
    p { margin: 8px 0; font-size: 13px; line-height: 1.6; overflow-wrap: anywhere; }
    button { min-height: 40px; border-radius: 8px; font-size: 12px; font-weight: 600; }
    button:disabled { opacity: .5; cursor: not-allowed; }
    button:focus-visible { outline: 2px solid var(--nav-primary, #2563eb); outline-offset: 3px; }
    [role=alert] { padding: 10px; border-left: 3px solid #ef4444; background: var(--bg-surface-alt, #f8fafc); border-radius: 4px; }
    @media (max-width: 760px) { :host { grid-template-columns: 1fr; } }
  `],
})
export class ZohoSalesorderComponent implements OnChanges {
  @Input() orderId = '';
  state: any;
  busy = false;
  customerBusy = false;
  customerError = '';
  get customerPending() { return ['queued', 'running', 'retrying'].includes(this.state?.customer?.job?.status); }
  error = '';
  constructor(private api: ZohoBooksService, private helpers: HelpersService, destroyRef: DestroyRef) {
    interval(5000).pipe(takeUntilDestroyed(destroyRef)).subscribe(() => {
      if (this.canManage && this.customerPending && !this.state?.customer?.contact_id) this.load();
    });
  }
  get canManage() { return this.helpers.can('zoho_sync.manage'); }
  ngOnChanges(): void { if (this.orderId && this.canManage) { this.state = null; this.error = ''; this.customerError = ''; this.load(); } }
  load(): void { this.api.order(this.orderId).subscribe({ next: response => { this.state = response.data; this.error = ''; }, error: () => this.error = 'Could not load Zoho status.' }); }
  syncCustomer(): void {
    if (this.customerBusy || this.customerPending || !this.state?.enabled || this.state?.customer?.contact_id) return;
    this.customerBusy = true; this.customerError = '';
    this.api.sync('order_contact', [this.orderId]).pipe(finalize(() => this.customerBusy = false)).subscribe({
      next: response => {
        this.state.customer = { ...this.state.customer, job: response.data?.[0] };
        this.load();
      },
      error: response => this.customerError = response?.error?.message || 'Unable to queue customer synchronization.',
    });
  }
  sync(): void {
    if (this.busy) return;
    this.busy = true; this.error = '';
    this.api.sync('salesorder', [this.orderId]).pipe(finalize(() => this.busy = false)).subscribe({
      next: () => this.load(), error: response => this.error = response?.error?.message || 'Unable to queue synchronization.',
    });
  }
}
