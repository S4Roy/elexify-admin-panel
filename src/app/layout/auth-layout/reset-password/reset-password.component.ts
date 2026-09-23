import { Component } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../core/services/auth.service';
import { NgIf } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import * as Global from '../../../global';

@Component({
  selector: 'app-reset-password',
  imports: [
    ReactiveFormsModule,
    RouterModule,
    NgIf,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent {
  Global = Global;
  formGroup!: FormGroup;
  visibiltyToogle: boolean[] = [];
  token: string | null = null;

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {
    this.token = this.route.snapshot.paramMap.get('token');

    this.formGroup = this.fb.group(
      {
        new_password: [
          null,
          Validators.compose([Validators.required, Validators.minLength(8)]),
        ],
        confirm_new_password: [null, Validators.compose([Validators.required])],
      },
      { validators: Global.MustMatch('new_password', 'confirm_new_password') }
    );

    if (!this.token) {
      this.toastr.error('Invalid or missing reset link.');
    }
  }

  onSubmit() {
    this.formGroup.markAllAsTouched();
    if (this.formGroup.valid && this.token) {
      this.formGroup.disable();
      const { new_password, confirm_new_password } =
        this.formGroup.getRawValue();
      this.authService
        .resetPassword({
          token: this.token,
          new_password,
          confirm_new_password,
        })
        .subscribe({
          next: (res: any) => {
            this.toastr.success(
              'Password reset successfully. Please login again.'
            );
            this.router.navigateByUrl('/auth/login');
          },
          error: (err: any) => {
            this.formGroup.enable();
          },
        });
    }
  }
}
