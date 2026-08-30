import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnquiriesComponent } from './enquiries.component';
import { sharedTestProviders, activatedRouteStub } from '../../../../../testing/shared-test-providers';

describe('EnquiriesComponent', () => {
  let component: EnquiriesComponent;
  let fixture: ComponentFixture<EnquiriesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnquiriesComponent],
      providers: [...sharedTestProviders(), activatedRouteStub()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(EnquiriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
