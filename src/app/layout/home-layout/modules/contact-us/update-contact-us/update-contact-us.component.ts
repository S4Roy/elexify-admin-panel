import { NgFor, NgIf, DatePipe, UpperCasePipe } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { NgSelectModule } from '@ng-select/ng-select';
import { ApiService } from 'app/core/services/api.service';
import { ToastrService } from 'ngx-toastr';
@Component({
  selector: 'app-update-contact-us',
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    NgSelectModule,
    NgFor, NgIf, DatePipe,
    UpperCasePipe,

    ReactiveFormsModule,
    MatSelectModule,
    MatButtonModule,
  ],
  templateUrl: './update-contact-us.component.html',
  styleUrl: './update-contact-us.component.scss',
})
export class UpdateContactUsComponent {
  formGroup!: FormGroup;
  saving = false;
  error = '';
  get emailLink(): string { return 'mailto:' + encodeURIComponent(this.data?.email || '') + '?subject=' + encodeURIComponent('Re: ' + (this.data?.subject || 'Your enquiry')); }
  get phoneLink(): string { return 'tel:' + String(this.data?.phone || '').replace(/[^+0-9]/g, ''); }
  constructor(
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<UpdateContactUsComponent>,
    private apiService: ApiService,
    private toastr: ToastrService
  ) {}
  ngOnInit() {
    this.formGroup = this.fb.group({
      _id: [this.data?._id, Validators.required],
      status: [this.data?.status, Validators.required],
    });
  }
  onSubmit() {
    if (this.saving) return;
    this.formGroup.markAllAsTouched();
    if (this.formGroup.valid) {
      this.saving = true;
      this.error = '';
      this.dialogRef.disableClose = true;
      this.apiService
        .updateContactUsStatus(this.formGroup.getRawValue())
        .subscribe({ next: (res: any) => {
          this.toastr.success(res?.message);
          this.dialogRef.close(res);
        }, error: () => {
          this.saving = false;
          this.dialogRef.disableClose = false;
          this.error = 'Unable to save status. Please try again.';
        } });
    }
  }
}
