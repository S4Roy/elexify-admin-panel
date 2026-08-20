import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { ForgetPasswordComponent } from './forget-password/forget-password.component';

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
];
