import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductsComponent } from './products.component';
import { sharedTestProviders, activatedRouteStub } from '../../../../../../testing/shared-test-providers';

describe('ProductsComponent', () => {
  let component: ProductsComponent;
  let fixture: ComponentFixture<ProductsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductsComponent],
      providers: [...sharedTestProviders(), activatedRouteStub()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('rolls variant stock up, reading a few sold-out variants as low', () => {
    component.siteThreshold = 5;
    const inv = component.inventoryOf({
      type: 'variable',
      variations: [
        { stock_quantity: 20, reserved_quantity: 2 },
        { stock_quantity: 0 },
        { manage_stock: false },
      ],
    });
    expect(inv).toEqual(jasmine.objectContaining({ status: 'low_stock', available: 18, reserved: 2, skus: 3, outCount: 1 }));
    expect(component.inventoryOf({ type: 'simple', stock_quantity: 3, reserved_quantity: 3 }).status).toBe('out_of_stock');
    expect(component.inventoryOf({ type: 'simple', stock_quantity: 3, low_stock_threshold: 2 }).status).toBe('in_stock');
    expect(component.inventoryOf({ type: 'simple', manage_stock: false }).status).toBe('untracked');
  });

  it('shows a price range for variants and the discount for one SKU', () => {
    expect(component.priceOf({ type: 'variable', variations: [{ regular_price: 500, sale_price: 400 }, { regular_price: 900 }] }))
      .toEqual(jasmine.objectContaining({ min: 400, max: 900, compareAt: null, anyOnSale: true }));
    expect(component.priceOf({ type: 'simple', regular_price: 1000, sale_price: 750 }))
      .toEqual(jasmine.objectContaining({ min: 750, max: 750, compareAt: 1000, discount: 25 }));
    expect(component.priceOf({ type: 'simple', regular_price: 0 }).min).toBeNull();
  });

  it('turns applied filters into removable chips', () => {
    component.categoryOptions = [{ value: 'cables', label: 'Cables' }];
    component.applyFilterValues({ ...component.filterValues, category: ['cables'], stock_status: 'low_stock', min_price: 100 });
    expect(component.activeFilters.map((f) => [f.key, f.value])).toEqual([
      ['category', 'Cables'], ['stock_status', 'Low Stock'], ['price', 'from ₹100'],
    ]);
    component.removeFilter('price');
    expect(component.filterOption.min_price).toBeNull();
    component.filterByStock('low_stock');
    expect(component.filterOption.stock_status).toBeNull();
    component.clearFilters();
    expect(component.activeFilters).toEqual([]);
  });
});
