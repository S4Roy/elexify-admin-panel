import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const guestGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
 ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);
 
  // Check if the user is logged in
  const isLoggedIn = authService.userLoggedIn();
 
  // If not logged in, redirect to the login page
  if (isLoggedIn) {
     return router.createUrlTree(['/']);
  }
 
  // If logged in, allow navigation
  return true;
 };
 