import { Component, Inject } from '@angular/core';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';
export interface ConfirmDialogData {
  title: string;
  message: string;
  cancelText: string;
  saveText: string;
}
@Component({
  selector: 'app-confirm-dialog',
  imports: [MatDialogModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  onConfirm(): void {
    this.dialogRef.close({ confirm: true });
  }

  onCancel(): void {
    this.dialogRef.close({ discard: true });
  }
  closeModal() {
    this.dialogRef.close(false);
  }
}
