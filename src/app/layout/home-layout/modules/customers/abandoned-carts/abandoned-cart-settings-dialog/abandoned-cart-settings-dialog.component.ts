import { NgFor, NgIf } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'app/core/services/api.service';

interface ReminderStep {
  enabled: boolean;
  delay_hours: number;
  coupon_code: string | null;
}

const MAX_STEPS = 5;

// Automatic reminder sequence (backend AbandonedCartSettings): when a cart
// counts as abandoned, the step schedule (hours after last cart activity),
// an optional coupon per step, and the guard rails.
@Component({
  selector: 'app-abandoned-cart-settings-dialog',
  imports: [MatDialogModule, NgIf, NgFor, FormsModule, MatFormFieldModule, MatInputModule, MatSlideToggleModule, MatIconModule],
  templateUrl: './abandoned-cart-settings-dialog.component.html',
})
export class AbandonedCartSettingsDialogComponent implements OnInit {
  loading = true;
  saving = false;
  settings: any = null;
  steps: ReminderStep[] = [];
  readonly maxSteps = MAX_STEPS;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { canEdit: boolean },
    private dialogRef: MatDialogRef<AbandonedCartSettingsDialogComponent>,
    private apiService: ApiService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.apiService.abandonedCartSettings().subscribe({
      next: (res: any) => {
        this.settings = { ...res?.data };
        this.steps = (res?.data?.steps ?? []).map((s: any) => ({
          enabled: s.enabled !== false,
          delay_hours: s.delay_hours,
          coupon_code: s.coupon_code || null,
        }));
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  addStep(): void {
    if (this.steps.length >= MAX_STEPS) return;
    const last = this.steps[this.steps.length - 1];
    this.steps.push({ enabled: true, delay_hours: last ? last.delay_hours * 2 : 1, coupon_code: null });
  }

  removeStep(index: number): void {
    if (this.steps.length > 1) this.steps.splice(index, 1);
  }

  describeDelay(hours: number): string {
    if (!hours) return '';
    return hours % 24 === 0 ? `${hours / 24} day(s)` : `${hours} hour(s)`;
  }

  save(): void {
    if (!this.data.canEdit || this.saving) return;
    this.saving = true;
    const s = this.settings;
    this.apiService
      .updateAbandonedCartSettings({
        auto_reminders_enabled: !!s.auto_reminders_enabled,
        abandon_after_minutes: Number(s.abandon_after_minutes),
        expire_after_days: Number(s.expire_after_days),
        min_cart_value: Number(s.min_cart_value) || 0,
        min_hours_between_reminders: Number(s.min_hours_between_reminders),
        steps: this.steps.map((step) => ({
          enabled: step.enabled,
          delay_hours: Number(step.delay_hours),
          coupon_code: step.coupon_code?.trim() || null,
        })),
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
