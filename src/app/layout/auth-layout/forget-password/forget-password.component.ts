import { Component } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../core/services/auth.service';
import { NgIf } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import * as Global from '../../../global';

@Component({
  selector: 'app-forget-password',
  imports: [
    ReactiveFormsModule,
    RouterModule,
    NgIf,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './forget-password.component.html',
  styleUrl: './forget-password.component.scss',
})
export class ForgetPasswordComponent {
  Global = Global;
  loginForm!: FormGroup;
  linkSent: boolean = false;

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private authService: AuthService
  ) {
    this.loginForm = this.fb.group({
      email: [
        null,
        Validators.compose([
          Validators.required,
          Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+.[a-z]{2,4}$'),
        ]),
      ],
    });
  }

  sendResetLink() {
    this.loginForm.markAllAsTouched();

    if (this.loginForm.valid) {
      this.loginForm.disable();
      this.authService.forgotPassword(this.loginForm.getRawValue()).subscribe({
        next: (res: any) => {
          this.linkSent = true;
          this.toastr.success('Password reset link sent to your email!');
        },
        error: (err: any) => {
          this.loginForm.enable();
        },
      });
    }
  }
}
