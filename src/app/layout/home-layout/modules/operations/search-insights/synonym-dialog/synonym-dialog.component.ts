import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil, of, catchError, map } from 'rxjs';
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

interface Suggestion { term: string; reason: 'spelling' | 'full_form' | 'shoppers' }
// Why each kind is suggested; the number on a chip is how many products it finds.
const SUGGESTION_GROUPS: { reason: Suggestion['reason']; label: string; help: string }[] = [
  { reason: 'spelling', label: 'Catalog spellings', help: 'Close spellings of words your products use' },
  { reason: 'full_form', label: 'Full forms in your catalog', help: 'What the short words stand for in product names' },
  { reason: 'shoppers', label: 'Shoppers also searched', help: 'Searches where shoppers picked the same products' },
];

@Component({
  selector: 'app-synonym-dialog',
  imports: [FormsModule, NgIf, NgFor, DecimalPipe],
  // Own layout instead of mat-dialog-content/actions: those only size and scroll correctly as
  // direct children of the dialog surface, and the <form> wrapper broke that (content overflowed the panel).
  template: `<form class="dialog" (ngSubmit)="save()">
    <header class="dialog-head">
      <h2 id="synonym-title" class="dialog-title">{{ data.id ? 'Edit synonym' : 'Add synonym' }}</h2>
      <p class="hint">When a shopper's whole search matches the term, products matching any alternative are shown too. Changes reach web and mobile within a minute.</p>
    </header>
    <div class="dialog-body">
      <label class="block">
        <span class="label">Search term</span>
        <input class="field" name="term" [(ngModel)]="term" (ngModelChange)="schedulePreview()" maxlength="100" required />
      </label>
      <p class="note" *ngIf="termCount === 0">
        Today “{{ normalizedTerm }}” finds <b>no products</b>. Add the words your catalog uses for it.
      </p>
      <p class="note note-ok" *ngIf="termCount">
        Today “{{ normalizedTerm }}” already finds <b>{{ termCount | number }}</b> {{ termCount === 1 ? 'product' : 'products' }}.
        Add alternatives only to include products listed under other names.
      </p>

      <div class="suggest" *ngFor="let group of suggestionGroups">
        <span class="hint" [title]="group.help">{{ group.label }}:</span>
        <button *ngFor="let s of group.terms" type="button" class="suggest-chip" [disabled]="isAdded(s)"
          [attr.aria-label]="(isAdded(s) ? 'Added: ' : 'Add alternative ') + s" (click)="addAlternative(s)">
          {{ isAdded(s) ? '✓' : '+' }} {{ s }}<span *ngIf="counts.has(s)" class="suggest-count">· {{ counts.get(s) | number }}</span>
        </button>
      </div>

      <label class="block mt-4">
        <span class="label">Also search for</span>
        <textarea class="field" name="alternatives" rows="3" [(ngModel)]="alternatives" (ngModelChange)="schedulePreview()"
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
    </div>
    <footer class="dialog-foot">
      <button type="button" class="cancel-btn" (click)="dialogRef.close()">Cancel</button>
      <button type="submit" class="save-btn" [disabled]="saving || !canSave">{{ saving ? 'Saving…' : 'Save' }}</button>
    </footer>
  </form>`,
  styles: [`
    :host { display: block; }
    .dialog { display: flex; flex-direction: column; max-height: min(640px, 85vh); color: var(--text-primary); }
    .dialog-head { padding: 22px 24px 12px; }
    .dialog-title { margin: 0 0 6px; font-size: 18px; font-weight: 600; }
    .dialog-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 4px 24px 16px; }
    .dialog-foot { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 24px 18px; border-top: 1px solid var(--border-color); }
    .label { display: block; margin-bottom: 4px; font-size: 13px; font-weight: 500; }
    .note { margin-top: 6px; padding: 8px 10px; border-radius: 8px; font-size: 12px; color: #92400e; background: #fffbeb; }
    .note-ok { color: #065f46; background: #ecfdf5; }
    :host-context(.dark) .note { color: #fcd34d; background: rgba(245, 158, 11, .12); }
    :host-context(.dark) .note-ok { color: #6ee7b7; background: rgba(16, 185, 129, .12); }
.suggest { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 10px; }
    .suggest-chip { padding: 3px 10px; font-size: 12px; border-radius: 999px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--nav-primary); }
    .suggest-chip:hover:not(:disabled) { border-color: var(--nav-primary); }
    .suggest-chip:disabled { color: var(--text-secondary); cursor: default; }
    .suggest-count { margin-left: 3px; color: var(--text-secondary); }
    .cancel-btn { padding: 8px 14px; border-radius: 6px; }
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
  suggestions: Suggestion[] = [];
  counts = new Map<string, number>();
  private preview$ = new Subject<void>();
  private suggest$ = new Subject<string>();
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
          ? this.apiService.previewSearchSynonym(terms, true).pipe(catchError(() => of({ failed: true })))
          : of(null);
      }),
      takeUntil(this.destroy$),
    ).subscribe((res: any) => {
      // Counts are a convenience; saving still works when they can't be loaded.
      this.previewFailed = !!res?.failed;
      for (const row of res?.data ?? []) this.counts.set(row.term, row.count);
      this.refreshPreview();
    });
    // Close catalog spellings for the term, with their counts so the useful ones stand out.
    this.suggest$.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(term => term
        ? this.apiService.suggestSearchSynonyms(term).pipe(
            // Older servers sent bare spellings.
            map((res: any) => (res?.data ?? []).map((s: any) => (typeof s === 'string' ? { term: s, reason: 'spelling' } : s))),
            catchError(() => of([])))
        : of([])),
      switchMap((suggestions: Suggestion[]) => {
        this.suggestions = suggestions;
        const missing = suggestions.map(s => s.term).filter(t => !this.counts.has(t));
        return missing.length
          ? this.apiService.previewSearchSynonym(missing, true).pipe(catchError(() => of(null)))
          : of(null);
      }),
      takeUntil(this.destroy$),
    ).subscribe((res: any) => {
      for (const row of res?.data ?? []) this.counts.set(row.term, row.count);
      // Suggestions that find nothing would not help; keep the rest, most products first.
      this.suggestions = this.suggestions
        .filter(s => this.counts.get(s.term) !== 0)
        .sort((a, b) => (this.counts.get(b.term) ?? 0) - (this.counts.get(a.term) ?? 0));
    });
    this.refreshPreview();
    this.preview$.next();
    this.suggest$.next(this.normalizedTerm);
  }

  get suggestionGroups(): { label: string; help: string; terms: string[] }[] {
    return SUGGESTION_GROUPS
      .map(group => ({ ...group, terms: this.suggestions.filter(s => s.reason === group.reason).map(s => s.term) }))
      .filter(group => group.terms.length);
  }

  isAdded(suggestion: string): boolean {
    return this.alternativeList.includes(suggestion);
  }

  addAlternative(suggestion: string): void {
    if (this.isAdded(suggestion)) return;
    this.alternatives = [...this.alternatives.split('\n').map(line => line.trim()).filter(Boolean), suggestion].join('\n');
    this.schedulePreview();
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
    this.suggest$.next(this.normalizedTerm);
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
