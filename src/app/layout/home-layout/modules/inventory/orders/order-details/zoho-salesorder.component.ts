import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';
import { finalize } from 'rxjs';
import { ZohoBooksService } from 'app/core/services/zoho-books.service';
import { HelpersService } from 'app/core/services/helpers.service';

@Component({
  selector: 'app-zoho-salesorder',
  imports: [CommonModule],
  template: `<section class="rounded-lg border bg-white p-5 mb-6" *ngIf="canManage && state">
    <h3 class="text-lg font-semibold">Zoho Books Sales Order</h3>
    <p>Status: {{ state.job?.status || state.zoho?.sync_status || 'Not synced' }}</p>
    <p>Sales Order: {{ state.zoho?.salesorder_number || '—' }} · ID: {{ state.zoho?.salesorder_id || '—' }}</p>
    <p>Last sync: {{ (state.zoho?.synced_at | date:'medium') || 'Never' }}</p>
    <p class="text-red-700" role="alert" *ngIf="error || state.job?.last_error">{{ error || state.job?.last_error }}</p>
    <p *ngIf="!state.zoho?.packed_at">Available after packing.</p>
    <button class="rounded bg-slate-900 text-white px-4 py-2 mt-3" [disabled]="busy || !state.enabled || !state.zoho?.packed_at" (click)="sync()">{{ busy ? 'Queueing…' : 'Sync / Re-sync to Zoho' }}</button>
    <button class="px-4 py-2" [disabled]="busy" (click)="load()">Refresh</button>
  </section>`,
})
export class ZohoSalesorderComponent implements OnChanges {
  @Input() orderId = '';
  state: any;
  busy = false;
  error = '';
  constructor(private api: ZohoBooksService, private helpers: HelpersService) {}
  get canManage() { return ['superadmin', 'manager'].includes(this.helpers.role()); }
  ngOnChanges(): void { if (this.orderId && this.canManage) this.load(); }
  load(): void { this.api.order(this.orderId).subscribe({ next: response => this.state = response.data, error: () => this.error = 'Could not load Zoho status.' }); }
  sync(): void {
    if (this.busy) return;
    this.busy = true; this.error = '';
    this.api.sync('salesorder', [this.orderId]).pipe(finalize(() => this.busy = false)).subscribe({
      next: () => this.load(), error: response => this.error = response?.error?.message || 'Unable to queue synchronization.',
    });
  }
}
