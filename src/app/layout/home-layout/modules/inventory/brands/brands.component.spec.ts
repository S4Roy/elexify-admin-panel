import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrandsComponent } from './brands.component';
import { sharedTestProviders, activatedRouteStub } from '../../../../../../testing/shared-test-providers';

describe('BrandsComponent', () => {
  let component: BrandsComponent;
  let fixture: ComponentFixture<BrandsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandsComponent],
      providers: [...sharedTestProviders(), activatedRouteStub()],
    }).compileComponents();

    fixture = TestBed.createComponent(BrandsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
