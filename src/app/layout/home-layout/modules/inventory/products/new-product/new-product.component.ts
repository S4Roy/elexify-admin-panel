import { NgFor, NgIf } from '@angular/common';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDragPlaceholder, CdkDropList } from '@angular/cdk/drag-drop';
import { Component, Inject, Optional } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  FormArray,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import * as Global from 'app/global';
import { MatSelectModule } from '@angular/material/select';
import { InventoryService } from 'app/core/services/inventory.service';
import FilterOptions from 'app/core/models/FilterOptions';
import PaginationOptions from 'app/core/models/PaginationOptions';
import { NgSelectModule } from '@ng-select/ng-select';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { Editor, NgxEditorModule } from 'ngx-editor';
import { MatButtonModule } from '@angular/material/button';
import { MediaComponent } from '../../../settings/media/media.component';
import { MatTabsModule } from '@angular/material/tabs';
import { ProductAttributesComponent } from './product-attributes/product-attributes.component';
import { ProductVariationsComponent } from './product-variations/product-variations.component';
import { AmountNumberDirective } from 'app/core/directives/amount-number.directive';
import { MatSliderModule } from '@angular/material/slider';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ProductSpecificationsComponent } from './product-specifications/product-specifications.component';
import { ProductSeoComponent } from './product-seo/product-seo.component';

@Component({
  selector: 'app-new-product',
  imports: [
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    CdkDragPlaceholder,
    ReactiveFormsModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    NgFor,
    MatTooltipModule,
    MatSelectModule,
    MatDialogModule,
    NgIf,
    NgSelectModule,
    NgxEditorModule,
    MatButtonModule,
    MatTabsModule,
    ProductAttributesComponent,
    ProductVariationsComponent,
    AmountNumberDirective,
    MatSliderModule,
    MatCheckboxModule,
    ProductSpecificationsComponent,
    ProductSeoComponent,
  ],
  templateUrl: './new-product.component.html',
  styleUrl: './new-product.component.scss',
})
export class NewProductComponent {
  Global = Global;
  formGroup!: FormGroup;
  shipping_classes: any = [];
  categories: any = [];
  sub_categories: any = [];
  brands: any = [];
  classification_list: any = [];
  tag_list: any = [];
  categoryPagination: PaginationOptions;
  subCategoryPagination: PaginationOptions;
  brandPagination: PaginationOptions;
  categoryFilter: FilterOptions;
  subCategoryFilter: FilterOptions;
  brandFilter: FilterOptions;
  categorySearchSubject = new Subject<any>();
  subCategorySearchSubject = new Subject<any>();
  brandsSearchSubject = new Subject<any>();

  tagSearchSubject = new Subject<any>();
  tagPagination: PaginationOptions;
  tagFilter: FilterOptions;

  classifcationSearchSubject = new Subject<any>();
  classifcationPagination: PaginationOptions;
  classifcationFilter: FilterOptions;

  shippingClassSearchSubject = new Subject<any>();
  shippingClassPagination: PaginationOptions;
  shippingClassFilter: FilterOptions;

