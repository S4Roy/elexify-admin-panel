import { NgFor, NgIf } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  SimpleChanges,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgSelectModule } from '@ng-select/ng-select';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';

import * as Global from 'app/global';
import { InventoryService } from 'app/core/services/inventory.service';
import { MatDialog } from '@angular/material/dialog';
import { MediaComponent } from 'app/layout/home-layout/modules/settings/media/media.component';
import { ToastrService } from 'ngx-toastr';
import { AmountNumberDirective } from 'app/core/directives/amount-number.directive';
import { MinMaxDirective } from 'app/core/directives/maximum-length.directive';
import { MatSliderModule } from '@angular/material/slider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { UpdateAllVariationsComponent } from './update-all-variations/update-all-variations.component';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

@Component({
  selector: 'app-product-variations',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NgSelectModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    NgFor,
    NgIf, // ✅ Added
    MatTooltipModule,
    MatButtonModule,
    MatExpansionModule,
    MatDividerModule,
    MatSelectModule,
    AmountNumberDirective,
    MatSliderModule,
    MatCheckboxModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-variations.component.html',
  styleUrls: ['./product-variations.component.scss'], // ✅ Fixed plural
})
export class ProductVariationsComponent implements OnInit {
  @Input() data!: any;
  @Input() formGroup!: FormGroup;
  @Output() variationsChange = new EventEmitter<any>();

  Global = Global;
  shipping_classes: any[] = [];
  attribute_values: any[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private inventoryService: InventoryService,
    private dialog: MatDialog,
    private toastr: ToastrService,
    private cd: ChangeDetectorRef
  ) {}

  get variations(): FormArray {
    return this.formGroup.get('variations') as FormArray;
  }

  ngOnInit() {
    // Populate from existing data
    if (this.data?.variations?.length && !this.variations.length) {
      console.log('Loading existing variations...');

      this.loadExistingVariations();
    }

    // Auto-generate when attributes change
    this.formGroup
      .get('attributes')
      ?.valueChanges.pipe(
        debounceTime(200),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.generateVariations());
  }

  // Add imports if not present:
  // import { NgZone } from '@angular/core';
  // ensure constructor includes private ngZone: NgZone, private cd: ChangeDetectorRef

  loadExistingVariations() {
    if (!Array.isArray(this.data?.variations) || !this.data.variations.length) {
      return;
    }

    // 1) Prepare a dedupe map for attribute_values (string id => value object)
    const attributeValueMap = new Map<string, any>();
    const newVariationGroups: any[] = []; // temporary storage for FormGroups

    // 2) Build all form groups locally (no FormArray mutation yet)
    const vars = this.data.variations;
    for (let i = 0; i < vars.length; i++) {
      const attr = vars[i];

      // Build attributes FormArray content for this variation
      const attrControls = [];
      if (Array.isArray(attr.attributes)) {
        for (let j = 0; j < attr.attributes.length; j++) {
          const item = attr.attributes[j];
          const attribute_id = item.attribute?._id ?? null;
          const value_id = item.value?._id ?? null;
          const attribute_name = item.attribute?.name ?? '';
          const value_name = item.value?.name ?? '';
          const visible_in_list = !!item.visible_in_list;

          // keep a deduped map of attribute values for the global dropdown
          if (value_id && !attributeValueMap.has(String(value_id))) {
            attributeValueMap.set(String(value_id), {
              _id: value_id,
              name: value_name || value_id,
              visible_in_list: !!item.value?.visible_in_list,
            });
          }

          // create the attribute FormGroup shape (but not yet fb.group)
          attrControls.push(
            this.fb.group({
              attribute_id: [attribute_id],
              value_id: [value_id],
              attribute_name: [attribute_name],
              value_name: [value_name],
              visible_in_list: [visible_in_list],
            })
          );
        }
      }

      // Build images FormArray content for this variation
      const imageControls = [];
      if (Array.isArray(attr.images) && attr.images.length) {
        for (let k = 0; k < attr.images.length; k++) {
          const img = attr.images[k] || {};
          imageControls.push(this.fb.group({ ...img }));
        }
      }

      // Build the variation form group (fully prepared)
      const variationGroup = this.fb.group({
        attributes: this.fb.array(attrControls),
        images: this.fb.array(imageControls),
        _id: [attr._id || ''],
        variant_name: [attr.variant_name || ''],
        visible_in_list: [attr.visible_in_list ?? false],
        weight: [attr.weight ?? null],
        length: [attr.length ?? null],
        width: [attr.width ?? null],
        height: [attr.height ?? null],
        shipping_class: [attr.shipping_class ?? null],
        power_level: [attr.power_level ?? 0],
        rarity: [attr?.rarity ?? null],
        ask_for_price: [attr?.ask_for_price ?? false],
        enable_enquiry: [attr?.enable_enquiry ?? false],
        regular_price: [
          attr?.regular_price ?? null,
          [Validators.required, Validators.min(0)],
        ],
        sale_price: [attr?.sale_price ?? null, [Validators.min(0)]],
        sale_start_date: [attr.sale_start_date ?? null],
        sale_end_date: [attr.sale_end_date ?? null],
        sku: [
          attr.sku ?? null,
          [Validators.required, Validators.pattern(/^[a-zA-Z0-9_-]+$/)],
        ],
        stock_status: [attr?.stock_status ?? 'in_stock', [Validators.required]],
        stock_quantity: [attr?.stock_quantity ?? null, [Validators.min(0)]],
      });

      newVariationGroups.push(variationGroup);
    }

    // 3) Replace the FormArray atomically
    // Clear existing only once and push all new groups
    this.variations.clear();
    for (let g = 0; g < newVariationGroups.length; g++) {
      this.variations.push(newVariationGroups[g]);
    }

    // 4) Replace attribute_values with deduped list once
    // keep insertion order from map
    this.attribute_values.length = 0;
    attributeValueMap.forEach((val) => this.attribute_values.push(val));

    // 5) Notify parent / UI once
    this.variationsChange.emit(this.formGroup);
    this.cd.markForCheck();
  }

