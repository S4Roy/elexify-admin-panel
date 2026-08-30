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

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
