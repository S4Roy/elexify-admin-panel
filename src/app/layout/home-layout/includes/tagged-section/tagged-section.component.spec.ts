import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaggedSectionComponent } from './tagged-section.component';

describe('TaggedSectionComponent', () => {
  let component: TaggedSectionComponent;
  let fixture: ComponentFixture<TaggedSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaggedSectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TaggedSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
