import { Routes } from '@angular/router';
import { HomeLayoutComponent } from '../../home-layout.component';
import { AboutComponent } from './about/about.component';
import { PageComponent } from './page/page.component';
import { pageResolver } from '../../../../core/resolver/page.resolver';
import { HomeComponent } from './home/home.component';
import { WhyChooseElexifyComponent } from './why-choose-elexify/why-choose-elexify.component';
import { HomepageComponent } from './homepage/homepage.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeLayoutComponent,
    data: { pageTitle: '', breadcrumb: 'Pages' },
    children: [
      {
        path: '',
        redirectTo: 'homepage',
        pathMatch: 'full',
      },
      // {
      //   path: 'home',
      //   component: HomeComponent,
      //   data: { pageTitle: 'Home', breadcrumb: 'Home' },
      // },
      // {
      //   path: 'about',
      //   component: AboutComponent,
      //   data: { pageTitle: 'About', breadcrumb: 'About' },
      // },
      {
        path: 'homepage',
        component: HomepageComponent,
        data: {
          pageTitle: 'Homepage Management',
          breadcrumb: 'Homepage',
        },
      },
      {
        path: 'header-navigation',
        loadChildren: () =>
          import('./header-navigation/header-navigation.routes').then(
            (m) => m.routes
          ),
        data: { pageTitle: 'Header & Navigation', breadcrumb: 'Header & Navigation' },
      },
      {
        path: 'why-elexify',
        component: WhyChooseElexifyComponent,
        data: {
          pageTitle: 'Why Elexify Industries',
          breadcrumb: 'Why Elexify Industries?',
        },
      },
      // {
      //   path: 'our-services',
      //   component: AboutComponent,
      //   data: { breadcrumb: 'Our Service', pageTitle: 'Our Service' },
      // },
      // {
      //   path: ':page_type',
      //   component: PageComponent,
      //   resolve: {
      //     pageData: pageResolver, // Use the resolver to fetch data based on page_type
      //   },
      // },
    ],
  },
];
