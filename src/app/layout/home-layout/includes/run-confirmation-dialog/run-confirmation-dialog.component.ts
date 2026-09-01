import { NgIf } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import {
  DataOperation,
  DryRunResult,
} from 'app/layout/home-layout/modules/settings/data-operations/data-operations.models';

export interface RunConfirmationDialogData {
  operation: DataOperation;
  environment: string;
  dryRunResult?: DryRunResult | null;
}

const REQUIRED_PHRASE = 'RUN PRODUCTION';

// Generic "are you sure" is banned for this flow — every operation shows
// its exact name/version/environment plus a concrete impact statement
// (dry-run counts when we have them, otherwise the current health gap),
// and HIGH/CRITICAL risk operations targeting production require the
// admin to type the exact confirmation phrase before Run unlocks.
@Component({
  selector: 'app-run-confirmation-dialog',
  imports: [MatDialogModule, NgIf, FormsModule],
  templateUrl: './run-confirmation-dialog.component.html',
  styleUrl: './run-confirmation-dialog.component.scss',
})
export class RunConfirmationDialogComponent {
  readonly requiredPhrase = REQUIRED_PHRASE;
  typedConfirmation = '';

  constructor(
    public dialogRef: MatDialogRef<RunConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RunConfirmationDialogData,
  ) {}

  get isProduction(): boolean {
    return (this.data.environment || '').toLowerCase() === 'production';
  }

  get isHighRisk(): boolean {
    return this.data.operation?.risk === 'HIGH' || this.data.operation?.risk === 'CRITICAL';
  }

  get requiresTypedConfirmation(): boolean {
    return this.isProduction && this.isHighRisk;
  }

  get canRun(): boolean {
    if (!this.requiresTypedConfirmation) return true;
    return this.typedConfirmation === this.requiredPhrase;
  }

  get impactText(): string {
    const dryRun = this.data.dryRunResult?.result;
    if (dryRun) {
      const parts: string[] = [];
      if (dryRun.wouldInsert) parts.push(`insert ${dryRun.wouldInsert}`);
      if (dryRun.wouldUpdate) parts.push(`update ${dryRun.wouldUpdate}`);
      if (dryRun.wouldSkip) parts.push(`skip ${dryRun.wouldSkip}`);
      if (dryRun.wouldDelete) parts.push(`delete ${dryRun.wouldDelete}`);
      if (parts.length) {
        return `Dry run reports this will ${parts.join(', ')} record(s).`;
      }
      return 'Dry run reports no changes would be made.';
    }

    const health = this.data.operation?.health;
    if (health && typeof health.missing === 'number' && typeof health.expected === 'number') {
      return `Missing ${health.missing} of ${health.expected} expected record(s).`;
    }
    if (health?.status) {
      return `Current health: ${health.status}.`;
    }
    return 'No dry-run or health data is available for this operation yet.';
  }

  onRun(): void {
    if (!this.canRun) return;
    this.dialogRef.close({
      confirmed: true,
      confirmation: this.requiresTypedConfirmation ? this.typedConfirmation : undefined,
    });
  }

  onCancel(): void {
    this.dialogRef.close({ confirmed: false });
  }
}
