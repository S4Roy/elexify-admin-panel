import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewClassificationComponent } from './new-classification.component';
import { sharedTestProviders, activatedRouteStub, matDialogDataProvider, matDialogRefStub } from '../../../../../../../testing/shared-test-providers';

describe('NewClassificationComponent', () => {
  let component: NewClassificationComponent;
  let fixture: ComponentFixture<NewClassificationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewClassificationComponent],
      providers: [...sharedTestProviders(), activatedRouteStub(), matDialogDataProvider(), matDialogRefStub()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewClassificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
