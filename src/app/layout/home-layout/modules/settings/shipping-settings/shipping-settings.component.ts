import { NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ToastrService } from 'ngx-toastr';
import * as Global from 'app/global';
import { NgSelectModule } from '@ng-select/ng-select';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import FilterOptions from 'app/core/models/FilterOptions';
import PaginationOptions from 'app/core/models/PaginationOptions';
import { InventoryService } from 'app/core/services/inventory.service';
import moment from 'moment';

const WEEKDAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const CANCELLATION_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'packed', label: 'Packed' },
];

@Component({
  selector: 'app-shipping-settings',
  imports: [
    ReactiveFormsModule,
    NgFor,
    NgIf,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatCheckboxModule,
    NgSelectModule,
  ],
  templateUrl: './shipping-settings.component.html',
  styleUrl: './shipping-settings.component.scss',
})
export class ShippingSettingsComponent {
  Global = Global;
  formGroup!: FormGroup;
  weekdays = WEEKDAYS;
  cancellationStatuses = CANCELLATION_STATUSES;

  zones: any = [];
  zonePagination: PaginationOptions;
  zoneFilter: FilterOptions;
  zoneSearchSubject = new Subject<any>();

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private inventoryService: InventoryService
  ) {
    this.zonePagination = Global.resetPaginationOptions();
    this.zoneFilter = Global.resetTableFilterOptions();

    this.formGroup = this.fb.group({
      delivery_estimate_source: ['shiprocket', Validators.required],
      delivery_pickup_postcode: ['', Validators.pattern(/^[1-9]\d{5}$/)],
      delivery_courier_policy: ['recommended', Validators.required],
      delivery_buffer_days: [1, [Validators.required, Validators.min(0), Validators.max(30), Validators.pattern(/^\d+$/)]],
      delivery_fallback_enabled: [true],
      processing_days_min: [1, [Validators.required, Validators.min(0), Validators.max(90), Validators.pattern(/^\d+$/)]],
      processing_days_max: [2, [Validators.required, Validators.min(0), Validators.max(90), Validators.pattern(/^\d+$/)]],
      exclude_weekends: [true],
      weekend_days: [[0]],
      holidays: this.fb.array([]),
      order_cutoff_time: [
        null,
        [Validators.pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)],
      ],
      default_shipping_zone: [null],
      cod_enabled: [true],
      cod_min_order: [0, [Validators.min(0)]],
      cod_max_order: [null, [Validators.min(0)]],
      cod_charge_enabled: [false],
      cod_charge: [0, [Validators.min(0)]],
      cod_advance_enabled: [false],
      cod_advance_percent: [20, [Validators.min(0), Validators.max(100)]],
      cod_allowed_pincodes_text: [''],
      cod_disallowed_pincodes_text: [''],
      cod_disallowed_categories_text: [''],
      cod_disallowed_brands_text: [''],
      cod_disallowed_shipping_classes_text: [''],
      cod_disallowed_zones: [[]],
      cod_allowed_customer_types_text: ['customer'],
      customer_cancellation_enabled: [true],
      customer_cancellation_statuses: [['pending', 'confirmed', 'processing', 'packed']],
      customer_cancel_packed_before_dispatch: [true],
      admin_cancellation_enabled: [true],
      admin_cancellation_statuses: [['pending', 'confirmed', 'processing', 'packed']],
      returns_enabled: [true],
      return_window_days: [7, [Validators.required, Validators.min(0), Validators.max(365)]],
      return_auto_approve: [false],
      return_require_images: [false],
      return_reasons_text: ['Damaged item\nWrong item\nDefective item\nNot as described\nOther', Validators.required],
    });
  }

  ngOnInit(): void {
    this.fetchShippingSettings();
    this.fetchZoneList();
    this.zoneSearchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((data: any) => {
        this.zones = [];
        this.zonePagination = Global.resetPaginationOptions();
        this.zoneFilter = Global.resetTableFilterOptions();
        this.zoneFilter.search_key = data?.term ?? '';
        this.fetchZoneList();
      });
  }

  get holidays(): FormArray {
    return this.formGroup.get('holidays') as FormArray;
  }

  newHoliday(value: any = null) {
    return this.fb.control(
      value ? moment(value).format('YYYY-MM-DD') : null,
      Validators.required
    );
  }

  addHoliday() {
    this.holidays.push(this.newHoliday());
  }

  removeHoliday(index: number) {
    this.holidays.removeAt(index);
  }

  isWeekdaySelected(value: number): boolean {
    const selected = this.formGroup.get('weekend_days')?.value ?? [];
    return selected.includes(value);
  }

  toggleWeekday(value: number, event: any) {
    const control = this.formGroup.get('weekend_days');
    const selected: number[] = [...(control?.value ?? [])];
    if (event?.checked) {
      if (!selected.includes(value)) selected.push(value);
    } else {
      const idx = selected.indexOf(value);
      if (idx > -1) selected.splice(idx, 1);
    }
    control?.setValue(selected);
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

  fetchShippingSettings() {
    this.inventoryService.shippingSettingsGet().subscribe({
      next: (res: any) => {
        const data = res?.data;
        if (!data) return;
        this.formGroup.patchValue({
          delivery_estimate_source: data.delivery_estimate_source ?? 'shiprocket',
          delivery_pickup_postcode: data.delivery_pickup_postcode ?? '',
          delivery_courier_policy: data.delivery_courier_policy ?? 'recommended',
          delivery_buffer_days: data.delivery_buffer_days ?? 1,
          delivery_fallback_enabled: data.delivery_fallback_enabled ?? true,
          processing_days_min: data.processing_days_min ?? 1,
          processing_days_max: data.processing_days_max ?? 2,
          exclude_weekends: data.exclude_weekends ?? true,
          weekend_days: data.weekend_days ?? [0],
          order_cutoff_time: data.order_cutoff_time ?? null,
          default_shipping_zone:
            data.default_shipping_zone?._id ?? data.default_shipping_zone ?? null,
          cod_enabled: data.cod_enabled ?? true,
          cod_min_order: data.cod_min_order ?? 0,
          cod_max_order: data.cod_max_order ?? null,
          cod_charge_enabled: data.cod_charge_enabled ?? false,
          cod_charge: data.cod_charge ?? 0,
          cod_advance_enabled: data.cod_advance_enabled ?? false,
          cod_advance_percent: data.cod_advance_percent ?? 20,
          cod_allowed_pincodes_text: (data.cod_allowed_pincodes ?? []).join(', '),
          cod_disallowed_pincodes_text: (data.cod_disallowed_pincodes ?? []).join(', '),
          cod_disallowed_categories_text: (data.cod_disallowed_categories ?? []).map((v: any) => v?._id ?? v).join(', '),
          cod_disallowed_brands_text: (data.cod_disallowed_brands ?? []).map((v: any) => v?._id ?? v).join(', '),
          cod_disallowed_shipping_classes_text: (data.cod_disallowed_shipping_classes ?? []).map((v: any) => v?._id ?? v).join(', '),
          cod_disallowed_zones: (data.cod_disallowed_zones ?? []).map((v: any) => v?._id ?? v),
          cod_allowed_customer_types_text: (data.cod_allowed_customer_types ?? []).join(', '),
          customer_cancellation_enabled: data.customer_cancellation_enabled ?? true,
          customer_cancellation_statuses: data.customer_cancellation_statuses ?? ['pending', 'confirmed', 'processing', 'packed'],
          customer_cancel_packed_before_dispatch: data.customer_cancel_packed_before_dispatch ?? true,
          admin_cancellation_enabled: data.admin_cancellation_enabled ?? true,
          admin_cancellation_statuses: data.admin_cancellation_statuses ?? ['pending', 'confirmed', 'processing', 'packed'],
          returns_enabled: data.returns_enabled ?? true,
          return_window_days: data.return_window_days ?? 7,
          return_auto_approve: data.return_auto_approve ?? false,
          return_require_images: data.return_require_images ?? false,
          return_reasons_text: (data.return_reasons ?? []).join('\n'),
        });
        this.holidays.clear();
        (data.holidays ?? []).forEach((holiday: any) => {
          this.holidays.push(this.newHoliday(holiday));
        });
        if (
          data.default_shipping_zone &&
          data.default_shipping_zone.name &&
          !this.zones.some((z: any) => z._id === data.default_shipping_zone._id)
        ) {
          this.zones = [data.default_shipping_zone, ...this.zones];
        }
      },
      error: (err) => {},
    });
  }

  onSubmit() {
    this.formGroup.markAllAsTouched();
    const values = this.formGroup.getRawValue();
    if (Number(values.processing_days_max) < Number(values.processing_days_min)) {
      this.toastr.error('Maximum processing days must be at least the minimum.');
      return;
    }
    if (values.exclude_weekends && values.weekend_days.length === 7) {
      this.toastr.error('Keep at least one working day per week.');
      return;
    }
    if (values.delivery_estimate_source === 'shiprocket' && !values.delivery_pickup_postcode) {
      this.toastr.error('Enter your Shiprocket pickup pincode for live estimates.');
      return;
    }
    if (this.formGroup.valid) {
      this.formGroup.disable();
      const payload = this.formGroup.getRawValue();
      payload.cod_allowed_pincodes = this.parsePincodes(payload.cod_allowed_pincodes_text);
      payload.cod_disallowed_pincodes = this.parsePincodes(payload.cod_disallowed_pincodes_text);
      payload.cod_disallowed_categories = this.parseIds(payload.cod_disallowed_categories_text);
      payload.cod_disallowed_brands = this.parseIds(payload.cod_disallowed_brands_text);
      payload.cod_disallowed_shipping_classes = this.parseIds(payload.cod_disallowed_shipping_classes_text);
      payload.cod_allowed_customer_types = String(payload.cod_allowed_customer_types_text || '').split(/[\s,]+/).map((v: string) => v.trim()).filter(Boolean);
      payload.return_reasons = [...new Set(String(payload.return_reasons_text || '').split(/\r?\n/).map((v: string) => v.trim()).filter(Boolean))];
      delete payload.cod_allowed_pincodes_text;
      delete payload.cod_disallowed_pincodes_text;
      delete payload.cod_disallowed_categories_text;
      delete payload.cod_disallowed_brands_text;
      delete payload.cod_disallowed_shipping_classes_text;
      delete payload.cod_allowed_customer_types_text;
      delete payload.return_reasons_text;
      payload.holidays = (payload.holidays ?? []).filter((h: any) => !!h);
      this.inventoryService.shippingSettingsUpdate(payload).subscribe({
        next: (res: any) => {
          this.formGroup.enable();
          this.toastr.success(res?.message);
        },
        error: (err: any) => {
          this.formGroup.enable();
        },
      });
    }
  }

  private parsePincodes(value: string): string[] {
    return [...new Set(String(value || '').split(/[\s,]+/).map((v) => v.trim()).filter((v) => /^\d{6}$/.test(v)))];
  }

  private parseIds(value: string): string[] {
    return [...new Set(String(value || '').split(/[\s,]+/).map((v) => v.trim()).filter((v) => /^[a-f\d]{24}$/i.test(v)))];
  }
}
