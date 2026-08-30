import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewTestimonialComponent } from './new-testimonial.component';
import { sharedTestProviders, matDialogDataProvider, matDialogRefStub } from '../../../../../../testing/shared-test-providers';

describe('NewTestimonialComponent', () => {
  let component: NewTestimonialComponent;
  let fixture: ComponentFixture<NewTestimonialComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewTestimonialComponent],
      providers: [...sharedTestProviders(), matDialogDataProvider(), matDialogRefStub()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewTestimonialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
