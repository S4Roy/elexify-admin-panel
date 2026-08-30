import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';

import { ProductAttributesComponent } from './product-attributes.component';
import { sharedTestProviders } from '../../../../../../../../testing/shared-test-providers';

describe('ProductAttributesComponent', () => {
  let component: ProductAttributesComponent;
  let fixture: ComponentFixture<ProductAttributesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductAttributesComponent],
      providers: [...sharedTestProviders()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductAttributesComponent);
    component = fixture.componentInstance;
    // formGroup is a required @Input (template binds [formGroup] unconditionally),
    // so it must be set before the first detectChanges() or the reactive-forms
    // directive throws NG01052. Use setInput (not direct property assignment)
    // so Angular actually runs ngOnChanges, which is what adds the
    // 'attributes' FormArray the template's formArrayName then binds to.
    fixture.componentRef.setInput('formGroup', new FormGroup({}));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
