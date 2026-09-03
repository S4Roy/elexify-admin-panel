import { Routes, ActivatedRouteSnapshot } from '@angular/router';
import { MediaComponent } from './media/media.component';
import { CurrencyComponent } from './currency/currency.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { StaticPageComponent } from './static-page/static-page.component';
import { pageResolver } from './static-page/page.resolver';
import { SiteSettingsComponent } from './site-settings/site-settings.component';
import { CountriesComponent } from './countries/countries.component';
import { StatesComponent } from './states/states.component';
import { CitiesComponent } from './cities/cities.component';
import { PincodesComponent } from './pincodes/pincodes.component';
import { ShippingSettingsComponent } from './shipping-settings/shipping-settings.component';
import { SeoSettingsComponent } from './seo-settings/seo-settings.component';
import { EmailTemplatesListComponent } from './email-templates/email-templates-list/email-templates-list.component';
import { EmailTemplateEditComponent } from './email-templates/email-template-edit/email-template-edit.component';
import { IntegrationCredentialsComponent } from './integration-credentials/integration-credentials.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    data: { pageTitle: 'Dashboard', breadcrumb: 'Dashboard' },
    component: DashboardComponent,
  },
  {
    path: 'media',
    data: { pageTitle: 'Media', breadcrumb: 'Media' },
    component: MediaComponent,
  },
  {
    path: 'currency',
    data: { pageTitle: 'Currency', breadcrumb: 'Currency' },
    component: CurrencyComponent,
  },
  {
    path: 'countries',
    data: { pageTitle: 'Countries', breadcrumb: 'Countries' },
    component: CountriesComponent,
  },
  {
    path: 'states',
    data: { pageTitle: 'States', breadcrumb: 'States' },
    component: StatesComponent,
  },
  {
    path: 'cities',
    data: { pageTitle: 'Cities', breadcrumb: 'Cities' },
    component: CitiesComponent,
  },
  {
    path: 'pincodes',
    data: { pageTitle: 'Pincodes', breadcrumb: 'Pincodes' },
    component: PincodesComponent,
  },
  {
    path: 'site',
    data: { pageTitle: 'Site Settings', breadcrumb: 'Site Info' },
    component: SiteSettingsComponent,
  },
  {
    path: 'shipping-settings',
    data: { pageTitle: 'Shipping Settings', breadcrumb: 'Shipping Settings' },
    component: ShippingSettingsComponent,
  },
  {
    path: 'seo',
    data: { pageTitle: 'SEO Settings', breadcrumb: 'SEO Settings' },
    component: SeoSettingsComponent,
  },
  {
    path: 'email-templates',
    data: { pageTitle: 'Email Templates', breadcrumb: 'Email Templates' },
    component: EmailTemplatesListComponent,
  },
  {
    path: 'email-templates/:action',
    data: { pageTitle: 'Edit Email Template', breadcrumb: 'Edit Template' },
    component: EmailTemplateEditComponent,
  },
  {
    path: 'integration-credentials',
    data: { pageTitle: 'Integration Credentials', breadcrumb: 'Integration Credentials' },
    component: IntegrationCredentialsComponent,
  },
  {
    path: 'data-operations',
    data: { pageTitle: 'Data Operations', breadcrumb: 'Data Operations' },
    loadChildren: () =>
      import('./data-operations/data-operations.routes').then((m) => m.routes),
  },
  {
    path: ':slug',
    component: StaticPageComponent,
    resolve: {
      page: pageResolver,
    },
    data: {
      pageTitle: 'Page',
      breadcrumb: (data: any) => data.page.title, // Gets name from resolver
    },
  },
];
