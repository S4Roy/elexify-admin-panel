import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { HelpersService } from '../services/helpers.service';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';

export const adminGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
 ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree => {
  const helpers = inject(HelpersService);
  const router = inject(Router);
 
  // Check if the user is logged in
  const role = helpers.role();
 
  // If not logged in, redirect to the login page
  if (role != 'admin') {
     return router.createUrlTree(['/employee/dashboard']);
  }
 
  // If logged in, allow navigation
  return true;
 };
