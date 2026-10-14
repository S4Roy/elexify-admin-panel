import { Component, Inject, OnInit } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ZohoBooksService } from 'app/core/services/zoho-books.service';

type Choice = 'pull' | 'push' | 'skip';
interface Field {
  key: string; label: string; ours: any; zoho: any; pullable: boolean; pushable: boolean;
  suggested: 'pull' | 'push' | 'review' | 'none'; choice: Choice;
}
interface Item {
  kind: 'item' | 'variation'; entity_id: string; sku: string | null; name: string; in_zoho: boolean;
  zoho_sku: string | null; sku_mismatch: boolean; can_create: boolean; create: boolean; fields: Field[];
  result?: { ok: boolean; error?: string; created?: boolean; pulled?: Record<string, any>; pushed?: string[] };
}
export interface ZohoSyncDialogResult { pulled: { entity_id: string; kind: string; values: Record<string, any> }[] }

// Readable reasons for sync errors an admin can act on.
const ERROR_TEXT: Record<string, string> = {
  LOCAL_SKU_COLLISION: 'Another product or variation uses this SKU.',
  PRODUCT_SKU_REQUIRED: 'Add a SKU before syncing.',
  PRODUCT_PRICE_REQUIRED: 'Add a price before syncing.',
  ZOHO_ITEM_NOT_FOUND: 'The Zoho item no longer exists.',
  MAPPED_SKU_CHANGED_REVIEW_REQUIRED: 'The SKU differs from Zoho. Fix the SKU on one side first.',
  HISTORICAL_SKU_CHANGED_REVIEW_REQUIRED: 'The SKU differs from Zoho. Fix the SKU on one side first.',
  MULTIPLE_REMOTE_MATCHES_REVIEW_REQUIRED: 'More than one Zoho item has this SKU.',
  PRODUCT_NOT_AVAILABLE: 'This item was deleted.',
  SYNC_VARIATIONS_NOT_PARENT: 'Sync the variations, not the parent product.',
};

// Compare-then-apply sync of one product with Zoho Books, field by field.
@Component({
  selector: 'app-zoho-sync-dialog',
  imports: [NgIf, NgFor, NgClass, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './zoho-sync-dialog.component.html',
  styleUrl: './zoho-sync-dialog.component.scss',
})
export class ZohoSyncDialogComponent implements OnInit {
  items: Item[] = [];
  loading = true;
  applying = false;
  applied = false;
  error = '';
  private pulled: ZohoSyncDialogResult['pulled'] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { productId: string; productName: string; unsaved: boolean; canManage: boolean },
    private dialogRef: MatDialogRef<ZohoSyncDialogComponent, ZohoSyncDialogResult>,
    private zoho: ZohoBooksService,
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = '';
    this.zoho.product(this.data.productId).subscribe({
      next: (res: any) => { this.items = this.toItems(res?.data?.rows); this.loading = false; },
      error: (err: any) => { this.error = this.message(err, 'Could not read Zoho Books.'); this.loading = false; },
    });
  }

  private toItems(rows: any[] = [], results: any[] = []): Item[] {
    const byId = new Map(results.map((r) => [r.entity_id, r]));
    return rows.map((row) => ({
      ...row,
      create: !this.applied && row.can_create,
      result: byId.get(row.entity_id),
      fields: row.fields.map((f: any) => ({ ...f, choice: f.suggested === 'pull' || f.suggested === 'push' ? f.suggested : 'skip' })),
    }));
  }

  differs(field: Field): boolean { return field.ours !== field.zoho; }
  differences(item: Item): number { return item.fields.filter((f) => this.differs(f)).length; }
  status(item: Item): { label: string; tone: string } {
    if (!item.in_zoho) return { label: 'Not in Zoho', tone: 'muted' };
    if (item.sku_mismatch) return { label: 'SKU differs', tone: 'error' };
    const count = this.differences(item);
    return count ? { label: `${count} difference${count > 1 ? 's' : ''}`, tone: 'warn' } : { label: 'In sync', tone: 'ok' };
  }
  display(field: Field, value: any): string {
    if (value === null || value === undefined || value === '') return '—';
    if (field.key === 'price') return '₹' + Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (field.key === 'status') return value === 'active' ? 'Active' : 'Inactive';
    return String(value);
  }
  editable(item: Item): boolean { return item.in_zoho && !item.sku_mismatch && this.data.canManage && !this.applying && !this.applied; }
  choose(item: Item, field: Field, choice: Choice): void {
    if (!this.editable(item)) return;
    if ((choice === 'pull' && !field.pullable) || (choice === 'push' && !field.pushable)) return;
    field.choice = choice;
  }
  chooseAll(choice: Choice): void {
    this.items.forEach((item) => item.fields.filter((f) => this.differs(f)).forEach((f) => this.choose(item, f, choice)));
  }

  private actions(): any[] {
    return this.items.flatMap((item): any[] => {
      if (!item.in_zoho) return item.create ? [{ entity_id: item.entity_id, create: true }] : [];
      const fields = Object.fromEntries(item.fields.filter((f) => this.differs(f) && f.choice !== 'skip').map((f) => [f.key, f.choice]));
      return Object.keys(fields).length ? [{ entity_id: item.entity_id, fields }] : [];
    });
  }
  get counts(): { pull: number; push: number; create: number } {
    const fields = this.items.flatMap((item) => (item.in_zoho ? item.fields.filter((f) => this.differs(f)) : []));
    return { pull: fields.filter((f) => f.choice === 'pull').length, push: fields.filter((f) => f.choice === 'push').length,
      create: this.items.filter((item) => !item.in_zoho && item.create).length };
  }
  get pending(): boolean { return this.actions().length > 0; }

  apply(): void {
    const actions = this.actions();
    if (!actions.length || this.applying || !this.data.canManage) return;
    this.applying = true;
    this.error = '';
    this.dialogRef.disableClose = true;
    this.zoho.syncProduct(this.data.productId, actions).subscribe({
      next: (res: any) => {
        const results = res?.data?.results ?? [];
        for (const result of results) {
          const item = this.items.find((i) => i.entity_id === result.entity_id);
          if (result.ok && item && result.pulled && Object.keys(result.pulled).length) {
            this.pulled.push({ entity_id: item.entity_id, kind: item.kind, values: result.pulled });
          }
        }
        this.applied = true;
        this.items = this.toItems(res?.data?.rows, results);
        this.applying = false;
        this.dialogRef.disableClose = false;
      },
      error: (err: any) => {
        this.error = this.message(err, 'Sync failed. Nothing was changed.');
        this.applying = false;
        this.dialogRef.disableClose = false;
      },
    });
  }

  resultText(item: Item): string {
    const r = item.result;
    if (!r) return '';
    if (!r.ok) {
      const code = (r.error || '').split(':')[0];
      return ERROR_TEXT[code] || r.error || 'Failed';
    }
    if (r.created) return 'Created in Zoho';
    const parts = [];
    if (r.pulled && Object.keys(r.pulled).length) parts.push('saved here');
    if (r.pushed?.length) parts.push('sent to Zoho');
    return parts.length ? parts.join(' and ').replace(/^./, (c) => c.toUpperCase()) : 'Nothing to change';
  }
  get failures(): number { return this.items.filter((item) => item.result && !item.result.ok).length; }
  close(): void { this.dialogRef.close({ pulled: this.pulled }); }
  private message(err: any, fallback: string): string { return err?.error?.message || err?.message || fallback; }
}
