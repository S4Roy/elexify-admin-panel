import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewSpecificationComponent } from './new-specification.component';
import { sharedTestProviders, activatedRouteStub, matDialogDataProvider, matDialogRefStub } from '../../../../../../../testing/shared-test-providers';

describe('NewSpecificationComponent', () => {
  let component: NewSpecificationComponent;
  let fixture: ComponentFixture<NewSpecificationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewSpecificationComponent],
      providers: [...sharedTestProviders(), activatedRouteStub(), matDialogDataProvider(), matDialogRefStub()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewSpecificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