  editor!: Editor;
  shortEditor!: Editor;
  product_id: any = null;
  constructor(
    private fb: FormBuilder,
    public toastr: ToastrService,
    private route: ActivatedRoute,
    private inventoryService: InventoryService,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any = {},
    @Optional() private dialogRef: MatDialogRef<NewProductComponent>,
    private dialog: MatDialog,
    private router: Router
  ) {
    this.editor = new Editor();
    this.shortEditor = new Editor();
    this.categoryPagination = Global.resetPaginationOptions();
    this.categoryFilter = Global.resetTableFilterOptions();

    this.subCategoryPagination = Global.resetPaginationOptions();
    this.subCategoryFilter = Global.resetTableFilterOptions();

    this.brandPagination = Global.resetPaginationOptions();
    this.brandFilter = Global.resetTableFilterOptions();

    this.tagPagination = Global.resetPaginationOptions();
    this.tagFilter = Global.resetTableFilterOptions();

    this.classifcationPagination = Global.resetPaginationOptions();
    this.classifcationFilter = Global.resetTableFilterOptions();

    this.shippingClassPagination = Global.resetPaginationOptions();
    this.shippingClassFilter = Global.resetTableFilterOptions();
    this.initFormGroup();
  }
  initFormGroup() {
    this.formGroup = this.fb.group({
      name: [this.data?.name ?? '', [Validators.required, Validators.maxLength(200)]],
      product_type: [this.data?.type ?? 'simple', [Validators.required]],
      description: [this.data?.description ?? '', [Validators.required]],
      short_description: [this.data?.short_description ?? ''],
      category: [null, [Validators.required]],
      tags: [null],
      classifications: [null],
      sub_category: [null],
      brand: [this.data?.brand?._id ?? null],
      status: [this.data?.status ?? 'active', [Validators.required]],
      images: this.fb.array([]),
      // Industry-standard SEO length caps — see backend
      // validations/admin/inventory/product/add.js|edit.js for the matching
      // server-side enforcement.
      meta_title: [this.data?.seo?.meta_title ?? '', [Validators.maxLength(60)]],
      meta_description: [this.data?.seo?.meta_description ?? '', [Validators.maxLength(160)]],
      meta_keywords: [
        Array.isArray(this.data?.seo?.meta_keywords)
          ? this.data.seo.meta_keywords
          : this.data?.seo?.meta_keywords
          ? String(this.data.seo.meta_keywords).split(',')
          : [],
        [], // no validators
      ],

      weight: [this.data?.weight ?? null],
      length: [this.data?.length ?? null],
      width: [this.data?.width ?? null],
      height: [this.data?.height ?? null],
      shipping_class: [
        this.data?.shipping_class?._id ?? this.data?.shipping_class ?? null,
      ],
      cod_status: [this.data?.cod_status ?? 'use_global'],
      prepaid_only: [this.data?.prepaid_only ?? false],

      regular_price: [
        this.data?.regular_price ?? null,
        [Validators.required, Validators.min(0)],
      ],
      sale_price: [this.data?.sale_price ?? null, [Validators.min(0)]],
      sale_start_date: [this.data?.sale_start_date ?? null],
      sale_end_date: [this.data?.sale_end_date ?? null],
      ask_for_price: [this.data?.ask_for_price ?? false],
      enable_enquiry: [this.data?.enable_enquiry ?? false],
      is_featured: [this.data?.is_featured ?? false],
      is_bestseller: [this.data?.is_bestseller ?? false],
      sku: [
        this.data?.sku ?? '',
        [Validators.required, Validators.pattern(/^[a-zA-Z0-9_-]+$/)],
      ],
      stock_status: [
        this.data?.stock_status ?? 'in_stock',
        [Validators.required],
      ],
      stock_quantity: [
        this.data?.stock_quantity ?? null,
        [Validators.min(0), Validators.required],
      ],
      allow_backorders: [
        this.data?.allow_backorders ?? false,
        [Validators.required],
      ],
      manage_stock: [this.data?.manage_stock ?? false, [Validators.required]],
      sold_individually: [
        this.data?.sold_individually ?? false,
        [Validators.required],
      ],
      attributes: this.fb.array([]),
      variations: this.fb.array([]),
      specifications: this.fb.array([]),
      quantity_discounts: this.fb.array([]),
    });
    this.formGroup.get('name')?.valueChanges.subscribe(() => this.autoGenerateSKU());
    this.formGroup.get('category')?.valueChanges.subscribe(() => this.autoGenerateSKU());

    if (this.data?.sub_categories?.length) {
      let subCategoryIds = this.data.sub_categories.map((cat: any) => cat._id);
      this.formGroup.patchValue({ sub_category: subCategoryIds });
      this.sub_categories = this.data.sub_categories; // ✅ important
    } else {
      this.fetchSubCategoryList();
    }
    if (this.data?.categories?.length) {
      let categoryIds = this.data.categories.map((cat: any) => cat._id);
      this.formGroup.patchValue({ category: categoryIds });
      this.categories = this.data.categories; // ✅ important
    } else {
      this.fetchCategoryList();
    }
    if (this.data?.tags?.length) {
      let tagIds = this.data.tags.map((tag: any) => tag._id);
      this.formGroup.patchValue({ tags: tagIds });
      this.tag_list = this.data.tags; // ✅ important
    } else {
      this.tag_list = [];
      this.fetchTagsList();
    }
    if (this.data?.classifications?.length) {
      let classificationIds = this.data.classifications.map(
        (cat: any) => cat._id
      );
      this.formGroup.patchValue({ classifications: classificationIds });
      this.classification_list = this.data.classifications; // ✅ important
    } else {
      this.classification_list = [];
      this.fetchClassifcationList();
    }
    if (this.data?._id) {
      // this.formGroup.get('product_type')?.disable();
    }
  }
  ngOnInit(): void {
    this.route.params.subscribe((params: any) => {
      this.product_id = params?._id;
      if (this.product_id) {
        this.fetchProductList();
      }
    });
    this.categorySearchSubject
      .pipe(
        debounceTime(300), // Adjust debounce time as needed
        distinctUntilChanged()
      )
      .subscribe((data: any) => {
        this.categories = [];
        this.categoryPagination = Global.resetPaginationOptions();
        this.categoryFilter = Global.resetTableFilterOptions();
        this.categoryFilter.search_key = data?.term ?? '';
        this.fetchCategoryList();
      });

    this.subCategorySearchSubject
      .pipe(
        debounceTime(300), // Adjust debounce time as needed
        distinctUntilChanged()
      )
      .subscribe((data: any) => {
        this.sub_categories = [];
        this.subCategoryPagination = Global.resetPaginationOptions();
        this.subCategoryFilter = Global.resetTableFilterOptions();
        this.subCategoryFilter.search_key = data?.term ?? '';
        this.fetchSubCategoryList();
      });

    this.brandsSearchSubject
      .pipe(
        debounceTime(300), // Adjust debounce time as needed
        distinctUntilChanged()
      )
      .subscribe((data: any) => {
        this.brands = [];
        this.brandPagination = Global.resetPaginationOptions();
        this.brandFilter = Global.resetTableFilterOptions();
        this.brandFilter.search_key = data?.term ?? '';
        this.fetchBrandList();
      });

    this.shippingClassSearchSubject
      .pipe(
        debounceTime(300), // Adjust debounce time as needed
        distinctUntilChanged()
      )
      .subscribe((data: any) => {
        this.shipping_classes = [];
        this.shippingClassPagination = Global.resetPaginationOptions();
        this.shippingClassFilter = Global.resetTableFilterOptions();
        this.shippingClassFilter.search_key = data?.term ?? '';
        this.fetchShippingClassList();
      });

    this.tagSearchSubject
      .pipe(
        debounceTime(300), // Adjust debounce time as needed
        distinctUntilChanged()
      )
      .subscribe((data: any) => {
        this.tag_list = [];
        this.tagPagination = Global.resetPaginationOptions();
        this.tagFilter = Global.resetTableFilterOptions();
        this.tagFilter.search_key = data?.term ?? '';
        this.fetchTagsList();
      });

    this.categorySearchSubject
      .pipe(
        debounceTime(300), // Adjust debounce time as needed
        distinctUntilChanged()
      )
      .subscribe((data: any) => {
        this.classification_list = [];
        this.classifcationPagination = Global.resetPaginationOptions();
        this.classifcationFilter = Global.resetTableFilterOptions();
        this.classifcationFilter.search_key = data?.term ?? '';
        this.fetchClassifcationList();
      });

    if (this.data?.brand) {
      this.brands = [this.data?.brand];
    } else {
      this.fetchBrandList();
    }

    if (this.data?.shipping_class && this.data.shipping_class._id) {
      this.shipping_classes = [this.data.shipping_class];
    } else {
      this.fetchShippingClassList();
    }
  }
  get images(): FormArray {
    return this.formGroup.get('images') as FormArray;
  }

