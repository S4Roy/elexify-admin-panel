import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { StocksComponent } from './stocks.component';
import { InventoryService } from 'app/core/services/inventory.service';
import { PermissionService } from 'app/core/services/permission.service';
import { sharedTestProviders, activatedRouteStub, matDialogDataProvider, matDialogRefStub } from '../../../../../../../testing/shared-test-providers';

describe('StocksComponent', () => {
  let component: StocksComponent;
  let fixture: ComponentFixture<StocksComponent>;
  let inventory: jasmine.SpyObj<InventoryService>;

  const level = {
    product: 'p1', variation: null, sku: 'SKU-1',
    stock_quantity: 10, reserved_quantity: 3, available_quantity: 7,
    stock_status: 'in_stock', manage_stock: true, allow_backorders: false,
  };

  beforeEach(async () => {
    inventory = jasmine.createSpyObj<InventoryService>('InventoryService', ['stockLevels', 'stockTransactions', 'adjustStock']);
    inventory.stockLevels.and.returnValue(of({ data: { docs: [level] } }));
    inventory.stockTransactions.and.returnValue(of({ data: { docs: [] } }));
    inventory.adjustStock.and.returnValue(of({ message: 'ok' }));

    await TestBed.configureTestingModule({
      imports: [StocksComponent],
      providers: [
        ...sharedTestProviders(), activatedRouteStub(), matDialogDataProvider({ _id: 'p1', name: 'Widget' }), matDialogRefStub(),
        { provide: InventoryService, useValue: inventory },
        { provide: PermissionService, useValue: { can: () => true } },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(StocksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads levels for the product', () => {
    expect(component.levels.length).toBe(1);
    expect(inventory.stockLevels.calls.mostRecent().args[0].get('product')).toBe('p1');
  });

  it('sends a negative delta with the on-hand it was based on when removing units', () => {
    component.openAdjust(level);
    component.formGroup.patchValue({ mode: 'remove', quantity: 2, reason: 'damage' });
    expect(component.previewOnHand).toBe(8);
    component.onSubmit();
    expect(inventory.adjustStock).toHaveBeenCalledWith(jasmine.objectContaining({
      product: 'p1', mode: 'delta', quantity: -2, reason: 'damage', expected_on_hand: 10,
    }));
  });

  it('sends a counted set and blocks going below reserved', () => {
    component.openAdjust(level);
    component.formGroup.patchValue({ mode: 'set', quantity: 2, reason: 'count_correction' });
    expect(component.belowReserved).toBeTrue();
    component.onSubmit();
    expect(inventory.adjustStock).not.toHaveBeenCalled();

    component.formGroup.patchValue({ quantity: 5 });
    component.onSubmit();
    expect(inventory.adjustStock).toHaveBeenCalledWith(jasmine.objectContaining({ mode: 'set', quantity: 5 }));
  });

  it('reloads levels when the server reports a stale on-hand (409)', () => {
    inventory.adjustStock.and.returnValue(throwError(() => ({ status: 409 })));
    component.openAdjust(level);
    component.formGroup.patchValue({ mode: 'add', quantity: 1, reason: 'received' });
    const before = inventory.stockLevels.calls.count();
    component.onSubmit();
    expect(inventory.stockLevels.calls.count()).toBe(before + 1);
    expect(component.formGroup.enabled).toBeTrue();
  });
});
