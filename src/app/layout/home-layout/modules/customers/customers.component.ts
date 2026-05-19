import { Component } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'app/core/services/api.service';
import * as Global from 'app/global';
import { ActivatedRoute, Router } from '@angular/router';
import FilterOptions from 'app/core/models/FilterOptions';
import { HelpersService } from 'app/core/services/helpers.service';
import { Subject, combineLatest, takeUntil } from 'rxjs';
import { PaginationComponent } from '../../includes/pagination/pagination.component';
import { MenuComponent } from '../../includes/menu/menu.component';
import PaginationOptions from 'app/core/models/PaginationOptions';
import { NewCustomerComponent } from './new-customer/new-customer.component';
import { MatIconModule } from '@angular/material/icon';
import { DialogService } from 'app/core/services/dialog.service';
import { ConfirmDialogData } from '../../includes/confirm-dialog/confirm-dialog.component';
@Component({
  selector: 'app-customers',
  imports: [
    MenuComponent,
    NgFor,
    NgIf,
    PaginationComponent,
    DatePipe,
    MatIconModule,
  ],
  templateUrl: './customers.component.html',
  styleUrl: './customers.component.scss',
})
export class CustomersComponent {
  Global = Global;
  item_list: any = [];
  paginationOption: PaginationOptions;

  filterOption: FilterOptions;
  private destroy$ = new Subject<void>();

  constructor(
    private dialog: MatDialog,
    private apiService: ApiService,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private router: Router,
    private helperService: HelpersService,
    private dialogService: DialogService,
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
        this.fetchCutomerList();
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
    this.fetchCutomerList();
  }
  getSortIcon(field: string): string {
    if (this.sortKey !== field) return 'sort-icon';
    return this.sortDirection === 'asc' ? 'sort-icon-up' : 'sort-icon-down';
  }
  addItem(data: any = null) {
    this.dialog
      .open(NewCustomerComponent, {
        data: data,
        disableClose: true,
      })
      .afterClosed()
      .subscribe((res: any) => {
        if (res) {
          this.fetchCutomerList();
        }
      });
  }
  fetchCutomerList() {
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

    this.apiService.customerList(params).subscribe({
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
    // this.inventoryService.deleteProduct({ _id: item._id }).subscribe({
    //   next: (res: any) => {
    //     this.toastr.success(res?.body?.message);
    //     this.fetchCutomerList();
    //   },
    //   error: (err: any) => {},
    // });
  }
  onPageChange(data: any) {
    this.paginationOption.page = data;
    this.fetchCutomerList();
  }
  permissions: any = ['add', 'edit', 'delete'];

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  updateStatus(item: any) {
    const currentStatus = item?.status;
    if (!item?._id || !currentStatus) {
      this.toastr.error('Invalid Customer data');
      return;
    }

    // Toggle status
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    const dialogData: ConfirmDialogData = {
      title: 'Are you sure?',
      message: `Do you want to ${
        newStatus === 'active' ? 'activate' : 'deactivate'
      } the Customer ${item?.name ?? ''}?`,
      cancelText: 'Cancel',
      saveText: 'Confirm',
    };

    this.dialogService.confirmDialog(dialogData).subscribe((result: any) => {
      if (result?.confirm) {
        this.apiService
          .updateCustomerStatus({ _id: item._id, status: newStatus })
          .subscribe({
            next: (res: any) => {
              this.toastr.success(
                `Customer ${
                  newStatus === 'active' ? 'activated' : 'deactivated'
                } successfully`,
              );
              this.fetchCutomerList();
            },
            error: (err: any) => {},
          });
      }
    });
  }
}
