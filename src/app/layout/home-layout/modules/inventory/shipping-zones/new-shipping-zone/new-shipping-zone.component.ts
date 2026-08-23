import { Location, NgFor, NgIf } from '@angular/common';
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
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import * as Global from 'app/global';
import { NgSelectModule } from '@ng-select/ng-select';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import FilterOptions from 'app/core/models/FilterOptions';
import PaginationOptions from 'app/core/models/PaginationOptions';
import { InventoryService } from 'app/core/services/inventory.service';
import { ApiService } from 'app/core/services/api.service';

@Component({
  selector: 'app-new-shipping-zone',
  imports: [
    ReactiveFormsModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    NgFor,
    NgIf,
    NgSelectModule,
  ],
  templateUrl: './new-shipping-zone.component.html',
  styleUrl: './new-shipping-zone.component.scss',
})
export class NewShippingZoneComponent {
  Global = Global;
  formGroup!: FormGroup;
  zone_id: any = null;

  countries: any = [];
  states: any = [];
  countryPagination: PaginationOptions;
  statePagination: PaginationOptions;
  countryFilter: FilterOptions;
  stateFilter: FilterOptions;
  countrySearchSubject = new Subject<any>();
  stateSearchSubject = new Subject<any>();

  constructor(
    private fb: FormBuilder,
    public toastr: ToastrService,
    private route: ActivatedRoute,
    private inventoryService: InventoryService,
    private apiService: ApiService,
    public location: Location
  ) {
    this.countryPagination = Global.resetPaginationOptions();
    this.countryFilter = Global.resetTableFilterOptions();
    this.statePagination = Global.resetPaginationOptions();
    this.stateFilter = Global.resetTableFilterOptions();

    this.formGroup = this.fb.group({
      name: [null, Validators.compose([Validators.required])],
      countries: [[]],
      states: [[]],
      pincode_prefixes: this.fb.array([]),
      is_default: [false],
      status: ['active', Validators.compose([Validators.required])],
    });

    this.route.params.subscribe((params: any) => {
      this.zone_id = params?._id;
      if (this.zone_id) {
        this.fetchZoneDetails();
      }
    });
  }

  ngOnInit(): void {
    this.fetchCountryList();
    this.fetchStateList();

    this.countrySearchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((data: any) => {
        this.countries = [];
        this.countryPagination = Global.resetPaginationOptions();
        this.countryFilter = Global.resetTableFilterOptions();
        this.countryFilter.search_key = data?.term ?? '';
        this.fetchCountryList();
      });

    this.stateSearchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((data: any) => {
        this.states = [];
        this.statePagination = Global.resetPaginationOptions();
        this.stateFilter = Global.resetTableFilterOptions();
        this.stateFilter.search_key = data?.term ?? '';
        this.fetchStateList();
      });
  }

  get pincode_prefixes(): FormArray {
    return this.formGroup.get('pincode_prefixes') as FormArray;
  }

  newPrefix(value: any = null) {
    return this.fb.control(value ?? '', Validators.required);
  }

  addPrefix() {
    this.pincode_prefixes.push(this.newPrefix());
  }

  removePrefix(index: number) {
    this.pincode_prefixes.removeAt(index);
  }

  fetchCountryList() {
    let params = new URLSearchParams();
    if (this.countryPagination.page) {
      params.set('page', String(this.countryPagination.page));
    }
    if (this.countryFilter.search_key) {
      params.set('search_key', this.countryFilter.search_key);
    }
    params.set('status', 'active');
    this.apiService.countryList(params).subscribe({
      next: (res: any) => {
        this.countries = [...this.countries, ...(res?.data?.docs ?? [])];
        this.countryPagination = { ...res?.data };
      },
      error: (err) => {},
    });
  }
  loadMoreCountries() {
    if (this.countryPagination.hasNextPage) {
      this.countryPagination.page = this.countryPagination.nextPage;
      this.fetchCountryList();
    }
  }

  fetchStateList() {
    let params = new URLSearchParams();
    if (this.statePagination.page) {
      params.set('page', String(this.statePagination.page));
    }
    if (this.stateFilter.search_key) {
      params.set('search_key', this.stateFilter.search_key);
    }
    params.set('status', 'active');
    this.apiService.stateList(params).subscribe({
      next: (res: any) => {
        this.states = [...this.states, ...(res?.data?.docs ?? [])];
        this.statePagination = { ...res?.data };
      },
      error: (err) => {},
    });
  }
  loadMoreStates() {
    if (this.statePagination.hasNextPage) {
      this.statePagination.page = this.statePagination.nextPage;
      this.fetchStateList();
    }
  }

  fetchZoneDetails() {
    let params = new URLSearchParams();
    params.set('page', '1');
    params.set('limit', '1000');
    this.inventoryService.shippingZoneList(params).subscribe({
      next: (res: any) => {
        const docs = res?.data?.docs ?? [];
        const zone = docs.find((z: any) => z._id === this.zone_id);
        if (!zone) return;
        this.formGroup.patchValue({
          name: zone.name,
          countries: zone.countries ?? [],
          states: zone.states ?? [],
          is_default: zone.is_default ?? false,
          status: zone.status ?? 'active',
        });
        this.pincode_prefixes.clear();
        (zone.pincode_prefixes ?? []).forEach((prefix: string) => {
          this.pincode_prefixes.push(this.newPrefix(prefix));
        });
      },
      error: (err) => {},
    });
  }

  onSubmit() {
    this.formGroup.markAllAsTouched();
    if (this.formGroup.valid) {
      this.formGroup.disable();
      let formData = this.formGroup.getRawValue();
      if (this.zone_id) {
        formData._id = this.zone_id;
      }
      this.inventoryService.submitShippingZone(formData).subscribe({
        next: (res: any) => {
          this.formGroup.enable();
          this.toastr.success(res?.message);
          this.location.back();
        },
        error: (err: any) => {
          this.formGroup.enable();
        },
      });
    }
  }
}
