import { Routes } from '@angular/router';
import { guestGuard } from './core/gurds/guest.guard';
import { authGuard } from './core/gurds/auth.guard';
import { P404Component } from './error/p404/p404.component';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./layout/home-layout/home-layout.module').then(
        (m) => m.HomeLayoutModule
      ),
    canActivate: [authGuard],
  },
  {
    path: 'auth',
    loadChildren: () =>
      import('./layout/auth-layout/auth-layout.module').then(
        (m) => m.AuthLayoutModule
      ),
    canActivate: [guestGuard],
  },
  {
    path: 'pages',
    loadChildren: () =>
      import('./layout/home-layout/modules/pages/pages.module').then(
        (m) => m.PagesModule
      ),
    canActivate: [authGuard],
  },
  {
    path: 'masters',
    loadChildren: () =>
      import('./layout/home-layout/modules/master/master.module').then(
        (m) => m.MasterModule
      ),
    canActivate: [authGuard],
  },
  {
    path: 'inventory',
    loadChildren: () =>
      import('./layout/home-layout/modules/inventory/inventory.module').then(
        (m) => m.InventoryModule
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
