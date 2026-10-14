import { Component, Inject, OnInit } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ZohoBooksService } from 'app/core/services/zoho-books.service';

type Direction = 'push' | 'pull' | 'skip';
interface Row {
  kind: 'item' | 'variation'; entity_id: string; sku: string | null; name: string;
  ours: string | null; inherited: boolean; in_zoho: boolean; zoho: string | null;
  suggested: 'push' | 'pull' | 'review' | 'none';
  choice: Direction; result?: { ok: boolean; error?: string; direction?: string; hsn?: string };
}
export interface ZohoHsnSyncResult { pulled: { entity_id: string; kind: string; own: string | null }[] }

const VALID_HSN = /^(\d{4}|\d{6}|\d{8})$/;
// Readable reasons for the sync errors an admin can act on.
const ERROR_TEXT: Record<string, string> = {
  LOCAL_SKU_COLLISION: 'Another product or variation uses this SKU.',
  PRODUCT_SKU_REQUIRED: 'Add a SKU before syncing.',
  PRODUCT_PRICE_REQUIRED: 'Add a price before syncing.',
  PRODUCT_HSN_REQUIRED: 'No HSN to send.',
  ZOHO_HSN_MISSING_OR_INVALID: 'Zoho has no valid HSN for this item.',
  MAPPED_SKU_CHANGED_REVIEW_REQUIRED: 'The SKU changed since the last Zoho sync. Review it in Zoho Books settings.',
  HISTORICAL_SKU_CHANGED_REVIEW_REQUIRED: 'The SKU changed since the last Zoho sync. Review it in Zoho Books settings.',
  MULTIPLE_REMOTE_MATCHES_REVIEW_REQUIRED: 'More than one Zoho item has this SKU.',
  PRODUCT_NOT_AVAILABLE: 'This item was deleted.',
};

// Compare-then-apply HSN sync for one product with Zoho Books.
@Component({
  selector: 'app-zoho-hsn-sync-dialog',
  imports: [NgIf, NgFor, NgClass, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './zoho-hsn-sync-dialog.component.html',
  styleUrl: './zoho-hsn-sync-dialog.component.scss',
})
export class ZohoHsnSyncDialogComponent implements OnInit {
  rows: Row[] = [];
  loading = true;
  applying = false;
  applied = false;
  error = '';
  private pulled: ZohoHsnSyncResult['pulled'] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { productId: string; productName: string; unsaved: boolean; canManage: boolean },
    private dialogRef: MatDialogRef<ZohoHsnSyncDialogComponent, ZohoHsnSyncResult>,
    private zoho: ZohoBooksService,
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = '';
    this.zoho.productHsn(this.data.productId).subscribe({
      next: (res: any) => {
        this.rows = (res?.data?.rows ?? []).map((row: any) => ({
          ...row, choice: row.suggested === 'push' || row.suggested === 'pull' ? row.suggested : 'skip',
        }));
        this.loading = false;
      },
      error: (err: any) => { this.error = this.message(err, 'Could not read Zoho Books.'); this.loading = false; },
    });
  }

  status(row: Row): { label: string; tone: string } {
    if (!row.in_zoho) return { label: 'Not in Zoho', tone: 'muted' };
    if (row.ours === row.zoho) return row.ours ? { label: 'In sync', tone: 'ok' } : { label: 'No HSN on either side', tone: 'warn' };
    if (!row.ours) return { label: 'Only in Zoho', tone: 'info' };
    if (!row.zoho) return { label: 'Missing in Zoho', tone: 'info' };
    return { label: 'Different', tone: 'warn' };
  }
  canPull(row: Row): boolean { return row.in_zoho && VALID_HSN.test(row.zoho ?? '') && row.zoho !== row.ours; }
  canPush(row: Row): boolean { return !!row.ours && row.ours !== row.zoho; }
  choose(row: Row, choice: Direction): void {
    if (this.applying || this.applied) return;
    if ((choice === 'pull' && !this.canPull(row)) || (choice === 'push' && !this.canPush(row))) return;
    row.choice = choice;
  }
  chooseAll(choice: Direction): void { this.rows.forEach((row) => this.choose(row, choice)); }
  count(direction: Direction): number { return this.rows.filter((row) => row.choice === direction).length; }
  get pending(): number { return this.count('push') + this.count('pull'); }

  apply(): void {
    const actions = this.rows.filter((row) => row.choice !== 'skip').map((row) => ({ entity_id: row.entity_id, direction: row.choice as 'push' | 'pull' }));
    if (!actions.length || this.applying || !this.data.canManage) return;
    this.applying = true;
    this.error = '';
    this.dialogRef.disableClose = true;
    this.zoho.syncProductHsn(this.data.productId, actions).subscribe({
      next: (res: any) => {
        const results = new Map<string, any>((res?.data?.results ?? []).map((r: any) => [r.entity_id, r]));
        this.rows.forEach((row) => {
          const result = results.get(row.entity_id);
          if (!result) return;
          row.result = result;
          if (!result.ok) return;
          if (result.direction === 'pull') {
            row.ours = result.hsn;
            row.inherited = !result.own;
            this.pulled.push({ entity_id: row.entity_id, kind: row.kind, own: result.own ?? result.hsn });
          } else row.zoho = result.hsn;
        });
        this.applying = false;
        this.applied = true;
        this.dialogRef.disableClose = false;
      },
      error: (err: any) => {
        this.error = this.message(err, 'Sync failed. Nothing was changed.');
        this.applying = false;
        this.dialogRef.disableClose = false;
      },
    });
  }

  errorText(code?: string): string {
    if (!code) return 'Failed';
    const key = code.split(':')[0];
    return ERROR_TEXT[key] ? ERROR_TEXT[key] : code;
  }
  get failures(): number { return this.rows.filter((row) => row.result && !row.result.ok).length; }
  close(): void { this.dialogRef.close({ pulled: this.pulled }); }
  private message(err: any, fallback: string): string { return err?.error?.message || err?.message || fallback; }
}
