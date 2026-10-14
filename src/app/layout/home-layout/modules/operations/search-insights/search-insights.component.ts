import { DatePipe, DecimalPipe, NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, firstValueFrom, takeUntil } from 'rxjs';
import { ApiService } from 'app/core/services/api.service';
import { HelpersService } from 'app/core/services/helpers.service';
import * as Global from 'app/global';
import { FilterFieldDef } from 'app/core/models/FilterFieldDef';
import PaginationOptions from 'app/core/models/PaginationOptions';
import { FilterDrawerComponent } from '../../../includes/filter-drawer/filter-drawer.component';
import { PaginationComponent } from '../../../includes/pagination/pagination.component';
import { EmptyStateComponent } from '../../../includes/empty-state/empty-state.component';
import { SynonymDialogComponent } from './synonym-dialog/synonym-dialog.component';


type SortKey = 'searches' | 'zero_results' | 'zero_rate' | 'last_searched';

@Component({
  selector: 'app-search-insights',
  imports: [NgIf, NgFor, DatePipe, DecimalPipe, MatIcon, RouterLink, PaginationComponent, EmptyStateComponent],
  templateUrl: './search-insights.component.html',
  styleUrl: './search-insights.component.scss',
})
export class SearchInsightsComponent implements OnInit, OnDestroy {
  itemList: any[] = [];
  paginationOption: PaginationOptions;
  loading = true;
  error = false;
  exporting = false;
  canEditSynonyms = false;
  summary = this.emptySummary();
  sort: SortKey = 'searches';
  searchText = '';
  private search$ = new Subject<string>();

  filterValues: Record<string, any> = {
    event_type: 'search',
    platform: null,
    filtered: null,
    zero_results: null,
    from_date: null,
    to_date: null,
  };
  private destroy$ = new Subject<void>();

  constructor(
    private dialog: MatDialog,
    private apiService: ApiService,
    public helperService: HelpersService,
    private toastr: ToastrService,
  ) {
    this.paginationOption = Global.resetPaginationOptions();
  }

