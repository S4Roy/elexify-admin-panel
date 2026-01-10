import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubscriberUpdateComponent } from './subscriber-update.component';

describe('SubscriberUpdateComponent', () => {
  let component: SubscriberUpdateComponent;
  let fixture: ComponentFixture<SubscriberUpdateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubscriberUpdateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubscriberUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
