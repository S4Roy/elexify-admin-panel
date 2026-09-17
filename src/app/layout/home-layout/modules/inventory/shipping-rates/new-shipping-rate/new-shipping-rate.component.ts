import { NgIf } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  ValidationErrors,
  AbstractControl,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { ToastrService } from 'ngx-toastr';
import * as Global from 'app/global';
import { InventoryService } from 'app/core/services/inventory.service';
import { NgSelectModule } from '@ng-select/ng-select';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import FilterOptions from 'app/core/models/FilterOptions';
import PaginationOptions from 'app/core/models/PaginationOptions';
import { AmountNumberDirective } from 'app/core/directives/amount-number.directive';

function deliveryDaysValidator(control: AbstractControl): ValidationErrors | null {
  const min = control.get('min_delivery_days')?.value;
  const max = control.get('max_delivery_days')?.value;
  if (min === null || min === undefined || max === null || max === undefined) {
    return null;
  }
  return Number(max) >= Number(min) ? null : { deliveryDaysInvalid: true };
}

@Component({
  selector: 'app-new-shipping-rate',
  imports: [
    ReactiveFormsModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatSelectModule,
    MatDialogModule,
    NgIf,
    NgSelectModule,
    AmountNumberDirective,
  ],
  templateUrl: './new-shipping-rate.component.html',
  styleUrl: './new-shipping-rate.component.scss',
})
export class NewShippingRateComponent {
  Global = Global;
  formGroup!: FormGroup;

  zones: any = [];
  zonePagination: PaginationOptions;
  zoneFilter: FilterOptions;
  zoneSearchSubject = new Subject<any>();

  shipping_classes: any = [];
  shippingClassPagination: PaginationOptions;
  shippingClassFilter: FilterOptions;
  shippingClassSearchSubject = new Subject<any>();

  constructor(
    private fb: FormBuilder,
    public toastr: ToastrService,
    private inventoryService: InventoryService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<NewShippingRateComponent>
  ) {
    this.zonePagination = Global.resetPaginationOptions();
    this.zoneFilter = Global.resetTableFilterOptions();
    this.shippingClassPagination = Global.resetPaginationOptions();
    this.shippingClassFilter = Global.resetTableFilterOptions();

    this.formGroup = this.fb.group(
      {
        zone: [
          this.data?.zone?._id ?? this.data?.zone ?? null,
          Validators.required,
        ],
        shipping_class: [
          this.data?.shipping_class?._id ?? this.data?.shipping_class ?? null,
        ],
        flat_rate: [
          this.data?.flat_rate ?? 0,
          [Validators.required, Validators.min(0)],
        ],
        per_kg_rate: [this.data?.per_kg_rate ?? 0, [Validators.min(0)]],
        free_weight_kg: [this.data?.free_weight_kg ?? 0, [Validators.min(0)]],
        free_shipping_min_order_value: [
          this.data?.free_shipping_min_order_value ?? null,
          [Validators.min(0)],
        ],
        min_delivery_days: [
          this.data?.min_delivery_days ?? 2,
          [Validators.required, Validators.min(0)],
        ],
        max_delivery_days: [
          this.data?.max_delivery_days ?? 5,
          [Validators.required, Validators.min(0)],
        ],
        status: [this.data?.status ?? 'active', Validators.required],
      },
      { validators: deliveryDaysValidator }
    );
  }

  ngOnInit(): void {
    this.fetchZoneList();
    this.fetchShippingClassList();
    if (this.data?.zone && this.data.zone.name) {
      this.zones = [this.data.zone];
    }
    if (this.data?.shipping_class && this.data.shipping_class.name) {
      this.shipping_classes = [this.data.shipping_class];
    }

    this.zoneSearchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((data: any) => {
        this.zones = [];
        this.zonePagination = Global.resetPaginationOptions();
        this.zoneFilter = Global.resetTableFilterOptions();
        this.zoneFilter.search_key = data?.term ?? '';
        this.fetchZoneList();
      });

    this.shippingClassSearchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((data: any) => {
        this.shipping_classes = [];
        this.shippingClassPagination = Global.resetPaginationOptions();
        this.shippingClassFilter = Global.resetTableFilterOptions();
        this.shippingClassFilter.search_key = data?.term ?? '';
        this.fetchShippingClassList();
      });
  }

  fetchZoneList() {
    let params = new URLSearchParams();
    if (this.zonePagination.page) {
      params.set('page', String(this.zonePagination.page));
    }
    if (this.zoneFilter.search_key) {
      params.set('search_key', this.zoneFilter.search_key);
    }
    this.inventoryService.shippingZoneList(params).subscribe({
      next: (res: any) => {
        this.zones = [...this.zones, ...(res?.data?.docs ?? [])];
        this.zonePagination = { ...res?.data };
      },
      error: (err) => {},
    });
  }
  loadMoreZones() {
    if (this.zonePagination.hasNextPage) {
      this.zonePagination.page = this.zonePagination.nextPage;
      this.fetchZoneList();
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
    this.inventoryService.shippingClassList(params).subscribe({
      next: (res: any) => {
        this.shipping_classes = [
          ...this.shipping_classes,
          ...(res?.data?.docs ?? []),
        ];
        this.shippingClassPagination = { ...res?.data };
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

  onSubmit() {
    this.formGroup.markAllAsTouched();
    if (this.formGroup.valid) {
      this.formGroup.disable();
      let formData = this.formGroup.getRawValue();
      if (this.data?._id) {
        formData._id = this.data._id;
      }
      if (!formData.shipping_class) {
        formData.shipping_class = null;
      }
      if (!formData.free_shipping_min_order_value) {
        formData.free_shipping_min_order_value = null;
      }

      this.inventoryService.submitShippingRate(formData).subscribe({
        next: (res: any) => {
          this.dialogRef.close(res);
          this.toastr.success(res?.message);
        },
        error: (err: any) => {
          this.formGroup.enable();
        },
      });
    }
  }
}
