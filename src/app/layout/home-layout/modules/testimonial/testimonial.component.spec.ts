import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestimonialComponent } from './testimonial.component';
import { sharedTestProviders, activatedRouteStub } from '../../../../../testing/shared-test-providers';

describe('TestimonialComponent', () => {
  let component: TestimonialComponent;
  let fixture: ComponentFixture<TestimonialComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestimonialComponent],
      providers: [...sharedTestProviders(), activatedRouteStub()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(TestimonialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
