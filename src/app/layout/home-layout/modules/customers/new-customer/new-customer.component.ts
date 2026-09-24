import { NgFor, NgIf } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { ToastrService } from 'ngx-toastr';
import * as Global from 'app/global';
import { ApiService } from 'app/core/services/api.service';

@Component({
  selector: 'app-new-customer',
  imports: [
    ReactiveFormsModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatTooltipModule,
    NgFor,
    NgIf,
  ],
  templateUrl: './new-customer.component.html',
  styleUrl: './new-customer.component.scss',
})
export class NewCustomerComponent implements OnInit {
  Global = Global;
  formGroup!: FormGroup;
  countries: any[] = [];

  constructor(
    private fb: FormBuilder,
    public toastr: ToastrService,
    private apiService: ApiService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<NewCustomerComponent>,
  ) {
    this.formGroup = this.fb.group({
      name: [
        this.data?.name ?? null,
        Validators.compose([Validators.required]),
      ],
      email: [this.data?.email ?? null, Validators.compose([Validators.email])],
      phone_code: [this.data?.phone_code ?? '91'],
      mobile: [
        this.data?.mobile ?? null,
        Validators.compose([Validators.pattern(/^[0-9]{6,15}$/)]),
      ],
      password: [
        null,
        // Required only on add; optional on edit
        ...(!this.data
          ? [Validators.compose([Validators.minLength(6)])]
          : [Validators.minLength(6)]),
      ],
      status: [
        this.data?.status ?? 'active',
        Validators.compose([Validators.required]),
      ],
      // Profile fields — editable once the customer exists.
      dob: [this.data?.dob ? String(this.data.dob).slice(0, 10) : ''],
      gender: [this.data?.gender ?? ''],
    });
  }

  // yyyy-MM-dd for the date input's max (no future birth dates).
  readonly today = new Date().toISOString().slice(0, 10);

  ngOnInit(): void {
    this.loadCountries();
  }

  loadCountries(): void {
    this.apiService.getCountries().subscribe({
      next: (res: any) => {
        this.countries = res?.data ?? [];
      },
      error: () => {},
    });
  }

  onSubmit(): void {
    this.formGroup.markAllAsTouched();
    if (this.formGroup.valid) {
      this.formGroup.disable();

      const formData: any = this.formGroup.getRawValue();

      // Remove empty optional fields — don't send null to backend
      if (!formData.email) delete formData.email;
      if (!formData.mobile) delete formData.mobile;
      if (!formData.password) delete formData.password;
      // dob/gender are only on the edit endpoint; "" clears them there.
      if (!this.data?._id) {
        delete formData.dob;
        delete formData.gender;
      } else {
        formData.dob = formData.dob || null;
        formData.gender = formData.gender || null;
      }

      // Attach _id for edit
      if (this.data?._id) {
        formData._id = this.data._id;
      }

      const request$ = this.data?._id
        ? this.apiService.editCustomer(formData)
        : this.apiService.addCustomer(formData);

      request$.subscribe({
        next: (res: any) => {
          this.dialogRef.close(res);
          this.toastr.success(res?.message);
        },
        error: () => {
          this.formGroup.enable();
        },
      });
    }
  }
}
