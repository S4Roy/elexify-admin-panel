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

@Component({
  selector: 'app-shiprocket-details-dialog',
  imports: [NgFor, NgIf],
  template: `
    <div class="p-6 sm:p-8">
      <h2 class="text-xl font-bold text-gray-900">Shiprocket details</h2>
      <p class="mt-1 text-xs text-gray-500">
        {{ data.linked_now ? 'Found on Shiprocket and linked to this order.' : data.changed ? 'Shipment details synchronized. Package outcomes are shown below.' : 'Live lookup completed. No local changes were made.' }}
      </p>

      <div *ngIf="data.details" class="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-200">
        <div *ngFor="let row of rows" class="flex justify-between gap-4 px-4 py-2.5 text-sm">
          <span class="text-gray-500">{{ row.label }}</span>
          <span class="font-medium text-gray-900">{{ row.value || '—' }}</span>
        </div>
      </div>

      <div *ngIf="data.packages?.length" class="mt-4 max-h-[55vh] overflow-auto space-y-3">
        <section *ngFor="let pkg of data.packages" class="rounded-lg border border-gray-200 p-3 text-sm">
          <div class="flex flex-wrap justify-between gap-2">
            <strong>{{ pkg.reference_id || 'Package ' + pkg.package_number }}</strong>
            <span>{{ label(pkg.outcome) }}</span>
          </div>
          <dl class="mt-2 grid grid-cols-2 gap-2">
            <div><dt class="text-xs text-gray-500">Package status</dt><dd>{{ label(pkg.status) }}</dd></div>
            <div><dt class="text-xs text-gray-500">Carrier status</dt><dd>{{ pkg.details?.status || '—' }}</dd></div>
            <div><dt class="text-xs text-gray-500">AWB</dt><dd class="break-all">{{ pkg.details?.awb || '—' }}</dd></div>
            <div><dt class="text-xs text-gray-500">Courier</dt><dd>{{ pkg.details?.courier_name || '—' }}</dd></div>
            <div><dt class="text-xs text-gray-500">Shipment ID</dt><dd>{{ pkg.details?.shipment_id || '—' }}</dd></div>
            <div><dt class="text-xs text-gray-500">ETD</dt><dd>{{ pkg.details?.etd || '—' }}</dd></div>
          </dl>
          <p *ngIf="pkg.error || pkg.message" class="mt-2 text-amber-800">{{ pkg.error || pkg.message }}</p>
          <p *ngIf="pkg.outcome === 'metadata_only'" class="mt-2 text-gray-500">Tracking updated; cancellation, return or refund workflow preserved.</p>
          <p *ngIf="pkg.outcome === 'stale'" class="mt-2 text-gray-500">A newer local update was kept.</p>
        </section>
      </div>
      <p *ngIf="data.outcome === 'metadata_only'" class="mt-3 text-sm text-gray-500">Tracking updated; fulfillment status was preserved.</p>
      <p *ngIf="data.reconciliation_error" class="mt-3 text-sm text-amber-800">{{ data.reconciliation_error }}</p>
      <p *ngIf="!data.found && !data.packages?.length" class="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
        {{ data.message }}
      </p>

      <div class="mt-6 flex justify-end gap-2">
        <button *ngIf="failedPackageIds.length || data.reconciliation_error" type="button"
          (click)="dialogRef.close({ retry: true, packageIds: data.reconciliation_error ? undefined : failedPackageIds })"
          class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold">Retry {{ data.reconciliation_error ? 'sync' : 'failed packages' }}</button>
        <button type="button" (click)="dialogRef.close()" class="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white">Close</button>
      </div>
    </div>
  `,
})
export class ShiprocketDetailsDialogComponent {
  get failedPackageIds(): string[] {
    return (this.data.packages || []).filter(pkg => pkg.outcome === 'error').map(pkg => pkg.package_id);
  }
  label(value?: string): string {
    return (value || 'Unknown').replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  }
  rows: { label: string; value: string | null }[] = [];

  constructor(
    public dialogRef: MatDialogRef<ShiprocketDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { found: boolean; linked_now?: boolean; details?: ShiprocketDetails; message?: string; changed?: boolean; outcome?: string; reconciliation_error?: string;
      packages?: { package_id: string; package_number: number; reference_id?: string; status: string;
        outcome: string; details?: ShiprocketDetails; error?: string; message?: string }[] },
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
