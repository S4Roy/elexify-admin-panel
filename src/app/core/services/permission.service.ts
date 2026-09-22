import { Injectable, signal } from '@angular/core';
import { HttpService } from './http.service';
import { firstValueFrom } from 'rxjs';

// Route/resource names mirror the existing API, including legacy permission keys.
const resources: Record<string, string> = {
  dashboard: 'orders', products: 'products', categories: 'categories', brands: 'brands', tags: 'tags',
  classification: 'classification', attributes: 'attributes', orders: 'orders', coupons: 'discounts',
  'shipping-classes': 'shipping_classes', 'shipping-zones': 'shipping_zones', 'shipping-rates': 'shipping_rates',
  customers: 'customers', blogs: 'blogs', testimonials: 'testimonials', faqs: 'faqs', ratings: 'ratings',
  'contact-us': 'contacts', enquiries: 'enquiries', subscriber: 'subscribers', media: 'media', currency: 'currency',
  countries: 'countries', states: 'states', cities: 'cities', pincodes: 'pincodes', site: 'settings',
  'shipping-settings': 'shipping', seo: 'seo', specifications: 'specifications', banners: 'banners',
  homepage: 'home', home: 'home', 'home-page': 'home', 'header-config': 'header', header: 'header', topbar: 'topbar',
  'navigation-menu': 'navigation', navigation: 'navigation', roles: 'roles',
};
@Injectable({ providedIn: 'root' })
export class PermissionService {
  readonly keys = signal<ReadonlySet<string>>(new Set());
  private loading?: Promise<void>;
  constructor(private http: HttpService) {}
  refresh(): Promise<void> {
    if (!this.loading) this.loading = firstValueFrom(this.http.get('admin/role/me')).then(res => {
      this.keys.set(new Set<string>(res.data.permissions));
    }).catch(error => { this.clear(); throw error; }).finally(() => { this.loading = undefined; });
    return this.loading;
  }
  clear(): void { this.keys.set(new Set()); }
  can(key: string): boolean { return this.keys().has(key); }
  canAny(keys: string[]): boolean { return keys.some(key => this.can(key)); }
  canAll(keys: string[]): boolean { return keys.every(key => this.can(key)); }
  resource(url: string): string {
    const parts = url.split('?')[0].split('/').filter(Boolean);
    if (parts.includes('seo-manager')) return 'seo';
    if (parts[0] === 'pages' && parts[1] === 'header-navigation') return parts[2] === 'top-bar' ? 'topbar' : parts[2] === 'menus' ? 'navigation' : 'header';
    if (parts[0] === 'pages' && !resources[parts[1]]) return 'pages';
    const part = ['inventory', 'settings', 'masters', 'pages'].includes(parts[0]) ? parts[1] : parts[0];
    return resources[part] || '';
  }
  canRoute(url: string): boolean {
    const path = url.split('?')[0];
    if (path === '/' || path === '/settings' || path === '/settings/dashboard') return this.keys().size > 0;
    const special: [string, string][] = [
      ['/settings/email-templates', 'email_template.manage'], ['/settings/sms-templates', 'sms_template.manage'],
      ['/settings/integration-credentials', 'integration_credential.manage'], ['/settings/integrations/zoho-books', 'zoho_sync.view'],
      ['/settings/data-operations', 'system.data.view'], ['/notifications', 'customer.notification.view'],
      ['/webhook-logs', 'operations.view'], ['/inventory/orders/returns', 'return.view'],
      ['/inventory/orders/reconciliation', 'order.status.manage'],
    ];
    for (const [prefix, permission] of special) if (path === prefix || path.startsWith(prefix + '/')) return this.can(permission);
    const resource = this.resource(path);
    const action = /\/(add|create)(\/|$)/.test(path) ? 'create' : /\/update(\/|$)/.test(path) ? 'update' : 'view';
    return !!resource && this.can(`${resource}.${action}`);
  }
  landingUrl(): string {
    const candidates = ['/dashboard', '/inventory/products', '/inventory/categories', '/inventory/orders',
      '/customers', '/inventory/orders/returns', '/settings/roles', '/settings/integrations/zoho-books',
      '/settings/email-templates', '/settings/sms-templates', '/notifications', '/pages/homepage',
      '/blogs', '/settings/dashboard'];
    return candidates.find(url => this.canRoute(url)) || '/access-denied';
  }
  actions(resource: string): string[] {
    return [['add', 'create'], ['edit', 'update'], ['delete', 'delete']].filter(([, key]) => this.can(`${resource}.${key}`)).map(([action]) => action);
  }
}
