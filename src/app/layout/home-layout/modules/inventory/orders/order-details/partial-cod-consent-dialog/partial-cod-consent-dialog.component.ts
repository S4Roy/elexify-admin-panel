import { CurrencyPipe, DatePipe, NgFor, NgIf, SlicePipe } from '@angular/common';
import { Component, ElementRef, Inject, QueryList, ViewChildren } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';

// Snapshot written by the backend's validatePartialCodConsent
// (elexify-backend/src/services/shipping/partialCodConsent.js) when the
// customer placed the order. Policy `content` is CMS HTML captured at that
// moment, so later page edits never change what was accepted.
export interface PartialCodConsent {
  version: string;
  wording: string;
  accepted_at: string;
  customer_id: string;
  grand_total: number;
  advance_amount: number;
  currency: string;
  policies: { path: string; title: string; content: string }[];
}

@Component({
  selector: 'app-partial-cod-consent-dialog',
  imports: [NgFor, NgIf, DatePipe, CurrencyPipe, SlicePipe, MatDialogModule, MatIconModule],
  template: `
    <div class="consent-dialog bg-white">
      <header class="consent-head">
        <span class="consent-badge" aria-hidden="true"><mat-icon>verified_user</mat-icon></span>
        <div class="min-w-0 flex-1">
          <h2 mat-dialog-title class="consent-title">Partial COD terms accepted</h2>
          <p class="consent-subtitle">Snapshot saved when the customer placed this order. Later edits to these pages don't change it.</p>
        </div>
        <button type="button" class="icon-btn" (click)="dialogRef.close()" aria-label="Close">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <div class="consent-scroll">
        <dl class="consent-facts">
          <div>
            <dt>Accepted</dt>
            <dd>{{ data.accepted_at | date: 'd MMM y, h:mm a' }}</dd>
          </div>
          <div>
            <dt>Order total</dt>
            <dd>{{ data.grand_total | currency: data.currency }}</dd>
          </div>
          <div>
            <dt>Advance</dt>
            <dd>{{ data.advance_amount | currency: data.currency }}</dd>
          </div>
          <div>
            <dt>Due on delivery</dt>
            <dd>{{ data.grand_total - data.advance_amount | currency: data.currency }}</dd>
          </div>
        </dl>

        <blockquote class="consent-wording">“{{ data.wording }}”</blockquote>

        <dl class="consent-ids">
          <div>
            <dt>Customer ID</dt>
            <dd>
              <code>{{ data.customer_id }}</code>
              <button type="button" class="icon-btn sm" (click)="copy(data.customer_id, 'Customer ID')" aria-label="Copy customer ID">
                <mat-icon>content_copy</mat-icon>
              </button>
            </dd>
          </div>
          <div>
            <dt>Policy version</dt>
            <dd>
              <code [title]="data.version">{{ data.version | slice: 0 : 12 }}…{{ data.version | slice: -8 }}</code>
              <button type="button" class="icon-btn sm" (click)="copy(data.version, 'Policy version')" aria-label="Copy policy version">
                <mat-icon>content_copy</mat-icon>
              </button>
            </dd>
          </div>
        </dl>

        <section class="consent-policies" aria-label="Accepted policies">
          <div role="tablist" aria-label="Policies" class="policy-tabs" (keydown)="onTabKeydown($event)">
            <button
              #tab
              *ngFor="let policy of data.policies; let i = index"
              type="button"
              role="tab"
              class="policy-tab"
              [id]="'consent-tab-' + i"
              [attr.aria-selected]="i === active"
              [attr.aria-controls]="'consent-panel-' + i"
              [tabIndex]="i === active ? 0 : -1"
              [class.active]="i === active"
              (click)="select(i)"
            >{{ policy.title }}</button>
          </div>
          <div
            *ngIf="data.policies[active] as policy"
            role="tabpanel"
            tabindex="0"
            class="policy-body"
            [id]="'consent-panel-' + active"
            [attr.aria-labelledby]="'consent-tab-' + active"
          >
            <div *ngIf="policy.content?.trim(); else emptyPolicy" [innerHTML]="policy.content"></div>
            <ng-template #emptyPolicy><p class="policy-empty">No content was captured for this policy.</p></ng-template>
          </div>
        </section>
      </div>

      <footer class="consent-foot">
        <button type="button" class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700" (click)="dialogRef.close()">Close</button>
      </footer>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .consent-dialog { display: flex; flex-direction: column; max-height: min(88vh, 900px); color: var(--text-primary, #111827); }
    .consent-head { display: flex; align-items: flex-start; gap: 14px; padding: 20px 20px 16px 24px; border-bottom: 1px solid var(--border-color, #e5e7eb); }
    .consent-badge { display: grid; place-items: center; flex-shrink: 0; width: 40px; height: 40px; border-radius: 12px; background: rgb(22 163 74 / 12%); color: #16a34a; }
    .consent-title { margin: 0 !important; padding: 0 !important; font-size: 17px !important; font-weight: 700 !important; line-height: 1.35 !important; letter-spacing: -.01em; color: var(--text-primary, #111827) !important; }
    .consent-title::before { display: none !important; }
    .consent-subtitle { margin: 4px 0 0; font-size: 13px; line-height: 1.5; color: var(--text-secondary, #6b7280); }
    .icon-btn { display: grid; place-items: center; flex-shrink: 0; width: 36px; height: 36px; border: 0; border-radius: 8px; background: none; color: var(--text-secondary, #6b7280); cursor: pointer; }
    .icon-btn:hover { background: var(--bg-surface-alt, #f3f4f6); color: var(--text-primary, #111827); }
    .icon-btn:focus-visible, .policy-tab:focus-visible, .policy-body:focus-visible { outline: 2px solid var(--nav-primary, #2563eb); outline-offset: 2px; }
    .icon-btn.sm { width: 28px; height: 28px; }
    .icon-btn.sm mat-icon { width: 16px; height: 16px; font-size: 16px; line-height: 16px; }

    .consent-scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 20px 24px; }
    .consent-facts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1px; margin: 0; overflow: hidden; border: 1px solid var(--border-color, #e5e7eb); border-radius: 12px; background: var(--border-color, #e5e7eb); }
    .consent-facts > div { padding: 12px 14px; background: var(--bg-surface, #fff); }
    .consent-facts dt, .consent-ids dt { margin: 0 0 3px; font-size: 11px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--text-secondary, #6b7280); }
    .consent-facts dd { margin: 0; font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; }
    .consent-wording { margin: 16px 0 0; padding: 12px 14px; border-left: 3px solid #16a34a; border-radius: 0 8px 8px 0; background: var(--bg-surface-alt, #f8fafc); font-size: 13px; line-height: 1.6; }
    .consent-ids { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 24px; margin: 16px 0 0; }
    .consent-ids dd { display: flex; align-items: center; gap: 4px; min-width: 0; margin: 0; }
    .consent-ids code { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }

    .consent-policies { margin-top: 22px; }
    .policy-tabs { display: flex; gap: 4px; overflow-x: auto; border-bottom: 1px solid var(--border-color, #e5e7eb); scrollbar-width: none; }
    .policy-tab { flex-shrink: 0; margin-bottom: -1px; padding: 10px 14px; border: 0; border-bottom: 2px solid transparent; background: none; font-size: 13px; font-weight: 600; color: var(--text-secondary, #6b7280); cursor: pointer; white-space: nowrap; }
    .policy-tab:hover { color: var(--text-primary, #111827); }
    .policy-tab.active { border-bottom-color: var(--nav-primary, #2563eb); color: var(--nav-primary, #2563eb); }
    .policy-body { max-height: 46vh; overflow-y: auto; margin-top: 12px; padding: 4px 16px 4px 2px; font-size: 13px; line-height: 1.7; overflow-wrap: anywhere; }
    .policy-body ::ng-deep h1, .policy-body ::ng-deep h2, .policy-body ::ng-deep h3 { margin: 1.4em 0 .5em; font-size: 14px; font-weight: 700; line-height: 1.4; color: var(--text-primary, #111827); }
    .policy-body ::ng-deep h1:first-child, .policy-body ::ng-deep h2:first-child, .policy-body ::ng-deep h3:first-child { margin-top: .25em; }
    .policy-body ::ng-deep p { margin: 0 0 .75em; }
    .policy-body ::ng-deep ul, .policy-body ::ng-deep ol { margin: 0 0 .75em; padding-left: 1.4em; }
    .policy-body ::ng-deep ul { list-style: disc; }
    .policy-body ::ng-deep ol { list-style: decimal; }
    .policy-body ::ng-deep li { margin: .2em 0; }
    .policy-body ::ng-deep a { color: var(--nav-primary, #2563eb); text-decoration: underline; }
    .policy-body ::ng-deep table { width: 100%; margin-bottom: .75em; border-collapse: collapse; }
    .policy-body ::ng-deep th, .policy-body ::ng-deep td { padding: 6px 8px; border: 1px solid var(--border-color, #e5e7eb); text-align: left; }
    .policy-empty { color: var(--text-secondary, #6b7280); font-style: italic; }

    .consent-foot { display: flex; justify-content: flex-end; padding: 14px 24px; border-top: 1px solid var(--border-color, #e5e7eb); }

    @media (max-width: 640px) {
      .consent-head { padding: 16px 12px 14px 16px; }
      .consent-scroll { padding: 16px; }
      .consent-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .consent-ids { grid-template-columns: minmax(0, 1fr); }
      .policy-body { max-height: none; }
      .consent-foot { padding: 12px 16px; }
    }
  `],
})
export class PartialCodConsentDialogComponent {
  @ViewChildren('tab') private tabs!: QueryList<ElementRef<HTMLButtonElement>>;
  active = 0;

  constructor(
    public dialogRef: MatDialogRef<PartialCodConsentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PartialCodConsent,
    private toastr: ToastrService,
  ) {}

  select(index: number): void {
    this.active = index;
  }

  // Roving tabindex: arrow keys move between policy tabs.
  onTabKeydown(event: KeyboardEvent): void {
    const count = this.data.policies.length;
    const next = event.key === 'ArrowRight' ? (this.active + 1) % count
      : event.key === 'ArrowLeft' ? (this.active - 1 + count) % count
        : event.key === 'Home' ? 0
          : event.key === 'End' ? count - 1
            : null;
    if (next === null) return;
    event.preventDefault();
    this.active = next;
    this.tabs.get(next)?.nativeElement.focus();
  }

  copy(value: string, what: string): void {
    navigator.clipboard?.writeText(value).then(
      () => this.toastr.success(`${what} copied`),
      () => this.toastr.error(`Couldn't copy ${what}`),
    );
  }
}
