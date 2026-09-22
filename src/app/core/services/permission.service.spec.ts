import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PermissionService } from './permission.service';
import { HttpService } from './http.service';
describe('PermissionService', () => {
  let service: PermissionService;
  let http: jasmine.SpyObj<HttpService>;
  beforeEach(() => { http = jasmine.createSpyObj('HttpService', ['get']); TestBed.configureTestingModule({ providers: [{ provide: HttpService, useValue: http }] }); service = TestBed.inject(PermissionService); });
  it('denies access before loading and uses granular permissions', async () => {
    expect(service.canRoute('/inventory/products')).toBeFalse();
    http.get.and.returnValue(of({ data: { permissions: ['products.view', 'products.create'] } }));
    await service.refresh();
    expect(service.canRoute('/inventory/products/add')).toBeTrue();
    expect(service.canRoute('/inventory/products/update/123')).toBeFalse();
    expect(service.actions('products')).toEqual(['add']);
    expect(service.landingUrl()).toBe('/inventory/products');
    expect(service.canAny(['products.delete', 'products.view'])).toBeTrue();
    expect(service.canAll(['products.view', 'products.delete'])).toBeFalse();
    expect(service.canRoute('/unknown')).toBeFalse();
  });
  it('refreshes revoked access and clears on logout', async () => {
    http.get.and.returnValue(of({ data: { permissions: ['orders.refund'] } })); await service.refresh(); expect(service.can('orders.refund')).toBeTrue();
    http.get.and.returnValue(of({ data: { permissions: [] } })); await service.refresh(); expect(service.can('orders.refund')).toBeFalse();
    service.clear(); expect(service.keys().size).toBe(0);
  });
});
