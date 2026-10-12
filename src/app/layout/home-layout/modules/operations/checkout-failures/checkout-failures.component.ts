import { DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';
import { ApiService } from 'app/core/services/api.service';
import { HelpersService } from 'app/core/services/helpers.service';
import * as Global from 'app/global';
import { FilterFieldDef } from 'app/core/models/FilterFieldDef';
import PaginationOptions from 'app/core/models/PaginationOptions';
import { FilterDrawerComponent } from '../../../includes/filter-drawer/filter-drawer.component';
import { PaginationComponent } from '../../../includes/pagination/pagination.component';
import { EmptyStateComponent } from '../../../includes/empty-state/empty-state.component';
import { CheckoutFailureDetailDialogComponent, STAGE_LABELS } from './checkout-failure-detail-dialog/checkout-failure-detail-dialog.component';

// Failed order placements / payment verifications recorded by the backend's
// logCheckoutFailure() — "warning" is an expected rejection the customer saw
// (out of stock, total changed, coupon…), "error" is a server-side failure.
@Component({
  selector: 'app-checkout-failures',
  imports: [NgIf, NgFor, NgClass, DatePipe, PaginationComponent, EmptyStateComponent],
  templateUrl: './checkout-failures.component.html',
})
export class CheckoutFailuresComponent implements OnInit, OnDestroy {
  itemList: any[] = [];
  paginationOption: PaginationOptions;
  loading = true;

  filterValues: Record<string, any> = {
    stage: [],
    level: null,
    search_key: null,
    from_date: null,
    to_date: null,
  };
  private destroy$ = new Subject<void>();

  constructor(
    private dialog: MatDialog,
    private apiService: ApiService,
    public helperService: HelpersService,
  ) {
    this.paginationOption = Global.resetPaginationOptions();
  }

  ngOnInit(): void {
    this.helperService.filterButtonClick$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.openFilters());
    this.updateFilterButton();
    this.fetchList();
  }

  ngOnDestroy(): void {
    this.helperService.clearFilterButton();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filterFields(): FilterFieldDef[] {
    return [
      {
        key: 'stage',
        label: 'Stage',
        type: 'multiselect',
        placeholder: 'All stages',
        showCheckboxes: true,
        options: Object.entries(STAGE_LABELS).map(([value, label]) => ({ value, label })),
      },
      {
        key: 'level',
        label: 'Severity',
        type: 'select',
        options: [
          { value: 'warning', label: 'Rejected (warning)' },
          { value: 'error', label: 'Server error' },
        ],
      },
      {
        key: 'search_key',
        label: 'Search',
        type: 'text',
        placeholder: 'Customer, reason, order or payment ID…',
      },
      {
        key: 'created_at',
        label: 'Date',
        type: 'daterange',
        fromKey: 'from_date',
        toKey: 'to_date',
      },
    ];
  }

  filterCount(): number {
    let count = 0;
    if (this.filterValues['stage']?.length) count++;
    if (this.filterValues['level']) count++;
    if (this.filterValues['search_key']) count++;
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
        this.paginationOption.page = 1;
        this.fetchList();
        this.updateFilterButton();
      });
  }

  fetchList() {
    this.loading = true;
    const params = new URLSearchParams();
    const f = this.filterValues;
    if (f['stage']?.length) params.set('stage', f['stage'].join(','));
    if (f['level']) params.set('level', f['level']);
    if (f['search_key']) params.set('search', f['search_key']);
    if (f['from_date']) params.set('from', f['from_date']);
    if (f['to_date']) params.set('to', f['to_date']);
    if (this.paginationOption.limit) params.set('limit', String(this.paginationOption.limit));
    if (this.paginationOption.page) params.set('page', String(this.paginationOption.page));

    this.apiService.checkoutFailures(params).subscribe({
      next: (res: any) => {
        this.itemList = res?.data?.docs ?? [];
        this.paginationOption = { ...res?.data };
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  onPageChange(page: number) {
    this.paginationOption.page = page;
    this.fetchList();
  }

  stageLabel(stage: string): string {
    return STAGE_LABELS[stage] ?? Global.humanize(stage || '');
  }

  levelClass(level: string): string {
    return level === 'error' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800';
  }

  viewDetails(item: any): void {
    // Avoid stacking dialogs on a double-click.
    this.dialog.closeAll();
    this.dialog.open(CheckoutFailureDetailDialogComponent, {
      width: '680px',
      maxWidth: '96vw',
      maxHeight: '90vh',
      data: { entry: item },
    });
  }
}
