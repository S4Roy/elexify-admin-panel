import { NgIf } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

// Matches PRODUCT_EXPORT_ROW_LIMIT in
// elexify-backend/src/services/inventory/product/exportProducts.js
const ROW_LIMIT = 20000;

@Component({
  selector: 'app-export-products-dialog',
  imports: [NgIf, FormsModule, MatDialogModule],
  template: `
    <div class="p-6 sm:p-8">
      <h2 class="text-xl font-bold text-gray-900">Export products</h2>
      <p class="mt-2 text-sm text-gray-600">Download an Excel (.xlsx) file of the products below.</p>

      <div class="mt-5 space-y-3">
        <label class="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-300 p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
          <input type="radio" name="export-scope" value="filtered" [(ngModel)]="scope" class="mt-1" />
          <span>
            <span class="block text-sm font-semibold text-gray-800">
              Export all products matching the current filters
            </span>
            <span class="block text-xs text-gray-500 mt-0.5">
              {{ data.filterCount ? data.filterCount + ' filter(s) applied' : 'No filters applied — exports every product' }}{{ data.searchKey ? ' · search "' + data.searchKey + '"' : '' }}
            </span>
          </span>
        </label>

        <label
          class="flex items-start gap-3 rounded-lg border border-gray-300 p-3"
          [class.cursor-pointer]="data.selectionCount > 0"
          [class.opacity-50]="!data.selectionCount"
          [class]="scope === 'selected' ? 'border-primary bg-primary/5' : ''"
        >
          <input type="radio" name="export-scope" value="selected" [(ngModel)]="scope" [disabled]="!data.selectionCount" class="mt-1" />
          <span>
            <span class="block text-sm font-semibold text-gray-800">Export only the selected rows</span>
            <span class="block text-xs text-gray-500 mt-0.5">
              {{ data.selectionCount ? data.selectionCount + ' product(s) selected on this page' : 'Select rows in the table first (checkboxes) to enable this' }}
            </span>
          </span>
        </label>
      </div>

      <p *ngIf="scope === 'filtered'" class="mt-4 text-xs text-gray-500">
        Limited to {{ rowLimit }} rows including variations per export — narrow the filters (e.g. by category) if you have more.
      </p>

      <div class="mt-6 flex justify-end gap-3">
        <button type="button" (click)="dialogRef.close()" class="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700">Cancel</button>
        <button type="button" (click)="confirm()" class="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white">Export</button>
      </div>
    </div>
  `,
})
export class ExportProductsDialogComponent {
  rowLimit = ROW_LIMIT;
  scope: 'filtered' | 'selected';

  constructor(
    public dialogRef: MatDialogRef<ExportProductsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { filterCount: number; searchKey?: string | null; selectionCount: number },
  ) {
    this.scope = data?.selectionCount ? 'selected' : 'filtered';
  }

  confirm(): void {
    this.dialogRef.close({ scope: this.scope });
  }
}
