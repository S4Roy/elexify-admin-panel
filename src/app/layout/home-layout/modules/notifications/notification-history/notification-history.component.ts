import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from 'app/core/services/api.service';
import * as Global from 'app/global';
import PaginationOptions from 'app/core/models/PaginationOptions';
import { PaginationComponent } from '../../../includes/pagination/pagination.component';
import { EmptyStateComponent } from '../../../includes/empty-state/empty-state.component';

@Component({
  selector: 'app-notification-history',
  imports: [NgIf, NgFor, DatePipe, FormsModule, PaginationComponent, EmptyStateComponent],
  templateUrl: './notification-history.component.html',
  styleUrl: './notification-history.component.scss',
})
export class NotificationHistoryComponent implements OnInit {
  itemList: any[] = [];
  paginationOption: PaginationOptions;
  loading = true;

  filters = {
    event: '',
    channel: '',
    status: '',
    from: '',
    to: '',
  };

  eventOptions = [
    'ORDER_PLACED', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'ORDER_PROCESSING',
    'ORDER_SHIPPED', 'ORDER_OUT_FOR_DELIVERY', 'ORDER_DELIVERED', 'ORDER_CANCELLED',
    'REFUND_INITIATED', 'REFUND_COMPLETED', 'ACCOUNT_LOGIN', 'PASSWORD_CHANGED',
    'EMAIL_CHANGED', 'MOBILE_CHANGED', 'SUSPICIOUS_ACTIVITY', 'PROMOTIONAL_OFFER',
    'BACK_IN_STOCK', 'PRICE_DROP', 'ABANDONED_CART',
  ];
  channelOptions = ['email', 'sms', 'whatsapp'];
  statusOptions = ['QUEUED', 'SENDING', 'SENT', 'FAILED', 'RETRYING', 'DEAD_LETTER'];

  constructor(private apiService: ApiService) {
    this.paginationOption = Global.resetPaginationOptions();
  }

  ngOnInit(): void {
    this.fetchList();
  }

  fetchList() {
    this.loading = true;
    const params = new URLSearchParams();
    if (this.paginationOption.limit) params.set('limit', String(this.paginationOption.limit));
    if (this.paginationOption.page) params.set('page', String(this.paginationOption.page));
    if (this.filters.event) params.set('event', this.filters.event);
    if (this.filters.channel) params.set('channel', this.filters.channel);
    if (this.filters.status) params.set('status', this.filters.status);
    if (this.filters.from) params.set('from', this.filters.from);
    if (this.filters.to) params.set('to', this.filters.to);

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

  applyFilters() {
    this.paginationOption.page = 1;
    this.fetchList();
  }

  clearFilters() {
    this.filters = { event: '', channel: '', status: '', from: '', to: '' };
    this.applyFilters();
  }

  onPageChange(page: number) {
    this.paginationOption.page = page;
    this.fetchList();
  }
}
