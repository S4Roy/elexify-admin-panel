import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewCouponComponent } from './new-coupon.component';
import { sharedTestProviders, matDialogDataProvider, matDialogRefStub } from '../../../../../../../testing/shared-test-providers';

describe('NewCouponComponent', () => {
  let component: NewCouponComponent;
  let fixture: ComponentFixture<NewCouponComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewCouponComponent],
      providers: [...sharedTestProviders(), matDialogDataProvider(), matDialogRefStub()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewCouponComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
