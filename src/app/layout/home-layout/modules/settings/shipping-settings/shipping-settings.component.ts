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
      processing_days_min: [1, [Validators.required, Validators.min(0)]],
      processing_days_max: [2, [Validators.required, Validators.min(0)]],
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
      cod_allowed_pincodes_text: [''],
      cod_disallowed_pincodes_text: [''],
      cod_disallowed_categories_text: [''],
      cod_disallowed_brands_text: [''],
      cod_disallowed_shipping_classes_text: [''],
      cod_disallowed_zones: [[]],
      cod_allowed_customer_types_text: ['customer'],
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
          cod_allowed_pincodes_text: (data.cod_allowed_pincodes ?? []).join(', '),
          cod_disallowed_pincodes_text: (data.cod_disallowed_pincodes ?? []).join(', '),
          cod_disallowed_categories_text: (data.cod_disallowed_categories ?? []).map((v: any) => v?._id ?? v).join(', '),
          cod_disallowed_brands_text: (data.cod_disallowed_brands ?? []).map((v: any) => v?._id ?? v).join(', '),
          cod_disallowed_shipping_classes_text: (data.cod_disallowed_shipping_classes ?? []).map((v: any) => v?._id ?? v).join(', '),
          cod_disallowed_zones: (data.cod_disallowed_zones ?? []).map((v: any) => v?._id ?? v),
          cod_allowed_customer_types_text: (data.cod_allowed_customer_types ?? []).join(', '),
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
    if (this.formGroup.valid) {
      this.formGroup.disable();
      const payload = this.formGroup.getRawValue();
      payload.cod_allowed_pincodes = this.parsePincodes(payload.cod_allowed_pincodes_text);
      payload.cod_disallowed_pincodes = this.parsePincodes(payload.cod_disallowed_pincodes_text);
      payload.cod_disallowed_categories = this.parseIds(payload.cod_disallowed_categories_text);
      payload.cod_disallowed_brands = this.parseIds(payload.cod_disallowed_brands_text);
      payload.cod_disallowed_shipping_classes = this.parseIds(payload.cod_disallowed_shipping_classes_text);
      payload.cod_allowed_customer_types = String(payload.cod_allowed_customer_types_text || '').split(/[\s,]+/).map((v: string) => v.trim()).filter(Boolean);
      delete payload.cod_allowed_pincodes_text;
      delete payload.cod_disallowed_pincodes_text;
      delete payload.cod_disallowed_categories_text;
      delete payload.cod_disallowed_brands_text;
      delete payload.cod_disallowed_shipping_classes_text;
      delete payload.cod_allowed_customer_types_text;
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
