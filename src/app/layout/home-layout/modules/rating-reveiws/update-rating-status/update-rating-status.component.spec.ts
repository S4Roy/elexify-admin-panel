import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateRatingStatusComponent } from './update-rating-status.component';

describe('UpdateRatingStatusComponent', () => {
  let component: UpdateRatingStatusComponent;
  let fixture: ComponentFixture<UpdateRatingStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateRatingStatusComponent]
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
