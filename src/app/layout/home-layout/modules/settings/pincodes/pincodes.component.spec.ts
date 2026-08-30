import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PincodesComponent } from './pincodes.component';
import { sharedTestProviders, activatedRouteStub } from '../../../../../../testing/shared-test-providers';

describe('PincodesComponent', () => {
  let component: PincodesComponent;
  let fixture: ComponentFixture<PincodesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PincodesComponent],
      providers: [...sharedTestProviders(), activatedRouteStub()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(PincodesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
