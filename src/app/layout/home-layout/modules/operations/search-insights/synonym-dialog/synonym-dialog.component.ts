import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ApiService } from 'app/core/services/api.service';

export interface SynonymDialogData {
  id?: string;
  term: string;
  alternatives?: string[];
}

@Component({
  selector: 'app-synonym-dialog',
  imports: [FormsModule, NgIf, MatDialogModule],
  template: `<form class="p-6" (ngSubmit)="save()">
    <h2 mat-dialog-title>{{ data.id ? 'Edit synonym' : 'Add synonym' }}</h2>
    <mat-dialog-content>
      <p class="mb-4 text-sm text-gray-500">When a shopper searches exactly for the term, products matching any alternative are also shown. Applies to web and mobile within a minute.</p>
      <label class="block mb-3">
        <span class="block text-sm font-medium mb-1">Search term</span>
        <input class="field" name="term" [(ngModel)]="term" maxlength="100" required placeholder="e.g. li ion" />
      </label>
      <label class="block">
        <span class="block text-sm font-medium mb-1">Also search for (one per line, up to 10)</span>
        <textarea class="field" name="alternatives" rows="4" [(ngModel)]="alternatives" placeholder="li-ion&#10;lithium"></textarea>
      </label>
      <p *ngIf="error" class="mt-3 text-sm text-red-600" role="alert">{{ error }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button type="button" class="px-4 py-2" (click)="dialogRef.close()">Cancel</button>
      <button type="submit" class="rounded bg-primary px-4 py-2 text-white" [disabled]="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
    </mat-dialog-actions>
  </form>`,
  styles: [`.field { width: 100%; padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-surface); color: var(--text-primary); font-size: 14px; }`],
})
export class SynonymDialogComponent {
  term: string;
  alternatives: string;
  saving = false;
  error = '';

  constructor(
    public dialogRef: MatDialogRef<SynonymDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SynonymDialogData,
    private apiService: ApiService,
  ) {
    this.term = data.term;
    this.alternatives = (data.alternatives ?? []).join('\n');
  }

  save(): void {
    const payload = {
      term: this.term.trim(),
      alternatives: this.alternatives.split('\n').map(line => line.trim()).filter(Boolean),
    };
    if (!payload.term || !payload.alternatives.length) {
      this.error = 'Enter a term and at least one alternative.';
      return;
    }
    this.saving = true;
    this.error = '';
    const request = this.data.id
      ? this.apiService.updateSearchSynonym(this.data.id, payload)
      : this.apiService.createSearchSynonym(payload);
    request.subscribe({
      next: (res: any) => this.dialogRef.close(res?.data ?? true),
      error: (err: any) => {
        this.saving = false;
        this.error = err?.error?.message || 'Could not save the synonym.';
      },
    });
  }
}
