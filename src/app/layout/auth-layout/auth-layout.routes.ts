import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { ForgetPasswordComponent } from './forget-password/forget-password.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    data: { pageTitle: 'Login' },
  },
  {
    path: 'forgot-password',
    component: ForgetPasswordComponent,
    //data: { pageTitle: 'Login' },
  },
  {
    path: 'reset-password/:token',
    component: ResetPasswordComponent,
    data: { pageTitle: 'Reset Password' },
  },
];
