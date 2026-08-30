import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateEnquiryComponent } from './update-enquiry.component';
import { sharedTestProviders, matDialogDataProvider, matDialogRefStub } from '../../../../../../testing/shared-test-providers';

describe('UpdateEnquiryComponent', () => {
  let component: UpdateEnquiryComponent;
  let fixture: ComponentFixture<UpdateEnquiryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateEnquiryComponent],
      providers: [...sharedTestProviders(), matDialogDataProvider(), matDialogRefStub()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateEnquiryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
