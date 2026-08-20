import { Component } from '@angular/core';
import {
  DatePipe,
  NgFor,
  NgIf,
  TitleCasePipe,
  UpperCasePipe,
} from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'app/core/services/api.service';
import * as Global from 'app/global';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import FilterOptions from 'app/core/models/FilterOptions';
import { FilterFieldDef } from 'app/core/models/FilterFieldDef';
import { HelpersService } from 'app/core/services/helpers.service';
import { Subject, combineLatest, takeUntil } from 'rxjs';
import { PaginationComponent } from '../../includes/pagination/pagination.component';
import { MenuComponent } from '../../includes/menu/menu.component';
import PaginationOptions from 'app/core/models/PaginationOptions';
import { MatIconModule } from '@angular/material/icon';
import { ReadMoreClampDirective } from 'app/core/directives/read-more-clamp.directive';
import { DialogService } from 'app/core/services/dialog.service';
import { ConfirmDialogData } from '../../includes/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../includes/empty-state/empty-state.component';
import { FilterDrawerComponent } from '../../includes/filter-drawer/filter-drawer.component';
@Component({
  selector: 'app-blogs',
  imports: [
    EmptyStateComponent,
    MenuComponent,
    NgFor,
    NgIf,
    PaginationComponent,
    MatIconModule,
    ReadMoreClampDirective,
    RouterModule,
  ],
  templateUrl: './blogs.component.html',
  styleUrl: './blogs.component.scss',
})
export class BlogsComponent {
  Global = Global;
  item_list: any = [];
  paginationOption: PaginationOptions;
  filterOption: FilterOptions;
  filterValues: Record<string, any> = {
    status: [],
    from_date: null,
    to_date: null,
  };
  private destroy$ = new Subject<void>();
  constructor(
    private dialog: MatDialog,
    private apiService: ApiService,
    private helperService: HelpersService,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private router: Router,
    private dialogService: DialogService
  ) {
    this.paginationOption = Global.resetPaginationOptions();
    this.filterOption = Global.resetTableFilterOptions();
    combineLatest([
      this.route.paramMap,
      this.helperService.searchKey$,
    ]).subscribe(([params, searchKey]) => {
      this.filterOption = Global.resetTableFilterOptions();
      this.filterOption.search_key = searchKey;
      this.paginationOption.page = 1;
      this.fetchBlogList();
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
        key: 'created_at',
        label: 'Created Date',
        type: 'daterange',
        fromKey: 'from_date',
        toKey: 'to_date',
      },
    ];
  }
  filterCount(): number {
    let count = 0;
    if (this.filterValues['status']?.length) count++;
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
        this.filterOption.from_date = this.filterValues['from_date'] || null;
        this.filterOption.to_date = this.filterValues['to_date'] || null;
        this.paginationOption.page = 1;
        this.fetchBlogList();
        this.updateFilterButton();
      });
  }

  fetchBlogList() {
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
    if (this.filterOption.from_date) {
      params.set('from_date', this.filterOption.from_date);
    }
    if (this.filterOption.to_date) {
      params.set('to_date', this.filterOption.to_date);
    }
    this.apiService.blogList(params).subscribe({
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
    this.apiService.deleteBlog({ _id: item._id }).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.body?.message);
        this.fetchBlogList();
      },
      error: (err: any) => {},
    });
  }
  onPageChange(data: any) {
    this.paginationOption.page = data;
    this.fetchBlogList();
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
  addItem(data: any = null) {
    this.router.navigateByUrl(`/blogs/${data ? 'update/' + data?._id : 'add'}`);
  }
  updateStatus(item: any) {
    const currentStatus = item?.status;
    if (!item?._id || !currentStatus) {
      this.toastr.error('Invalid Blog data');
      return;
    }

    // Toggle status
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    const dialogData: ConfirmDialogData = {
      title: 'Are you sure?',
      message: `Do you want to ${
        newStatus === 'active' ? 'activate' : 'deactivate'
      } the Blog ${item?.title ?? ''}?`,
      cancelText: 'Cancel',
      saveText: 'Confirm',
    };

    this.dialogService.confirmDialog(dialogData).subscribe((result: any) => {
      if (result?.confirm) {
        this.apiService
          .submiBlog({ _id: item._id, status: newStatus })
          .subscribe({
            next: (res: any) => {
              this.toastr.success(
                `Blog ${
                  newStatus === 'active' ? 'activated' : 'deactivated'
                } successfully`
              );
              this.fetchBlogList();
            },
            error: (err: any) => {},
          });
      }
    });
  }
}
