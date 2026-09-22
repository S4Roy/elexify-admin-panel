import { permissionGuard } from './core/gurds/permission.guard';
import { AccessDeniedComponent } from './error/access-denied/access-denied.component';
import { Routes } from '@angular/router';
import { guestGuard } from './core/gurds/guest.guard';
import { authGuard } from './core/gurds/auth.guard';
import { P404Component } from './error/p404/p404.component';

export const routes: Routes = [
  { path: "access-denied", component: AccessDeniedComponent, canActivate: [authGuard] },
  {
    path: '',
    loadChildren: () =>
      import('./layout/home-layout/home-layout.routes').then((m) => m.routes),
    canActivate: [authGuard],
    canActivateChild: [permissionGuard],
  },
  {
    path: 'auth',
    loadChildren: () =>
      import('./layout/auth-layout/auth-layout.routes').then((m) => m.routes),
    canActivate: [guestGuard],
  },
  {
    path: 'pages',
    loadChildren: () =>
      import('./layout/home-layout/modules/pages/pages.routes').then(
        (m) => m.routes
      ),
    canActivate: [authGuard],
    canActivateChild: [permissionGuard],
  },
  {
    path: 'masters',
    loadChildren: () =>
      import('./layout/home-layout/modules/master/master.routes').then(
        (m) => m.routes
      ),
    canActivate: [authGuard],
    canActivateChild: [permissionGuard],
  },
  {
    path: 'inventory',
    loadChildren: () =>
      import('./layout/home-layout/modules/inventory/inventory.routes').then(
        (m) => m.routes
      ),
    canActivate: [authGuard],
    canActivateChild: [permissionGuard],
  },

  {
    path: '**',
    component: P404Component,
    data: {
      pageTitle: 'Page Not Found',
    },
  },
];