  get quantity_discounts(): FormArray {
    return this.formGroup.get('quantity_discounts') as FormArray;
  }

  newDiscountTier(value: any = null): FormGroup {
    return this.fb.group({
      min_quantity: [
        value?.min_quantity ?? null,
        [Validators.required, Validators.min(2)],
      ],
      discount_percent: [
        value?.discount_percent ?? null,
        [Validators.required, Validators.min(0), Validators.max(100)],
      ],
    });
  }

  addDiscountTier() {
    this.quantity_discounts.push(this.newDiscountTier());
  }

  removeDiscountTier(index: number) {
    this.quantity_discounts.removeAt(index);
  }

  fetchCategoryList() {
    let params = new URLSearchParams();
    if (this.categoryPagination.page) {
      params.set('page', String(this.categoryPagination.page));
    }
    if (this.categoryFilter.slug) {
      params.set('slug', this.categoryFilter.slug);
    }
    if (this.categoryFilter.category) {
      params.set('category', this.categoryFilter.category);
    }
    if (this.categoryFilter.search_key) {
      params.set('search_key', this.categoryFilter.search_key);
    }
    params.set('type', 'parent');

    this.inventoryService.categoryList(params).subscribe({
      next: (res: any) => {
        this.categories = [...this.categories, ...res?.data?.docs];
        this.categoryPagination = {
          ...res?.data,
        };
      },
      error: (err) => {},
    });
  }

