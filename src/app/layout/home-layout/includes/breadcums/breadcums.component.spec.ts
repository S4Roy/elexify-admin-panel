import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BreadcumsComponent } from './breadcums.component';
import { sharedTestProviders } from '../../../../../testing/shared-test-providers';

describe('BreadcumsComponent', () => {
  let component: BreadcumsComponent;
  let fixture: ComponentFixture<BreadcumsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BreadcumsComponent],
      providers: [...sharedTestProviders()],
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
