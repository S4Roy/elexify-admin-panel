import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewAttributeComponent } from './new-attribute.component';
import { sharedTestProviders, activatedRouteStub, matDialogDataProvider, matDialogRefStub } from '../../../../../../../testing/shared-test-providers';

describe('NewAttributeComponent', () => {
  let component: NewAttributeComponent;
  let fixture: ComponentFixture<NewAttributeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewAttributeComponent],
      providers: [...sharedTestProviders(), activatedRouteStub(), matDialogDataProvider(), matDialogRefStub()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewAttributeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
