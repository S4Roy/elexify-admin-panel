import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { HelpersService } from 'app/core/services/helpers.service';
import { FilterDrawerComponent } from '../../../includes/filter-drawer/filter-drawer.component';
import { PaginationComponent } from '../../../includes/pagination/pagination.component';
import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { InventoryService } from 'app/core/services/inventory.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-returns',
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule, PaginationComponent],
  templateUrl: './returns.component.html',
  styleUrl: './returns.component.scss',
})
export class ReturnsComponent implements OnInit, OnDestroy {
  requests: any[] = [];
  loading = true;
  status = '';
  error = '';
  pagination: any = {};
  expanded: Record<string, boolean> = {};
  readonly statuses = ['requested', 'approved', 'received', 'refund_pending', 'refund_failed', 'manual_action_required', 'replacement_pending', 'replacement_shipped', 'qc_failed', 'completed', 'rejected', 'cancelled'];
  private destroy$ = new Subject<void>();
  private listRequest?: Subscription;
  label(value: string): string { return (value || '').replace(/_/g, ' '); }
  tone(status: string): string {
    if (['completed', 'replacement_shipped'].includes(status)) return 'success';
    if (['refund_failed', 'qc_failed', 'rejected'].includes(status)) return 'danger';
    if (['requested', 'manual_action_required'].includes(status)) return 'warning';
    return 'neutral';
  }
  get awaitingReview(): number { return this.requests.filter(r => r.status === 'requested').length; }
  get needsAttention(): number { return this.requests.filter(r => ['refund_failed', 'qc_failed', 'manual_action_required'].includes(r.status)).length; }
  get inProgress(): number { return this.requests.filter(r => ['approved', 'received', 'refund_pending', 'replacement_pending'].includes(r.status)).length; }
  openFilters(): void {
    this.dialog.open(FilterDrawerComponent, { data: { fields: [{ key: 'status', label: 'Return status', type: 'select', options: this.statuses.map(value => ({ value, label: this.label(value) })) }], values: { status: this.status } } })
      .afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
        if (!result) return;
        this.status = result.status || ''; this.page = 1; this.load();
      });
  }
  clearFilter(): void { this.status = ''; this.page = 1; this.load(); }
  changePage(page: number): void { this.page = page; this.load(); }

  page = 1;
  totalPages = 1;
  booking: Record<string, any> = {};
  busyId: string | null = null;
  notes: Record<string, string> = {};
  inspection: Record<string, Record<string, { accepted_quantity: number; disposition: 'restock' | 'damaged'; note: string }>> = {};
  settlementReferences: Record<string, string> = {};
  pickup: Record<string, { status: string; provider: string; tracking_number: string; failure_reason: string; expected_at: string }> = {};

  constructor(private inventory: InventoryService, private toastr: ToastrService, private helper: HelpersService, private dialog: MatDialog) {}
  ngOnInit() {
    this.helper.filterButtonClick$.pipe(takeUntil(this.destroy$)).subscribe(() => this.openFilters());
    this.load();
  }
  ngOnDestroy(): void {
    this.listRequest?.unsubscribe();
    this.helper.clearFilterButton();
    this.destroy$.next(); this.destroy$.complete();
  }

  load() {
    this.listRequest?.unsubscribe();
    this.helper.setFilterButton(this.status ? 1 : 0);
    this.error = '';
    this.loading = true;
    const params = new URLSearchParams({ page: String(this.page), limit: '20' });
    if (this.status) params.set('status', this.status);
    this.listRequest = this.inventory.returnRequests(params).subscribe({
      next: (response: any) => { this.requests = response?.data?.docs ?? []; this.pagination = response?.data || {}; this.totalPages = response?.data?.totalPages || 1; this.loading = false; },
      error: () => { this.loading = false; this.error = 'Could not load return requests. Please try again.'; },
    });
  }

  bookingFor(request: any): any {
    this.booking[request._id] ??= { warehouse: '', length: null, breadth: null, height: null, weight: null, external_order_id: '' };
    return this.booking[request._id];
  }

  operate(request: any, operation: string): void {
    const form = this.bookingFor(request);
    const payload: any = { return_request_id: request._id, operation };
    if (operation === 'book') {
      payload.warehouse = form.warehouse;
      if (form.external_order_id) payload.external_order_id = String(form.external_order_id);
      if (!request.pickup?.shiprocket_shipment_id && !form.external_order_id) {
        if (['length', 'breadth', 'height', 'weight'].some((key) => !(Number(form[key]) > 0))) {
          this.toastr.error('Enter positive parcel dimensions and weight.'); return;
        }
        payload.parcel = { length: Number(form.length), breadth: Number(form.breadth), height: Number(form.height), weight: Number(form.weight) };
      }
    }
    this.busyId = request._id;
    this.inventory.returnOperation(payload).subscribe({
      next: (response: any) => { this.toastr.success(response.message); this.busyId = null; this.load(); },
      error: () => { this.busyId = null; this.load(); },
    });
  }

  review(request: any, action: 'approve' | 'reject'): void {
    const note = (this.notes[request._id] || '').trim();
    if (action === 'reject' && !note) {
      this.toastr.error('A rejection reason is required.');
      return;
    }
    this.busyId = request._id;
    this.inventory.reviewReturn({ return_request_id: request._id, action, note }).subscribe({
      next: (response: any) => { this.toastr.success(response?.message); this.busyId = null; this.load(); },
      error: () => { this.busyId = null; },
    });
  }

  receive(request: any): void {
    this.busyId = request._id;
    this.inventory.receiveReturn(request._id).subscribe({
      next: (response: any) => { this.toastr.success(response?.message); this.busyId = null; this.load(); },
      error: () => { this.busyId = null; },
    });
  }

  inspectionFor(request: any, item: any) {
    this.inspection[request._id] ??= {};
    this.inspection[request._id][item._id] ??= { accepted_quantity: item.quantity, disposition: 'restock', note: '' };
    return this.inspection[request._id][item._id];
  }

  submitInspection(request: any): void {
    const items = request.items.map((item: any) => ({ return_item_id: item._id, ...this.inspectionFor(request, item) }));
    const invalid = items.some((item: any, index: number) => item.accepted_quantity < 0 || item.accepted_quantity > request.items[index].quantity);
    if (invalid) { this.toastr.error('Accepted quantities must be within the requested quantities.'); return; }
    this.busyId = request._id;
    this.inventory.inspectReturn({ return_request_id: request._id, items, note: this.notes[request._id] || '' }).subscribe({
      next: (response: any) => { this.toastr.success(response?.message); this.busyId = null; this.load(); },
      error: () => { this.busyId = null; },
    });
  }

  completeManualRefund(request: any): void {
    const reference = (this.settlementReferences[request._id] || '').trim();
    if (!reference) { this.toastr.error('Enter the bank, PayPal, or cash settlement reference.'); return; }
    this.busyId = request._id;
    this.inventory.completeManualReturnRefund({ return_request_id: request._id, reference, note: this.notes[request._id] || '' }).subscribe({
      next: (response: any) => { this.toastr.success(response?.message); this.busyId = null; this.load(); },
      error: () => { this.busyId = null; },
    });
  }

  pickupFor(request: any) {
    this.pickup[request._id] ??= {
      status: request.pickup?.status === 'not_scheduled' ? 'scheduled' : (request.pickup?.status || 'scheduled'),
      provider: request.pickup?.provider || 'Shiprocket', tracking_number: request.pickup?.tracking_number || '', failure_reason: '',
      expected_at: request.pickup?.expected_at ? new Date(request.pickup.expected_at).toISOString().slice(0, 16) : '',
    };
    return this.pickup[request._id];
  }

  updatePickup(request: any): void {
    const pickup = this.pickupFor(request);
    if (['scheduled', 'rescheduled'].includes(pickup.status) && (!pickup.provider.trim() || !pickup.tracking_number.trim() || !pickup.expected_at)) {
      this.toastr.error('Provider, tracking number, and pickup date are required.'); return;
    }
    if (pickup.status === 'failed' && !pickup.failure_reason.trim()) {
      this.toastr.error('Failure reason is required.'); return;
    }
    this.busyId = request._id;
    this.inventory.updateReturnPickup({ return_request_id: request._id, ...pickup, expected_at: pickup.expected_at ? new Date(pickup.expected_at).toISOString() : null }).subscribe({
      next: (response: any) => { this.toastr.success(response?.message); this.busyId = null; this.load(); },
      error: () => { this.busyId = null; },
    });
  }
}
