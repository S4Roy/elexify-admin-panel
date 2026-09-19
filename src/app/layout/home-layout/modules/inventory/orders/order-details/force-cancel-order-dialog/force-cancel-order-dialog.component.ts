import { NgIf } from '@angular/common';
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

export interface ForceCancelOrderDialogData {
  orderNumber: string;
  orderStatus: string;
}

// Superadmin-only override for orders the normal Cancel Order flow refuses
// (e.g. a packed order that already has courier/AWB details attached).
// Always requires a written justification — see backend
// validations/admin/inventory/order/cancel.js `forceCancel`.
@Component({
  selector: 'app-force-cancel-order-dialog',
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    NgIf,
  ],
  templateUrl: './force-cancel-order-dialog.component.html',
  styleUrl: './force-cancel-order-dialog.component.scss',
})
export class ForceCancelOrderDialogComponent {
  formGroup: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<ForceCancelOrderDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ForceCancelOrderDialogData,
    private fb: FormBuilder
  ) {
    this.formGroup = this.fb.group({
      reason: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  closeModal() {
    this.dialogRef.close(false);
  }

  onKeepOrder() {
    this.dialogRef.close(false);
  }

  onConfirmForceCancel() {
    const reason = this.formGroup.get('reason')?.value?.trim();
    if (!reason || reason.length < 10) {
      this.formGroup.get('reason')?.markAsTouched();
      this.formGroup.get('reason')?.setErrors({ minlength: true });
      return;
    }
    this.dialogRef.close({ confirm: true, reason });
  }
}
