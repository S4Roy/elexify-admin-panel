import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewSpecificationComponent } from './new-specification.component';

describe('NewSpecificationComponent', () => {
  let component: NewSpecificationComponent;
  let fixture: ComponentFixture<NewSpecificationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewSpecificationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewSpecificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
