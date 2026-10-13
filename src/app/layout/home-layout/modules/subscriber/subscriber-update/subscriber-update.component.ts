import { Component, Inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ApiService } from 'app/core/services/api.service';
import { PermissionService } from 'app/core/services/permission.service';

@Component({
  selector: 'app-subscriber-update',
  imports: [NgIf, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './subscriber-update.component.html',
  styleUrl: './subscriber-update.component.scss'
})
export class SubscriberUpdateComponent {
  status = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  saving = false;
  error = '';
  constructor(@Inject(MAT_DIALOG_DATA) public data: any, private dialogRef: MatDialogRef<SubscriberUpdateComponent>,
    private api: ApiService, public access: PermissionService) {}
  save(): void {
    if (this.saving || this.status.invalid || !this.access.can('subscribers.update')) return;
    this.saving = true;
    this.error = '';
    this.dialogRef.disableClose = true;
    this.status.disable();
    this.api.updateSubscriberStatus({ _id: this.data._id, status: this.status.value }).subscribe({
      next: () => this.dialogRef.close(true),
      error: () => { this.saving = false; this.dialogRef.disableClose = false; this.status.enable(); this.error = 'Unable to save changes. Please retry.'; }
    });
  }
}
