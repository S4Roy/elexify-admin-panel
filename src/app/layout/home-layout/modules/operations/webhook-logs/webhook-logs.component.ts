import { DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';
import { ApiService } from 'app/core/services/api.service';
import { HelpersService } from 'app/core/services/helpers.service';
import * as Global from 'app/global';
import FilterOptions from 'app/core/models/FilterOptions';
import { FilterFieldDef } from 'app/core/models/FilterFieldDef';
import PaginationOptions from 'app/core/models/PaginationOptions';
import { FilterDrawerComponent } from '../../../includes/filter-drawer/filter-drawer.component';
import { PaginationComponent } from '../../../includes/pagination/pagination.component';
import { EmptyStateComponent } from '../../../includes/empty-state/empty-state.component';
import { WebhookLogDetailDialogComponent } from './webhook-log-detail-dialog/webhook-log-detail-dialog.component';

const PROVIDER_OPTIONS = ['shiprocket', 'razorpay'].map((value) => ({ value, label: value }));
const OUTCOME_OPTIONS = ['processed', 'ignored', 'error'].map((value) => ({ value, label: value }));

const OUTCOME_STYLES: Record<string, string> = {
  processed: 'bg-green-100 text-green-800',
  ignored: 'bg-gray-100 text-gray-600',
  error: 'bg-red-100 text-red-700',
};

@Component({
  selector: 'app-webhook-logs',
  imports: [NgIf, NgFor, NgClass, DatePipe, PaginationComponent, EmptyStateComponent],
  templateUrl: './webhook-logs.component.html',
  styleUrl: './webhook-logs.component.scss',
})
export class WebhookLogsComponent implements OnInit, OnDestroy {
  itemList: any[] = [];
  paginationOption: PaginationOptions;
  loading = true;

  filterOption: FilterOptions;
  filterValues: Record<string, any> = {
    provider: null,
    outcome: null,
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
    this.filterOption = Global.resetTableFilterOptions();
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
      { key: 'provider', label: 'Provider', type: 'select', options: PROVIDER_OPTIONS },
      { key: 'outcome', label: 'Outcome', type: 'select', options: OUTCOME_OPTIONS },
      { key: 'search_key', label: 'Order / payment / refund / event ID / AWB', type: 'text', placeholder: 'Enter an exact reference ID…' },
      {
        key: 'received_at',
        label: 'Date',
        type: 'daterange',
        fromKey: 'from_date',
        toKey: 'to_date',
      },
    ];
  }

  filterCount(): number {
    let count = 0;
    if (this.filterValues['provider']) count++;
    if (this.filterValues['outcome']) count++;
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
        this.filterOption.provider = this.filterValues['provider'] || null;
        this.filterOption.outcome = this.filterValues['outcome'] || null;
        this.filterOption.search_key = this.filterValues['search_key'] || null;
        this.filterOption.from_date = this.filterValues['from_date'] || null;
        this.filterOption.to_date = this.filterValues['to_date'] || null;
        this.paginationOption.page = 1;
        this.fetchList();
        this.updateFilterButton();
      });
  }

  fetchList() {
    this.loading = true;
    const params = new URLSearchParams();
    if (this.paginationOption.limit) params.set('limit', String(this.paginationOption.limit));
    if (this.paginationOption.page) params.set('page', String(this.paginationOption.page));
    if (this.filterOption.provider) params.set('provider', this.filterOption.provider);
    if (this.filterOption.outcome) params.set('outcome', this.filterOption.outcome);
    if (this.filterOption.search_key) params.set('search', this.filterOption.search_key);
    if (this.filterOption.from_date) params.set('from', this.filterOption.from_date);
    if (this.filterOption.to_date) params.set('to', this.filterOption.to_date);

    this.apiService.webhookLogs(params).subscribe({
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

  outcomeClass(outcome: string): string {
    return OUTCOME_STYLES[outcome] ?? 'bg-gray-100 text-gray-600';
  }

  viewDetails(item: any): void {
    this.apiService.webhookLogDetails(item._id).subscribe((res: any) => {
      this.dialog.open(WebhookLogDetailDialogComponent, {
        width: '720px',
        maxWidth: '96vw',
        maxHeight: '90vh',
        data: { entry: res?.data ?? item },
      });
    });
  }
}
