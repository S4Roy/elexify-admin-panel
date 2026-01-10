import { CommonModule, CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import PaginationOptions from 'app/core/models/PaginationOptions';
import { MasterService } from 'app/core/services/master.service';
import { PaginationComponent } from 'app/layout/home-layout/includes/pagination/pagination.component';
import { ToastrService } from 'ngx-toastr';
import { MenuComponent } from 'app/layout/home-layout/includes/menu/menu.component';
import * as Global from 'app/global';
import { InventoryService } from 'app/core/services/inventory.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import FilterOptions from 'app/core/models/FilterOptions';
import { NewProductComponent } from './new-product/new-product.component';
import { StocksComponent } from './stocks/stocks.component';
import { MatIconModule } from '@angular/material/icon';
import { combineLatest } from 'rxjs';
import { HelpersService } from 'app/core/services/helpers.service';
import { DialogService } from 'app/core/services/dialog.service';
import { ConfirmDialogData } from 'app/layout/home-layout/includes/confirm-dialog/confirm-dialog.component';
import { SpecialButtonComponent } from 'app/layout/home-layout/includes/special-button/special-button.component';
import { A11yModule } from '@angular/cdk/a11y';
import { TruncateListDirective } from 'app/core/directives/truncate-list.directive';
@Component({
  selector: 'app-products',
  imports: [
    NgFor,
    NgIf,
    PaginationComponent,
    MenuComponent,
    RouterLink,
    MatIconModule,
    CurrencyPipe,
    CommonModule,
    SpecialButtonComponent,
    A11yModule,
    TruncateListDirective,
  ],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',
})
export class ProductsComponent {
  Global = Global;
  item_list: any = [];
  expanded = new Set<string>();

  paginationOption: PaginationOptions;
  filterOption: FilterOptions;
  public sortKey: string = 'created_at';
  public sortDirection: 'asc' | 'desc' = 'desc';
  constructor(
    private dialog: MatDialog,
    private inventoryService: InventoryService,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private router: Router,
    private helperService: HelpersService,
    private dialogService: DialogService
  ) {
    this.paginationOption = Global.resetPaginationOptions();
    this.filterOption = Global.resetTableFilterOptions();
    // this.checkPermission();
  }
  ngOnInit(): void {
    combineLatest([
      this.route.paramMap,
      this.route.queryParamMap,
      this.helperService.searchKey$,
    ]).subscribe(([params, queryParam, searchKey]) => {
      this.filterOption = Global.resetTableFilterOptions();
      this.filterOption.category = params.get('slug');
      this.filterOption.stock_status = queryParam.get('stock_status');
      this.filterOption.tags = queryParam.get('tags');
      this.filterOption.classifications = queryParam.get('classifications');
      this.filterOption.search_key = searchKey;
      this.paginationOption.page = 1;
      this.fetchProductList();
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
    this.fetchProductList();
  }
  getSortIcon(field: string): string {
    if (this.sortKey !== field) return 'sort-icon';
    return this.sortDirection === 'asc' ? 'sort-icon-up' : 'sort-icon-down';
  }
  addItem(data: any = null) {
    this.router.navigateByUrl(
      `/inventory/products/${data ? 'update/' + data?._id : 'add'}`
    );
    // this.dialog
    //   .open(NewProductComponent, {
    //     data: data,
    //     disableClose: true,
    //   })
    //   .afterClosed()
    //   .subscribe((res: any) => {
    //     if (res) {
    //       this.fetchProductList();
    //     }
    //   });
  }
  stockItem(data: any = null) {
    this.dialog
      .open(StocksComponent, {
        data: data,
        disableClose: true,
      })
      .afterClosed()
      .subscribe((res: any) => {
        if (res) {
          this.fetchProductList();
        }
      });
  }
  fetchProductList() {
    let params = new URLSearchParams({
      sort_by: this.sortKey,
      sort_order: this.sortDirection === 'asc' ? '1' : '-1',
    });
    if (this.paginationOption.page) {
      params.set('page', String(this.paginationOption.page));
    }
    if (this.filterOption.category) {
      params.set('category', this.filterOption.category);
    }
    if (this.filterOption.stock_status) {
      params.set('stock_status', this.filterOption.stock_status);
    }
    if (this.filterOption.search_key) {
      params.set('search_key', this.filterOption.search_key);
    }
    if (this.filterOption.tags) {
      params.set('tags', this.filterOption.tags);
    }
    if (this.filterOption.classifications) {
      params.set('classifications', this.filterOption.classifications);
    }
    this.inventoryService.productList(params).subscribe({
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
    this.inventoryService.deleteProduct({ _id: item._id }).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.body?.message);
        this.fetchProductList();
      },
      error: (err: any) => {},
    });
  }
  onPageChange(data: any) {
    this.paginationOption.page = data;
    this.fetchProductList();
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
  updateStatus(item: any) {
    const currentStatus = item?.status;
    if (!item?._id || !currentStatus) {
      this.toastr.error('Invalid product data');
      return;
    }

    // Toggle status
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    const dialogData: ConfirmDialogData = {
      title: 'Are you sure?',
      message: `Do you want to ${
        newStatus === 'active' ? 'activate' : 'deactivate'
      } the product ${item?.name ?? ''}?`,
      cancelText: 'Cancel',
      saveText: 'Confirm',
    };

    this.dialogService.confirmDialog(dialogData).subscribe((result: any) => {
      if (result?.confirm) {
        this.inventoryService
          .updateProductStatus({ _id: item._id, status: newStatus })
          .subscribe({
            next: (res: any) => {
              this.toastr.success(
                `Product ${
                  newStatus === 'active' ? 'activated' : 'deactivated'
                } successfully`
              );
              this.fetchProductList();
            },
            error: (err: any) => {},
          });
      }
    });
  }
  toggleExpand(productId: string | number | undefined) {
    if (!productId) return;
    const id = String(productId);
    if (this.expanded.has(id)) this.expanded.delete(id);
    else this.expanded.add(id);
    // trigger change detection if needed (usually not required)
  }

  isExpanded(productId: string | number | undefined): boolean {
    if (!productId) return false;
    return this.expanded.has(String(productId));
  }

  trackByVariant(index: number, variant: any) {
    return variant?._id || variant?.id || index;
  }
}
