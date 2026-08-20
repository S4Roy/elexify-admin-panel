import { Component } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'app/core/services/api.service';
import * as Global from 'app/global';
import { ActivatedRoute, Router } from '@angular/router';
import FilterOptions from 'app/core/models/FilterOptions';
import { FilterFieldDef } from 'app/core/models/FilterFieldDef';
import { HelpersService } from 'app/core/services/helpers.service';
import { Subject, combineLatest, takeUntil } from 'rxjs';
import PaginationOptions from 'app/core/models/PaginationOptions';
import { MenuComponent } from 'app/layout/home-layout/includes/menu/menu.component';
import { PaginationComponent } from 'app/layout/home-layout/includes/pagination/pagination.component';
import { DialogService } from 'app/core/services/dialog.service';
import { ConfirmDialogData } from 'app/layout/home-layout/includes/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../includes/empty-state/empty-state.component';
import { FilterDrawerComponent } from '../../../includes/filter-drawer/filter-drawer.component';
@Component({
  selector: 'app-countries',
  imports: [EmptyStateComponent, NgFor, NgIf, PaginationComponent, DatePipe],
  templateUrl: './countries.component.html',
  styleUrl: './countries.component.scss',
})
export class CountriesComponent {
  Global = Global;
  item_list: any = [];
  paginationOption: PaginationOptions;

  filterOption: FilterOptions;
  // Working filter values, keyed to match filterFields below — this is what
  // gets handed to the (page-agnostic) filter drawer and read back from it.
  filterValues: Record<string, any> = {
    status: [],
  };
  private destroy$ = new Subject<void>();

  constructor(
    private dialog: MatDialog,
    private apiService: ApiService,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private dialogService: DialogService,
    private helperService: HelpersService
  ) {
    this.paginationOption = Global.resetPaginationOptions();
    this.filterOption = Global.resetTableFilterOptions();
    // this.checkPermission();
  }
  public sortKey: string = 'created_at';
  public sortDirection: 'asc' | 'desc' = 'desc';
  ngOnInit(): void {
    combineLatest([this.route.paramMap, this.helperService.searchKey$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([params, searchKey]) => {
        this.filterOption = Global.resetTableFilterOptions();
        this.filterOption.search_key = searchKey;
        this.paginationOption.page = 1;
        this.fetchCountryList();
      });
    this.helperService.filterButtonClick$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.openFilters());
    this.updateFilterButton();
  }
  get filterFields(): FilterFieldDef[] {
    return [
      {
        key: 'status',
        label: 'Status',
        type: 'multiselect',
        options: Global.STATUS_OPTIONS,
      },
    ];
  }
  filterCount(): number {
    let count = 0;
    if (this.filterValues['status']?.length) count++;
    return count;
  }
  updateFilterButton(): void {
    this.helperService.setFilterButton(this.filterCount());
  }
  openFilters(): void {
    this.dialog
      .open(FilterDrawerComponent, {
        data: { fields: this.filterFields, values: { ...this.filterValues } },
      })
      .afterClosed()
      .subscribe((result: Record<string, any> | undefined) => {
        if (!result) return;
        this.filterValues = result;
        this.filterOption.status = this.filterValues['status']?.length
          ? this.filterValues['status'].join(',')
          : null;
        this.paginationOption.page = 1;
        this.fetchCountryList();
        this.updateFilterButton();
      });
  }
  sort(field: string): void {
    this.paginationOption = Global.resetPaginationOptions();

    if (this.sortKey === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = field;
      this.sortDirection = 'asc';
    }

    // Emit or trigger sorting logic (API call or client-side)
    this.fetchCountryList();
  }
  getSortIcon(field: string): string {
    if (this.sortKey !== field) return 'sort-icon';
    return this.sortDirection === 'asc' ? 'sort-icon-up' : 'sort-icon-down';
  }
  addItem(data: any = null) {}
  fetchCountryList() {
    let params = new URLSearchParams({
      sort_by: this.sortKey,
      sort_order: this.sortDirection === 'asc' ? '1' : '-1',
    });
    if (this.paginationOption.limit) {
      params.set('limit', String(this.paginationOption.limit));
    }
    if (this.paginationOption.page) {
      params.set('page', String(this.paginationOption.page));
    }

    if (this.filterOption.search_key) {
      params.set('search_key', this.filterOption.search_key);
    }
    if (this.filterOption.status) {
      params.set('status', this.filterOption.status);
    }

    this.apiService.countryList(params).subscribe({
      next: (res: any) => {
        this.item_list = res?.data?.docs ?? [];
        this.paginationOption = {
          ...res?.data,
        };
      },
      error: (err) => {},
    });
  }
  updateCurrencyStatus(item: any) {
    const currentStatus = item?.status;
    if (!item?._id || !currentStatus) {
      this.toastr.error('Invalid currency data');
      return;
    }

    // Toggle status
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    const dialogData: ConfirmDialogData = {
      title: 'Are you sure?',
      message: `Do you want to ${
        newStatus === 'active' ? 'activate' : 'deactivate'
      } the currency ${item?.code ?? ''}?`,
      cancelText: 'Cancel',
      saveText: 'Confirm',
    };

    this.dialogService.confirmDialog(dialogData).subscribe((result: any) => {
      if (result?.confirm) {
        this.apiService
          .updateCountryStatus({ _id: item._id, status: newStatus })
          .subscribe({
            next: (res: any) => {
              this.toastr.success(
                `Country ${
                  newStatus === 'active' ? 'activated' : 'deactivated'
                } successfully`
              );
              this.fetchCountryList();
            },
            error: (err: any) => {},
          });
      }
    });
  }

  onPageChange(data: any) {
    this.paginationOption.page = data;
    this.fetchCountryList();
  }
  permissions: any = ['add', 'edit', 'delete'];

  ngOnDestroy(): void {
    this.helperService.clearFilterButton();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
