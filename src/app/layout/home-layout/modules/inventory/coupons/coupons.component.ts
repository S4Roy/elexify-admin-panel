import { CouponUsageComponent } from './coupon-usage/coupon-usage.component';
import { DatePipe, NgFor, NgIf, TitleCasePipe } from '@angular/common';
import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import PaginationOptions from 'app/core/models/PaginationOptions';
import { MasterService } from 'app/core/services/master.service';
import { PaginationComponent } from 'app/layout/home-layout/includes/pagination/pagination.component';
import { ToastrService } from 'ngx-toastr';
import { MenuComponent } from 'app/layout/home-layout/includes/menu/menu.component';
import * as Global from 'app/global';
import { InventoryService } from 'app/core/services/inventory.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import FilterOptions from 'app/core/models/FilterOptions';
import { FilterFieldDef } from 'app/core/models/FilterFieldDef';
import { MatIconModule } from '@angular/material/icon';
import { Subject, combineLatest, takeUntil } from 'rxjs';
import { HelpersService } from 'app/core/services/helpers.service';
import { NewCouponComponent } from './new-coupon/new-coupon.component';
import { TruncateListDirective } from 'app/core/directives/truncate-list.directive';
import { DialogService } from 'app/core/services/dialog.service';
import { ConfirmDialogData } from 'app/layout/home-layout/includes/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../includes/empty-state/empty-state.component';
import { FilterDrawerComponent } from '../../../includes/filter-drawer/filter-drawer.component';
@Component({
  selector: 'app-coupons',
  imports: [
    EmptyStateComponent,
    NgFor,
    NgIf,
    PaginationComponent,
    MenuComponent,
    MatIconModule,
    TitleCasePipe,
    DatePipe,
    TruncateListDirective,
  ],
  templateUrl: './coupons.component.html',
  styleUrl: './coupons.component.scss',
})
export class CouponsComponent {
  Global = Global;
  item_list: any = [];
  paginationOption: PaginationOptions;
  filterOption: FilterOptions;
  // Working filter values, keyed to match filterFields below — this is what
  // gets handed to the (page-agnostic) filter drawer and read back from it.
  filterValues: Record<string, any> = {
    status: [],
    discount_type: null,
    from_date: null,
    to_date: null,
  };
  private destroy$ = new Subject<void>();
  constructor(
    private dialog: MatDialog,
    private inventoryService: InventoryService,
    private helperService: HelpersService,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private dialogService: DialogService
  ) {
    this.paginationOption = Global.resetPaginationOptions();
    this.filterOption = Global.resetTableFilterOptions();
    combineLatest([this.route.paramMap, this.helperService.searchKey$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([params, searchKey]) => {
        this.filterOption = Global.resetTableFilterOptions();
        this.filterOption.slug = params.get('slug');
        this.filterOption.search_key = searchKey;
        this.filterOption.status = this.filterValues['status']?.length
          ? this.filterValues['status'].join(',')
          : null;
        this.filterOption.type = this.filterValues['discount_type'] || null;
        this.filterOption.from_date = this.filterValues['from_date'] || null;
        this.filterOption.to_date = this.filterValues['to_date'] || null;
        this.paginationOption.page = 1;
        this.fetchItems();
      });
  }
  ngOnInit(): void {
    if (this.permissions.includes('add')) {
      this.helperService.setActionButton({
        label: 'Add New Coupon',
        icon: 'add',
      });
    }
    this.helperService.actionButtonClick$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.addItem());
    this.helperService.filterButtonClick$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.openFilters());
    this.updateFilterButton();
  }
  ngOnDestroy(): void {
    this.helperService.clearActionButton();
    this.helperService.clearFilterButton();
    this.destroy$.next();
    this.destroy$.complete();
  }
  get filterFields(): FilterFieldDef[] {
    return [
      {
        key: 'status',
        label: 'Status',
        type: 'multiselect',
        options: Global.STATUS_OPTIONS,
      },
      {
        key: 'discount_type',
        label: 'Discount Type',
        type: 'select',
        options: [
          { value: 'percentage', label: 'Percentage' },
          { value: 'fixed', label: 'Fixed Amount' },
        ],
      },
      {
        key: 'validity',
        label: 'Validity Period',
        type: 'daterange',
        fromKey: 'from_date',
        toKey: 'to_date',
      },
    ];
  }
  filterCount(): number {
    let count = 0;
    if (this.filterValues['status']?.length) count++;
    if (this.filterValues['discount_type']) count++;
    if (this.filterValues['from_date'] || this.filterValues['to_date']) count++;
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
        this.filterOption.type = this.filterValues['discount_type'] || null;
        this.filterOption.from_date = this.filterValues['from_date'] || null;
        this.filterOption.to_date = this.filterValues['to_date'] || null;
        this.paginationOption.page = 1;
        this.fetchItems();
        this.updateFilterButton();
      });
  }
  openUsage(coupon: any = null): void {
    this.dialog.open(CouponUsageComponent, { data: coupon, width: '1200px', maxWidth: '96vw', autoFocus: false });
  }
  addItem(data: any = null) {
    this.dialog
      .open(NewCouponComponent, {
        data: data,
        disableClose: true,
      })
      .afterClosed()
      .subscribe((res: any) => {
        if (res) {
          this.fetchItems();
        }
      });
  }
  fetchItems() {
    let params = new URLSearchParams();
    if (this.paginationOption.page) {
      params.set('page', String(this.paginationOption.page));
    }
    if (this.filterOption.slug) {
      params.set('slug', this.filterOption.slug);
    }
    if (this.filterOption.search_key) {
      params.set('search_key', this.filterOption.search_key);
    }
    if (this.filterOption.status) {
      params.set('status', this.filterOption.status);
    }
    if (this.filterOption.type) {
      params.set('discount_type', this.filterOption.type);
    }
    if (this.filterOption.from_date) {
      params.set('from_date', this.filterOption.from_date);
    }
    if (this.filterOption.to_date) {
      params.set('to_date', this.filterOption.to_date);
    }
    this.inventoryService.couponList(params).subscribe({
      next: (res: any) => {
        this.item_list = res?.data?.docs ?? [];
        this.paginationOption = {
          ...res?.data,
        };
      },
      error: (err) => {},
    });
  }
  deleteItem(item: any) {
    this.inventoryService.deleteCoupon({ _id: item._id }).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.body?.message);
        this.fetchItems();
      },
      error: (err: any) => {},
    });
  }
  onPageChange(data: any) {
    this.paginationOption.page = data;
    this.fetchItems();
  }
  permissions: any = ['add', 'edit', 'delete'];
  checkPermission() {
    // this.settingService.checkPermission({ sec: 'award' }).subscribe({
    //   next: (res: any) => {
    //     const { permissions } = res?.results[0];
    //     this.permissions = permissions;
    //   },
    // });
  }
  lifecycle(item: any): string {
    if (item.status !== 'active') return 'Inactive';
    if (new Date(item.end_date).getTime() < Date.now()) return 'Expired';
    if (item.usage_limit != null && item.total_used >= item.usage_limit) return 'Exhausted';
    if (new Date(item.start_date).getTime() > Date.now()) return 'Scheduled';
    return 'Live';
  }
  updateStatus(item: any) {
    const currentStatus = item?.status;
    if (!item?._id || !currentStatus) {
      this.toastr.error('Invalid Coupon data');
      return;
    }

    // Toggle status
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    const dialogData: ConfirmDialogData = {
      title: 'Are you sure?',
      message: `Do you want to ${
        newStatus === 'active' ? 'activate' : 'deactivate'
      } the Coupon ${item?.code ?? ''}?`,
      cancelText: 'Cancel',
      saveText: 'Confirm',
    };

    this.dialogService.confirmDialog(dialogData).subscribe((result: any) => {
      if (result?.confirm) {
        this.inventoryService
          .submitCoupon({ _id: item._id, status: newStatus })
          .subscribe({
            next: (res: any) => {
              this.toastr.success(
                `Coupon ${
                  newStatus === 'active' ? 'activated' : 'deactivated'
                } successfully`
              );
              this.fetchItems();
            },
            error: (err: any) => {},
          });
      }
    });
  }
}
