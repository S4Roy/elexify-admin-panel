import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RouterCardComponent } from './router-card.component';
import { sharedTestProviders, activatedRouteStub } from '../../../../../testing/shared-test-providers';

describe('RouterCardComponent', () => {
  let component: RouterCardComponent;
  let fixture: ComponentFixture<RouterCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterCardComponent],
      providers: [...sharedTestProviders(), activatedRouteStub()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(RouterCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
