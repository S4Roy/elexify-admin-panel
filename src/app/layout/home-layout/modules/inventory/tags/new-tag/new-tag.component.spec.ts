import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewTagComponent } from './new-tag.component';
import { sharedTestProviders, activatedRouteStub, matDialogDataProvider, matDialogRefStub } from '../../../../../../../testing/shared-test-providers';

describe('NewTagComponent', () => {
  let component: NewTagComponent;
  let fixture: ComponentFixture<NewTagComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewTagComponent],
      providers: [...sharedTestProviders(), activatedRouteStub(), matDialogDataProvider(), matDialogRefStub()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewTagComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
