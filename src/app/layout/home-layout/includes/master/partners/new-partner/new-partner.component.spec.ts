import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewPartnerComponent } from './new-partner.component';

describe('NewPartnerComponent', () => {
  let component: NewPartnerComponent;
  let fixture: ComponentFixture<NewPartnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewPartnerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewPartnerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
