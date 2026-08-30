import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewBrandComponent } from './new-brand.component';
import { sharedTestProviders, activatedRouteStub, matDialogDataProvider, matDialogRefStub } from '../../../../../../../testing/shared-test-providers';

describe('NewBrandComponent', () => {
  let component: NewBrandComponent;
  let fixture: ComponentFixture<NewBrandComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewBrandComponent],
      providers: [...sharedTestProviders(), activatedRouteStub(), matDialogDataProvider(), matDialogRefStub()],
    }).compileComponents();

    fixture = TestBed.createComponent(NewBrandComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
