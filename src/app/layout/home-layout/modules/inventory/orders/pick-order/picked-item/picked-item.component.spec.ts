import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PickedItemComponent } from './picked-item.component';

describe('PickedItemComponent', () => {
  let component: PickedItemComponent;
  let fixture: ComponentFixture<PickedItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PickedItemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PickedItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
