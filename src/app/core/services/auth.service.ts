import { Injectable } from '@angular/core';
import { HttpService } from './http.service';
import { Router } from '@angular/router';
import * as CryptoJS from 'crypto-js';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment.prod';
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  USER_TOKEN_KEY: string = 'ELEXIFY-TOKEN';
  USER_TOKEN_ADMIN: string = 'ELEXIFY-USER';
  constructor(
    private httpService: HttpService,
    private router: Router,
    private toastr: ToastrService
  ) {}
  submitLogin(payload: any) {
    return this.httpService.post('auth/admin/login', payload);
  }
  sendOtp(payload: any) {
    return this.httpService.post('admin/auth/login', payload);
  }
  verifyLoginOtp(payload: any) {
    return this.httpService.post('admin/auth/verify/login-otp', payload);
  }
  forgotPassword(payload: any) {
    return this.httpService.post('admin/auth/send-verification-code', payload);
  }
  verifyResetCode(payload: any) {
    return this.httpService.post('admin/auth/verify-reset-code', payload);
  }
  resetPassword(payload: any) {
    return this.httpService.post('admin/auth/reset-password', payload);
  }

  userSuccessLogin(data: any, rememberme: boolean = true, encodedUrl: string) {
    // userSuccessLogin(data: any, encodedUrl: string) {

    let user = { ...data?.user };

    if (rememberme == true) {
      localStorage.setItem(
        this.USER_TOKEN_KEY,
        this.encrypt(data?.token?.access_token)
      );
      localStorage.setItem(
        this.USER_TOKEN_ADMIN,
        this.encrypt(JSON.stringify(user))
      );
    } else {
      sessionStorage.setItem(
        this.USER_TOKEN_KEY,
        this.encrypt(data?.token?.access_token)
      );
      sessionStorage.setItem(
        this.USER_TOKEN_ADMIN,
        this.encrypt(JSON.stringify(user))
      );
    }
    this.router.navigate(['/']);
  }
  getUserToken() {
    let token = localStorage.getItem(this.USER_TOKEN_KEY);
    if (!token) {
      token = sessionStorage.getItem(this.USER_TOKEN_KEY);
    }
    return token ? this.decrypt(token) : null;
  }
  getUserData() {
    let data = localStorage.getItem(this.USER_TOKEN_ADMIN);
    if (!data) {
      data = sessionStorage.getItem(this.USER_TOKEN_ADMIN);
    }
    return data ? this.decrypt(data) : null;
  }
  userLogout() {
    localStorage.removeItem(this.USER_TOKEN_KEY);
    localStorage.removeItem(this.USER_TOKEN_ADMIN);
    sessionStorage.removeItem(this.USER_TOKEN_KEY);
    sessionStorage.removeItem(this.USER_TOKEN_ADMIN);

    this.router.navigateByUrl('/auth/login');
  }
  userLoggedIn() {
    return !!this.getUserToken();
  }
  private encrypt(txt: string): string {
    return CryptoJS.AES.encrypt(txt.toString(), environment.AES_KEY).toString();
  }

  private decrypt(txtToDecrypt: string) {
    if (!txtToDecrypt) {
      console.error('Decryption failed: Invalid input data.');
      return null;
    }

    try {
      const decryptedBytes = CryptoJS.AES.decrypt(
        txtToDecrypt,
        environment.AES_KEY
      );
      const decryptedText = decryptedBytes.toString(CryptoJS.enc.Utf8);
      return decryptedText ? decryptedText : null;
    } catch (error) {
      console.error('Decryption failed:', error);
      this.userLogout();
      return null;
    }
  }
  // HRMS_REDIRECTION(res: any) {
  //   localStorage.removeItem(this.USER_TOKEN_KEY);
  //   localStorage.removeItem(this.USER_TOKEN_ADMIN);
  //   sessionStorage.removeItem(this.USER_TOKEN_KEY);
  //   sessionStorage.removeItem(this.USER_TOKEN_ADMIN);
  //   this.userSuccessLogin(res, true, '');
  // }
}
