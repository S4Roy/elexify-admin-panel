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
import { Subject, Subscription, combineLatest, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { PaginationComponent } from '../../includes/pagination/pagination.component';
import { MenuComponent } from '../../includes/menu/menu.component';
import PaginationOptions from 'app/core/models/PaginationOptions';
import { InventoryService } from 'app/core/services/inventory.service';
import { MatIconModule } from '@angular/material/icon';
import { ReadMoreClampDirective } from 'app/core/directives/read-more-clamp.directive';
import { UpdateRatingStatusComponent } from './update-rating-status/update-rating-status.component';
import { EmptyStateComponent } from '../../includes/empty-state/empty-state.component';
import { FilterDrawerComponent } from '../../includes/filter-drawer/filter-drawer.component';

@Component({
  selector: 'app-rating-reveiws',
  imports: [
    EmptyStateComponent,
    MenuComponent,
    NgFor,
    NgIf,
    PaginationComponent,
    MatIconModule,
    ReadMoreClampDirective,
  ],
  templateUrl: './rating-reveiws.component.html',
  styleUrl: './rating-reveiws.component.scss',
})
export class RatingReveiwsComponent {
  Global = Global;
  item_list: any = [];
  loading = false;
  loadError = false;
  private ratingRequest?: Subscription;
  paginationOption: PaginationOptions;
  filterOption: FilterOptions;
  filterValues: Record<string, any> = {
    import_source: null,
    status: [],
    rating: [],
  };
  private destroy$ = new Subject<void>();
  constructor(
    private dialog: MatDialog,
    private apiService: ApiService,
    private helperService: HelpersService,
    private route: ActivatedRoute,
    private toastr: ToastrService
  ) {
    this.paginationOption = Global.resetPaginationOptions();
    this.filterOption = Global.resetTableFilterOptions();
    combineLatest([
      this.route.paramMap,
      this.helperService.searchKey$.pipe(debounceTime(250), distinctUntilChanged()),
    ]).pipe(takeUntil(this.destroy$)).subscribe(([params, searchKey]) => {
      this.filterOption.slug = params.get('slug');
      this.filterOption.search_key = searchKey;
      this.paginationOption.page = 1;
      this.fetchRating();
    });
  }
  ngOnInit(): void {
    this.helperService.filterButtonClick$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.openFilters());
    this.updateFilterButton();
  }
  ngOnDestroy(): void {
    this.ratingRequest?.unsubscribe();
    this.helperService.clearFilterButton();
    this.destroy$.next();
    this.destroy$.complete();
  }
  get filterFields(): FilterFieldDef[] {
    return [
      {
        key: 'import_source', label: 'Import source', type: 'select',
        options: [
          { value: '', label: 'All records' },
          { value: 'backup', label: 'WooCommerce backup import' },
          { value: 'other', label: 'Other records' },
        ],
      },
      {
        key: 'status',
        label: 'Status',
        type: 'multiselect',
        options: [
          { value: 'pending', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' },
        ],
      },
      {
        key: 'rating',
        label: 'Rating',
        type: 'multiselect',
        options: [
          { value: '1', label: '1 Star' },
          { value: '2', label: '2 Stars' },
          { value: '3', label: '3 Stars' },
          { value: '4', label: '4 Stars' },
          { value: '5', label: '5 Stars' },
        ],
      },
    ];
  }
  filterCount(): number {
    let count = 0;
    if (this.filterValues['import_source']) count++;
    if (this.filterValues['status']?.length) count++;
    if (this.filterValues['rating']?.length) count++;
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
        this.filterOption.rating = this.filterValues['rating']
          ?.length
          ? this.filterValues['rating'].join(',')
          : null;
        this.paginationOption.page = 1;
        this.fetchRating();
        this.updateFilterButton();
      });
  }

  fetchRating() {
    this.ratingRequest?.unsubscribe();
    this.loading = true;
    this.loadError = false;
    let params = new URLSearchParams();
    params.set("limit", "20");
    if (this.filterValues['import_source']) params.set('import_source', this.filterValues['import_source']);
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
    if (this.filterOption.rating) {
      params.set('rating', this.filterOption.rating);
    }
    this.ratingRequest = this.apiService.ratingList(params).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.item_list = res?.data?.docs ?? [];
        this.paginationOption = {
          ...res?.data,
        };
      },
      error: () => { this.loading = false; this.loadError = true; },
    });
  }
  updateStatus(item: any) {
    this.dialog
      .open(UpdateRatingStatusComponent, {
        data: item,
        width: '400px',
      })
      .afterClosed()
      .subscribe((res: any) => {
        if (res) {
          this.fetchRating();
        }
      });
  }
  deleteItem(item: any) {
    this.apiService.deleteRating({ _id: item._id }).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.body?.message);
        this.fetchRating();
      },
      error: (err: any) => {},
    });
  }
  onPageChange(data: any) {
    this.paginationOption.page = data;
    this.fetchRating();
  }
  private readonly access = injectPermissions(PermissionService);
  get permissions(): string[] { return this.access.actions('ratings'); }
  checkPermission() {
    // this.settingService.checkPermission({ sec: 'award' }).subscribe({
    //   next: (res: any) => {
    //     const { permissions } = res?.results[0];
    //     this.permissions = permissions;
    //   },
    // });
  }
}
