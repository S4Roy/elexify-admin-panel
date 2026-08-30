import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray, FormGroup } from '@angular/forms';

import { ProductVariationsComponent } from './product-variations.component';
import { sharedTestProviders } from '../../../../../../../../testing/shared-test-providers';

describe('ProductVariationsComponent', () => {
  let component: ProductVariationsComponent;
  let fixture: ComponentFixture<ProductVariationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductVariationsComponent],
      providers: [...sharedTestProviders()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductVariationsComponent);
    component = fixture.componentInstance;
    // formGroup is a required @Input read in ngOnInit (both the 'variations'
    // and 'attributes' controls), so it must be set - with both controls
    // already present, exactly as the real parent (new-product.component.ts)
    // constructs it - before the first detectChanges().
    fixture.componentRef.setInput(
      'formGroup',
      new FormGroup({ variations: new FormArray([]), attributes: new FormArray([]) })
    );
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
