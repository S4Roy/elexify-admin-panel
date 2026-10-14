import { DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import * as Global from 'app/global';
import PaginationOptions from 'app/core/models/PaginationOptions';
import { InventoryService } from 'app/core/services/inventory.service';
import { PermissionService } from 'app/core/services/permission.service';
import { PaginationComponent } from 'app/layout/home-layout/includes/pagination/pagination.component';
import { finalize } from 'rxjs';
import { STOCK_ADJUSTMENT_REASONS, STOCK_STATUS_LABELS, movementIcon, movementLabel } from './stock-reasons';

/**
 * Stock for one product: on-hand / reserved / available per SKU, manual
 * adjustments with a reason code, and the movement history (ledger).
 * Opened from the product list's row menu with the product row as data.
 */
@Component({
  selector: 'app-stocks',
  imports: [
    ReactiveFormsModule, NgIf, NgFor, NgClass, DatePipe, RouterLink,
    MatDialogModule, MatIconModule, MatTooltipModule, PaginationComponent,
  ],
  templateUrl: './stocks.component.html',
  styleUrl: './stocks.component.scss',
})
export class StocksComponent implements OnInit {
  Global = Global;
  reasons = STOCK_ADJUSTMENT_REASONS;
  statusLabels = STOCK_STATUS_LABELS;
  movementLabel = movementLabel;
  movementIcon = movementIcon;
  // Site-wide low-stock level (a SKU's own threshold wins).
  siteThreshold = 5;
  loading = true;
  historyLoading = false;
  readonly pageSizeOptions = [10, 25, 50];
  @ViewChild('historyTop') historyTop?: ElementRef<HTMLElement>;

  levels: any[] = [];
  transactions: any[] = [];
  paginationOption: PaginationOptions;
  // Row being adjusted (null = form closed); history filter (null = all SKUs).
  adjusting: any = null;
  historySku: any = null;
  changed = false;
  formGroup!: FormGroup;

  constructor(
    private fb: FormBuilder,
    public toastr: ToastrService,
    private inventoryService: InventoryService,
    private permissions: PermissionService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<StocksComponent>
  ) {
    this.paginationOption = { ...Global.resetPaginationOptions(), limit: 10 };
    this.buildForm();
  }

  get canAdjust(): boolean {
    return this.permissions.can('inventory.adjust');
  }

  ngOnInit(): void {
    this.fetchLevels();
    this.fetchTransactions();
  }

  buildForm() {
    this.formGroup = this.fb.group({
      mode: ['add'],
      quantity: [null, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
      reason: ['received', Validators.required],
      note: [null, Validators.maxLength(500)],
    });
  }

  fetchLevels() {
    const params = new URLSearchParams({ product: this.data?._id, limit: '200' });
    this.inventoryService.stockLevels(params).subscribe({
      next: (res: any) => {
        this.levels = res?.data?.docs ?? [];
        this.siteThreshold = res?.data?.low_stock_threshold ?? this.siteThreshold;
        this.loading = false;
        // Keep an open form pointed at the fresh figures.
        if (this.adjusting) this.adjusting = this.levels.find((l) => this.skuKey(l) === this.skuKey(this.adjusting)) ?? null;
      },
    });
  }

  fetchTransactions() {
    const params = new URLSearchParams({ product: this.data?._id, limit: String(this.paginationOption.limit) });
    if (this.paginationOption.page) params.set('page', String(this.paginationOption.page));
    if (this.historySku?.variation) params.set('variation', this.historySku.variation);
    this.historyLoading = true;
    this.inventoryService.stockTransactions(params).pipe(finalize(() => (this.historyLoading = false))).subscribe({
      next: (res: any) => {
        this.transactions = res?.data?.docs ?? [];
        this.paginationOption = { ...res?.data };
      },
    });
  }

  skuKey(level: any): string {
    return String(level?.variation ?? level?.product);
  }

  // Variations are named by their attribute combination; a simple product
  // is just "Default".
  skuLabel(level: any): string {
    return level?.variation ? (level?.variation_name || level?.sku) : 'Default';
  }

  // Falls back to deriving the status when the server hasn't stored one yet
  // (before the stock-ledger-foundation migration has run).
  statusOf(level: any): string {
    if (level?.stock_status) return level.stock_status;
    if (level?.manage_stock === false) return 'in_stock';
    if (Number(level?.available_quantity) > 0) return 'in_stock';
    return level?.allow_backorders ? 'on_backorder' : 'out_of_stock';
  }

  isLow(level: any): boolean {
    if (!level?.manage_stock) return false;
    const available = Number(level.available_quantity);
    return available > 0 && available <= Number(level.low_stock_threshold ?? this.siteThreshold);
  }

  step(by: number) {
    const current = Number(this.formGroup.value.quantity) || 0;
    this.formGroup.patchValue({ quantity: Math.max(0, current + by) });
  }

  setMode(mode: 'add' | 'remove' | 'set') {
    this.formGroup.patchValue({ mode });
    this.onModeChange();
  }

  openAdjust(level: any) {
    this.adjusting = level;
    this.buildForm();
  }

  closeAdjust() {
    this.adjusting = null;
  }

  filterHistory(level: any) {
    this.historySku = this.historySku && this.skuKey(this.historySku) === this.skuKey(level) ? null : level;
    this.paginationOption.page = 1;
    this.fetchTransactions();
  }

  // Signed change the form will apply, for the preview line.
  get previewOnHand(): number | null {
    const qty = Number(this.formGroup.value.quantity);
    if (!this.adjusting || !Number.isFinite(qty) || this.formGroup.value.quantity === null) return null;
    const onHand = Number(this.adjusting.stock_quantity);
    switch (this.formGroup.value.mode) {
      case 'remove': return onHand - qty;
      case 'set': return qty;
      default: return onHand + qty;
    }
  }

  get belowReserved(): boolean {
    const next = this.previewOnHand;
    return next !== null && next < Number(this.adjusting?.reserved_quantity ?? 0);
  }

  onModeChange() {
    const mode = this.formGroup.value.mode;
    const reason = this.formGroup.value.reason;
    // Steer the reason to a sensible default for the chosen direction.
    if (mode === 'add' && ['damage', 'loss', 'theft', 'expired', 'internal_use', 'returned_to_vendor'].includes(reason)) {
      this.formGroup.patchValue({ reason: 'received' });
    } else if (mode === 'remove' && reason === 'received') {
      this.formGroup.patchValue({ reason: 'damage' });
    } else if (mode === 'set') {
      this.formGroup.patchValue({ reason: 'count_correction' });
    }
  }

  onSubmit() {
    this.formGroup.markAllAsTouched();
    if (this.formGroup.invalid || !this.adjusting || this.belowReserved) return;
    const { mode, quantity, reason, note } = this.formGroup.getRawValue();
    const qty = Number(quantity);
    if (mode !== 'set' && qty === 0) {
      this.toastr.warning('Enter a quantity greater than zero.');
      return;
    }
    this.formGroup.disable();
    this.inventoryService.adjustStock({
      product: this.adjusting.product,
      variation: this.adjusting.variation ?? null,
      mode: mode === 'set' ? 'set' : 'delta',
      quantity: mode === 'remove' ? -qty : qty,
      reason,
      note: note?.trim() || null,
      expected_on_hand: this.adjusting.stock_quantity,
    }).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message ?? 'Stock adjusted');
        this.changed = true;
        this.adjusting = null;
        this.formGroup.enable();
        this.fetchLevels();
        this.paginationOption.page = 1;
        this.fetchTransactions();
      },
      error: (err: any) => {
        this.formGroup.enable();
        // 409 = someone sold or adjusted this SKU meanwhile; the interceptor
        // already explained it, so just reload the figures.
        if (err?.status === 409) this.fetchLevels();
      },
    });
  }

  onPageChange(page: any) {
    this.paginationOption.page = page;
    this.fetchTransactions();
    this.historyTop?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  close() {
    this.dialogRef.close(this.changed);
  }
}
