import { NgIf } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ToastrService } from 'ngx-toastr';
import * as Global from 'app/global';
import { InventoryService } from 'app/core/services/inventory.service';
import { NgSelectModule } from '@ng-select/ng-select';
import moment from 'moment';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AmountNumberDirective } from 'app/core/directives/amount-number.directive';
import { NumbersOnlyDirective } from 'app/core/directives/numbers-only.directive';

@Component({
  selector: 'app-new-coupon',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    NgIf,
    NgSelectModule,
    MatCheckboxModule,
    AmountNumberDirective,
    NumbersOnlyDirective,
  ],
  templateUrl: './new-coupon.component.html',
  styleUrl: './new-coupon.component.scss',
})
export class NewCouponComponent implements OnInit {
  Global = Global;
  formGroup!: FormGroup;

  // dropdown data
  products: any = [];
  categories: any = [];
  brands: any = [];
  variations: any = [];

  constructor(
    private fb: FormBuilder,
    private inventoryService: InventoryService,
    private toastr: ToastrService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<NewCouponComponent>
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadDropdowns();
  }

  initForm() {
    this.formGroup = this.fb.group({
      /* BASIC */
      code: [this.data?.code ?? null, Validators.required],
      title: [this.data?.title ?? null, Validators.required],
      description: [this.data?.description ?? null],

      /* DISCOUNT */
      discount_type: [
        this.data?.discount_type ?? 'percentage',
        Validators.required,
      ],
      discount_value: [this.data?.discount_value ?? null, Validators.required],
      max_discount_amount: [this.data?.max_discount_amount ?? null],
      min_cart_value: [this.data?.min_cart_value ?? 0],

      /* USER TYPE */
      applicable_for: [
        this.data?.applicable_for ?? 'both',
        Validators.required,
      ],

      /* SCOPE */
      applicable_scope: [this.data?.applicable_scope ?? 'all'],
      usage_limit: [this.data?.usage_limit ?? null],
      usage_per_email: [this.data?.usage_per_email ?? 1],
      single_use_per_order: [this.data?.single_use_per_order ?? true],

      /* TARGETS (conditional) */
      applicable_products: [null],
      applicable_categories: [null],
      applicable_brands: [null],
      applicable_variations: [null],

      /* DATES */
      start_date: [
        this.data?.start_date
          ? moment(this.data.start_date).format('YYYY-MM-DD')
          : null,
        Validators.required,
      ],
      end_date: [
        this.data?.end_date
          ? moment(this.data.end_date).format('YYYY-MM-DD')
          : null,
        Validators.required,
      ],

      /* EXCLUSIONS */
      exclude_sale_items: [this.data?.exclude_sale_items ?? false],
      exclude_ask_for_price: [this.data?.exclude_ask_for_price ?? true],
      exclude_enquiry_products: [this.data?.exclude_enquiry_products ?? true],

      /* STATUS */
      status: [this.data?.status ?? 'active', Validators.required],
    });
    if (this.data) {
      // patch targets
      switch (this.data.applicable_scope) {
        case 'product':
          this.formGroup
            .get('applicable_products')
            ?.setValue(
              this.data.applicable_products.map((res: any) => res?._id) ?? []
            );
          break;

        case 'category':
          this.formGroup
            .get('applicable_categories')
            ?.setValue(
              this.data.applicable_categories.map((res: any) => res?._id) ?? []
            );
          break;

        case 'brand':
          this.formGroup
            .get('applicable_brands')
            ?.setValue(
              this.data.applicable_brands.map((res: any) => res?._id) ?? []
            );
          break;

        case 'variation':
          this.formGroup
            .get('applicable_variations')
            ?.setValue(
              this.data.applicable_variations.map((res: any) => res?._id) ?? []
            );
          break;
      }
    }
  }

  loadDropdowns() {
    // keep these lightweight (name + _id only)
    this.inventoryService
      .productList(new URLSearchParams({ all: 'true' }))
      .subscribe((res: any) => (this.products = res?.data ?? []));
    this.inventoryService
      .categoryList(new URLSearchParams({ all: 'true' }))
      .subscribe((res: any) => (this.categories = res?.data ?? []));
    this.inventoryService
      .brandList(new URLSearchParams({ all: 'true' }))
      .subscribe((res: any) => (this.brands = res?.data ?? []));
  }

  onSubmit() {
    this.formGroup.markAllAsTouched();
    if (!this.formGroup.valid) return;

    this.formGroup.disable();
    const payload: any = { ...this.formGroup.getRawValue() };

    /* FIX percentage logic */
    if (payload.discount_type !== 'percentage') {
      delete payload.max_discount_amount;
    } else if (payload.max_discount_amount === '') {
      payload.max_discount_amount = null;
    }

    /* CLEAN + NORMALIZE scope targets */
    switch (payload.applicable_scope) {
      case 'product':
        payload.applicable_products = Array.isArray(payload.applicable_products)
          ? payload.applicable_products
          : payload.applicable_products
          ? [payload.applicable_products]
          : [];
        delete payload.applicable_categories;
        delete payload.applicable_brands;
        delete payload.applicable_variations;
        break;

      case 'category':
        payload.applicable_categories = Array.isArray(
          payload.applicable_categories
        )
          ? payload.applicable_categories
          : payload.applicable_categories
          ? [payload.applicable_categories]
          : [];
        delete payload.applicable_products;
        delete payload.applicable_brands;
        delete payload.applicable_variations;
        break;

      case 'brand':
        payload.applicable_brands = Array.isArray(payload.applicable_brands)
          ? payload.applicable_brands
          : payload.applicable_brands
          ? [payload.applicable_brands]
          : [];
        delete payload.applicable_products;
        delete payload.applicable_categories;
        delete payload.applicable_variations;
        break;

      case 'variation':
        payload.applicable_variations = Array.isArray(
          payload.applicable_variations
        )
          ? payload.applicable_variations
          : payload.applicable_variations
          ? [payload.applicable_variations]
          : [];
        delete payload.applicable_products;
        delete payload.applicable_categories;
        delete payload.applicable_brands;
        break;

      default:
        delete payload.applicable_products;
        delete payload.applicable_categories;
        delete payload.applicable_brands;
        delete payload.applicable_variations;
    }

    /* FIX dates */
    payload.start_date = moment(payload.start_date)
      .startOf('day')
      .toISOString();
    payload.end_date = moment(payload.end_date).startOf('day').toISOString();

    if (this.data?._id) payload._id = this.data._id;

    this.inventoryService.submitCoupon(payload).subscribe({
      next: (res: any) => {
        this.toastr.success(res.message);
        this.dialogRef.close(res);
      },
      error: () => this.formGroup.enable(),
    });
  }
}
