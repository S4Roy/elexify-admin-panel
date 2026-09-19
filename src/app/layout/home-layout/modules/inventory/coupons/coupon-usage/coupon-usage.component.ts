import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { InventoryService } from 'app/core/services/inventory.service';
import { PaginationComponent } from 'app/layout/home-layout/includes/pagination/pagination.component';

@Component({
  selector: 'app-coupon-usage', standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, RouterLink, PaginationComponent],
  templateUrl: './coupon-usage.component.html', styleUrl: './coupon-usage.component.scss',
})
export class CouponUsageComponent implements OnInit, OnDestroy {
  filters = { search_key: '', status: '', from_date: '', to_date: '', sort_order: '-1', limit: '25' };
  rows: any[] = [];
  summary: any[] = [];
  pagination: any = { page: 1, totalDocs: 0, totalPages: 0 };
  loading = false;
  error = '';
  private request?: Subscription;
  constructor(private inventory: InventoryService, @Inject(MAT_DIALOG_DATA) public coupon: any) {}
  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.request?.unsubscribe(); }
  reset(): void {
    this.filters = { search_key: '', status: '', from_date: '', to_date: '', sort_order: '-1', limit: '25' };
    this.load();
  }
  load(page = 1): void {
    this.request?.unsubscribe();
    this.loading = false;
    this.error = '';
    if (this.filters.from_date && this.filters.to_date && this.filters.from_date > this.filters.to_date) {
      this.error = 'Choose an end date on or after the start date.';
      return;
    }
    const params = new URLSearchParams({ page: String(page), limit: this.filters.limit, sort_order: this.filters.sort_order });
    if (this.coupon?._id) params.set('coupon', this.coupon._id);
    if (this.filters.search_key.trim()) params.set('search_key', this.filters.search_key.trim());
    if (this.filters.status) params.set('status', this.filters.status);
    for (const key of ['from_date', 'to_date'] as const) {
      if (this.filters[key]) {
        const date = new Date(this.filters[key] + 'T00:00:00');
        if (key === 'to_date') date.setHours(23, 59, 59, 999);
        params.set(key, date.toISOString());
      }
    }
    this.loading = true;
    this.rows = [];
    this.summary = [];
    this.request = this.inventory.couponUsage(params).subscribe({
      next: (res: any) => {
        this.rows = res.data.docs;
        this.summary = res.data.summary;
        this.pagination = res.data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Could not load usage history. Please try again.';
        this.loading = false;
      },
    });
  }
}
