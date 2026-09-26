import { CustomerAddressDialogComponent } from './customer-address-dialog.component';
import { NewCustomerComponent } from '../new-customer/new-customer.component';
import { CurrencyPipe, DatePipe, LowerCasePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from '../../inventory/orders/order-status-display';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subject, takeUntil } from 'rxjs';
import { ApiService } from 'app/core/services/api.service';
import { HelpersService } from 'app/core/services/helpers.service';
import * as Global from 'app/global';
import PaginationOptions from 'app/core/models/PaginationOptions';
import { FilterFieldDef } from 'app/core/models/FilterFieldDef';
import { PaginationComponent } from '../../../includes/pagination/pagination.component';
import { EmptyStateComponent } from '../../../includes/empty-state/empty-state.component';
import { FilterDrawerComponent } from '../../../includes/filter-drawer/filter-drawer.component';
import {
  ReasonDialogComponent,
  ReasonDialogData,
} from '../../../includes/reason-dialog/reason-dialog.component';

// Notification preference groups + rows as returned by
// GET admin/customers/:id/notification-preferences. Kept here (rather than
// derived from the response) so the grid always renders every known row —
// including ones the backend might omit — with a stable label/order.
const PREFERENCE_GROUPS: {
  key: string;
  label: string;
  rows: { key: string; label: string }[];
}[] = [
  {
    key: 'transactional',
    label: 'Transactional',
    rows: [
      { key: 'order_email', label: 'Order updates — Email' },
      { key: 'order_sms', label: 'Order updates — SMS' },
      { key: 'order_whatsapp', label: 'Order updates — WhatsApp' },
      { key: 'payment_email', label: 'Payment updates — Email' },
      { key: 'payment_sms', label: 'Payment updates — SMS' },
      { key: 'refund_email', label: 'Refund updates — Email' },
      { key: 'refund_sms', label: 'Refund updates — SMS' },
    ],
  },
  {
    key: 'security',
    label: 'Security',
    rows: [
      { key: 'email', label: 'Security alerts — Email' },
      { key: 'sms', label: 'Security alerts — SMS' },
    ],
  },
  {
    key: 'marketing',
    label: 'Marketing',
    rows: [
      { key: 'push', label: 'Marketing — Push' },
      { key: 'email', label: 'Marketing — Email' },
      { key: 'sms', label: 'Marketing — SMS' },
      { key: 'whatsapp', label: 'Marketing — WhatsApp' },
    ],
  },
  {
    key: 'reminders',
    label: 'Reminders',
    rows: [
      { key: 'abandoned_cart_email', label: 'Abandoned cart — Email' },
      { key: 'abandoned_cart_whatsapp', label: 'Abandoned cart — WhatsApp' },
      { key: 'wishlist_email', label: 'Wishlist — Email' },
    ],
  },
];

