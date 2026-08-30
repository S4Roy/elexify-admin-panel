import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RatingReveiwsComponent } from './rating-reveiws.component';
import { sharedTestProviders, activatedRouteStub } from '../../../../../testing/shared-test-providers';

describe('RatingReveiwsComponent', () => {
  let component: RatingReveiwsComponent;
  let fixture: ComponentFixture<RatingReveiwsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RatingReveiwsComponent],
      providers: [...sharedTestProviders(), activatedRouteStub()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(RatingReveiwsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
