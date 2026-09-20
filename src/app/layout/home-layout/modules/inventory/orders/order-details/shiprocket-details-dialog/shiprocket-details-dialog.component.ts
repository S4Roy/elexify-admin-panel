import { NgFor, NgIf } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

interface ShiprocketDetails {
  shiprocket_order_id: string | null;
  channel_order_id: string | null;
  channel_name: string | null;
  status: string | null;
  shipment_id: string | null;
  awb: string | null;
  courier_name: string | null;
  etd: string | null;
}

// Read-only display for the "Fetch Shiprocket details" button — this
// never changes anything in the database (see
// services/orderService/fetchShiprocketDetails.js on the backend), it
// only shows exactly what Shiprocket currently reports.
@Component({
  selector: 'app-shiprocket-details-dialog',
  imports: [NgFor, NgIf],
  template: `
    <div class="p-6 sm:p-8">
      <h2 class="text-xl font-bold text-gray-900">Shiprocket details</h2>
      <p class="mt-1 text-xs text-gray-500">Fetched live from Shiprocket — nothing on this order was changed.</p>

      <div *ngIf="data.found" class="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-200">
        <div *ngFor="let row of rows" class="flex justify-between gap-4 px-4 py-2.5 text-sm">
          <span class="text-gray-500">{{ row.label }}</span>
          <span class="font-medium text-gray-900">{{ row.value || '—' }}</span>
        </div>
      </div>

      <p *ngIf="!data.found" class="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
        {{ data.message }}
      </p>

      <div class="mt-6 flex justify-end">
        <button type="button" (click)="dialogRef.close()" class="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white">Close</button>
      </div>
    </div>
  `,
})
export class ShiprocketDetailsDialogComponent {
  rows: { label: string; value: string | null }[] = [];

  constructor(
    public dialogRef: MatDialogRef<ShiprocketDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { found: boolean; details?: ShiprocketDetails; message?: string },
  ) {
    if (data.found && data.details) {
      const d = data.details;
      this.rows = [
        { label: 'Status', value: d.status },
        { label: 'Shiprocket order ID', value: d.shiprocket_order_id },
        { label: 'Channel order ID', value: d.channel_order_id },
        { label: 'Channel', value: d.channel_name },
        { label: 'AWB', value: d.awb },
        { label: 'Courier', value: d.courier_name },
        { label: 'ETD', value: d.etd },
        { label: 'Shipment ID', value: d.shipment_id },
      ];
    }
  }
}
