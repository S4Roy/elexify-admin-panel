import { DatePipe, NgFor, NgIf } from '@angular/common';
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

const EVENT_OPTIONS = [
  'ORDER_PLACED', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'ORDER_PROCESSING',
  'ORDER_SHIPPED', 'ORDER_OUT_FOR_DELIVERY', 'ORDER_DELIVERED', 'ORDER_CANCELLED',
  'REFUND_INITIATED', 'REFUND_COMPLETED', 'ACCOUNT_LOGIN', 'PASSWORD_CHANGED',
  'EMAIL_CHANGED', 'MOBILE_CHANGED', 'SUSPICIOUS_ACTIVITY', 'PROMOTIONAL_OFFER',
  'BACK_IN_STOCK', 'PRICE_DROP', 'ABANDONED_CART',
].map((value) => ({ value, label: value }));

const CHANNEL_OPTIONS = ['email', 'sms', 'whatsapp'].map((value) => ({ value, label: value }));

const NOTIFICATION_STATUS_OPTIONS = ['QUEUED', 'SENDING', 'SENT', 'FAILED', 'RETRYING', 'DEAD_LETTER'].map(
  (value) => ({ value, label: value })
);

@Component({
  selector: 'app-notification-history',
  imports: [NgIf, NgFor, DatePipe, PaginationComponent, EmptyStateComponent],
  templateUrl: './notification-history.component.html',
  styleUrl: './notification-history.component.scss',
})
export class NotificationHistoryComponent implements OnInit, OnDestroy {
  itemList: any[] = [];
  paginationOption: PaginationOptions;
  loading = true;

  filterOption: FilterOptions;
  filterValues: Record<string, any> = {
    event: null,
    channel: null,
    status: null,
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
      { key: 'event', label: 'Event', type: 'select', options: EVENT_OPTIONS },
      { key: 'channel', label: 'Channel', type: 'select', options: CHANNEL_OPTIONS },
      { key: 'status', label: 'Status', type: 'select', options: NOTIFICATION_STATUS_OPTIONS },
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
    if (this.filterValues['event']) count++;
    if (this.filterValues['channel']) count++;
    if (this.filterValues['status']) count++;
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
        this.filterOption.event = this.filterValues['event'] || null;
        this.filterOption.channel = this.filterValues['channel'] || null;
        this.filterOption.status = this.filterValues['status'] || null;
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
    if (this.filterOption.event) params.set('event', this.filterOption.event);
    if (this.filterOption.channel) params.set('channel', this.filterOption.channel);
    if (this.filterOption.status) params.set('status', this.filterOption.status);
    if (this.filterOption.from_date) params.set('from', this.filterOption.from_date);
    if (this.filterOption.to_date) params.set('to', this.filterOption.to_date);

    this.apiService.notificationHistory(params).subscribe({
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
}
