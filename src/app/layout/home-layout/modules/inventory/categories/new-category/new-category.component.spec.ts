import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewCategoryComponent } from './new-category.component';
import { sharedTestProviders, activatedRouteStub } from '../../../../../../../testing/shared-test-providers';

describe('NewCategoryComponent', () => {
  let component: NewCategoryComponent;
  let fixture: ComponentFixture<NewCategoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewCategoryComponent],
      providers: [...sharedTestProviders(), activatedRouteStub()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewCategoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