  generateVariations(): void {
    const attributes = this.formGroup.value.attributes || [];

    // ✅ Clear old variations before generating
    this.variations.clear();

    if (!attributes.length) return;

    const attributeIds = attributes.map((attr: any) => attr.attribute);
    this.fetchAttributeValues(attributeIds.join(','));
  }

  generateCombinations(attributes: any[]): any[] {
    const combinations: any[] = [];
    const helper = (index: number, current: any[], nameParts: string[]) => {
      if (index === attributes.length) {
        combinations.push({
          attributes: [...current],
          variant_name: nameParts.join(' / '),
        });
        return;
      }
      const attr = attributes[index];
      const values = attr.values || [];
      for (const val of values) {
        const valueId = typeof val === 'object' ? val._id : val;
        const valueName =
          typeof val === 'object' ? val.name || val.label || val._id : val;
        helper(
          index + 1,
          [
            ...current,
            {
              attribute_id: attr.attribute,
              value_id: valueId,
              visible_in_list: val.visible_in_list ? true : false,
            },
          ],
          [...nameParts, `${attr.attribute_name}: ${valueName}`]
        );
      }
    };
    helper(0, [], []);
    return combinations;
  }

  setVariationsForm(combinations: any[]): void {
    this.variations.clear(); // ✅ Ensure no duplicates
    console.log(combinations);

    combinations.forEach((combo, index) => {
      const attributesArray = this.fb.array(
        combo.attributes.map((attr: any) =>
          this.fb.group({
            attribute_id: [attr.attribute_id || null],
            value_id: [attr.value_id || null],
            attribute_name: [attr.attribute_name || ''],
            value_name: [attr.value_name || ''],
          })
        )
      );
      const sku = this.generateSKU(combo.variant_name, index);
      const visible_in_list = combo.attributes.every(
        (item: any) => item.visible_in_list === true
      );

      this.variations.push(
        this.fb.group({
          attributes: attributesArray,
          images: this.fb.array([]),
          variant_name: [combo.variant_name || ''],
          weight: [null],
          length: [null],
          width: [null],
          height: [null],
          shipping_class: [null],
          power_level: [0],
          rarity: [null],
          visible_in_list: [visible_in_list || false],
          regular_price: [null, [Validators.required, Validators.min(0)]],
          sale_price: [null, [Validators.min(0)]],
          sale_start_date: [null],
          sale_end_date: [null],
          sku: [
            sku,
            [Validators.required, Validators.pattern(/^[a-zA-Z0-9_-]+$/)],
          ],
          stock_status: ['in_stock', [Validators.required]],
          stock_quantity: [null, [Validators.min(0), Validators.required]],
          ask_for_price: [this.data?.ask_for_price ?? false],
          enable_enquiry: [this.data?.enable_enquiry ?? false],
        })
      );
    });

    this.variationsChange.emit(this.formGroup);
  }

