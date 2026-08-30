import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray, FormGroup } from '@angular/forms';

import { ProductSpecificationsComponent } from './product-specifications.component';
import { sharedTestProviders } from '../../../../../../../../testing/shared-test-providers';

describe('ProductSpecificationsComponent', () => {
  let component: ProductSpecificationsComponent;
  let fixture: ComponentFixture<ProductSpecificationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductSpecificationsComponent],
      providers: [...sharedTestProviders()],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductSpecificationsComponent);
    component = fixture.componentInstance;
    // formGroup is a required @Input (template binds [formGroup] unconditionally),
    // so it must be set before the first detectChanges() or the reactive-forms
    // directive throws NG01052. Unlike its sibling ProductAttributesComponent,
    // this component does not add the 'specifications' FormArray itself - it
    // expects the caller to have already added it, exactly as the real parent
    // (new-product.component.ts) does. Mirror that here rather than fixing it
    // in this component, since changing production behavior is out of scope.
    fixture.componentRef.setInput(
      'formGroup',
      new FormGroup({ specifications: new FormArray([]) })
    );
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
