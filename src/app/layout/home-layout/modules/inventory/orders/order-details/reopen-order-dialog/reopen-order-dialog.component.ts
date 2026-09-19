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

export interface ReopenOrderDialogData {
  orderNumber: string;
}

// Undoes a cancellation back to "processing" — see backend
// services/orderService/reopenOrder.js. Always requires a written
// justification, same as force-cancel.
@Component({
  selector: 'app-reopen-order-dialog',
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    NgIf,
  ],
  templateUrl: './reopen-order-dialog.component.html',
  styleUrl: './reopen-order-dialog.component.scss',
})
export class ReopenOrderDialogComponent {
  formGroup: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<ReopenOrderDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ReopenOrderDialogData,
    private fb: FormBuilder
  ) {
    this.formGroup = this.fb.group({
      reason: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  closeModal() {
    this.dialogRef.close(false);
  }

  onKeepCancelled() {
    this.dialogRef.close(false);
  }

  onConfirmReopen() {
    const reason = this.formGroup.get('reason')?.value?.trim();
    if (!reason || reason.length < 10) {
      this.formGroup.get('reason')?.markAsTouched();
      this.formGroup.get('reason')?.setErrors({ minlength: true });
      return;
    }
    this.dialogRef.close({ confirm: true, reason });
  }
}
