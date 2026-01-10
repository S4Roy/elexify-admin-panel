import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { HelpersService } from '../services/helpers.service';

export const employeeGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
 ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree => {
  const helpers = inject(HelpersService);
  const router = inject(Router);
 
  // Check if the user is logged in
  const role = helpers.role();
 
  // If not logged in, redirect to the login page
  if (role != 'employee') {
     return router.createUrlTree(['/admin/dashboard']);
  }
 
  // If logged in, allow navigation
  return true;
 };