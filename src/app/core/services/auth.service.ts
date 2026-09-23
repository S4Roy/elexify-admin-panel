import { PermissionService } from './permission.service';
import { Injectable, inject } from '@angular/core';
import { HttpService } from './http.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private permissions = inject(PermissionService);
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
    return this.httpService.post('auth/admin/request-password-reset', payload);
  }
  resetPassword(payload: any) {
    return this.httpService.post('auth/admin/reset-password', payload);
  }

  userSuccessLogin(data: any, rememberme: boolean = true, encodedUrl: string) {
    // userSuccessLogin(data: any, encodedUrl: string) {

    this.permissions.clear();
    let user = { ...data?.user };

    if (rememberme == true) {
      localStorage.setItem(this.USER_TOKEN_KEY, data?.token?.access_token);
      localStorage.setItem(this.USER_TOKEN_ADMIN, JSON.stringify(user));
    } else {
      sessionStorage.setItem(this.USER_TOKEN_KEY, data?.token?.access_token);
      sessionStorage.setItem(this.USER_TOKEN_ADMIN, JSON.stringify(user));
    }
    void this.permissions.refresh().then(() => this.router.navigateByUrl(this.permissions.landingUrl()))
      .catch(() => this.router.navigateByUrl('/access-denied'));
  }
  getUserToken() {
    let token = localStorage.getItem(this.USER_TOKEN_KEY);
    if (!token) {
      token = sessionStorage.getItem(this.USER_TOKEN_KEY);
    }
    return token;
  }
  getUserData() {
    let data = localStorage.getItem(this.USER_TOKEN_ADMIN);
    if (!data) {
      data = sessionStorage.getItem(this.USER_TOKEN_ADMIN);
    }
    return data;
  }
  userLogout() {
    this.permissions.clear();
    localStorage.removeItem(this.USER_TOKEN_KEY);
    localStorage.removeItem(this.USER_TOKEN_ADMIN);
    sessionStorage.removeItem(this.USER_TOKEN_KEY);
    sessionStorage.removeItem(this.USER_TOKEN_ADMIN);

    this.router.navigateByUrl('/auth/login');
  }
  userLoggedIn() {
    return !!this.getUserToken();
  }
  // HRMS_REDIRECTION(res: any) {
  //   localStorage.removeItem(this.USER_TOKEN_KEY);
  //   localStorage.removeItem(this.USER_TOKEN_ADMIN);
  //   sessionStorage.removeItem(this.USER_TOKEN_KEY);
  //   sessionStorage.removeItem(this.USER_TOKEN_ADMIN);
  //   this.userSuccessLogin(res, true, '');
  // }
}
