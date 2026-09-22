import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { permissionGuard } from './permission.guard';
import { PermissionService } from '../services/permission.service';
describe('direct URL permission guard', () => {
  it('denies a manually entered restricted URL after refreshing permissions', async () => {
    const access = { refresh: jasmine.createSpy().and.resolveTo(), canRoute: jasmine.createSpy().and.returnValue(false) };
    const denied = {};
    TestBed.configureTestingModule({ providers: [{ provide: PermissionService, useValue: access }, { provide: Router, useValue: { createUrlTree: () => denied } }] });
    const result = await TestBed.runInInjectionContext(() => permissionGuard({} as any, { url: '/inventory/products/add' } as any));
    expect(result).toBe(denied as any); expect(access.refresh).toHaveBeenCalled(); expect(access.canRoute).toHaveBeenCalledWith('/inventory/products/add');
  });
});
