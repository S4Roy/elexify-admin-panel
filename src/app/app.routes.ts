import { Routes } from '@angular/router';
import { guestGuard } from './core/gurds/guest.guard';
import { authGuard } from './core/gurds/auth.guard';
import { P404Component } from './error/p404/p404.component';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./layout/home-layout/home-layout.routes').then((m) => m.routes),
    canActivate: [authGuard],
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
  },
  {
    path: 'masters',
    loadChildren: () =>
      import('./layout/home-layout/modules/master/master.routes').then(
        (m) => m.routes
      ),
    canActivate: [authGuard],
  },
  {
    path: 'inventory',
    loadChildren: () =>
      import('./layout/home-layout/modules/inventory/inventory.routes').then(
        (m) => m.routes
      ),
    canActivate: [authGuard],
  },

  {
    path: '**',
    component: P404Component,
    data: {
      pageTitle: 'Page Not Found',
    },
  },
];
