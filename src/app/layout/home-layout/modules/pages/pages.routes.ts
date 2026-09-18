import { Routes } from '@angular/router';
import { HomeLayoutComponent } from '../../home-layout.component';
import { AboutComponent } from './about/about.component';
import { PageComponent } from './page/page.component';
import { pageResolver } from '../../../../core/resolver/page.resolver';
import { HomeComponent } from './home/home.component';
import { WhyChooseElexifyComponent } from './why-choose-elexify/why-choose-elexify.component';
import { HomepageComponent } from './homepage/homepage.component';
import { StaticPageComponent } from '../settings/static-page/static-page.component';
import { pageResolver as staticPageResolver } from '../settings/static-page/page.resolver';

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
      { path: 'terms-of-service', redirectTo: 'terms-conditions', pathMatch: 'full' },
      { path: 'refund-policy', redirectTo: 'refund-cancellations-policy', pathMatch: 'full' },
      ...[
        ['about-us', 'About Us'],
        ['contact-us', 'Contact Us'],
        ['faq', 'FAQ Page'],
        ['terms-conditions', 'Terms & Conditions'],
        ['privacy-policy', 'Privacy Policy'],
        ['refund-cancellations-policy', 'Refund & Cancellations'],
        ['shipping-policy', 'Shipping Policy'],
      ].map(([slug, label]) => ({
        path: slug,
        component: StaticPageComponent,
        resolve: { page: staticPageResolver },
        data: { pageTitle: label, breadcrumb: label },
      })),
      {
        path: ':slug',
        component: StaticPageComponent,
        resolve: { page: staticPageResolver },
        data: { pageTitle: 'CMS Page', breadcrumb: 'CMS Page' },
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
