import { Component, Inject } from '@angular/core';
import * as Global from '../../../../../global';
import { NgIf } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup,
  FormBuilder,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogModule,
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { SettingsService } from '../../../../../core/services/settings.service';

@Component({
  selector: 'app-change-password',
  imports: [
    NgIf,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss',
})
export class ChangePasswordComponent {
  Global = Global;
  formGroup!: FormGroup;
  visibiltyToogle: any[] = [];
  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private settingService: SettingsService,
    private dialogRef: MatDialogRef<ChangePasswordComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.formGroup = this.fb.group(
      {
        old_password: [null, Validators.compose([Validators.required])],
        new_password: [
          null,
          Validators.compose([Validators.required, Validators.minLength(6)]),
        ],
        confirm_password: [null, Validators.compose([Validators.required])],
      },
      { validators: Global.MustMatch('new_password', 'confirm_password') }
    );
  }
  onSubmit() {
    this.formGroup.markAllAsTouched();
    if (this.formGroup.valid) {
      this.formGroup.disable();
      const { old_password, new_password } = this.formGroup.getRawValue();
      this.settingService
        .userChangePassword({ old_password, new_password })
        .subscribe({
          next: (res: any) => {
            this.toastr.success(`Password Changed Successfully`);
            this.dialogRef.close(true);
          },
          error: (err: any) => {
            this.formGroup.enable();
          },
        });
    }
  }
}
