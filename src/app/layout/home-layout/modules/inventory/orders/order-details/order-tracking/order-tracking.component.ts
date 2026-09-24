import { DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { InventoryService } from 'app/core/services/inventory.service';

// Shipment tracking on the admin order-details page — the same model the
// storefront /track-order page renders (milestones, one card per shipment
// with its full courier scan log), plus what staff need: Shiprocket ids,
// where each scan came from, booking failures and the order's audit trail
// (every status change with who made it and why).

const IST = '+0530';
const PREVIEW_EVENTS = 8;
const PREVIEW_ACTIVITY = 6;

const SHIPMENT_STATUS_STYLES: Record<string, string> = {
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-700',
  returned: 'bg-amber-100 text-amber-800',
  return_requested: 'bg-amber-100 text-amber-800',
  failed: 'bg-red-100 text-red-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  out_for_delivery: 'bg-indigo-100 text-indigo-800',
};

const SOURCE_LABELS: Record<string, string> = {
  webhook: 'Webhook',
  tracking_api: 'Tracking API',
};

interface DayGroup { key: string; label: string; events: any[] }

@Component({
  selector: 'app-order-tracking',
  imports: [NgIf, NgFor, NgClass, DatePipe, MatIconModule],
  templateUrl: './order-tracking.component.html',
  styleUrl: './order-tracking.component.scss',
})
export class OrderTrackingComponent implements OnChanges {
  /** The order as loaded by the details page (with `packages` and `order_items`). */
  @Input() order: any;
  @Input() canSync = false;
  @Input() syncing = false;
  /** Ask the page to run the Shiprocket status sync for these packages. */
  @Output() syncPackages = new EventEmitter<string[] | undefined>();

  readonly tz = IST;
  tracking: any = null;
  loading = false;
  refreshing = false;
  failed = false;
  expanded = new Set<string>();
  groups = new Map<string, { all: DayGroup[]; preview: DayGroup[] }>();
  private loadedKey = '';

  constructor(private inventoryService: InventoryService, private toastr: ToastrService) {}

  // Reload whenever the page re-fetches the order (status change, package
  // sync, …) so the log never lags behind the rest of the page.
  ngOnChanges(): void {
    const key = `${this.order?._id}|${this.order?.updated_at}|${this.order?.order_status}|${this.order?.packages?.length ?? 0}`;
    if (!this.order?._id || key === this.loadedKey) return;
    this.loadedKey = key;
    this.load(false);
  }

  load(refresh: boolean): void {
    if (!this.order?._id) return;
    refresh ? (this.refreshing = true) : (this.loading = !this.tracking);
    this.inventoryService.orderTracking(this.order._id, refresh).subscribe({
      next: (res: any) => {
        this.setTracking(res?.data ?? null);
        this.loading = this.refreshing = false;
        this.failed = false;
        if (refresh) this.toastr.success('Courier tracking refreshed');
      },
      error: () => {
        this.loading = this.refreshing = false;
        this.failed = !this.tracking;
      },
    });
  }

  private setTracking(data: any): void {
    this.tracking = data;
    this.groups.clear();
    for (const s of data?.shipments ?? []) {
      this.groups.set(s.key, { all: groupByDay(s.events), preview: groupByDay(s.events.slice(0, PREVIEW_EVENTS)) });
    }
    const activity = data?.activity ?? [];
    this.groups.set('activity', { all: groupByDay(activity), preview: groupByDay(activity.slice(0, PREVIEW_ACTIVITY)) });
  }

  get shipments(): any[] {
    return this.tracking?.shipments ?? [];
  }

  // Packages whose Shiprocket booking failed are not shipments yet, so the
  // tracking model leaves them out — list them so they aren't forgotten.
  get unbookedPackages(): any[] {
    const tracked = new Set(this.shipments.map((s) => String(s.package_id)));
    return (this.order?.packages ?? []).filter(
      (p: any) => p.integration_status && p.integration_status !== 'created' && !tracked.has(String(p._id)),
    );
  }

  eta(at: string | null, raw: string | null): string | null {
    if (at) return new Date(at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
    return raw || null;
  }

  groupsFor(key: string): DayGroup[] {
    const g = this.groups.get(key);
    if (!g) return [];
    return this.expanded.has(key) ? g.all : g.preview;
  }

  toggle(key: string): void {
    this.expanded.has(key) ? this.expanded.delete(key) : this.expanded.add(key);
  }

  isLatest(shipment: any, event: any): boolean {
    return shipment.events[0] === event;
  }

  packageFor(shipment: any): any {
    return (this.order?.packages ?? []).find((p: any) => String(p._id) === String(shipment.package_id));
  }

  orderItemFor(id: string): any {
    return (this.order?.order_items ?? []).find((item: any) => String(item._id) === String(id));
  }

  statusClass(status: string): string {
    return SHIPMENT_STATUS_STYLES[status] ?? 'bg-blue-100 text-blue-800';
  }

  sourceLabel(event: any): string {
    if (event.kind === 'update') return 'Package update';
    return SOURCE_LABELS[event.source] ?? 'Courier';
  }

  milestoneDot(m: any): string {
    if (m.tone === 'danger' && m.state !== 'upcoming') return 'border-red-500 bg-red-500 text-white';
    if (m.tone === 'warning' && m.state !== 'upcoming') return 'border-amber-500 bg-amber-500 text-white';
    if (m.state === 'done') return 'border-primary bg-primary text-white';
    if (m.state === 'current') return 'border-primary bg-white text-primary';
    return 'border-gray-200 bg-white text-gray-300';
  }

  lineDone(i: number): boolean {
    const next = this.tracking?.milestones?.[i + 1];
    return !!next && next.state !== 'upcoming';
  }

  copy(value: string, what: string): void {
    navigator.clipboard?.writeText(value).then(
      () => this.toastr.success(`${what} copied`),
      () => this.toastr.error(`Couldn't copy ${what}`),
    );
  }

  syncShipment(shipment: any): void {
    this.syncPackages.emit(shipment.package_id ? [String(shipment.package_id)] : undefined);
  }
}

// Newest-first events under one heading per IST calendar day.
function groupByDay(events: any[]): DayGroup[] {
  const groups: DayGroup[] = [];
  const dayKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const today = dayKey(new Date());
  const yesterday = dayKey(new Date(Date.now() - 86_400_000));
  for (const event of events) {
    const date = event.at ? new Date(event.at) : null;
    const key = date ? dayKey(date) : 'unknown';
    const last = groups[groups.length - 1];
    if (last?.key === key) {
      last.events.push(event);
      continue;
    }
    const label = !date
      ? 'Date unknown'
      : key === today
        ? 'Today'
        : key === yesterday
          ? 'Yesterday'
          : date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
    groups.push({ key, label, events: [event] });
  }
  return groups;
}