  generateSKU(variantName: string, index: number): string {
    const slug = variantName
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);
    return `SKU-${slug}-V${(index + 1).toString().padStart(2, '0')}`;
  }

  getVariationAttributes(index: number): FormArray {
    return this.variations.at(index).get('attributes') as FormArray;
  }

  fetchAttributeValues(attributeId: string): void {
    if (!attributeId) return;
    this.inventoryService
      .attributeValueList(
        new URLSearchParams({ limit: '1000', attribute: attributeId })
      )
      .subscribe({
        next: (res: any) => {
          this.attribute_values = res?.data?.docs || [];
          const attributes = this.formGroup.value.attributes || [];

          const fixedAttributes = attributes.map((attr: any) => {
            // Normalize attr.values to an array of string ids
            const attrValueIds: string[] = Array.isArray(attr.values)
              ? attr.values.map((id: any) => String(id))
              : [];

            const values = this.attribute_values.filter((value: any) => {
              // Compare attribute_id and attribute (both normalized to string)
              const valueAttrId = String(value.attribute_id);
              const attrId = String(attr.attribute);
              const valueId = String(value._id);

              return valueAttrId === attrId && attrValueIds.includes(valueId);
            });

            // Map to expected shape
            attr.values = values.map((value: any) => ({
              _id: value._id,
              name: value.name || value.label || value._id,
              visible_in_list: !!value.visible_in_list,
            }));

            return attr;
          });
          const combinations = this.generateCombinations(fixedAttributes);
          this.setVariationsForm(combinations);
        },
        error: (err) => console.error('Error fetching attribute values:', err),
      });
  }

  getImages(index: number): FormArray {
    const arr = this.variations;
    if (!arr || index < 0 || index >= arr.length) {
      // return an empty FormArray to avoid undefined access in template
      return this.fb.array([]);
    }
    const fa = arr.at(index).get('images') as FormArray | null;
    return (fa as FormArray) || this.fb.array([]);
  }

  chooseFile(index: number) {
    this.dialog
      .open(MediaComponent, {
        disableClose: true,
        width: '80%',
        height: '80%',
        data: {
          ref_type: 'products',
          multiple: true,
          selectedFiles: this.getImages(index).value,
        },
      })
      .afterClosed()
      .subscribe((res: any) => {
        if (res) {
          this.getImages(index).clear();
          res.forEach((file: any) => {
            this.getImages(index).push(this.fb.group(file));
          });
          this.emitChanges();
        }
      });
  }
  removeVariation(index: number) {
    const variation = this.variations.at(index).value;
    if (variation?._id) {
      this.inventoryService
        .deleteProductVariation({ _id: variation._id })
        .subscribe({
          next: (res: any) => {
            this.toastr.success(res?.body?.message);
            this.variations.removeAt(index);
            this.emitChanges();
          },
          error: (err: any) => {},
        });
    } else {
      this.variations.removeAt(index);
      this.emitChanges();
    }
  }

  removeImage(index: number, imageIndex: number) {
    const images = this.getImages(index);
    if (imageIndex >= 0 && imageIndex < images.length) {
      images.removeAt(imageIndex);
      images.updateValueAndValidity();
    }
    this.emitChanges();
  }
  emitChanges() {
    this.formGroup.markAllAsTouched();
    this.variationsChange.emit(this.formGroup);
    this.cd.markForCheck();
  }
  deleteItem(_id: any) {
    this.inventoryService.deleteProductVariation({ _id: _id }).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.body?.message);
      },
      error: (err: any) => {},
    });
  }
  updateAll() {
    this.dialog
      .open(UpdateAllVariationsComponent, {
        disableClose: true,
        data: {
          variationsFormArray: this.variations,
        },
      })
      .afterClosed()
      .subscribe((res: any) => {
        if (res) {
          console.log('Updated Variations Data from Dialog:', res);
          this.variations.value.forEach((variation: any, index: number) => {
            const variationGroup = this.variations.at(index);
            if (res.regular_price !== '') {
              variationGroup.get('regular_price')?.setValue(res.regular_price);
            }
            if (res.sale_price !== '') {
              variationGroup.get('sale_price')?.setValue(res.sale_price);
            }
            // if (res.sku !== '') {
            //   variationGroup.get('sku')?.setValue(res.sku);
            // }
            if (res.stock_quantity !== '') {
              variationGroup
                .get('stock_quantity')
                ?.setValue(res.stock_quantity);
            }
            if (res.weight !== '') {
              variationGroup.get('weight')?.setValue(res.weight);
            }
          });
          this.emitChanges();
        }
      });
  }
  trackByIndex(index: number, item: AbstractControl) {
    // prefer a stable id if you have one: item.value._id
    return (item && (item.value as any)?._id) || index;
  }
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
