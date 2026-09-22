import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { PermissionService } from '../services/permission.service';
export const permissionGuard: CanActivateChildFn = async (_route, state) => {
  const permissions = inject(PermissionService);
  const router = inject(Router);
  try {
    await permissions.refresh();
    return permissions.canRoute(state.url) || router.createUrlTree(['/access-denied']);
  } catch { return router.createUrlTree(['/access-denied']); }
};
