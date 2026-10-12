import { CurrencyPipe, DatePipe, DecimalPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subject, takeUntil } from 'rxjs';
import { ApiService } from 'app/core/services/api.service';
import { HelpersService } from 'app/core/services/helpers.service';
import * as Global from 'app/global';
import { FilterFieldDef } from 'app/core/models/FilterFieldDef';
import PaginationOptions from 'app/core/models/PaginationOptions';
import { FilterDrawerComponent } from '../../../includes/filter-drawer/filter-drawer.component';
import { PaginationComponent } from '../../../includes/pagination/pagination.component';
import { EmptyStateComponent } from '../../../includes/empty-state/empty-state.component';
import { AbandonedCartDetailDialogComponent } from './abandoned-cart-detail-dialog/abandoned-cart-detail-dialog.component';
import { SendCartReminderDialogComponent } from './send-cart-reminder-dialog/send-cart-reminder-dialog.component';
import { AbandonedCartSettingsDialogComponent } from './abandoned-cart-settings-dialog/abandoned-cart-settings-dialog.component';
import { customerAvatarColor, customerInitials } from './abandoned-cart.utils';

// Abandoned carts of signed-in customers, maintained by the backend's
// services/abandonedCart cron: KPIs for the period, a filterable list with
// per-customer reachable channels, manual/bulk reminders, and the automatic
// reminder sequence settings.
@Component({
  selector: 'app-abandoned-carts',
  imports: [NgIf, NgFor, NgClass, DatePipe, CurrencyPipe, DecimalPipe, RouterLink, MatCheckboxModule, MatIconModule, MatTooltipModule, PaginationComponent, EmptyStateComponent],
  templateUrl: './abandoned-carts.component.html',
  styleUrl: './abandoned-carts.component.scss',
})
export class AbandonedCartsComponent implements OnInit, OnDestroy {
  itemList: any[] = [];
  paginationOption: PaginationOptions;
  loading = true;
  stats: any = null;
  autoRemindersEnabled: boolean | null = null;
  selectedIds = new Set<string>();
  readonly canSend: boolean;
  readonly canConfigure: boolean;

  filterValues: Record<string, any> = {
    status: 'open',
    reminded: null,
    sort: null,
    search_key: null,
    min_value: null,
    max_value: null,
    from_date: null,
    to_date: null,
  };
  readonly statusTabs: { value: string | null; label: string }[] = [
    { value: 'open', label: 'Open' },
    { value: 'recovered', label: 'Recovered' },
    { value: 'expired', label: 'Expired' },
    { value: null, label: 'All' },
  ];
  private destroy$ = new Subject<void>();

  constructor(
    private dialog: MatDialog,
    private apiService: ApiService,
    private toastr: ToastrService,
    public helperService: HelpersService,
  ) {
    this.paginationOption = Global.resetPaginationOptions();
    this.canSend = this.helperService.can('customer.notification.send');
    this.canConfigure = this.helperService.can('customer.notification.schedule');
  }

  ngOnInit(): void {
    this.helperService.filterButtonClick$.pipe(takeUntil(this.destroy$)).subscribe(() => this.openFilters());
    this.helperService.setActionButton({ label: 'Reminder settings', icon: 'tune' });
    this.helperService.actionButtonClick$.pipe(takeUntil(this.destroy$)).subscribe(() => this.openSettings());
    this.helperService.selectionActionClick$.pipe(takeUntil(this.destroy$)).subscribe(() => this.sendReminder(this.selectedItems()));
    this.helperService.selectionClear$.pipe(takeUntil(this.destroy$)).subscribe(() => this.clearSelection());
    this.updateFilterButton();
    this.loadSettings();
    this.refresh();
  }

