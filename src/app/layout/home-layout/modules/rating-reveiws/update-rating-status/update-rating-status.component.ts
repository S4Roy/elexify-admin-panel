import { NgFor, UpperCasePipe } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  ɵInternalFormsSharedModule,
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
  selector: 'app-update-rating-status',
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    NgSelectModule,
    NgFor,
    UpperCasePipe,
    ɵInternalFormsSharedModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatButtonModule,
  ],
  templateUrl: './update-rating-status.component.html',
  styleUrl: './update-rating-status.component.scss',
})
export class UpdateRatingStatusComponent {
  formGroup!: FormGroup;
  constructor(
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<UpdateRatingStatusComponent>,
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
    this.formGroup.markAllAsTouched();
    if (this.formGroup.valid) {
      this.apiService
        .updateRatingStatus(this.formGroup.getRawValue())
        .subscribe((res: any) => {
          this.toastr.success(res?.message);
          this.dialogRef.close(res);
        });
    }
  }
}
