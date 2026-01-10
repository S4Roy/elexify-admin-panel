import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BreadcumsComponent } from './breadcums.component';

describe('BreadcumsComponent', () => {
  let component: BreadcumsComponent;
  let fixture: ComponentFixture<BreadcumsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BreadcumsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BreadcumsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
