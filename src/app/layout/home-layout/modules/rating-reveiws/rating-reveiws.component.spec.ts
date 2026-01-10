import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RatingReveiwsComponent } from './rating-reveiws.component';

describe('RatingReveiwsComponent', () => {
  let component: RatingReveiwsComponent;
  let fixture: ComponentFixture<RatingReveiwsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RatingReveiwsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RatingReveiwsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
