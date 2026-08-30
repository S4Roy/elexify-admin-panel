import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateRatingStatusComponent } from './update-rating-status.component';
import { sharedTestProviders, matDialogDataProvider, matDialogRefStub } from '../../../../../../testing/shared-test-providers';

describe('UpdateRatingStatusComponent', () => {
  let component: UpdateRatingStatusComponent;
  let fixture: ComponentFixture<UpdateRatingStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateRatingStatusComponent],
      providers: [...sharedTestProviders(), matDialogDataProvider(), matDialogRefStub()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateRatingStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
