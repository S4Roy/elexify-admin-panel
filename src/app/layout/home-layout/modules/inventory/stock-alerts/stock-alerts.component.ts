import { DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ApiService } from 'app/core/services/api.service';
import { HelpersService } from 'app/core/services/helpers.service';
import * as Global from 'app/global';
import { FilterFieldDef } from 'app/core/models/FilterFieldDef';
import PaginationOptions from 'app/core/models/PaginationOptions';
import { FilterDrawerComponent } from '../../../includes/filter-drawer/filter-drawer.component';
import { PaginationComponent } from '../../../includes/pagination/pagination.component';
import { EmptyStateComponent } from '../../../includes/empty-state/empty-state.component';
import { StockAlertSubscribersDialogComponent } from './stock-alert-subscribers-dialog/stock-alert-subscribers-dialog.component';
import { StockAlertSettingsDialogComponent } from './stock-alert-settings-dialog/stock-alert-settings-dialog.component';

type Tab = 'low' | 'requests';

// What needs restocking (products/variations under the low-stock threshold,
// with how many customers are waiting) and back-in-stock demand from the
// storefront's "Notify me" button — backend services/stockAlerts.
@Component({
  selector: 'app-stock-alerts',
  imports: [NgIf, NgFor, NgClass, DatePipe, RouterLink, MatIconModule, PaginationComponent, EmptyStateComponent],
  templateUrl: './stock-alerts.component.html',
  styleUrl: './stock-alerts.component.scss',
})
export class StockAlertsComponent implements OnInit, OnDestroy {
  tab: Tab = 'low';
  itemList: any[] = [];
  paginationOption: PaginationOptions;
  loading = true;
  threshold: number | null = null;
  totals: { waiting: number; notified_30d: number } | null = null;
  settings: any = null;
  readonly canEditProducts: boolean;
  readonly canConfigure: boolean;

  filterValues: Record<string, any> = { level: null, search_key: null };
  private destroy$ = new Subject<void>();

  constructor(
    private dialog: MatDialog,
    private apiService: ApiService,
    public helperService: HelpersService,
  ) {
    this.paginationOption = Global.resetPaginationOptions();
    this.canEditProducts = this.helperService.can('products.update');
    this.canConfigure = this.helperService.can('settings.update');
  }

  ngOnInit(): void {
    this.helperService.filterButtonClick$.pipe(takeUntil(this.destroy$)).subscribe(() => this.openFilters());
    this.helperService.setActionButton({ label: 'Alert settings', icon: 'tune' });
    this.helperService.actionButtonClick$.pipe(takeUntil(this.destroy$)).subscribe(() => this.openSettings());
    this.updateFilterButton();
    this.loadSettings();
    this.fetchList();
  }

  ngOnDestroy(): void {
    this.helperService.clearFilterButton();
    this.helperService.clearActionButton();
    this.destroy$.next();
    this.destroy$.complete();
  }

  setTab(tab: Tab): void {
    if (this.tab === tab) return;
    this.tab = tab;
    this.filterValues = { level: null, search_key: null };
    this.paginationOption = Global.resetPaginationOptions();
    this.updateFilterButton();
    this.fetchList();
  }

  get filterFields(): FilterFieldDef[] {
    const search: FilterFieldDef = { key: 'search_key', label: 'Search', type: 'text', placeholder: 'Product name, variation or SKU…' };
    if (this.tab === 'requests') return [search];
    return [
      {
        key: 'level',
        label: 'Stock level',
        type: 'select',
        options: [
          { value: 'out', label: 'Out of stock' },
          { value: 'low', label: 'Running low' },
        ],
      },
      search,
    ];
  }

  updateFilterButton(): void {
    const count = (this.filterValues['level'] ? 1 : 0) + (this.filterValues['search_key'] ? 1 : 0);
    this.helperService.setFilterButton(count);
  }

  openFilters(): void {
    this.dialog
      .open(FilterDrawerComponent, { data: { fields: this.filterFields, values: { ...this.filterValues } } })
      .afterClosed()
      .subscribe((result: Record<string, any> | undefined) => {
        if (!result) return;
        this.filterValues = result;
        this.paginationOption.page = 1;
        this.updateFilterButton();
        this.fetchList();
      });
  }

  fetchList(): void {
    this.loading = true;
    const params = new URLSearchParams();
    if (this.tab === 'low' && this.filterValues['level']) params.set('level', this.filterValues['level']);
    if (this.filterValues['search_key']) params.set('search', this.filterValues['search_key']);
    if (this.paginationOption.limit) params.set('limit', String(this.paginationOption.limit));
    if (this.paginationOption.page) params.set('page', String(this.paginationOption.page));
    const request = this.tab === 'low' ? this.apiService.lowStockItems(params) : this.apiService.backInStockRequests(params);
    const tab = this.tab;
    request.subscribe({
      next: (res: any) => {
        if (tab !== this.tab) return;
        this.itemList = res?.data?.docs ?? [];
        this.paginationOption = { ...res?.data };
        if (tab === 'low') this.threshold = res?.data?.threshold ?? null;
        else this.totals = res?.data?.totals ?? null;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  private loadSettings(): void {
    this.apiService.stockAlertSettings().subscribe({ next: (res: any) => (this.settings = res?.data ?? null) });
  }

  onPageChange(page: number): void {
    this.paginationOption.page = page;
    this.fetchList();
  }

  levelLabel(item: any): string {
    return item?.stock_quantity <= 0 ? 'Out of stock' : 'Running low';
  }

  levelClass(item: any): string {
    return item?.stock_quantity <= 0 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800';
  }

  viewSubscribers(item: any): void {
    this.dialog.closeAll();
    this.dialog.open(StockAlertSubscribersDialogComponent, {
      width: '680px',
      maxWidth: '96vw',
      maxHeight: '90vh',
      data: { item },
    });
  }

  openSettings(): void {
    this.dialog
      .open(StockAlertSettingsDialogComponent, {
        width: '560px',
        maxWidth: '96vw',
        maxHeight: '90vh',
        data: { canEdit: this.canConfigure },
      })
      .afterClosed()
      .subscribe((saved) => {
        if (!saved) return;
        this.loadSettings();
        if (this.tab === 'low') this.fetchList();
      });
  }
}
