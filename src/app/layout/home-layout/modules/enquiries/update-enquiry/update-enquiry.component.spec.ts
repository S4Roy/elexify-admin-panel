import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateEnquiryComponent } from './update-enquiry.component';

describe('UpdateEnquiryComponent', () => {
  let component: UpdateEnquiryComponent;
  let fixture: ComponentFixture<UpdateEnquiryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateEnquiryComponent]
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
