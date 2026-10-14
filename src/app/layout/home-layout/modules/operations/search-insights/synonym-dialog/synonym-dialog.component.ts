import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Subject, debounceTime, switchMap, takeUntil, of, catchError } from 'rxjs';
import { ApiService } from 'app/core/services/api.service';

export interface SynonymDialogData {
  id?: string;
  term: string;
  alternatives?: string[];
}

interface PreviewRow { term: string; count: number | null; redundant: boolean }

const MAX_ALTERNATIVES = 10;
// Mirrors the storefront: spaces, hyphens and underscores between words already match each other.
const separatorless = (value: string) => value.trim().toLowerCase().replace(/[\s_-]+/g, '');

@Component({
  selector: 'app-synonym-dialog',
  imports: [FormsModule, NgIf, NgFor, DecimalPipe, MatDialogModule],
  template: `<form (ngSubmit)="save()">
    <h2 mat-dialog-title>{{ data.id ? 'Edit synonym' : 'Add synonym' }}</h2>
    <mat-dialog-content>
      <p class="mb-4 text-sm text-gray-500">When a shopper's whole search matches the term, products matching any alternative are shown too. Changes reach web and mobile within a minute.</p>
      <label class="block mb-1">
        <span class="block text-sm font-medium mb-1">Search term</span>
        <input class="field" name="term" [(ngModel)]="term" (ngModelChange)="schedulePreview()" maxlength="100" required />
      </label>
      <p class="hint mb-4" *ngIf="termCount !== null">
        Today “{{ normalizedTerm }}” finds <b>{{ termCount | number }}</b> {{ termCount === 1 ? 'product' : 'products' }}.
      </p>
      <label class="block">
        <span class="block text-sm font-medium mb-1">Also search for</span>
        <textarea class="field" name="alternatives" rows="4" [(ngModel)]="alternatives" (ngModelChange)="schedulePreview()"
          placeholder="One word or phrase per line" aria-describedby="alt-hint"></textarea>
      </label>
      <p id="alt-hint" class="hint mt-1">Up to {{ maxAlternatives }}. Spaces and hyphens already match each other, so “li-ion” isn't needed for “li ion”.</p>

      <ul class="preview" *ngIf="previewRows.length" aria-live="polite">
        <li *ngFor="let row of previewRows">
          <span class="preview-term">{{ row.term }}</span>
          <span *ngIf="row.redundant" class="tag tag-muted">Already matched</span>
          <span *ngIf="!row.redundant && row.count === null && !previewFailed" class="tag tag-muted">Checking…</span>
          <span *ngIf="!row.redundant && row.count === 0" class="tag tag-warn">No products</span>
          <span *ngIf="!row.redundant && row.count" class="tag tag-ok">{{ row.count | number }} {{ row.count === 1 ? 'product' : 'products' }}</span>
        </li>
      </ul>
      <p *ngIf="tooMany" class="mt-2 text-sm text-red-600">Keep it to {{ maxAlternatives }} alternatives.</p>
      <p *ngIf="error" class="mt-3 text-sm text-red-600" role="alert">{{ error }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button type="button" class="px-4 py-2" (click)="dialogRef.close()">Cancel</button>
      <button type="submit" class="save-btn" [disabled]="saving || !canSave">{{ saving ? 'Saving…' : 'Save' }}</button>
    </mat-dialog-actions>
  </form>`,
  styles: [`
    .field { width: 100%; padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-surface); color: var(--text-primary); font-size: 14px; }
    .field::placeholder { color: var(--text-secondary); opacity: .6; font-style: italic; }
    .hint { font-size: 12px; color: var(--text-secondary); }
    .preview { margin: 12px 0 0; padding: 0; list-style: none; border: 1px solid var(--border-color); border-radius: 8px; }
    .preview li { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 10px; font-size: 13px; }
    .preview li + li { border-top: 1px solid var(--border-color); }
    .preview-term { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tag { flex-shrink: 0; padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
    .tag-ok { color: #047857; background: #d1fae5; }
    .tag-warn { color: #b45309; background: #fef3c7; }
    .tag-muted { color: var(--text-secondary); background: var(--bg-surface-alt); }
    :host-context(.dark) .tag-ok { color: #6ee7b7; background: rgba(16, 185, 129, .15); }
    :host-context(.dark) .tag-warn { color: #fcd34d; background: rgba(245, 158, 11, .15); }
    .save-btn { padding: 8px 16px; border-radius: 6px; background: var(--nav-primary); color: #fff; }
    .save-btn:disabled { opacity: .5; cursor: not-allowed; }
  `],
})
export class SynonymDialogComponent implements OnInit, OnDestroy {
  readonly maxAlternatives = MAX_ALTERNATIVES;
  term: string;
  alternatives: string;
  saving = false;
  error = '';
  termCount: number | null = null;
  previewFailed = false;
  previewRows: PreviewRow[] = [];
  private counts = new Map<string, number>();
  private preview$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(
    public dialogRef: MatDialogRef<SynonymDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SynonymDialogData,
    private apiService: ApiService,
  ) {
    this.term = data.term;
    this.alternatives = (data.alternatives ?? []).join('\n');
  }

  ngOnInit(): void {
    this.preview$.pipe(
      debounceTime(500),
      switchMap(() => {
        const terms = [this.normalizedTerm, ...this.alternativeList]
          .filter(term => term && !this.counts.has(term))
          .slice(0, MAX_ALTERNATIVES + 1);
        return terms.length
          ? this.apiService.previewSearchSynonym(terms).pipe(catchError(() => of({ failed: true })))
          : of(null);
      }),
      takeUntil(this.destroy$),
    ).subscribe((res: any) => {
      // Counts are a convenience; saving still works when they can't be loaded.
      this.previewFailed = !!res?.failed;
      for (const row of res?.data ?? []) this.counts.set(row.term, row.count);
      this.refreshPreview();
    });
    this.refreshPreview();
    this.preview$.next();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get normalizedTerm(): string {
    return this.term.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  get alternativeList(): string[] {
    const term = this.normalizedTerm;
    const lines = this.alternatives.split('\n').map(line => line.trim().replace(/\s+/g, ' ').toLowerCase()).filter(Boolean);
    return [...new Set(lines)].filter(line => line !== term);
  }

  get tooMany(): boolean {
    return this.alternativeList.length > MAX_ALTERNATIVES;
  }

  get canSave(): boolean {
    return !!this.normalizedTerm && this.alternativeList.length > 0 && !this.tooMany;
  }

  schedulePreview(): void {
    this.error = '';
    this.refreshPreview();
    this.preview$.next();
  }

  private refreshPreview(): void {
    const term = this.normalizedTerm;
    this.termCount = term && this.counts.has(term) ? this.counts.get(term)! : null;
    this.previewRows = this.alternativeList.slice(0, MAX_ALTERNATIVES).map(alt => ({
      term: alt,
      count: this.counts.get(alt) ?? null,
      redundant: separatorless(alt) === separatorless(term),
    }));
  }

  save(): void {
    if (!this.canSave) {
      this.error = 'Enter a term and at least one alternative.';
      return;
    }
    // Alternatives that only differ by spacing or hyphens add nothing; leave them out.
    const alternatives = this.alternativeList.filter(alt => separatorless(alt) !== separatorless(this.normalizedTerm));
    if (!alternatives.length) {
      this.error = 'Those alternatives already match the term. Add a different word, such as “lithium”.';
      return;
    }
    this.saving = true;
    this.error = '';
    const payload = { term: this.normalizedTerm, alternatives };
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
