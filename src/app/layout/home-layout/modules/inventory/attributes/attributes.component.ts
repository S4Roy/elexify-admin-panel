import { NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, ActivatedRoute } from '@angular/router';
import FilterOptions from 'app/core/models/FilterOptions';
import { FilterFieldDef } from 'app/core/models/FilterFieldDef';
import PaginationOptions from 'app/core/models/PaginationOptions';
import { HelpersService } from 'app/core/services/helpers.service';
import { InventoryService } from 'app/core/services/inventory.service';
import { PaginationComponent } from 'app/layout/home-layout/includes/pagination/pagination.component';
import { ToastrService } from 'ngx-toastr';
import { Subject, combineLatest, takeUntil } from 'rxjs';
import { MenuComponent } from 'app/layout/home-layout/includes/menu/menu.component';
import * as Global from 'app/global';
import { NewAttributeComponent } from './new-attribute/new-attribute.component';
import { EmptyStateComponent } from '../../../includes/empty-state/empty-state.component';
import { FilterDrawerComponent } from '../../../includes/filter-drawer/filter-drawer.component';

@Component({
  selector: 'app-attributes',
  imports: [EmptyStateComponent, NgFor, NgIf, PaginationComponent, MenuComponent, MatIconModule],
  templateUrl: './attributes.component.html',
  styleUrl: './attributes.component.scss',
})
export class AttributesComponent {
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
        this.filterOption.slug = params.get('slug');
        this.filterOption.search_key = searchKey;
        this.paginationOption.page = 1;
        this.fetchAttributeList();
      });
    if (this.permissions.includes('add')) {
      this.helperService.setActionButton({ label: 'Add New', icon: 'add' });
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
        this.fetchAttributeList();
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
      .open(NewAttributeComponent, {
        data: data,
        disableClose: true,
      })
      .afterClosed()
      .subscribe((res: any) => {
        if (res) {
          this.fetchAttributeList();
        }
      });
  }
  fetchAttributeList() {
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
    this.inventoryService.attributeList(params).subscribe({
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
    this.inventoryService.deleteAttribute({ _id: item._id }).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.body?.message);
        this.fetchAttributeList();
      },
      error: (err: any) => {},
    });
  }
  onPageChange(data: any) {
    this.paginationOption.page = data;
    this.fetchAttributeList();
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
}