  loadMoreCategories() {
    if (this.categoryPagination.hasNextPage) {
      this.categoryPagination.page = this.categoryPagination.nextPage;
      this.fetchCategoryList();
    }
  }
  fetchSubCategoryList() {
    let params = new URLSearchParams();
    if (this.subCategoryPagination.page) {
      params.set('page', String(this.subCategoryPagination.page));
    }
    if (this.subCategoryFilter.slug) {
      params.set('slug', this.subCategoryFilter.slug);
    }
    if (this.subCategoryFilter.category) {
      params.set('category', this.subCategoryFilter.category);
    }
    if (this.subCategoryFilter.search_key) {
      params.set('search_key', this.subCategoryFilter.search_key);
    }
    params.set('type', 'sub');
    this.inventoryService.categoryList(params).subscribe({
      next: (res: any) => {
        this.sub_categories = [...this.sub_categories, ...res?.data?.docs];
        this.subCategoryPagination = {
          ...res?.data,
        };
      },
      error: (err) => {},
    });
  }
  loadMoreSubCategories() {
    if (this.subCategoryPagination.hasNextPage) {
      this.subCategoryPagination.page = this.subCategoryPagination.nextPage;
      this.fetchSubCategoryList();
    }
  }
  loadMoreBrands() {
    if (this.brandPagination.hasNextPage) {
      this.brandPagination.page = this.brandPagination.nextPage;
      this.fetchBrandList();
    }
  }
  fetchBrandList() {
    let params = new URLSearchParams();
    if (this.brandPagination.page) {
      params.set('page', String(this.brandPagination.page));
    }
    if (this.brandFilter.slug) {
      params.set('slug', this.brandFilter.slug);
    }
    if (this.brandFilter.category) {
      params.set('brand', this.brandFilter.category);
    }
    if (this.brandFilter.search_key) {
      params.set('search_key', this.brandFilter.search_key);
    }
    this.inventoryService.brandList(params).subscribe({
      next: (res: any) => {
        this.brands = [...this.brands, ...res?.data?.docs];
        this.brandPagination = {
          ...res?.data,
        };
      },
      error: (err) => {},
    });
  }
  loadMoreShippingClasses() {
    if (this.shippingClassPagination.hasNextPage) {
      this.shippingClassPagination.page = this.shippingClassPagination.nextPage;
      this.fetchShippingClassList();
    }
  }
  fetchShippingClassList() {
    let params = new URLSearchParams();
    if (this.shippingClassPagination.page) {
      params.set('page', String(this.shippingClassPagination.page));
    }
    if (this.shippingClassFilter.search_key) {
      params.set('search_key', this.shippingClassFilter.search_key);
    }
    params.set('status', 'active');
    this.inventoryService.shippingClassList(params).subscribe({
      next: (res: any) => {
        this.shipping_classes = [
          ...this.shipping_classes,
          ...res?.data?.docs,
        ];
        this.shippingClassPagination = {
          ...res?.data,
        };
      },
      error: (err) => {},
    });
  }
  chooseFile() {
    this.dialog
      .open(MediaComponent, {
        disableClose: true,
        width: '80%',
        height: '80%',
        data: {
          ref_type: 'products',
          multiple: true,
          selectedFiles: this.images.value,
        },
      })
      .afterClosed()
      .subscribe((res: any) => {
        if (!res) return;
        // Keep the current arrangement: existing images stay in place, new picks
        // are appended, and images deselected in the picker are dropped.
        const picked = new Map<string, any>(res.map((file: any) => [String(file._id), file]));
        const kept = this.images.value.filter((img: any) => picked.has(String(img._id)));
        const keptIds = new Set(kept.map((img: any) => String(img._id)));
        const added = res.filter((file: any) => !keptIds.has(String(file._id)));
        this.images.clear();
        [...kept.map((img: any) => picked.get(String(img._id))), ...added].forEach((file: any) => {
          this.images.push(this.fb.group(file));
        });
        if (added.length) this.announceImages(`${added.length} image${added.length === 1 ? '' : 's'} added at the end.`);
      });
  }
  removeImage(index: number) {
    this.images?.removeAt(index);
    this.images.markAsDirty();
    this.announceImages(index === 0 && this.images.length ? 'Image removed. The next image is now the main image.' : 'Image removed.');
  }

