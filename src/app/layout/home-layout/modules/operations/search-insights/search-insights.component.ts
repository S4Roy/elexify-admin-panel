import { DatePipe, NgFor, NgIf } from '@angular/common';
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


@Component({
  selector: 'app-search-insights',
  imports: [NgIf, NgFor, DatePipe, PaginationComponent, EmptyStateComponent],
  templateUrl: './search-insights.component.html',
})
export class SearchInsightsComponent implements OnInit, OnDestroy {
  itemList: any[] = [];
  paginationOption: PaginationOptions;
  loading = true;
  error = false;
  summary = { searches: 0, zero_results: 0 };

  filterValues: Record<string, any> = {
    zero_results: null,
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
      { key: 'zero_results', label: 'Results', type: 'select', options: [{ value: 'true', label: 'Queries with no-result searches' }] },
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
    if (this.filterValues['zero_results']) count++;
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
    this.error = false;
    const params = new URLSearchParams();
    const f = this.filterValues;
    if (f['zero_results']) params.set('zero_results', f['zero_results']);
    if (f['from_date']) params.set('from', f['from_date']);
    if (f['to_date']) params.set('to', f['to_date']);
    if (this.paginationOption.limit) params.set('limit', String(this.paginationOption.limit));
    if (this.paginationOption.page) params.set('page', String(this.paginationOption.page));

    this.apiService.searchInsights(params).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.summary = res?.data?.summary ?? { searches: 0, zero_results: 0 };
        this.itemList = res?.data?.docs ?? [];
        this.paginationOption = { ...res?.data };
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      },
    });
  }

  onPageChange(page: number) {
    this.paginationOption.page = page;
    this.fetchList();
  }

}
