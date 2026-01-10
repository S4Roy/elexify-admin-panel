import { Component } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../core/services/auth.service';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { NgIf } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import * as Global from '../../../global';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    MatCheckboxModule,
    RouterModule,
    NgIf,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  Global = Global;
  loginForm!: FormGroup;
  visibiltyToogle: boolean[] = [];
  encodedUrl: any = null;
  otpSend: boolean = false;
  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {
    this.encodedUrl = this.route.snapshot.queryParamMap.get('redirectTo');

    this.loginForm = this.fb.group({
      email: [
        null,
        Validators.compose([
          Validators.required,
          Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+.[a-z]{2,4}$'),
        ]),
      ],
      verification_code: [null, Validators.compose([])],
      password: [null, Validators.compose([Validators.required])],
      //rememberme: [true],
    });
  }
  sendOtp() {
    this.loginForm.markAllAsTouched();

    if (this.loginForm.valid) {
      this.loginForm.disable();
      let formData = this.loginForm.getRawValue();
      delete formData.verification_code;
      this.authService.sendOtp(formData).subscribe({
        next: (res: any) => {
          this.otpSend = true;
          this.loginForm.enable();
          this.toastr.success('OTP Sent Successfully!', '', {
            timeOut: 1000, // Display for 1 seconds
          });
          this.loginForm
            .get('verification_code')
            ?.setValidators([Validators.required]);
          this.loginForm.get('verification_code')?.markAsUntouched();
          this.loginForm.get('verification_code')?.updateValueAndValidity();
          this.loginForm.get('password')?.clearValidators();
          this.loginForm.get('password')?.updateValueAndValidity();
        },
        error: (err: any) => {
          this.loginForm.enable();
          this.otpSend = false;
        },
      });
    }
  }
  submitLogin() {
    this.loginForm.markAllAsTouched();

    if (this.loginForm.valid) {
      this.loginForm.disable();
      let formData = this.loginForm.getRawValue();
      delete formData.verification_code;
      this.authService.submitLogin(formData).subscribe({
        next: (res: any) => {
          this.authService.userSuccessLogin(res?.data, true, this.encodedUrl);
        },
        error: (err: any) => {
          this.loginForm.enable();
          // this.toastr.error('Please check the email and password','', {
          //   timeOut: 2000,
          // });
          // this.authService.userSuccessLogin({token:'gregrehberhbe',email:'email@ff.ff'}, true, this.encodedUrl);
        },
        complete: () => {
          this.loginForm.enable();
          this.toastr.success('Logged in Successfully!', 'Welcome!', {
            timeOut: 1000, // Display for 1 seconds
          });
        },
      });
    }
  }
}
