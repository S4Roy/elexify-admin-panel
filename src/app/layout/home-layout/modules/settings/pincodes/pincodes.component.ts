import { inject as injectPermissions } from '@angular/core';
import { PermissionService } from 'app/core/services/permission.service';
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
import { PaginationComponent } from 'app/layout/home-layout/includes/pagination/pagination.component';
import { DialogService } from 'app/core/services/dialog.service';
import { ConfirmDialogData } from 'app/layout/home-layout/includes/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../includes/empty-state/empty-state.component';
import { FilterDrawerComponent } from '../../../includes/filter-drawer/filter-drawer.component';

// Serviceability: which pincodes we deliver to (status = active) vs. have
// explicitly excluded (status = inactive), with the reason shown in `note`.
// Backed by src/routes/admin/pincode.js on the API.
@Component({
  selector: 'app-pincodes',
  imports: [EmptyStateComponent, NgFor, NgIf, PaginationComponent, DatePipe],
  templateUrl: './pincodes.component.html',
  styleUrl: './pincodes.component.scss',
})
export class PincodesComponent {
  Global = Global;
  item_list: any = [];
  paginationOption: PaginationOptions;

  filterOption: FilterOptions;
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
  }

  public sortKey: string = 'pincode';
  public sortDirection: 'asc' | 'desc' = 'asc';

  ngOnInit(): void {
    combineLatest([this.route.paramMap, this.helperService.searchKey$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([params, searchKey]) => {
        this.filterOption = Global.resetTableFilterOptions();
        this.filterOption.search_key = searchKey;
        this.paginationOption.page = 1;
        this.fetchPincodeList();
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
        label: 'Serviceable',
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
        this.fetchPincodeList();
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
    this.fetchPincodeList();
  }
  getSortIcon(field: string): string {
    if (this.sortKey !== field) return 'sort-icon';
    return this.sortDirection === 'asc' ? 'sort-icon-up' : 'sort-icon-down';
  }

  fetchPincodeList() {
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

    this.apiService.pincodeList(params).subscribe({
      next: (res: any) => {
        this.item_list = res?.data?.docs ?? [];
        this.paginationOption = {
          ...res?.data,
        };
      },
      error: (err) => {},
    });
  }

  updatePincodeStatus(item: any) {
    if (!item?._id || !item?.status) {
      this.toastr.error('Invalid pincode data');
      return;
    }
    const newStatus = item.status === 'active' ? 'inactive' : 'active';

    const dialogData: ConfirmDialogData = {
      title: 'Are you sure?',
      message:
        newStatus === 'active'
          ? `Resume delivery to pincode ${item.pincode}?`
          : `Exclude pincode ${item.pincode} from delivery? Customers won't be able to save addresses with this pincode.`,
      cancelText: 'Cancel',
      saveText: 'Confirm',
    };

    this.dialogService.confirmDialog(dialogData).subscribe((result: any) => {
      if (result?.confirm) {
        this.apiService
          .updatePincode({ _id: item._id, status: newStatus })
          .subscribe({
            next: () => {
              this.toastr.success(
                `Pincode ${item.pincode} ${
                  newStatus === 'active' ? 'included' : 'excluded'
                } successfully`
              );
              this.fetchPincodeList();
            },
            error: (err: any) => {},
          });
      }
    });
  }

  updateCodStatus(item: any) {
    const statuses = ['use_global', 'allowed', 'disallowed'];
    const current = statuses.indexOf(item?.cod_status ?? 'use_global');
    const cod_status = statuses[(current + 1) % statuses.length];
    this.apiService.updatePincode({ _id: item._id, cod_status }).subscribe({
      next: () => {
        this.toastr.success(`COD setting updated for ${item.pincode}`);
        this.fetchPincodeList();
      },
      error: () => {},
    });
  }

  onPageChange(data: any) {
    this.paginationOption.page = data;
    this.fetchPincodeList();
  }
  private readonly access = injectPermissions(PermissionService);
  get permissions(): string[] { return this.access.actions('pincodes'); }

  ngOnDestroy(): void {
    this.helperService.clearFilterButton();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
