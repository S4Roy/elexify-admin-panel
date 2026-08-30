import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PickOrderComponent } from './pick-order.component';
import { sharedTestProviders, activatedRouteStub } from '../../../../../../../testing/shared-test-providers';

describe('PickOrderComponent', () => {
  let component: PickOrderComponent;
  let fixture: ComponentFixture<PickOrderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PickOrderComponent],
      providers: [...sharedTestProviders(), activatedRouteStub()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(PickOrderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
