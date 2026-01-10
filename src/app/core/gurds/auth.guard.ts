import { CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Observable } from 'rxjs';

export const authGuard: CanActivateFn = (
 route: ActivatedRouteSnapshot,
 state: RouterStateSnapshot
): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree => {
 const authService = inject(AuthService);
 const router = inject(Router);

 // Check if the user is logged in
 const isLoggedIn = authService.userLoggedIn();

 // If not logged in, redirect to the login page
 if (!isLoggedIn) {
    return router.createUrlTree(['/auth/login'],{queryParams:{ redirectTo: state.url }});
 }

 // If logged in, allow navigation
 return true;
};
