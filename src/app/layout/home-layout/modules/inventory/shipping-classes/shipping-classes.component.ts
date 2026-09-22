import { inject as injectPermissions } from '@angular/core';
import { PermissionService } from 'app/core/services/permission.service';
import { NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import PaginationOptions from 'app/core/models/PaginationOptions';
import { PaginationComponent } from 'app/layout/home-layout/includes/pagination/pagination.component';
import { ToastrService } from 'ngx-toastr';
import { MenuComponent } from 'app/layout/home-layout/includes/menu/menu.component';
import * as Global from 'app/global';
import { InventoryService } from 'app/core/services/inventory.service';
import { ActivatedRoute } from '@angular/router';
import FilterOptions from 'app/core/models/FilterOptions';
import { FilterFieldDef } from 'app/core/models/FilterFieldDef';
import { MatIconModule } from '@angular/material/icon';
import { Subject, combineLatest, takeUntil } from 'rxjs';
import { HelpersService } from 'app/core/services/helpers.service';
import { NewShippingClassComponent } from './new-shipping-class/new-shipping-class.component';
import { EmptyStateComponent } from '../../../includes/empty-state/empty-state.component';
import { FilterDrawerComponent } from '../../../includes/filter-drawer/filter-drawer.component';

@Component({
  selector: 'app-shipping-classes',
  imports: [
    EmptyStateComponent,
    NgFor,
    NgIf,
    PaginationComponent,
    MenuComponent,
    MatIconModule,
  ],
  templateUrl: './shipping-classes.component.html',
  styleUrl: './shipping-classes.component.scss',
})
export class ShippingClassesComponent {
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
    private inventoryService: InventoryService,
    private helperService: HelpersService,
    private route: ActivatedRoute,
    private toastr: ToastrService
  ) {
    this.paginationOption = Global.resetPaginationOptions();
    this.filterOption = Global.resetTableFilterOptions();
  }
  ngOnInit(): void {
    combineLatest([this.route.paramMap, this.helperService.searchKey$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([params, searchKey]) => {
        this.filterOption = Global.resetTableFilterOptions();
        this.filterOption.search_key = searchKey;
        this.paginationOption.page = 1;
        this.fetchShippingClasses();
      });
    if (this.permissions.includes('add')) {
      this.helperService.setActionButton({
        label: 'Add New',
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
        this.fetchShippingClasses();
        this.updateFilterButton();
      });
  }
  ngOnDestroy(): void {
    this.helperService.clearActionButton();
    this.helperService.clearFilterButton();
    this.destroy$.next();
    this.destroy$.complete();
  }
  addItem(data: any = null) {
    this.dialog
      .open(NewShippingClassComponent, {
        data: data,
        disableClose: true,
      })
      .afterClosed()
      .subscribe((res: any) => {
        if (res) {
          this.fetchShippingClasses();
        }
      });
  }
  fetchShippingClasses() {
    let params = new URLSearchParams();
    if (this.paginationOption.page) {
      params.set('page', String(this.paginationOption.page));
    }
    if (this.filterOption.search_key) {
      params.set('search_key', this.filterOption.search_key);
    }
    if (this.filterOption.status) {
      params.set('status', this.filterOption.status);
    }
    this.inventoryService.shippingClassList(params).subscribe({
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
    this.inventoryService.deleteShippingClass({ _id: item._id }).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.body?.message);
        this.fetchShippingClasses();
      },
      error: (err: any) => {},
    });
  }
  onPageChange(data: any) {
    this.paginationOption.page = data;
    this.fetchShippingClasses();
  }
  private readonly access = injectPermissions(PermissionService);
  get permissions(): string[] { return this.access.actions('shipping_classes'); }
}
