import { NgFor, NgIf } from '@angular/common';
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
import { MatIconModule } from '@angular/material/icon';
import { Subject, combineLatest, takeUntil } from 'rxjs';
import { HelpersService } from 'app/core/services/helpers.service';
import { NewSpecificationComponent } from './new-specification/new-specification.component';
import { ApiService } from 'app/core/services/api.service';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { DialogService } from 'app/core/services/dialog.service';
import { ConfirmDialogData } from 'app/layout/home-layout/includes/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../includes/empty-state/empty-state.component';
import { FilterFieldDef } from 'app/core/models/FilterFieldDef';
import { FilterDrawerComponent } from '../../../includes/filter-drawer/filter-drawer.component';

@Component({
  selector: 'app-specifications',
  imports: [
    EmptyStateComponent,
    NgFor,
    NgIf,
    PaginationComponent,
    MenuComponent,
    MatIconModule,
    CdkDropList,
    CdkDrag,
  ],
  templateUrl: './specifications.component.html',
  styleUrl: './specifications.component.scss',
})
export class SpecificationsComponent {
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
    private helperService: HelpersService,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private dialogService: DialogService
  ) {
    this.paginationOption = Global.resetPaginationOptions();
    this.filterOption = Global.resetTableFilterOptions();
    combineLatest([
      this.route.paramMap,
      this.helperService.searchKey$,
    ]).subscribe(([params, searchKey]) => {
      this.filterOption = Global.resetTableFilterOptions();
      this.filterOption.slug = params.get('slug');
      this.filterOption.search_key = searchKey;
      this.paginationOption.page = 1;
      this.fetchClassification();
    });
  }
  ngOnInit(): void {
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
        this.fetchClassification();
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
      .open(NewSpecificationComponent, {
        data: data,
        disableClose: true,
      })
      .afterClosed()
      .subscribe((res: any) => {
        if (res) {
          this.fetchClassification();
        }
      });
  }
  fetchClassification() {
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
    this.apiService.specificationList(params).subscribe({
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
    this.apiService.deleteSpecification({ _id: item._id }).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.body?.message);
        this.fetchClassification();
      },
      error: (err: any) => {},
    });
  }
  onPageChange(data: any) {
    this.paginationOption.page = data;
    this.fetchClassification();
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
  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.item_list, event.previousIndex, event.currentIndex);
    const payload = this.helperService.makeSortPayload(
      this.item_list,
      this.paginationOption
    );
    this.updateSortOrder(payload);
  }
  updateSortOrder(payload: any[]) {
    this.apiService.updateSpecSortOrder({ items: payload }).subscribe({
      next: (res) => {
        this.toastr.success(res?.message);
      },
    });
  }
  updateStatus(item: any) {
    const currentStatus = item?.status;
    if (!item?._id || !currentStatus) {
      this.toastr.error('Invalid Specification data');
      return;
    }

    // Toggle status
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    const dialogData: ConfirmDialogData = {
      title: 'Are you sure?',
      message: `Do you want to ${
        newStatus === 'active' ? 'activate' : 'deactivate'
      } the Specification ${item?.label ?? ''}?`,
      cancelText: 'Cancel',
      saveText: 'Confirm',
    };

    this.dialogService.confirmDialog(dialogData).subscribe((result: any) => {
      if (result?.confirm) {
        this.apiService
          .submitSpecification({ _id: item._id, status: newStatus })
          .subscribe({
            next: (res: any) => {
              this.toastr.success(
                `Specification ${
                  newStatus === 'active' ? 'activated' : 'deactivated'
                } successfully`
              );
              this.fetchClassification();
            },
            error: (err: any) => {},
          });
      }
    });
  }
}
