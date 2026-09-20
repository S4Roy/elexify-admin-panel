import { NgFor, NgIf } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

interface BulkStatusResultRow {
  order_id: string;
  success: boolean;
  order_status?: string;
  error?: string;
}

// Shown after a bulk status update call so failures (ineligible orders,
// concurrent edits, etc.) are visible per order rather than folded into a
// single toast — bulk admin actions can partially succeed by design (see
// bulkUpdateStatus.js on the backend).
@Component({
  selector: 'app-bulk-order-status-result-dialog',
  imports: [NgFor, NgIf],
  template: `
    <div class="p-6 sm:p-8">
      <h2 class="text-xl font-bold text-gray-900">Bulk status update results</h2>
      <p class="mt-2 text-sm text-gray-600">
        {{ data.summary.updated }} of {{ data.summary.total }} order{{ data.summary.total === 1 ? '' : 's' }} updated.
        <span *ngIf="data.summary.failed">{{ data.summary.failed }} skipped — see below.</span>
      </p>
      <div class="mt-4 max-h-80 overflow-y-auto rounded-lg border border-gray-200">
        <table class="w-full text-left text-sm">
          <thead class="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th class="px-3 py-2">Order ID</th>
              <th class="px-3 py-2">Result</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of data.results" class="border-t border-gray-100">
              <td class="px-3 py-2 font-mono text-xs">{{ row.order_id }}</td>
              <td class="px-3 py-2">
                <span *ngIf="row.success" class="text-green-700">Updated to {{ row.order_status }}</span>
                <span *ngIf="!row.success" class="text-red-600">{{ row.error }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="mt-6 flex justify-end">
        <button type="button" (click)="dialogRef.close()" class="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white">Close</button>
      </div>
    </div>
  `,
})
export class BulkOrderStatusResultDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<BulkOrderStatusResultDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { summary: { total: number; updated: number; failed: number }; results: BulkStatusResultRow[] },
  ) {}
}
