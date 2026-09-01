import { NgIf } from '@angular/common';
import { Component, Inject, Optional } from '@angular/core';
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

// "Send a test email" confirm dialog -- adapted from the reason-dialog
// pattern (same MatDialog shape/markup) but swaps the reason textarea for
// a required, email-validated input. Used by the email-template editor to
// collect the destination address before calling the send-test endpoint.
export interface SendTestEmailDialogData {
  title?: string;
  message?: string;
}

@Component({
  selector: 'app-send-test-email-dialog',
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    NgIf,
  ],
  templateUrl: './send-test-email-dialog.component.html',
  styleUrl: './send-test-email-dialog.component.scss',
})
export class SendTestEmailDialogComponent {
  formGroup: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<SendTestEmailDialogComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: SendTestEmailDialogData = {},
    private fb: FormBuilder,
  ) {
    this.formGroup = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  closeModal() {
    this.dialogRef.close(false);
  }

  onCancel() {
    this.dialogRef.close(false);
  }

  onConfirm() {
    if (this.formGroup.invalid) {
      this.formGroup.markAllAsTouched();
      return;
    }
    const email = this.formGroup.get('email')?.value?.trim();
    this.dialogRef.close({ confirm: true, email });
  }
}
