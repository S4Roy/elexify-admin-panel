import { NgIf } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'app/core/services/api.service';

// Back-in-stock on/off, the low-stock threshold (shared with the product
// list and dashboard) and the admin inboxes that get the low-stock digest.
@Component({
  selector: 'app-stock-alert-settings-dialog',
  imports: [MatDialogModule, NgIf, FormsModule, MatFormFieldModule, MatInputModule, MatSlideToggleModule],
  template: `
    <h2 mat-dialog-title>Stock alert settings</h2>
    <mat-dialog-content class="dialog-body">
      <div *ngIf="loading" class="text-center text-gray-500 py-6">Loading…</div>
      <div *ngIf="!loading && form" class="flex flex-col gap-4">
        <div class="rounded-lg border p-3">
          <mat-slide-toggle [(ngModel)]="form.back_in_stock_enabled" [disabled]="!data.canEdit">Back-in-stock alerts to customers</mat-slide-toggle>
          <p class="text-xs text-gray-500 mt-2">
            Customers who tap "Notify me" on an out-of-stock product get one email / app notification when it's available again.
          </p>
        </div>

        <div class="rounded-lg border p-3">
          <mat-slide-toggle [(ngModel)]="form.low_stock_alerts_enabled" [disabled]="!data.canEdit">Low-stock emails to the team</mat-slide-toggle>
          <p class="text-xs text-gray-500 mt-2 mb-3">
            An hourly email listing products that just sold out or dropped below the threshold. Each item is reported once until it's restocked.
          </p>
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Low-stock threshold</mat-label>
            <input matInput type="number" min="1" [(ngModel)]="form.low_stock_threshold" [disabled]="!data.canEdit" />
            <mat-hint>Stock below this counts as running low. Also used by the products list and dashboard.</mat-hint>
          </mat-form-field>
          <mat-form-field appearance="outline" class="w-full mt-3">
            <mat-label>Send to (emails)</mat-label>
            <textarea matInput rows="2" [(ngModel)]="form.recipients" [disabled]="!data.canEdit" placeholder="ops@yourstore.com, owner@yourstore.com"></textarea>
            <mat-hint>Separate with commas. Up to 10.</mat-hint>
          </mat-form-field>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-dialog-close type="button"
        class="inline-flex justify-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50">
        {{ data.canEdit ? 'Cancel' : 'Close' }}
      </button>
      <button *ngIf="data.canEdit" type="button" (click)="save()" [disabled]="saving || loading"
        class="ml-2 inline-flex justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50">
        {{ saving ? 'Saving…' : 'Save settings' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class StockAlertSettingsDialogComponent implements OnInit {
  loading = true;
  saving = false;
  form: { back_in_stock_enabled: boolean; low_stock_alerts_enabled: boolean; low_stock_threshold: number; recipients: string } | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { canEdit: boolean },
    private dialogRef: MatDialogRef<StockAlertSettingsDialogComponent>,
    private apiService: ApiService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.apiService.stockAlertSettings().subscribe({
      next: (res: any) => {
        const s = res?.data ?? {};
        this.form = {
          back_in_stock_enabled: s.back_in_stock_enabled !== false,
          low_stock_alerts_enabled: !!s.low_stock_alerts_enabled,
          low_stock_threshold: s.low_stock_threshold ?? 5,
          recipients: (s.low_stock_recipients || []).join(', '),
        };
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  save(): void {
    if (!this.form || this.saving) return;
    this.saving = true;
    this.apiService
      .updateStockAlertSettings({
        back_in_stock_enabled: this.form.back_in_stock_enabled,
        low_stock_alerts_enabled: this.form.low_stock_alerts_enabled,
        low_stock_threshold: Number(this.form.low_stock_threshold),
        low_stock_recipients: this.form.recipients,
      })
      .subscribe({
        next: (res: any) => {
          this.toastr.success(res?.message || 'Settings saved');
          this.dialogRef.close(true);
        },
        error: () => (this.saving = false),
      });
  }
}
