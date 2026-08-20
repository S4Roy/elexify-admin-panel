import { Routes } from '@angular/router';
import { SpecificationsComponent } from './specifications/specifications.component';
import { BlankLayoutComponent } from '../../includes/blank-layout/blank-layout.component';
import { HomeLayoutComponent } from '../../home-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeLayoutComponent,
    data: { pageTitle: '', breadcrumb: 'Master' },
    children: [
      {
        path: '',
        redirectTo: 'specifications',
        pathMatch: 'full',
      },

      {
        path: 'specifications',
        component: BlankLayoutComponent,
        data: { pageTitle: 'specifications', breadcrumb: 'specifications' },
        children: [
          {
            path: '',
            redirectTo: '',
            pathMatch: 'full',
          },
          {
            path: '',
            component: SpecificationsComponent,
            data: { pageTitle: 'Specifications', breadcrumb: '' },
          },
        ],
      },
    ],
  },
];
