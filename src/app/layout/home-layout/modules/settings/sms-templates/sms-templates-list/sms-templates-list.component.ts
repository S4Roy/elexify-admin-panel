import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ApiService } from 'app/core/services/api.service';
import { HelpersService } from 'app/core/services/helpers.service';
import * as Global from 'app/global';
import FilterOptions from 'app/core/models/FilterOptions';
import { FilterFieldDef } from 'app/core/models/FilterFieldDef';
import { FilterDrawerComponent } from '../../../../includes/filter-drawer/filter-drawer.component';
import { EmptyStateComponent } from '../../../../includes/empty-state/empty-state.component';
import { MatDialog } from '@angular/material/dialog';

const CATEGORY_OPTIONS = [
  { value: 'transactional', label: 'Transactional' },
  { value: 'otp', label: 'OTP' },
  { value: 'security', label: 'Security' },
  { value: 'marketing', label: 'Marketing' },
];

@Component({
  selector: 'app-sms-templates-list',
  imports: [NgFor, NgIf, DatePipe, EmptyStateComponent],
  templateUrl: './sms-templates-list.component.html',
  styleUrl: './sms-templates-list.component.scss',
})
export class SmsTemplatesListComponent implements OnInit, OnDestroy {
  templateList: any[] = [];
  loading = true;

  filterOption: FilterOptions;
  filterValues: Record<string, any> = {
    status: [],
    category: [],
  };
  private destroy$ = new Subject<void>();

  constructor(
    private dialog: MatDialog,
    private apiService: ApiService,
    private router: Router,
    public helperService: HelpersService,
  ) {
    this.filterOption = Global.resetTableFilterOptions();
  }

  get isPrivileged(): boolean {
    return this.helperService.can('sms_template.manage');
  }

  ngOnInit(): void {
    this.helperService.searchKey$
      .pipe(takeUntil(this.destroy$))
      .subscribe((searchKey) => {
        this.filterOption.search_key = searchKey;
        this.fetchTemplateList();
      });
    this.helperService.filterButtonClick$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.openFilters());
    this.updateFilterButton();
  }

  ngOnDestroy(): void {
    this.helperService.clearFilterButton();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Every DLT-approved template needs to already exist as a code default
  // (constants/smsTemplateDefaults.js) before it can be seeded — unlike
  // email templates, there's no "run seed" action here since a fabricated
  // SMS template would send unapproved text through the DLT route. New
  // templates go through Data Operations once their defaults are added.
  viewInDataOperations(): void {
    this.router.navigateByUrl('/settings/data-operations/operations/sms-templates');
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
        key: 'category',
        label: 'Category',
        type: 'multiselect',
        options: CATEGORY_OPTIONS,
      },
    ];
  }

  filterCount(): number {
    let count = 0;
    if (this.filterValues['status']?.length) count++;
    if (this.filterValues['category']?.length) count++;
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
        this.filterOption.category = this.filterValues['category']?.length
          ? this.filterValues['category'].join(',')
          : null;
        this.fetchTemplateList();
        this.updateFilterButton();
      });
  }

  fetchTemplateList() {
    this.loading = true;
    const params = new URLSearchParams();
    if (this.filterOption.search_key) {
      params.set('search', this.filterOption.search_key);
    }
    if (this.filterOption.status) {
      params.set('status', this.filterOption.status);
    }
    if (this.filterOption.category) {
      params.set('category', this.filterOption.category);
    }
    this.apiService.smsTemplateList(params).subscribe({
      next: (res: any) => {
        this.templateList = res?.data ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  editTemplate(event: string) {
    this.router.navigateByUrl(`/settings/sms-templates/${event}`);
  }
}
