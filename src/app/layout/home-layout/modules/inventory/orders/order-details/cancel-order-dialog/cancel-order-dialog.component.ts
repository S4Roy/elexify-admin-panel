import { NgFor, NgIf } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

export const CANCELLATION_REASONS = [
  'Ordered by mistake',
  'Changed my mind',
  'Found a better price',
  'Delivery taking too long',
  'Incorrect address',
  'Need to change product/quantity',
  'Other',
];

export interface CancelOrderDialogData {
  orderNumber: string;
}

@Component({
  selector: 'app-cancel-order-dialog',
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    ReactiveFormsModule,
    NgFor,
    NgIf,
  ],
  templateUrl: './cancel-order-dialog.component.html',
  styleUrl: './cancel-order-dialog.component.scss',
})
export class CancelOrderDialogComponent {
  reasons = CANCELLATION_REASONS;
  formGroup: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<CancelOrderDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CancelOrderDialogData,
    private fb: FormBuilder
  ) {
    this.formGroup = this.fb.group({
      reason: ['', Validators.required],
      comment: [''],
    });
  }

  get isOther(): boolean {
    return this.formGroup.get('reason')?.value === 'Other';
  }

  closeModal() {
    this.dialogRef.close(false);
  }

  onKeepOrder() {
    this.dialogRef.close(false);
  }

  onConfirmCancel() {
    const reason = this.formGroup.get('reason')?.value;
    const comment = this.formGroup.get('comment')?.value?.trim();

    if (!reason) {
      this.formGroup.get('reason')?.markAsTouched();
      return;
    }
    if (reason === 'Other' && !comment) {
      this.formGroup.get('comment')?.markAsTouched();
      this.formGroup.get('comment')?.setErrors({ required: true });
      return;
    }

    this.dialogRef.close({ confirm: true, reason, comment });
  }
}
