import { NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { RouterCardComponent } from 'app/layout/home-layout/includes/router-card/router-card.component';
import { HelpersService } from 'app/core/services/helpers.service';

@Component({
  selector: 'app-dashboard',
  imports: [NgFor, NgIf, RouterCardComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  // Keep this overview in the same order as the Settings sidebar.
  readonly nav_list = [
    { label: 'Zoho Books', description: 'Accounting integration and synchronization', router_path: '/settings/integrations/zoho-books', roles: ['superadmin', 'manager'] },
    { label: 'Site Settings', description: 'Store and company details', router_path: '/settings/site' },
    { label: 'Media', description: 'Manage uploaded assets', router_path: '/settings/media' },
    { label: 'Countries', description: 'Manage countries', router_path: '/settings/countries' },
    { label: 'States', description: 'Manage states', router_path: '/settings/states' },
    { label: 'Cities', description: 'Manage cities', router_path: '/settings/cities' },
    { label: 'Pincodes', description: 'Manage delivery pincodes', router_path: '/settings/pincodes' },
    { label: 'Currency', description: 'Manage currency', router_path: '/settings/currency' },
    { label: 'Shipping Settings', description: 'Configure fulfillment', router_path: '/settings/shipping-settings' },
    { label: 'SEO Settings', description: 'Search visibility defaults', router_path: '/settings/seo' },
    { label: 'Email Templates', description: 'Customer email messages', router_path: '/settings/email-templates' },
    { label: 'SMS Templates', description: 'Customer text messages', router_path: '/settings/sms-templates' },
    { label: 'Integration Credentials', description: 'Connected service credentials', router_path: '/settings/integration-credentials', roles: ['superadmin'] },
    { label: 'Data Operations', description: 'Maintenance and migrations', router_path: '/settings/data-operations' },
  ];

  constructor(private helpersService: HelpersService) {}

  canAccess(item: { roles?: string[] }): boolean {
    return !item.roles?.length || item.roles.includes(this.helpersService.role());
  }
}
