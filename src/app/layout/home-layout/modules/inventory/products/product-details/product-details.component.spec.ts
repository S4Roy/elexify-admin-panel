import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductDetailsComponent } from './product-details.component';
import { sharedTestProviders, activatedRouteStub } from '../../../../../../../testing/shared-test-providers';

describe('ProductDetailsComponent', () => {
  let component: ProductDetailsComponent;
  let fixture: ComponentFixture<ProductDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductDetailsComponent],
      providers: [...sharedTestProviders(), activatedRouteStub()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows a not-found state when the resolver could not load the product', () => {
    expect(component.product).toBeNull();
    expect(fixture.nativeElement.textContent).toContain("couldn't be loaded");
  });

  it('sums stock across variants and flags sold-out ones', () => {
    component.product = {
      type: 'variable',
      variations: [
        { stock_quantity: 30, reserved_quantity: 4 },
        { stock_quantity: 0 },
      ],
    };
    expect(component.stockSummary).toEqual(jasmine.objectContaining({
      status: 'low_stock', onHand: 30, reserved: 4, available: 26, outCount: 1, skuCount: 2,
    }));
  });

  it('prices simple products with their discount and variable ones as a range', () => {
    expect(component.discountOf({ regular_price: 200, sale_price: 150 })).toBe(25);
    expect(component.sellingPrice({ regular_price: 200, sale_price: 0 })).toBe(200);
    component.product = { type: 'variable', variations: [{ regular_price: 900 }, { regular_price: 500, sale_price: 450 }] };
    expect(component.priceRange).toEqual({ min: 450, max: 900 });
  });
});
