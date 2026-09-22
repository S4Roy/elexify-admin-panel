import { inject as injectPermissions } from '@angular/core';
import { PermissionService } from 'app/core/services/permission.service';
import { EmptyStateComponent } from '../../includes/empty-state/empty-state.component';
import { Component } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'app/core/services/api.service';
import * as Global from 'app/global';
import { ActivatedRoute } from '@angular/router';
import FilterOptions from 'app/core/models/FilterOptions';
import { FilterFieldDef } from 'app/core/models/FilterFieldDef';
import { HelpersService } from 'app/core/services/helpers.service';
import { Subject, Subscription, combineLatest, takeUntil } from 'rxjs';
import { PaginationComponent } from '../../includes/pagination/pagination.component';
import { MenuComponent } from '../../includes/menu/menu.component';
import PaginationOptions from 'app/core/models/PaginationOptions';
import { MatIconModule } from '@angular/material/icon';
import { UpdateContactUsComponent } from './update-contact-us/update-contact-us.component';
import { FilterDrawerComponent } from '../../includes/filter-drawer/filter-drawer.component';

@Component({
  selector: 'app-contact-us',
  imports: [
    EmptyStateComponent,
    MenuComponent,
    NgFor,
    NgIf,
    PaginationComponent,
    MatIconModule,
    DatePipe,
  ],
  templateUrl: './contact-us.component.html',
  styleUrl: './contact-us.component.scss',
})
export class ContactUsComponent {
  Global = Global;
  loading = false;
  error = '';
  readonly statuses = ['pending', 'answered', 'archived', 'spam'];
  private listRequest?: Subscription;

  get activeStatus(): string { return this.filterValues['status']?.length === 1 ? this.filterValues['status'][0] : ''; }
  setStatus(status: string): void {
    this.filterValues['status'] = status ? [status] : [];
    this.filterOption.status = status || null;
    this.paginationOption.page = 1;
    this.updateFilterButton();
    this.fetchEnquiries();
  }
  messagePreview(message: string): string { return (message || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }

  item_list: any = [];
  paginationOption: PaginationOptions;
  filterOption: FilterOptions;
  // Working filter values, keyed to match filterFields below — handed to
  // the (page-agnostic) filter drawer and read back from it.
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
    private toastr: ToastrService
  ) {
    this.paginationOption = Global.resetPaginationOptions();
    this.filterOption = Global.resetTableFilterOptions();
    combineLatest([
      this.route.paramMap,
      this.helperService.searchKey$,
    ]).pipe(takeUntil(this.destroy$)).subscribe(([params, searchKey]) => {
      this.filterOption.slug = params.get('slug');
      this.filterOption.search_key = searchKey;
      this.paginationOption.page = 1;
      this.fetchEnquiries();
    });
  }
  ngOnInit(): void {
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
        options: [
          { value: 'pending', label: 'Pending' },
          { value: 'answered', label: 'Answered' },
          { value: 'archived', label: 'Archived' },
          { value: 'spam', label: 'Spam' },
        ],
      },
      {
        key: 'created_at',
        label: 'Submitted Date',
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
        this.fetchEnquiries();
        this.updateFilterButton();
      });
  }

  fetchEnquiries() {
    this.listRequest?.unsubscribe();
    this.loading = true;
    this.error = '';
    let params = new URLSearchParams();
    if (this.paginationOption.limit) params.set('limit', String(this.paginationOption.limit));
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
    if (this.filterOption.from_date) {
      params.set('from_date', this.filterOption.from_date);
    }
    if (this.filterOption.to_date) {
      params.set('to_date', this.filterOption.to_date);
    }
    this.listRequest = this.apiService.contactUsList(params).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.item_list = res?.data?.docs ?? [];
        this.paginationOption = {
          ...res?.data,
        };
      },
      error: () => { this.loading = false; this.error = 'Unable to load enquiries. Please try again.'; },
    });
  }
  updateStatus(item: any) {
    this.dialog
      .open(UpdateContactUsComponent, {
        data: item,
        width: '680px',
        maxWidth: '95vw',
        maxHeight: '90vh',
      })
      .afterClosed()
      .subscribe((res: any) => {
        if (res) {
          this.fetchEnquiries();
        }
      });
  }
  deleteItem(item: any) {
    this.apiService.deleteContactUs({ _id: item._id }).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.body?.message);
        this.fetchEnquiries();
      },
      error: () => this.toastr.error('Unable to delete enquiry. Please try again.'),
    });
  }
  onPageChange(data: any) {
    this.paginationOption.page = data;
    this.fetchEnquiries();
  }
  private readonly access = injectPermissions(PermissionService);
  get permissions(): string[] { return this.access.actions('contacts'); }
  checkPermission() {
    // this.settingService.checkPermission({ sec: 'award' }).subscribe({
    //   next: (res: any) => {
    //     const { permissions } = res?.results[0];
    //     this.permissions = permissions;
    //   },
    // });
  }
  ngOnDestroy(): void {
    this.listRequest?.unsubscribe();
    this.helperService.clearFilterButton();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