@Component({
  selector: 'app-customer-details',
  imports: [
    NgIf,
    NgFor,
    NgClass,
    DatePipe,
    CurrencyPipe,
    LowerCasePipe,
    MatIconModule,
    RouterModule,
    PaginationComponent,
    EmptyStateComponent,
  ],
  templateUrl: './customer-details.component.html',
  styleUrl: './customer-details.component.scss',
})
export class CustomerDetailsComponent implements OnInit, OnDestroy {
  sessionState: any = null;
  sessionsLoading = false;
  sessionsError = '';
  sessionActionBusy = false;
  authEvents: any[] = [];
  fetchSessions(): void {
    if (!this.customerId || !this.helperService.can('customer.view')) return;
    const id = this.customerId;
    this.sessionsLoading = true;
    this.sessionsError = '';
    this.sessionState = null;
    this.apiService.customerSessions(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: res => { if (id === this.customerId) { this.sessionState = res.data; this.sessionsLoading = false; } },
      error: () => { if (id === this.customerId) { this.sessionsError = 'Unable to load sessions. Please retry.'; this.sessionsLoading = false; } },
    });
    this.authEvents = [];
    if (this.helperService.can('audit_log.view')) this.apiService.customerAuthEvents(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: res => { if (id === this.customerId) this.authEvents = res.data.events; },
      error: () => { this.toastr.error('Unable to load authentication events'); },
    });
  }
  revokeSession(sessionId: string | null): void {
    if (!this.customerId || this.sessionActionBusy || !this.helperService.can('customers.update')) return;
    const id = this.customerId;
    this.dialog.open(ReasonDialogComponent, { disableClose: true, data: {
      title: sessionId ? 'Sign out this device?' : 'Sign out all devices?',
      message: 'The customer will need to sign in again. This action is recorded in the security history.',
      reasonLabel: 'Reason', minLength: 10, confirmText: 'Sign out',
    } }).afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (!result?.confirm || id !== this.customerId) return;
      this.sessionActionBusy = true;
      this.apiService.revokeCustomerSession(id, sessionId, result.reason).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => { this.sessionActionBusy = false; this.toastr.success('Customer signed out'); if (id === this.customerId) this.fetchSessions(); },
        error: () => { this.sessionActionBusy = false; this.toastr.error('Unable to revoke session'); },
      });
    });
  }
  Global = Global;
  customerId: string | null = null;
  customer: any = null;
  loading = true;
  addresses: any[] = [];
  addressesLoading = false;
  addressesError = false;

  preferences: any = null;
  preferenceGroups = PREFERENCE_GROUPS;
  editingPreferences = false;
  editablePreferenceValues: Record<string, Record<string, boolean>> = {};
  savingPreferences = false;

  historyList: any[] = [];
  historyPagination: PaginationOptions;
  historyFilterValues: Record<string, any> = {
    event: null,
    channel: null,
    status: null,
    from_date: null,
    to_date: null,
  };

  pushState: { devices: { platform: string; app_version?: string; last_seen_at: string }[]; can_test: boolean; reason: string | null } | null = null;
  pushLoading = false;
  pushError = '';
  pushSending = false;
  private pushRequestId: string | null = null;

  fetchPushDevices(): void {
    if (!this.customerId || !this.helperService.can('customer.notification.view')) return;
    const id = this.customerId;
    this.pushLoading = true;
    this.pushState = null;
    this.pushError = '';
    this.apiService.customerPushDevices(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => { if (id !== this.customerId) return; this.pushState = res.data; this.pushLoading = false; },
      error: () => { if (id !== this.customerId) return; this.pushError = 'Unable to load registered devices.'; this.pushLoading = false; },
    });
  }

  sendTestPush(): void {
    if (!this.customerId || !this.pushState?.can_test || this.pushSending || !this.helperService.can('customer.notification.send')) return;
    const id = this.customerId;
    this.pushRequestId ||= crypto.randomUUID();
    this.pushSending = true;
    this.apiService.customerPushTest(id, this.pushRequestId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.pushSending = false;
        this.pushRequestId = null;
        this.toastr.success('Test push queued. Delivery will be attempted by the notification worker.');
        if (id === this.customerId) this.fetchNotificationHistory();
      },
      error: (error: any) => {
        this.pushSending = false;
        this.toastr.error(error?.error?.message || 'Unable to queue test push. Please retry.');
      },
    });
  }

  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private dialog: MatDialog,
    public helperService: HelpersService,
  ) {
    this.historyPagination = Global.resetPaginationOptions();
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.customerId = params.get('_id');
      if (this.customerId) {
        this.pushRequestId = null;
        this.fetchSessions();
        this.fetchPushDevices();
        this.fetchAddresses();
        this.fetchCustomerDetails();
        this.fetchNotificationPreferences();
        this.fetchNotificationHistory();
      }
    });
    this.helperService.filterButtonClick$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.openFilters());
    this.updateFilterButton();
  }

  ngOnDestroy(): void {
    this.helperService.clearFilterButton();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isPrivileged(): boolean {
    return this.helperService.can('customer.address.manage');
  }

  fetchAddresses(): void {
    if (!this.customerId) return;
    this.addresses = [];
    this.addressesLoading = true;
    this.addressesError = false;
    this.apiService.customerAddresses(this.customerId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => { this.addresses = res?.data || []; this.addressesLoading = false; },
      error: () => { this.addressesLoading = false; this.addressesError = true; },
    });
  }

  editAddress(address: any): void {
    if (!this.isPrivileged || !this.customerId) return;
    this.dialog.open(CustomerAddressDialogComponent, {
      width: '680px', maxWidth: '96vw', maxHeight: '92vh', disableClose: true,
      data: { customerId: this.customerId, address },
    }).afterClosed().subscribe(saved => {
      if (saved) { this.fetchAddresses(); this.toastr.success('Customer address updated'); }
    });
  }

  // --- Header / summary ---

  get initials(): string {
    const parts = String(this.customer?.name || '?').trim().split(/\s+/);
    return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
  }

  get shortId(): string {
    return String(this.customer?._id || '').slice(-8);
  }

  get stats(): any {
    return this.customer?.stats ?? { order_count: 0, total_spent: 0, average_order_value: 0, last_order_at: null, first_order_at: null };
  }

  get recentOrders(): any[] {
    return this.customer?.recent_orders ?? [];
  }

  orderStatusLabel(status: string): string {
    return ORDER_STATUS_LABELS[status] ?? status;
  }

  orderStatusClass(status: string): string {
    return ORDER_STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700';
  }

  copy(value: string, what: string): void {
    navigator.clipboard?.writeText(value).then(
      () => this.toastr.success(`${what} copied`),
      () => this.toastr.error(`Couldn't copy ${what}`),
    );
  }

  // ORDER_PLACED → "Order placed"
  eventLabel(event: string): string {
    const text = String(event || '').replace(/[._-]+/g, ' ').trim().toLowerCase();
    return text ? text[0].toUpperCase() + text.slice(1) : '—';
  }

  channelLabel(channel: string): string {
    return ({ sms: 'SMS', whatsapp: 'WhatsApp', email: 'Email', push: 'Push' } as Record<string, string>)[channel] ?? channel;
  }

  channelIcon(channel: string): string {
    return ({ sms: 'sms', whatsapp: 'chat', email: 'mail', push: 'notifications' } as Record<string, string>)[channel] ?? 'send';
  }

  statusLabel(status: string): string {
    return ({ DEAD_LETTER: 'Failed', RETRYING: 'Retrying', QUEUED: 'Queued', SENDING: 'Sending', SENT: 'Sent', DELIVERED: 'Delivered', FAILED: 'Failed' } as Record<string, string>)[status] ?? status;
  }

  // Same slide-over the customer list uses. Email/mobile changes reset
  // verification server-side, so preferences are reloaded too.
  editCustomer(): void {
    if (!this.customer || !this.helperService.can('customers.update')) return;
    const { _id, name, email, phone_code, mobile, status, dob, gender } = this.customer;
    this.dialog
      .open(NewCustomerComponent, { data: { _id, name, email, phone_code, mobile, status, dob, gender }, disableClose: true })
      .afterClosed()
      .subscribe((saved: any) => {
        if (!saved) return;
        this.fetchCustomerDetails();
        this.fetchNotificationPreferences();
      });
  }

  // --- Profile / verification ---

  fetchCustomerDetails() {
    this.loading = true;
    this.apiService.customerDetails(this.customerId!).subscribe({
      next: (res: any) => {
        this.customer = res?.data ?? null;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  markVerified(channel: 'email' | 'mobile') {
    const dialogData: ReasonDialogData = {
      title: `Mark ${channel === 'email' ? 'email' : 'mobile'} as verified?`,
      message:
        'This overrides the normal verification flow. Please provide a reason for this manual override — it will be recorded on the customer record.',
      reasonLabel: 'Reason for override',
      minLength: 10,
      confirmText: 'Mark Verified',
    };

    this.dialog
      .open(ReasonDialogComponent, { data: dialogData, disableClose: true })
      .afterClosed()
      .subscribe((result: any) => {
        if (!result?.confirm) return;
        this.apiService
          .verificationOverride(this.customerId!, {
            channel,
            reason: result.reason,
          })
          .subscribe({
            next: () => {
              this.toastr.success(
                `${channel === 'email' ? 'Email' : 'Mobile'} marked as verified`,
              );
              this.fetchCustomerDetails();
            },
            error: () => {},
          });
      });
  }

  // --- Notification preferences ---

  fetchNotificationPreferences() {
    this.apiService.notificationPreferences(this.customerId!).subscribe({
      next: (res: any) => {
        this.preferences = res?.data ?? null;
        this.resetEditableValues();
      },
      error: () => {},
    });
  }

  resetEditableValues() {
    this.editablePreferenceValues = {};
    for (const group of this.preferenceGroups) {
      this.editablePreferenceValues[group.key] = {};
      for (const row of group.rows) {
        this.editablePreferenceValues[group.key][row.key] =
          !!this.preferences?.preferences?.[group.key]?.[row.key];
      }
    }
  }

  isLocked(groupKey: string, rowKey: string): boolean {
    const path = `${groupKey}.${rowKey}`;
    return !!this.preferences?.mandatory_locked_paths?.includes(path);
  }

  unavailableReason(groupKey: string, rowKey: string): string | null {
    const isSmsOrWhatsapp =
      rowKey.includes('sms') || rowKey.includes('whatsapp');
    const isEmail = rowKey.includes('email') || rowKey === 'email';
    if (isSmsOrWhatsapp && this.preferences?.mobile_verified === false) {
      return 'Unavailable — mobile not verified';
    }
    if (isEmail && this.preferences?.email_verified === false) {
      return 'Unavailable — email not verified';
    }
    return null;
  }

  unavailableShort(groupKey: string, rowKey: string): string {
    const reason = this.unavailableReason(groupKey, rowKey) || '';
    return reason.includes('mobile') ? 'Mobile unverified' : reason.includes('email') ? 'Email unverified' : reason;
  }

  isRowDisabled(groupKey: string, rowKey: string): boolean {
    return this.isLocked(groupKey, rowKey) || !!this.unavailableReason(groupKey, rowKey);
  }

  rowValue(groupKey: string, rowKey: string): boolean {
    return !!this.preferences?.preferences?.[groupKey]?.[rowKey];
  }

  toggleEditMode() {
    if (!this.helperService.can('customer.preference.manage')) return;
    if (this.editingPreferences) {
      this.resetEditableValues();
    }
    this.editingPreferences = !this.editingPreferences;
  }

  toggleEditableValue(groupKey: string, rowKey: string) {
    if (this.isRowDisabled(groupKey, rowKey)) return;
    this.editablePreferenceValues[groupKey][rowKey] =
      !this.editablePreferenceValues[groupKey][rowKey];
  }

  savePreferences() {
    if (!this.customerId) return;
    this.savingPreferences = true;
    const payload: Record<string, any> = {};
    for (const group of this.preferenceGroups) {
      payload[group.key] = { ...this.editablePreferenceValues[group.key] };
    }
    this.apiService
      .updateNotificationPreferences(this.customerId, payload)
      .subscribe({
        next: (res: any) => {
          this.savingPreferences = false;
          this.preferences = res?.data ?? this.preferences;
          this.resetEditableValues();
          this.editingPreferences = false;
          this.toastr.success('Notification preferences updated');
          this.fetchPushDevices();
        },
        error: () => {
          this.savingPreferences = false;
        },
      });
  }

  // --- Notification history ---

  get historyFilterFields(): FilterFieldDef[] {
    return [
      {
        key: 'event',
        label: 'Event',
        type: 'text',
        placeholder: 'e.g. order.placed',
      },
      {
        key: 'channel',
        label: 'Channel',
        type: 'select',
        options: [
          { value: 'email', label: 'Email' },
          { value: 'sms', label: 'SMS' },
          { value: 'whatsapp', label: 'WhatsApp' },
          { value: 'push', label: 'Push' },
        ],
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'QUEUED', label: 'Queued' },
          { value: 'SENDING', label: 'Sending' },
          { value: 'SENT', label: 'Sent' },
          { value: 'DELIVERED', label: 'Delivered' },
          { value: 'FAILED', label: 'Failed' },
          { value: 'RETRYING', label: 'Retrying' },
          { value: 'DEAD_LETTER', label: 'Dead Letter' },
        ],
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
    if (this.historyFilterValues['event']) count++;
    if (this.historyFilterValues['channel']) count++;
    if (this.historyFilterValues['status']) count++;
    if (this.historyFilterValues['from_date'] || this.historyFilterValues['to_date'])
      count++;
    return count;
  }

  updateFilterButton(): void {
    this.helperService.setFilterButton(this.filterCount());
  }

  openFilters(): void {
    this.dialog
      .open(FilterDrawerComponent, {
        data: {
          fields: this.historyFilterFields,
          values: { ...this.historyFilterValues },
        },
      })
      .afterClosed()
      .subscribe((result: Record<string, any> | undefined) => {
        if (!result) return;
        this.historyFilterValues = result;
        this.historyPagination.page = 1;
        this.fetchNotificationHistory();
        this.updateFilterButton();
      });
  }

  fetchNotificationHistory() {
    if (!this.customerId) return;
    const params = new URLSearchParams({ user_id: this.customerId });
    if (this.historyPagination.limit) {
      params.set('limit', String(this.historyPagination.limit));
    }
    if (this.historyPagination.page) {
      params.set('page', String(this.historyPagination.page));
    }
    if (this.historyFilterValues['event']) {
      params.set('event', this.historyFilterValues['event']);
    }
    if (this.historyFilterValues['channel']) {
      params.set('channel', this.historyFilterValues['channel']);
    }
    if (this.historyFilterValues['status']) {
      params.set('status', this.historyFilterValues['status']);
    }
    if (this.historyFilterValues['from_date']) {
      params.set('from', this.historyFilterValues['from_date']);
    }
    if (this.historyFilterValues['to_date']) {
      params.set('to', this.historyFilterValues['to_date']);
    }

    this.apiService.notificationHistory(params).subscribe({
      next: (res: any) => {
        this.historyList = res?.data?.docs ?? [];
        this.historyPagination = { ...res?.data };
      },
      error: () => {},
    });
  }

  onHistoryPageChange(page: number) {
    this.historyPagination.page = page;
    this.fetchNotificationHistory();
  }
}
