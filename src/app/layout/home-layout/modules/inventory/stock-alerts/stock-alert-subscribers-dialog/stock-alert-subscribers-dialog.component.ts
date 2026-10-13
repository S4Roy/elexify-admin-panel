import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { ApiService } from 'app/core/services/api.service';

const CHANNEL_LABELS: Record<string, string> = { email: 'Email', whatsapp: 'WhatsApp', push: 'App push', sms: 'SMS' };

// Customers who asked to be notified about one product/variation — still
// waiting, and recently notified.
@Component({
  selector: 'app-stock-alert-subscribers-dialog',
  imports: [MatDialogModule, NgIf, NgFor, DatePipe, RouterLink],
  template: `
    <h2 mat-dialog-title>Notify-me requests</h2>
    <mat-dialog-content class="dialog-body">
      <p class="text-sm text-gray-700 mb-3">
        <strong>{{ data.item?.name }}</strong><span *ngIf="data.item?.variation_name"> · {{ data.item.variation_name }}</span>
      </p>
      <div *ngIf="loading" class="text-center text-gray-500 py-6">Loading…</div>
      <table *ngIf="!loading && rows.length" class="w-full text-sm">
        <thead class="text-xs text-gray-500 uppercase">
          <tr><th class="text-left py-2">Customer</th><th class="text-left">Requested</th><th class="text-left">Status</th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of rows" class="border-t">
            <td class="py-2 pr-3">
              <a *ngIf="row.customer; else gone" mat-dialog-close class="font-medium text-gray-900 hover:underline" [routerLink]="['/customers/details', row.customer._id]">
                {{ row.customer.name || 'Unnamed customer' }}
              </a>
              <ng-template #gone><span class="text-gray-400">Deleted customer</span></ng-template>
              <span class="block text-xs text-gray-500">{{ row.customer?.email || row.customer?.mobile || '' }}</span>
            </td>
            <td class="pr-3 whitespace-nowrap">{{ row.created_at | date : 'short' }}<span class="block text-xs text-gray-500">via {{ row.source }}</span></td>
            <td>
              <span *ngIf="row.status === 'active'" class="table-status bg-amber-100 text-amber-800">Waiting</span>
              <ng-container *ngIf="row.status === 'notified'">
                <span class="table-status bg-green-100 text-green-800">Notified</span>
                <span class="block text-xs text-gray-500">{{ row.notified_at | date : 'short' }}{{ channels(row) }}</span>
              </ng-container>
            </td>
          </tr>
        </tbody>
      </table>
      <p *ngIf="!loading && !rows.length" class="text-sm text-gray-500">No requests for this item.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-dialog-close type="button"
        class="inline-flex justify-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50">
        Close
      </button>
    </mat-dialog-actions>
  `,
})
export class StockAlertSubscribersDialogComponent implements OnInit {
  loading = true;
  rows: any[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { item: any },
    private apiService: ApiService,
  ) {}

  ngOnInit(): void {
    const params = new URLSearchParams({ product_id: String(this.data.item.product_id) });
    if (this.data.item.variation_id) params.set('variation_id', String(this.data.item.variation_id));
    this.apiService.stockAlertSubscribers(params).subscribe({
      next: (res: any) => {
        this.rows = res?.data ?? [];
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  channels(row: any): string {
    const list = (row.channels || []).map((c: string) => CHANNEL_LABELS[c] ?? c);
    return list.length ? ` · ${list.join(', ')}` : '';
  }
}
