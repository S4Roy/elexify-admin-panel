import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateAllVariationsComponent } from './update-all-variations.component';

describe('UpdateAllVariationsComponent', () => {
  let component: UpdateAllVariationsComponent;
  let fixture: ComponentFixture<UpdateAllVariationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateAllVariationsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateAllVariationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
