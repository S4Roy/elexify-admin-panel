import { Routes } from '@angular/router';
import { HeaderNavigationShellComponent } from './header-navigation-shell/header-navigation-shell.component';
import { TopbarSettingsComponent } from './topbar/topbar.component';
import { HeaderSettingsComponent } from './header-settings/header-settings.component';
import { MenuListComponent } from './menu-list/menu-list.component';
import { MenuBuilderComponent } from './menu-builder/menu-builder.component';
import { PreviewPanelComponent } from './preview-panel/preview-panel.component';

export const routes: Routes = [
  {
    path: '',
    component: HeaderNavigationShellComponent,
    children: [
      {
        path: '',
        redirectTo: 'top-bar',
        pathMatch: 'full',
      },
      {
        path: 'top-bar',
        component: TopbarSettingsComponent,
        data: { pageTitle: 'Top Bar', breadcrumb: 'Top Bar' },
      },
      {
        path: 'header',
        component: HeaderSettingsComponent,
        data: { pageTitle: 'Header Settings', breadcrumb: 'Header' },
      },
      {
        path: 'menus',
        component: MenuListComponent,
        data: { pageTitle: 'Navigation Menus', breadcrumb: 'Menus' },
      },
      {
        path: 'menus/:menuId',
        component: MenuBuilderComponent,
        data: { pageTitle: 'Menu Builder', breadcrumb: 'Menu Builder' },
      },
      {
        path: 'preview',
        component: PreviewPanelComponent,
        data: { pageTitle: 'Preview', breadcrumb: 'Preview' },
      },
    ],
  },
];
