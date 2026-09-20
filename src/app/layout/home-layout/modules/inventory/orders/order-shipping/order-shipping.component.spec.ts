import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderShippingComponent } from './order-shipping.component';
import { sharedTestProviders, activatedRouteStub } from '../../../../../../../testing/shared-test-providers';

describe('OrderShippingComponent', () => {
  let component: OrderShippingComponent;
  let fixture: ComponentFixture<OrderShippingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderShippingComponent],
      providers: [...sharedTestProviders(), activatedRouteStub()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrderShippingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('recalculates weight as package contents and quantities change', () => {
    component.order = { order_items: [{ _id: 'a', weight: 2 }, { _id: 'b', weight: 0.5 }] };
    const lines = [{ order_item_id: 'a', quantity: 3 }, { order_item_id: 'b', quantity: 4 }];
    expect(component.packageWeight(lines)).toBe(8);
    lines[0].quantity = 1;
    expect(component.packageWeight(lines)).toBe(4);
    lines.pop();
    expect(component.packageWeight(lines)).toBe(2);
    expect(component.packageWeight([])).toBe(0);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
