import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewFaqComponent } from './new-faq.component';

describe('NewFaqComponent', () => {
  let component: NewFaqComponent;
  let fixture: ComponentFixture<NewFaqComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewFaqComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewFaqComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
