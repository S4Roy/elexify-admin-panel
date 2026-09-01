import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ApiService } from 'app/core/services/api.service';
import { HelpersService } from 'app/core/services/helpers.service';
import * as Global from 'app/global';
import FilterOptions from 'app/core/models/FilterOptions';
import { FilterFieldDef } from 'app/core/models/FilterFieldDef';
import { FilterDrawerComponent } from '../../../../includes/filter-drawer/filter-drawer.component';
import { EmptyStateComponent } from '../../../../includes/empty-state/empty-state.component';
import { SeedRunDialogComponent } from '../../../../includes/seed-run-dialog/seed-run-dialog.component';

const MARKETING_OPTIONS = [
  { value: 'yes', label: 'Marketing' },
  { value: 'no', label: 'Transactional' },
];

@Component({
  selector: 'app-email-templates-list',
  imports: [NgFor, NgIf, DatePipe, EmptyStateComponent],
  templateUrl: './email-templates-list.component.html',
  styleUrl: './email-templates-list.component.scss',
})
export class EmailTemplatesListComponent implements OnInit, OnDestroy {
  templateList: any[] = [];
  loading = true;

  filterOption: FilterOptions;
  filterValues: Record<string, any> = {
    status: [],
    is_marketing: null,
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
    const role = this.helperService.role();
    return role === 'superadmin' || role === 'manager';
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

    if (this.isPrivileged) {
      this.helperService.setActionButton({ label: 'Run Seed', icon: 'sync' });
      this.helperService.actionButtonClick$
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.openSeedRun());
    }
  }

  ngOnDestroy(): void {
    this.helperService.clearFilterButton();
    this.helperService.clearActionButton();
    this.destroy$.next();
    this.destroy$.complete();
  }

  openSeedRun(): void {
    this.dialog
      .open(SeedRunDialogComponent, { disableClose: true })
      .afterClosed()
      .subscribe(() => this.fetchTemplateList());
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
        key: 'is_marketing',
        label: 'Type',
        type: 'select',
        options: MARKETING_OPTIONS,
      },
    ];
  }

  filterCount(): number {
    let count = 0;
    if (this.filterValues['status']?.length) count++;
    if (this.filterValues['is_marketing']) count++;
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
        this.filterOption.is_marketing = this.filterValues['is_marketing'] || null;
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
    if (this.filterOption.is_marketing) {
      params.set('is_marketing', this.filterOption.is_marketing);
    }
    this.apiService.emailTemplateList(params).subscribe({
      next: (res: any) => {
        this.templateList = res?.data ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  editTemplate(action: string) {
    this.router.navigateByUrl(`/settings/email-templates/${action}`);
  }
}