  ngOnDestroy(): void {
    this.helperService.clearFilterButton();
    this.helperService.clearActionButton();
    this.helperService.clearSelectionAction();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filterFields(): FilterFieldDef[] {
    return [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'open', label: 'Open' },
          { value: 'recovered', label: 'Recovered' },
          { value: 'expired', label: 'Expired' },
        ],
      },
      {
        key: 'reminded',
        label: 'Reminder',
        type: 'select',
        options: [
          { value: 'yes', label: 'Reminded' },
          { value: 'no', label: 'Not reminded' },
        ],
      },
      {
        key: 'sort',
        label: 'Sort by',
        type: 'select',
        options: [
          { value: 'recent', label: 'Most recent' },
          { value: 'value', label: 'Highest value' },
        ],
      },
      { key: 'search_key', label: 'Search', type: 'text', placeholder: 'Customer, product or order number…' },
      { key: 'cart_value', label: 'Cart value (₹)', type: 'number-range', fromKey: 'min_value', toKey: 'max_value' },
      { key: 'abandoned_at', label: 'Abandoned on', type: 'daterange', fromKey: 'from_date', toKey: 'to_date' },
    ];
  }

  filterCount(): number {
    const f = this.filterValues;
    return ['status', 'reminded', 'sort', 'search_key'].filter((key) => !!f[key]).length
      + (f['min_value'] || f['max_value'] ? 1 : 0)
      + (f['from_date'] || f['to_date'] ? 1 : 0);
  }

  updateFilterButton(): void {
    this.helperService.setFilterButton(this.filterCount());
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
        this.refresh();
      });
  }

  private filterParams(): URLSearchParams {
    const f = this.filterValues;
    const params = new URLSearchParams();
    if (f['from_date']) params.set('from', f['from_date']);
    if (f['to_date']) params.set('to', f['to_date']);
    return params;
  }

  refresh(): void {
    this.fetchList();
    this.fetchStats();
  }

  fetchStats(): void {
    this.apiService.abandonedCartStats(this.filterParams()).subscribe({
      next: (res: any) => (this.stats = res?.data ?? null),
    });
  }

  fetchList(): void {
    this.loading = true;
    const f = this.filterValues;
    const params = this.filterParams();
    if (f['status']) params.set('status', f['status']);
    if (f['reminded']) params.set('reminded', f['reminded']);
    if (f['sort']) params.set('sort', f['sort']);
    if (f['search_key']) params.set('search', f['search_key']);
    if (f['min_value']) params.set('min_value', f['min_value']);
    if (f['max_value']) params.set('max_value', f['max_value']);
    if (this.paginationOption.limit) params.set('limit', String(this.paginationOption.limit));
    if (this.paginationOption.page) params.set('page', String(this.paginationOption.page));

    this.apiService.abandonedCarts(params).subscribe({
      next: (res: any) => {
        this.itemList = res?.data?.docs ?? [];
        this.paginationOption = { ...res?.data };
        this.loading = false;
        this.clearSelection();
      },
      error: () => (this.loading = false),
    });
  }

  private loadSettings(): void {
    this.apiService.abandonedCartSettings().subscribe({
      next: (res: any) => (this.autoRemindersEnabled = !!res?.data?.auto_reminders_enabled),
    });
  }

  setStatus(status: string | null): void {
    if (this.filterValues['status'] === status) return;
    this.filterValues = { ...this.filterValues, status };
    this.paginationOption.page = 1;
    this.updateFilterButton();
    this.fetchList();
  }

  onPageChange(page: number): void {
    this.paginationOption.page = page;
    this.fetchList();
  }

  // --- selection (open carts only; bulk "Send reminder") ---
  selectable(item: any): boolean {
    return this.canSend && item?.status === 'open';
  }
  isSelected(item: any): boolean {
    return this.selectedIds.has(item?._id);
  }
  toggleSelected(item: any, checked: boolean): void {
    if (checked) this.selectedIds.add(item._id);
    else this.selectedIds.delete(item._id);
    this.syncSelectionAction();
  }
  get selectableOnPage(): any[] {
    return this.itemList.filter((item) => this.selectable(item));
  }
  get allOnPageSelected(): boolean {
    return !!this.selectableOnPage.length && this.selectableOnPage.every((item) => this.selectedIds.has(item._id));
  }
  toggleSelectAllOnPage(checked: boolean): void {
    for (const item of this.selectableOnPage) {
      if (checked) this.selectedIds.add(item._id);
      else this.selectedIds.delete(item._id);
    }
    this.syncSelectionAction();
  }
  clearSelection(): void {
    this.selectedIds.clear();
    this.syncSelectionAction();
  }
  private selectedItems(): any[] {
    return this.itemList.filter((item) => this.selectedIds.has(item._id));
  }
  private syncSelectionAction(): void {
    if (!this.selectedIds.size) {
      this.helperService.clearSelectionAction();
      return;
    }
    this.helperService.setSelectionAction({ count: this.selectedIds.size, label: 'Send reminder', icon: 'send' });
  }

  // --- display helpers ---
  statusLabel(item: any): string {
    if (item?.status === 'recovered') return item.recovered_via_reminder ? 'Recovered · reminder' : 'Recovered';
    if (item?.status === 'expired') return item.closed_reason === 'cart_emptied' ? 'Expired · emptied' : 'Expired';
    return 'Open';
  }
  sentReminders(item: any): any[] {
    return (item?.reminders || []).filter((r: any) => r.channels?.length);
  }
  lastSentAt(item: any): string | null {
    const sent = this.sentReminders(item);
    return sent.length ? sent[sent.length - 1].sent_at : null;
  }
  timeAgo(value: string | Date | null | undefined): string {
    if (!value) return '—';
    const mins = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  }
  initials(name: string | null | undefined): string {
    return customerInitials(name);
  }
  avatarColor(name: string | null | undefined): string {
    return customerAvatarColor(name);
  }
  meterWidth(rate: number | null | undefined): number {
    return Math.max(0, Math.min(100, Number(rate) || 0));
  }
  isReachable(item: any): boolean {
    const r = item?.reachable;
    return !!(r?.email || r?.whatsapp || r?.push);
  }

  // --- actions ---
  viewDetails(item: any): void {
    this.dialog.closeAll();
    this.dialog
      .open(AbandonedCartDetailDialogComponent, {
        width: '760px',
        maxWidth: '96vw',
        maxHeight: '90vh',
        data: { entry: item, canSend: this.selectable(item) },
      })
      .afterClosed()
      .subscribe((action) => {
        if (action === 'remind') this.sendReminder([item]);
      });
  }

  sendReminder(items: any[]): void {
    if (!this.canSend || !items.length) return;
    this.dialog
      .open(SendCartReminderDialogComponent, { width: '520px', maxWidth: '96vw', data: { items } })
      .afterClosed()
      .subscribe((result: { coupon_code: string | null } | undefined) => {
        if (!result) return;
        this.apiService
          .remindAbandonedCarts({ ids: items.map((item) => item._id), coupon_code: result.coupon_code || undefined })
          .subscribe({
            next: (res: any) => {
              const sent = res?.data?.sent?.length ?? 0;
              const skipped: any[] = res?.data?.skipped ?? [];
              if (sent) this.toastr.success(res?.message || 'Reminder sent');
              else this.toastr.warning(skipped[0]?.reason || res?.message || 'No reminders were sent');
              if (sent && skipped.length) this.toastr.info(`Skipped: ${skipped[0].reason}${skipped.length > 1 ? ` (+${skipped.length - 1} more)` : ''}`);
              this.refresh();
            },
          });
      });
  }

  openSettings(): void {
    this.dialog
      .open(AbandonedCartSettingsDialogComponent, {
        width: '640px',
        maxWidth: '96vw',
        maxHeight: '90vh',
        data: { canEdit: this.canConfigure },
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.loadSettings();
      });
  }
}
