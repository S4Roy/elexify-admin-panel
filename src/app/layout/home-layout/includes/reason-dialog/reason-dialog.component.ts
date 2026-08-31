import { NgIf } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

// Reusable "mandatory reason" confirm dialog — used anywhere an action
// needs a free-text justification before it can proceed (verification
// override, notification retry, etc). Adapted from the order-cancellation
// dialog pattern but generalised: title/message/labels are all data-driven
// instead of hardcoded to orders, and the reason is a single required
// textarea (min length configurable) rather than a reason+comment pair.
export interface ReasonDialogData {
  title: string;
  message: string;
  reasonLabel?: string;
  minLength?: number;
  confirmText?: string;
  cancelText?: string;
}

@Component({
  selector: 'app-reason-dialog',
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    NgIf,
  ],
  templateUrl: './reason-dialog.component.html',
  styleUrl: './reason-dialog.component.scss',
})
export class ReasonDialogComponent {
  formGroup: FormGroup;
  minLength: number;

  constructor(
    public dialogRef: MatDialogRef<ReasonDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ReasonDialogData,
    private fb: FormBuilder,
  ) {
    this.minLength = this.data?.minLength ?? 10;
    this.formGroup = this.fb.group({
      reason: ['', [Validators.required, Validators.minLength(this.minLength)]],
    });
  }

  closeModal() {
    this.dialogRef.close(false);
  }

  onCancel() {
    this.dialogRef.close(false);
  }

  onConfirm() {
    const reason = this.formGroup.get('reason')?.value?.trim();
    if (!reason || reason.length < this.minLength) {
      this.formGroup.get('reason')?.markAsTouched();
      return;
    }
    this.dialogRef.close({ confirm: true, reason });
  }
}