  // ── SEO meta fields: detect and fix pasted HTML / over-long values ───────
  readonly metaLimits = { meta_title: 60, meta_description: 160 } as const;

  // Plain one-line text: strips editor HTML, decodes entities (via the browser's
  // parser, which never executes scripts), collapses whitespace, cuts at a word.
  toMetaText(value: unknown, maxLength: number): string {
    // Block boundaries (paragraphs, line breaks, list items, headings) become sentence breaks.
    const raw = String(value ?? '').replace(/<\/(p|div|li|h[1-6])>|<br\s*\/?>/gi, '\n');
    const text = (new DOMParser().parseFromString(raw, 'text/html').body.textContent ?? '')
      .replace(/[·•]/g, ' ')
      .split('\n')
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .map((line, i, lines) => (i < lines.length - 1 && !/[.!?:;]$/.test(line) ? `${line}.` : line))
      .join(' ');
    if (text.length <= maxLength) return text;
    const cut = text.slice(0, maxLength);
    const space = cut.lastIndexOf(' ');
    return (space > 0 ? cut.slice(0, space) : cut).replace(/[\s,;:–-]+$/, '').trim();
  }

  metaIssue(field: 'meta_title' | 'meta_description'): string | null {
    const value = String(this.formGroup?.get(field)?.value ?? '');
    const max = this.metaLimits[field];
    const hasHtml = /<[a-z!/][^>]*>|&(#\d+|#x[0-9a-f]+|[a-z]+);/i.test(value);
    if (hasHtml && value.length > max) return `Contains HTML from the product description and is ${value.length - max} characters too long.`;
    if (hasHtml) return 'Contains HTML code, which search engines show as plain text.';
    if (value.length > max) return `${value.length - max} characters over the ${max}-character limit; search engines cut it off.`;
    return null;
  }

  fixMeta(field: 'meta_title' | 'meta_description') {
    const control = this.formGroup.get(field);
    control?.setValue(this.toMetaText(control.value, this.metaLimits[field]));
    control?.markAsDirty();
    control?.markAsTouched();
  }

  // Fills an empty meta description from the short description, else the full description.
  writeMetaDescriptionFromProduct() {
    const source = this.formGroup.get('short_description')?.value || this.formGroup.get('description')?.value || '';
    const control = this.formGroup.get('meta_description');
    control?.setValue(this.toMetaText(source, this.metaLimits.meta_description));
    control?.markAsDirty();
    control?.markAsTouched();
  }

  // ── Image arrangement (first image = main image) ─────────────────────────
  imageAnnouncement = '';

  trackImage = (_: number, img: any) => img?._id ?? img?.url;

  dropImage(event: CdkDragDrop<unknown>) {
    this.reorderImage(event.previousIndex, event.currentIndex);
  }

  moveImage(index: number, delta: -1 | 1) {
    this.reorderImage(index, index + delta);
  }

  makeMainImage(index: number) {
    this.reorderImage(index, 0);
  }

  // Arrow keys on a focused drag handle move the image; Home makes it the main image.
  onHandleKey(event: KeyboardEvent, index: number) {
    const target = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? index - 1
      : event.key === 'ArrowRight' || event.key === 'ArrowDown' ? index + 1
        : event.key === 'Home' ? 0
          : event.key === 'End' ? this.images.length - 1 : null;
    if (target === null) return;
    event.preventDefault();
    if (this.reorderImage(index, target)) {
      // Keep focus on the moved image's handle.
      setTimeout(() => (document.querySelectorAll<HTMLElement>('.image-tile .drag-handle')[target] as HTMLElement | undefined)?.focus());
    }
  }

  private reorderImage(from: number, to: number): boolean {
    const last = this.images.length - 1;
    to = Math.max(0, Math.min(last, to));
    if (from === to || from < 0 || from > last) return false;
    const control = this.images.at(from);
    this.images.removeAt(from, { emitEvent: false });
    this.images.insert(to, control);
    this.images.markAsDirty();
    this.announceImages(to === 0 ? 'Moved to first. This is now the main image.' : `Moved to position ${to + 1} of ${last + 1}.`);
    return true;
  }

  private announceImages(message: string) {
    // Reset first so repeating the same message is announced again.
    this.imageAnnouncement = '';
    setTimeout(() => (this.imageAnnouncement = message));
  }
  onProductTypeChange(event: any) {
    if (event.value === 'variable') {
      this.removeSimpleProductValidators();
    } else {
      this.addSimpleProductValidators();
    }
  }

  private setControlValidators(path: string, validators: ValidatorFn[] = []) {
    const ctrl = this.formGroup.get(path);
    if (!ctrl) return;
    // filter out any falsy or non-function just in case
    const clean = validators.filter((v) => typeof v === 'function');
    ctrl.setValidators(clean.length ? clean : null);
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  private enableControls(paths: string[]) {
    paths.forEach((p) => this.formGroup.get(p)?.enable({ emitEvent: false }));
  }

  private disableAndClearControls(paths: string[]) {
    paths.forEach((p) => {
      const c = this.formGroup.get(p);
      if (!c) return;
      c.reset(); // better than setValue(null) for mixed types
      c.disable({ emitEvent: false });
      c.clearValidators();
      c.updateValueAndValidity({ emitEvent: false });
    });
  }
  addSimpleProductValidators() {
    // enable the fields first (so they validate)
    this.enableControls([
      'regular_price',
      'sale_price',
      'sku',
      'stock_status',
      'stock_quantity',
      'weight',
      'length',
      'width',
      'height',
      'shipping_class',
    ]);

    this.setControlValidators('regular_price', [
      Validators.required,
      Validators.min(0),
    ]);
    this.setControlValidators('sale_price', [Validators.min(0)]);
    this.setControlValidators('sku', [
      Validators.required,
      Validators.pattern(/^[a-zA-Z0-9_-]+$/),
    ]);
    this.setControlValidators('stock_status', [Validators.required]);
    this.setControlValidators('stock_quantity', [Validators.min(0)]);

    // optional: dimension validators if you use them
    this.setControlValidators('weight', [Validators.min(0)]);
    this.setControlValidators('length', [Validators.min(0)]);
    this.setControlValidators('width', [Validators.min(0)]);
    this.setControlValidators('height', [Validators.min(0)]);
  }
  removeSimpleProductValidators() {
    this.disableAndClearControls([
      'regular_price',
      'sale_price',
      'sku',
      'stock_status',
      'stock_quantity',
      'weight',
      'length',
      'width',
      'height',
      'shipping_class',
    ]);
  }

  onAttributesChange(updatedFormGroup: any) {
    const updatedAttributes = updatedFormGroup.get('attributes') as FormArray;
    if (updatedAttributes) {
      this.formGroup.setControl('attributes', updatedAttributes);
    }
  }
  onSpecificationsChange(updatedFormGroup: any) {
    const updatedSpecifications = updatedFormGroup.get(
      'specifications'
    ) as FormArray;
    if (updatedSpecifications) {
      this.formGroup.setControl('specifications', updatedSpecifications);
    }
  }
  onVariationsChange(updatedFormGroup: any) {
    const updatedVariations = updatedFormGroup.get('variations') as FormArray;
    if (updatedVariations) {
      this.formGroup.setControl('variations', updatedVariations);
    }
  }
  onSubmit() {
    this.formGroup.markAllAsTouched();
    Global.scrollToQuery('.is-invalid');
    if (this.formGroup.valid) {
      const rawValue = this.formGroup.getRawValue();
      // this.formGroup.disable();
      console.log(rawValue);

      if (!rawValue.sub_category) {
        rawValue.sub_category = [];
      }
      if (!rawValue.classifications) {
        rawValue.classifications = [];
      }
      if (!rawValue.tags) {
        rawValue.tags = [];
      }
      if (this.data?._id) {
        rawValue._id = this.data._id;
      }
      if (Array.isArray(rawValue.meta_keywords)) {
        rawValue.meta_keywords = rawValue.meta_keywords.join(',');
      }
      const isAdd = !this.data?._id;
      this.inventoryService.submitProduct(rawValue, isAdd).subscribe({
        next: (res: any) => {
          // this.formGroup.enable();
          this.router.navigateByUrl('/inventory/products');
          this.toastr.success(res?.message);
        },
        error: () => {
          // this.formGroup.enable();
        },
      });
    }
  }
  fetchProductList() {
    let params = new URLSearchParams();
    params.set('_id', this.product_id);
    this.inventoryService.productList(params).subscribe({
      next: (res: any) => {
        this.data = res?.data;
        if (this.data?._id) {
          this.initFormGroup();
          this.images.clear();
          res?.data?.images.forEach((file: any) => {
            this.images.push(this.fb.group(file));
          });
          this.quantity_discounts.clear();
          (res?.data?.quantity_discounts ?? []).forEach((tier: any) => {
            this.quantity_discounts.push(this.newDiscountTier(tier));
          });
          this.onProductTypeChange({ value: this.data?.type });
        }
      },
      error: (err) => {},
    });
  }
  generateProductSKU(productName: string, categoryName: string): string {
    const format = (str: string) =>
      str
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '') // Remove special characters
        .slice(0, 4); // Keep first 4 characters

    const productCode = format(productName);
    const categoryCode = format(categoryName);
    const random = Math.floor(1000 + Math.random() * 9000); // Random 4-digit number

    return `${categoryCode}-${productCode}-${random}`;
  }
  autoGenerateSKU() {
    // Only new products regenerate their SKU when name/category inputs change.
    // Submit saves the current input, including any manual SKU correction.
    if (this.data?._id || this.product_id ||
        this.formGroup.get('product_type')?.value !== 'simple') return;
    const name = this.formGroup.get('name')?.value;
    const selectedCategoryIds: string[] = this.formGroup.get('category')?.value;

    if (
      name &&
      Array.isArray(selectedCategoryIds) &&
      selectedCategoryIds.length > 0
    ) {
      const selectedCategory = this.categories.find(
        (category: any) => category._id === selectedCategoryIds[0]
      );

      if (selectedCategory) {
        const generatedSKU = this.generateProductSKU(
          name,
          selectedCategory.name
        );
        this.formGroup.patchValue(
          {
            sku: generatedSKU,
          },
          { emitEvent: false }
        ); // prevent recursive trigger
      }
    }
  }

  fetchTagsList() {
    let params = new URLSearchParams();
    if (this.tagPagination.page) {
      params.set('page', String(this.tagPagination.page));
    }
    if (this.tagFilter.search_key) {
      params.set('search_key', this.tagFilter.search_key);
    }
    this.inventoryService.tagList(params).subscribe({
      next: (res: any) => {
        this.tag_list = [...this.tag_list, ...res?.data?.docs];
        this.tagPagination = {
          ...res?.data,
        };
      },
      error: (err) => {},
    });
  }
  loadMoreTags() {
    if (this.tagPagination.hasNextPage) {
      this.tagPagination.page = this.tagPagination.nextPage;
      this.fetchTagsList();
    }
  }

  fetchClassifcationList() {
    let params = new URLSearchParams();
    if (this.classifcationPagination.page) {
      params.set('page', String(this.classifcationPagination.page));
    }
    if (this.classifcationFilter.search_key) {
      params.set('search_key', this.classifcationFilter.search_key);
    }
    this.inventoryService.classificationList(params).subscribe({
      next: (res: any) => {
        this.classification_list = [
          ...this.classification_list,
          ...res?.data?.docs,
        ];
        this.classifcationPagination = {
          ...res?.data,
        };
      },
      error: (err) => {},
    });
  }
  loadMoreClassifcation() {
    if (this.classifcationPagination.hasNextPage) {
      this.classifcationPagination.page = this.classifcationPagination.nextPage;
      this.fetchClassifcationList();
    }
  }
}
