import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpecificationsComponent } from './specifications.component';
import { sharedTestProviders, activatedRouteStub } from '../../../../../../testing/shared-test-providers';

describe('SpecificationsComponent', () => {
  let component: SpecificationsComponent;
  let fixture: ComponentFixture<SpecificationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpecificationsComponent],
      providers: [...sharedTestProviders(), activatedRouteStub()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(SpecificationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
