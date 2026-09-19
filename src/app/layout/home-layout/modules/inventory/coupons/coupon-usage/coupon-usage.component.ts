import { HelpersService } from 'app/core/services/helpers.service';
import { FilterFieldDef } from 'app/core/models/FilterFieldDef';
import { FilterDrawerComponent } from '../../../../includes/filter-drawer/filter-drawer.component';
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, takeUntil, Subscription } from 'rxjs';
import { InventoryService } from 'app/core/services/inventory.service';
import { PaginationComponent } from 'app/layout/home-layout/includes/pagination/pagination.component';

@Component({
  selector: 'app-coupon-usage', standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent],
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
  coupon: { _id: string; code: string } | null = null;
  private destroy$ = new Subject<void>();
  constructor(private inventory: InventoryService, private route: ActivatedRoute, private helper: HelpersService, private dialog: MatDialog) {}
  ngOnInit(): void {
    this.helper.filterButtonClick$.pipe(takeUntil(this.destroy$)).subscribe(() => this.openFilters());
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.coupon = params.get('coupon') ? { _id: params.get('coupon')!, code: params.get('code') || 'Selected coupon' } : null;
      this.load();
    });
  }
  ngOnDestroy(): void {
    this.request?.unsubscribe();
    this.helper.clearFilterButton();
    this.destroy$.next();
    this.destroy$.complete();
  }
  openFilters(): void {
    const fields: FilterFieldDef[] = [
      { key: 'status', label: 'Usage status', type: 'select', options: [{ value: 'applied', label: 'Applied' }, { value: 'refunded', label: 'Refunded' }] },
      { key: 'dates', label: 'Redemption date', type: 'daterange', fromKey: 'from_date', toKey: 'to_date' },
    ];
    this.dialog.open(FilterDrawerComponent, { data: { fields, values: { ...this.filters } } }).afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (!result) return;
      this.filters = { ...this.filters, status: result.status || '', from_date: result.from_date || '', to_date: result.to_date || '' };
      this.load();
    });
  }
  reset(): void {
    this.filters = { search_key: '', status: '', from_date: '', to_date: '', sort_order: '-1', limit: '25' };
    this.load();
  }
  load(page = 1): void {
    this.helper.setFilterButton(Number(!!this.filters.status) + Number(!!(this.filters.from_date || this.filters.to_date)));
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
