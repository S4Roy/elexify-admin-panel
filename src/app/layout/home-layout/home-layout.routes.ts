import { CampaignsComponent } from './modules/notifications/campaigns/campaigns.component';
import { Routes } from '@angular/router';
import { HomeLayoutComponent } from './home-layout.component';
import { CustomersComponent } from './modules/customers/customers.component';
import { DashboardComponent } from './modules/dashboard/dashboard/dashboard.component';
import { TestimonialComponent } from './modules/testimonial/testimonial.component';
import { FaqComponent } from './modules/faq/faq.component';
import { BlogsComponent } from './modules/blogs/blogs.component';
import { NewBlogsComponent } from './modules/blogs/new-blogs/new-blogs.component';
import { BlogDetailsComponent } from './modules/blogs/blog-details/blog-details.component';
import { RatingReveiwsComponent } from './modules/rating-reveiws/rating-reveiws.component';
import { ContactUsComponent } from './modules/contact-us/contact-us.component';
import { SubscriberComponent } from './modules/subscriber/subscriber.component';
import { EnquiriesComponent } from './modules/enquiries/enquiries.component';
import { CustomerDetailsComponent } from './modules/customers/customer-details/customer-details.component';
import { NotificationDashboardComponent } from './modules/notifications/notification-dashboard/notification-dashboard.component';
import { DeadLetterComponent } from './modules/notifications/dead-letter/dead-letter.component';
import { NotificationHistoryComponent } from './modules/notifications/notification-history/notification-history.component';
import { WebhookLogsComponent } from './modules/operations/webhook-logs/webhook-logs.component';
import { AuditLogsComponent } from './modules/operations/audit-logs/audit-logs.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        component: DashboardComponent,
      },
      {
        path: 'settings',
        data: { pageTitle: 'Settings', breadcrumb: 'Settings' },
        loadChildren: () =>
          import('./modules/settings/settings.routes').then((m) => m.routes),
      },
      {
        path: 'customers',
        data: { pageTitle: 'Customers', breadcrumb: 'Customers' },
        children: [
          {
            path: '',
            component: CustomersComponent,
            data: { pageTitle: 'Customers', breadcrumb: 'List' },
          },
          {
            path: 'details/:_id',
            component: CustomerDetailsComponent,
            data: { pageTitle: 'Customer Details', breadcrumb: 'Details' },
          },
        ],
      },
      {
        path: 'notifications',
        data: { pageTitle: 'Notifications', breadcrumb: 'Notifications' },
        children: [
          { path: 'campaigns', component: CampaignsComponent, data: { pageTitle: 'Push Campaigns', breadcrumb: 'Campaigns' } },
          {
            path: '',
            component: NotificationDashboardComponent,
            data: { pageTitle: 'Notifications', breadcrumb: 'Summary' },
          },
          {
            path: 'dead-letter',
            component: DeadLetterComponent,
            data: { pageTitle: 'Dead Letter Queue', breadcrumb: 'Dead Letter' },
          },
          {
            path: 'history',
            component: NotificationHistoryComponent,
            data: { pageTitle: 'Notification History', breadcrumb: 'History' },
          },
        ],
      },
      {
        path: 'webhook-logs',
        component: WebhookLogsComponent,
        data: { pageTitle: 'Webhook Logs', breadcrumb: 'Webhook Logs' },
      },
      {
        path: 'audit-logs',
        component: AuditLogsComponent,
        data: { pageTitle: 'Audit Logs', breadcrumb: 'Audit Logs' },
      },
      {
        path: 'testimonials',
        component: TestimonialComponent,
        data: { pageTitle: 'Testimonials', breadcrumb: 'Testimonials' },
      },
      {
        path: 'faqs',
        component: FaqComponent,
        data: { pageTitle: 'FAQs', breadcrumb: 'FAQs' },
      },
      {
        path: 'contact-us',
        component: ContactUsComponent,
        data: { pageTitle: 'Contact us', breadcrumb: 'Contact us' },
      },
      {
        path: 'ratings',
        component: RatingReveiwsComponent,
        data: { pageTitle: 'Rating & Reviews', breadcrumb: 'Rating & Reviews' },
      },
      {
        path: 'enquiries',
        component: EnquiriesComponent,
        data: { pageTitle: 'Enquiries', breadcrumb: 'Enquiries' },
      },
      {
        path: 'subscriber',
        component: SubscriberComponent,
        data: { pageTitle: 'subscriber', breadcrumb: 'subscriber' },
      },
      {
        path: 'blogs',
        data: { pageTitle: 'Blogs', breadcrumb: 'Blogs' },

        children: [
          {
            path: '',
            component: BlogsComponent,
            data: { pageTitle: 'Blogs', breadcrumb: 'List' },
          },
          {
            path: 'add',
            component: NewBlogsComponent,
            data: { pageTitle: 'New Blog', breadcrumb: 'New Blog' },
          },
          {
            path: 'update/:_id',
            component: NewBlogsComponent,
            data: { pageTitle: 'Update Blog', breadcrumb: 'Update Blog' },
          },
          {
            path: 'details/:slug',
            component: BlogDetailsComponent,
            data: { pageTitle: 'Details Blog', breadcrumb: 'Details Blog' },
          },
        ],
      },
    ],
  },
];
