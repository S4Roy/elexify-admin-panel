import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { ForgetPasswordComponent } from './forget-password/forget-password.component';
import { AuthLayoutComponent } from './auth-layout.component';

const routes: Routes = [
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

  // {
  //     path: 'login',
  //     component: AuthLayoutComponent,
  //     children: [
  //       {
  //         path: 'login',
  //         component: LoginComponent,
  //         data: { pageTitle: 'Login' },
  //       },
  //       {
  //         path: 'forgot-password',
  //         component: ForgetPasswordComponent,
  //         data: { pageTitle: 'ForgetPassword' },
  //       },
  //     ]
  // }  
  

  // { path: 'login', component: LoginComponent },
  // { path: 'forgot-password', component: ForgetPasswordComponent },
  // { path: '', redirectTo: 'login', pathMatch: 'full' }, // Redirect to login by default
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AuthLayoutRoutingModule {}
