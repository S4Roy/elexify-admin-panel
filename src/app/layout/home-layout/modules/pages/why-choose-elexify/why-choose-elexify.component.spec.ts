import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WhyChooseElexifyComponent } from './why-choose-elexify.component';

describe('WhyChooseElexifyComponent', () => {
  let component: WhyChooseElexifyComponent;
  let fixture: ComponentFixture<WhyChooseElexifyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WhyChooseElexifyComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WhyChooseElexifyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
