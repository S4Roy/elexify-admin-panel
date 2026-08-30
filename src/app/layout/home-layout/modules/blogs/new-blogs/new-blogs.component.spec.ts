import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewBlogsComponent } from './new-blogs.component';
import { sharedTestProviders, activatedRouteStub } from '../../../../../../testing/shared-test-providers';

describe('NewBlogsComponent', () => {
  let component: NewBlogsComponent;
  let fixture: ComponentFixture<NewBlogsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewBlogsComponent],
      providers: [...sharedTestProviders(), activatedRouteStub()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewBlogsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