  ngOnInit(): void {
    this.helperService.filterButtonClick$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.openFilters());
    this.search$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(text => {
        this.searchText = text;
        this.paginationOption.page = 1;
        this.fetchList();
      });
    this.canEditSynonyms = this.helperService.can('operations.update');
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
      { key: 'event_type', label: 'Activity', type: 'select', options: [
        { value: 'search', label: 'Completed searches' },
        { value: 'suggestion', label: 'Suggestion selections' },
        { value: 'legacy', label: 'Legacy search requests (includes typing)' },
      ] },
      { key: 'platform', label: 'Platform', type: 'select', options: [{ value: 'web', label: 'Web' }, { value: 'mobile', label: 'Mobile' }] },
      { key: 'filtered', label: 'Search scope', type: 'select', options: [{ value: 'false', label: 'Without filters' }, { value: 'true', label: 'With filters' }] },
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
    if (this.filterValues['event_type'] && this.filterValues['event_type'] !== 'search') count++;
    if (this.filterValues['platform']) count++;
    if (this.filterValues['filtered']) count++;
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
        if (result['zero_results'] !== this.filterValues['zero_results']) this.sort = this.defaultSort(result['zero_results']);
        this.filterValues = result;
        this.paginationOption.page = 1;
        this.fetchList();
        this.updateFilterButton();
      });
  }

  private emptySummary() {
    return { searches: 0, zero_results: 0, measured: 0, distinct_queries: 0, failing_queries: 0, first_tracked: null as string | null };
  }

  private defaultSort(zeroResults: string | null): SortKey {
    return zeroResults === 'true' ? 'zero_results' : 'searches';
  }

  get showsResults(): boolean {
    return this.filterValues['event_type'] !== 'suggestion';
  }

  setNoResultsOnly(on: boolean): void {
    const value = on ? 'true' : null;
    if (this.filterValues['zero_results'] === value) return;
    this.filterValues = { ...this.filterValues, zero_results: value };
    this.sort = this.defaultSort(value);
    this.paginationOption.page = 1;
    this.fetchList();
    this.updateFilterButton();
  }

  setSort(sort: SortKey): void {
    if (this.sort === sort) return;
    this.sort = sort;
    this.paginationOption.page = 1;
    this.fetchList();
  }

  onSearchInput(value: string): void {
    this.search$.next(value.trim());
  }

  noResultLabel(item: any): string {
    return item.measured ? `${item.zero_results} / ${item.measured}` : '—';
  }

  alwaysFails(item: any): boolean {
    return item.measured > 0 && item.zero_results === item.measured;
  }

  get scopeLabel(): string {
    const f = this.filterValues;
    const dates = f['from_date'] || f['to_date']
      ? `${f['from_date'] || 'Start'} to ${f['to_date'] || 'today'}`
      : 'Last 90 days';
    const parts = [dates, this.activityLabel];
    if (f['event_type'] !== 'legacy') parts.push(f['platform'] === 'web' ? 'Web' : f['platform'] === 'mobile' ? 'Mobile' : 'All platforms');
    if ((f['event_type'] || 'search') === 'search' && f['filtered']) parts.push(f['filtered'] === 'true' ? 'With filters' : 'Without filters');
    if (this.searchText) parts.push(`Query contains “${this.searchText}”`);
    return parts.join(' · ');
  }

  private buildParams(): URLSearchParams {
    const params = new URLSearchParams();
    const f = this.filterValues;
    params.set('event_type', f['event_type'] || 'search');
    if (f['event_type'] !== 'legacy' && f['platform']) params.set('platform', f['platform']);
    if ((f['event_type'] || 'search') === 'search' && f['filtered']) params.set('filtered', f['filtered']);
    if (f['event_type'] !== 'suggestion' && f['zero_results']) params.set('zero_results', f['zero_results']);
    if (f['from_date']) params.set('from', f['from_date']);
    if (f['to_date']) params.set('to', f['to_date']);
    if (this.searchText) params.set('q', this.searchText);
    params.set('sort', this.sort);
    return params;
  }

  fetchList() {
    this.loading = true;
    this.error = false;
    const params = this.buildParams();
    if (this.paginationOption.limit) params.set('limit', String(this.paginationOption.limit));
    if (this.paginationOption.page) params.set('page', String(this.paginationOption.page));

    this.apiService.searchInsights(params).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.summary = { ...this.emptySummary(), ...res?.data?.summary };
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

  get activityLabel(): string {
    return this.filterValues['event_type'] === 'legacy' ? 'Legacy search requests'
      : this.filterValues['event_type'] === 'suggestion' ? 'Suggestion selections' : 'Completed searches';
  }

  get zeroResultRate(): string {
    return this.summary.measured ? (100 * this.summary.zero_results / this.summary.measured).toFixed(1) + '%' : '—';
  }

  // Opens the existing rule for this query when there is one, so edits never hit the duplicate-term conflict.
  addSynonym(query: string): void {
    this.apiService.searchSynonymByTerm(query).subscribe({
      next: (res: any) => {
        const existing = res?.data;
        const data = existing ? { id: existing._id, term: existing.term, alternatives: existing.alternatives } : { term: query };
        this.dialog.open(SynonymDialogComponent, { width: '480px', data }).afterClosed().subscribe(saved => {
          if (saved) this.toastr.success(`Synonym saved. New searches for "${query}" will include the alternatives.`);
        });
      },
      error: () => this.toastr.error('Could not load synonyms'),
    });
  }

  // Pages through the API so the export matches the table's filters and sort.
  async exportCsv(): Promise<void> {
    if (this.exporting) return;
    this.exporting = true;
    try {
      const rows: any[] = [];
      for (let page = 1; page <= 50; page++) {
        const params = this.buildParams();
        params.set('limit', '100');
        params.set('page', String(page));
        const res: any = await firstValueFrom(this.apiService.searchInsights(params));
        rows.push(...(res?.data?.docs ?? []));
        if (!res?.data?.hasNextPage) break;
      }
      const header = ['query', 'searches', ...(this.showsResults ? ['no_results', 'confirmed_counts'] : []), 'last_searched'];
      const lines = rows.map(r => [r._id, r.searches, ...(this.showsResults ? [r.zero_results, r.measured] : []), r.last_searched]
        .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
      const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `search-insights-${this.filterValues['event_type'] || 'search'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      this.toastr.error('Could not export search insights');
    } finally {
      this.exporting = false;
    }
  }

  onPageChange(page: number) {
    this.paginationOption.page = page;
    this.fetchList();
  }

}
