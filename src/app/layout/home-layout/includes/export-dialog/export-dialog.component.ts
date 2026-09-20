import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-export-dialog',
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatSelectModule],
  template: `<div class="p-6">
    <h2 mat-dialog-title>Export {{ data.entity }}</h2>
    <mat-dialog-content>
      <p class="mb-4">Download an Excel (.xlsx) file. Exports include all matching pages.</p>
      <mat-form-field class="w-full">
        <mat-label>Export scope</mat-label>
        <mat-select [(ngModel)]="scope">
          <mat-option value="filtered">All {{ data.entity }} matching current filters</mat-option>
          <mat-option value="selected" [disabled]="!data.selectionCount">Selected rows ({{ data.selectionCount }})</mat-option>
        </mat-select>
      </mat-form-field>
      <p>{{ data.filterCount }} filters applied{{ data.searchKey ? ' · Search: ' + data.searchKey : '' }}</p>
      <p class="mt-3 text-sm text-gray-500">Maximum 20,000 rows, including product variations. Narrow filters for larger exports.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button type="button" class="px-4 py-2" (click)="dialogRef.close()">Cancel</button>
      <button type="button" class="rounded bg-primary px-4 py-2 text-white" (click)="dialogRef.close({ scope })">Export</button>
    </mat-dialog-actions>
  </div>`,
})
export class ExportDialogComponent {
  scope: 'filtered' | 'selected';
  constructor(public dialogRef: MatDialogRef<ExportDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { entity: string; selectionCount: number; filterCount: number; searchKey?: string | null }) {
    this.scope = data.selectionCount ? 'selected' : 'filtered';
  }
}
