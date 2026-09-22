import { AuthService } from 'app/core/services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { DialogService } from 'app/core/services/dialog.service';
import { of } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { RolesComponent } from './roles.component';
import { HttpService } from 'app/core/services/http.service';
import { PermissionService } from 'app/core/services/permission.service';
describe('RolesComponent permission editor', () => {
  let component: RolesComponent;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      { provide: HttpService, useValue: {} },
      { provide: AuthService, useValue: { getUserData: () => '{"_id":"self"}' } },
      { provide: MatDialog, useValue: { open: jasmine.createSpy('open') } },
      { provide: DialogService, useValue: { confirmDialog: () => of({ discard: true }) } },
      { provide: PermissionService, useValue: { can: (key: string) => key === 'zoho_sync.view', canAll: () => false } },
    ] });
    component = TestBed.runInInjectionContext(() => new RolesComponent());
    component.permissions = ['zoho_sync.view', 'zoho_sync.manage', 'zoho_invoice.manage', 'integration_credential.manage', 'products.view']
      .map(key => ({ _id: key, module: key.split('.')[0], action: key.split('.').slice(1).join('.') }));
  });
  it('finds all internal Zoho capabilities by their visible module name', () => {
    component.search = 'Zoho Books';
    expect(component.groups.length).toBe(1);
    expect(component.groups[0].items.length).toBe(4);
    component.search = 'accounting';
    expect(component.groups[0].items[0]._id).toBe('integration_credential.manage');
  });
  it('does not treat a cancelled shared confirmation as approval', async () => {
    expect(await component.confirmAction('Delete role', 'Confirm deletion', 'Delete')).toBeFalse();
  });
  it('hides access controls for self and protected accounts', () => {
    component.roles = [{ _id: 'owner', protected: true, permissions: [] } as any];
    expect(component.canManageStaff({ _id: 'self', admin_role_id: null })).toBeFalse();
    expect(component.canManageStaff({ _id: 'other', admin_role_id: 'owner' })).toBeFalse();
    expect(component.canManageStaff({ _id: 'other', admin_role_id: null })).toBeTrue();
  });
  it('paginates filtered roles in the shared pagination shape', () => {
    component.roles = Array.from({ length: 23 }, (_, i) => ({ name: 'Role ' + i, description: '' } as any));
    component.rolePage = 3;
    expect(component.visibleRoles.length).toBe(3);
    expect(component.rolePagination.totalPages).toBe(3);
    component.roleSearch = 'Role 22';
    component.rolePage = 1;
    expect(component.visibleRoles.length).toBe(1);
  });
  it('selects only permissions the current user can delegate', () => {
    component.selectAll();
    expect([...component.selected]).toEqual(['zoho_sync.view']);
    component.selected.clear();
    component.selectModule(component.permissions, true);
    expect([...component.selected]).toEqual(['zoho_sync.view']);
  });
});
