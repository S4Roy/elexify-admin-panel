import {
  CurrencyPipe,
  DatePipe,
  DecimalPipe,
  NgFor,
  NgIf,
} from '@angular/common';
import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { InventoryService } from 'app/core/services/inventory.service';
import { MatIconModule } from '@angular/material/icon';
import * as Highcharts from 'highcharts';
import {
  HighchartsChartComponent,
  ChartConstructorType,
} from 'highcharts-angular';
import { statusColor } from 'app/global';
import { HelpersService } from 'app/core/services/helpers.service';

const CHART_FONT = 'Rethink Sans, sans-serif';

// Last-used dashboard filters, per browser. A shared/bookmarked URL wins
// over this; this only restores the admin's own last view.
const FILTER_STORAGE_KEY = 'elexify.dashboard.filters.v1';

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  prepaid: 'Prepaid',
  cod: 'Cash on delivery',
  partial_cod: 'Partial COD',
  other: 'Other',
};
const PAYMENT_TYPE_COLORS: Record<string, string> = {
  prepaid: '#2563eb',
  cod: '#f59e0b',
  partial_cod: '#8b5cf6',
  other: '#94a3b8',
};

// Highcharts.numberFormat isn't reliably present on the statically-imported
// CJS namespace under this project's module resolution (the actual chart
// rendering instance comes from provideHighcharts()'s own dynamic ESM
// import instead) — a plain Intl formatter sidesteps that mismatch and
// matches the en-IN locale already used elsewhere on this page.
const numberFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0,
});
function formatNumber(value: number | undefined | null): string {
  return numberFormatter.format(value ?? 0);
}

type TrendPreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'last_7_days'
  | 'last_30_days'
  | 'last_90_days'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'this_year'
  | 'last_year'
  | 'all_time'
  | 'custom';

type GeoMetric = 'revenue' | 'orders' | 'new_customers';
type CompareMode = 'previous_period' | 'previous_year';
type ChannelFilter = '' | 'storefront' | 'admin';
type PaymentFilter = '' | 'prepaid' | 'cod' | 'partial_cod';

@Component({
  selector: 'app-dashboard',
  host: { class: 'dashboard-overview' },
  imports: [
    NgFor,
    RouterLink,
    NgIf,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    MatIconModule,
    HighchartsChartComponent,
    FormsModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  data: any = {};
  product: any = {};
  performance: any = {};
  leaderboardProducts: any[] = [];
  leaderboardProductsMeta: any = {};
  leaderboardCategories: any[] = [];
  leaderboardCategoriesMeta: any = {};
  isLoading: boolean = false;

  // "Store at a glance" (backend order/overview) + inventory watchlist.
  overview: any = null;
  lowStockProducts: any[] = [];

  // The from/to actually applied by the last fetchAll() — used to carry the
  // selected range into the Orders/Customers nav links, so it stays in sync
  // with what's on screen (and doesn't jump ahead on an unapplied custom pick).
  appliedRange: { from: string; to: string } = { from: '', to: '' };

  trendPresets: { value: TrendPreset; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'this_week', label: 'This Week' },
    { value: 'last_week', label: 'Last Week' },
    { value: 'last_7_days', label: 'Last 7 Days' },
    { value: 'last_30_days', label: 'Last 30 Days' },
    { value: 'last_90_days', label: 'Last 90 Days' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'this_quarter', label: 'This Quarter' },
    { value: 'last_quarter', label: 'Last Quarter' },
    { value: 'this_year', label: 'This Year' },
    { value: 'last_year', label: 'Last Year' },
    { value: 'all_time', label: 'All Time' },
    { value: 'custom', label: 'Custom Range' },
  ];
  trendPreset: TrendPreset = 'last_7_days';

  // Segment filters shared by every widget (see backend
  // helpers/dashboard/orderFilters.js). Kept in the URL so a filtered view
  // can be bookmarked or shared.
  compare: CompareMode = 'previous_period';
  channel: ChannelFilter = '';
  payment: PaymentFilter = '';
  compareOptions: { value: CompareMode; label: string }[] = [
    { value: 'previous_period', label: 'Previous period' },
    { value: 'previous_year', label: 'Previous year' },
  ];
  channelOptions: { value: ChannelFilter; label: string }[] = [
    { value: '', label: 'All channels' },
    { value: 'storefront', label: 'Online store' },
    { value: 'admin', label: 'Admin orders' },
  ];
  paymentOptions: { value: PaymentFilter; label: string }[] = [
    { value: '', label: 'All payments' },
    { value: 'prepaid', label: 'Prepaid' },
    { value: 'cod', label: 'Cash on delivery' },
    { value: 'partial_cod', label: 'Partial COD' },
  ];
  customFrom: string | null = null;
  customTo: string | null = null;
  today = this.formatDate(new Date());

  trendLoading = false;
  trendChartOptions: Highcharts.Options = {};
  statusChartOptions: Highcharts.Options = {};

  // Geographic breakdown — one map/list widget shared by "state wise
  // revenue" and "customer demographics" via a metric switcher, instead of
  // two separate widgets over the same underlying per-state data.
  geoStats: any[] = [];
  geoMetric: GeoMetric = 'revenue';
  geoMetricOptions: { value: GeoMetric; label: string }[] = [
    { value: 'revenue', label: 'Revenue' },
    { value: 'orders', label: 'Orders' },
    { value: 'new_customers', label: 'New Customers' },
  ];
  geoMapOptions: Highcharts.Options = {};
  mapChartConstructor: ChartConstructorType = 'mapChart';
  private indiaMapData: any = null;

  constructor(
    private inventoryService: InventoryService,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private helpers: HelpersService,
  ) {}

  // ── Permissions: each section renders (and fetches) only for staff who
  // can see the underlying data, so nobody gets 403 toasts on load.
  get canOrders(): boolean {
    return this.helpers.can('orders.view');
  }
  get canCustomers(): boolean {
    return this.helpers.can('customers.view');
  }
  get canProducts(): boolean {
    return this.helpers.can('products.view');
  }
  get canCategories(): boolean {
    return this.helpers.can('categories.view');
  }
  get canReturns(): boolean {
    return this.helpers.can('return.view');
  }
  get hasAnyInsight(): boolean {
    return (
      this.canOrders ||
      this.canCustomers ||
      this.canProducts ||
      this.canCategories
    );
  }

  ngOnInit() {
    this.readFiltersFromUrl();
    this.fetchAll();
  }

  private readFiltersFromUrl() {
    const url = this.route.snapshot.queryParamMap;
    const fromUrl = [
      'range',
      'from',
      'to',
      'compare',
      'channel',
      'payment',
    ].some((k) => url.has(k));
    let stored: Record<string, string | null> = {};
    if (!fromUrl) {
      try {
        stored =
          JSON.parse(localStorage.getItem(FILTER_STORAGE_KEY) || '{}') || {};
      } catch {
        stored = {};
      }
    }
    const q = {
      get: (k: string): string | null =>
        fromUrl ? url.get(k) : (stored[k] ?? null),
    };
    const range = q.get('range') as TrendPreset | null;
    if (range && this.trendPresets.some((p) => p.value === range))
      this.trendPreset = range;
    if (this.trendPreset === 'custom') {
      this.customFrom = q.get('from');
      this.customTo = q.get('to');
      if (!this.customFrom || !this.customTo) this.trendPreset = 'last_7_days';
    }
    const compare = q.get('compare') as CompareMode | null;
    if (compare && this.compareOptions.some((o) => o.value === compare))
      this.compare = compare;
    const channel = (q.get('channel') || '') as ChannelFilter;
    if (this.channelOptions.some((o) => o.value === channel))
      this.channel = channel;
    const payment = (q.get('payment') || '') as PaymentFilter;
    if (this.paymentOptions.some((o) => o.value === payment))
      this.payment = payment;
  }

  private writeFiltersToUrl() {
    const custom = this.trendPreset === 'custom';
    try {
      localStorage.setItem(
        FILTER_STORAGE_KEY,
        JSON.stringify({
          range: this.trendPreset,
          from: custom ? this.customFrom : null,
          to: custom ? this.customTo : null,
          compare: this.compare,
          channel: this.channel,
          payment: this.payment,
        }),
      );
    } catch {
      // Storage unavailable (private mode / blocked) — URL still carries it.
    }
    this.router.navigate([], {
      relativeTo: this.route,
      replaceUrl: true,
      queryParams: {
        range: this.trendPreset === 'last_7_days' ? null : this.trendPreset,
        from: custom ? this.customFrom : null,
        to: custom ? this.customTo : null,
        compare: this.compare === 'previous_period' ? null : this.compare,
        channel: this.channel || null,
        payment: this.payment || null,
      },
    });
  }

  selectTrendPreset(value: TrendPreset) {
    this.trendPreset = value;
    if (value === 'custom') {
      // Wait for the admin to pick both dates and hit Apply — clear the
      // stale views from whatever preset was active before.
      this.trendChartOptions = {};
    } else {
      this.fetchAll();
    }
  }

  setCompare(value: CompareMode) {
    this.compare = value;
    this.fetchPerformance(this.appliedRange.from, this.appliedRange.to);
    this.writeFiltersToUrl();
  }

  setChannel(value: ChannelFilter) {
    this.channel = value;
    this.fetchAll();
  }

  setPayment(value: PaymentFilter) {
    this.payment = value;
    this.fetchAll();
  }

  get activeSegmentCount(): number {
    return (this.channel ? 1 : 0) + (this.payment ? 1 : 0);
  }

  get isDefaultView(): boolean {
    return (
      this.trendPreset === 'last_7_days' &&
      this.compare === 'previous_period' &&
      !this.activeSegmentCount
    );
  }

  resetFilters() {
    this.trendPreset = 'last_7_days';
    this.customFrom = this.customTo = null;
    this.compare = 'previous_period';
    this.channel = '';
    this.payment = '';
    this.fetchAll();
  }

  get segmentSummary(): string {
    return [
      this.channel
        ? this.channelOptions.find((o) => o.value === this.channel)?.label
        : null,
      this.payment
        ? this.paymentOptions.find((o) => o.value === this.payment)?.label
        : null,
    ]
      .filter(Boolean)
      .join(' · ');
  }

  formatRangeDate(value: string): string {
    if (!value) return '';
    return new Date(value + 'T00:00:00').toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  /** Date range + segment filters as query params for a dashboard endpoint. */
  private filterParams(
    from: string,
    to: string,
    extra: Record<string, string> = {},
  ): URLSearchParams {
    const params = new URLSearchParams({ from, to, ...extra });
    if (this.channel) params.set('channel', this.channel);
    if (this.payment) params.set('payment', this.payment);
    return params;
  }

  applyCustomRange() {
    if (!this.customFrom || !this.customTo) return;
    this.fetchAll();
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private computePresetRange(preset: TrendPreset): {
    from: string;
    to: string;
  } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (preset) {
      case 'today':
        return { from: this.formatDate(today), to: this.formatDate(today) };
      case 'yesterday': {
        const d = new Date(today);
        d.setDate(d.getDate() - 1);
        return { from: this.formatDate(d), to: this.formatDate(d) };
      }
      case 'this_week': {
        const from = this.startOfWeek(today);
        return { from: this.formatDate(from), to: this.formatDate(today) };
      }
      case 'last_week': {
        const thisWeekStart = this.startOfWeek(today);
        const from = new Date(thisWeekStart);
        from.setDate(from.getDate() - 7);
        const to = new Date(thisWeekStart);
        to.setDate(to.getDate() - 1);
        return { from: this.formatDate(from), to: this.formatDate(to) };
      }
      case 'last_7_days': {
        const from = new Date(today);
        from.setDate(from.getDate() - 6);
        return { from: this.formatDate(from), to: this.formatDate(today) };
      }
      case 'last_90_days': {
        const from = new Date(today);
        from.setDate(from.getDate() - 89);
        return { from: this.formatDate(from), to: this.formatDate(today) };
      }
      case 'this_month': {
        const from = new Date(today.getFullYear(), today.getMonth(), 1);
        return { from: this.formatDate(from), to: this.formatDate(today) };
      }
      case 'last_month': {
        const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const to = new Date(today.getFullYear(), today.getMonth(), 0);
        return { from: this.formatDate(from), to: this.formatDate(to) };
      }
      case 'this_quarter': {
        const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
        const from = new Date(today.getFullYear(), quarterStartMonth, 1);
        return { from: this.formatDate(from), to: this.formatDate(today) };
      }
      case 'last_quarter': {
        const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
        const from = new Date(today.getFullYear(), quarterStartMonth - 3, 1);
        const to = new Date(today.getFullYear(), quarterStartMonth, 0);
        return { from: this.formatDate(from), to: this.formatDate(to) };
      }
      case 'this_year': {
        const from = new Date(today.getFullYear(), 0, 1);
        return { from: this.formatDate(from), to: this.formatDate(today) };
      }
      case 'last_year': {
        const from = new Date(today.getFullYear() - 1, 0, 1);
        const to = new Date(today.getFullYear() - 1, 11, 31);
        return { from: this.formatDate(from), to: this.formatDate(to) };
      }
      case 'all_time':
        // A fixed, far-past sentinel rather than a literal epoch date — this
        // still reads sensibly if ever shown in the "from X to Y" range hint,
        // and predates any realistic order history.
        return { from: '2024-01-01', to: this.formatDate(today) };
      case 'last_30_days':
      default: {
        const from = new Date(today);
        from.setDate(from.getDate() - 29);
        return { from: this.formatDate(from), to: this.formatDate(today) };
      }
    }
  }

  // Monday-start week, matching business/e-commerce dashboard convention
  // (Sunday=0 in JS's getDay(), so Monday is day distance 1; this rolls
  // Sunday back 6 days instead of forward).
  private startOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diff);
    return d;
  }

  private currentRange(): { from: string; to: string } {
    if (this.trendPreset === 'custom') {
      return { from: this.customFrom as string, to: this.customTo as string };
    }
    return this.computePresetRange(this.trendPreset);
  }

  /** Single entry point — everything date-scoped on this page refetches together. */
  fetchAll() {
    const { from, to } = this.currentRange();
    this.appliedRange = { from, to };
    this.writeFiltersToUrl();
    if (this.canOrders) {
      this.fetchOrderStats(from, to);
      this.fetchOrderTrend(from, to);
      this.fetchPerformance(from, to);
      this.fetchOverview(from, to);
      this.fetchLeaderboard('product', from, to);
      this.fetchLeaderboard('category', from, to);
      this.fetchGeoStats(from, to);
    }
    // product/stats carries stock counts, category count and new sign-ups.
    if (this.canProducts) this.fetchProductStats(from, to);
    if (this.canProducts) this.fetchLowStock();
  }

  fetchOverview(from: string, to: string) {
    this.inventoryService.orderOverview(this.filterParams(from, to)).subscribe({
      next: (res: any) => (this.overview = res?.data ?? null),
      error: () => (this.overview = null),
    });
  }

  fetchLowStock() {
    const params = new URLSearchParams({
      stock_status: 'low_stock',
      limit: '6',
      page: '1',
    });
    this.inventoryService.productList(params).subscribe({
      next: (res: any) => (this.lowStockProducts = res?.data?.docs ?? []),
      error: () => (this.lowStockProducts = []),
    });
  }

  stockLeft(product: any): number {
    if (product?.type === 'variable' && product?.variations?.length) {
      return Math.min(
        ...product.variations.map((v: any) => Number(v?.stock_quantity) || 0),
      );
    }
    return Number(product?.stock_quantity) || 0;
  }

  /** Backlog entries worth showing, with where each one should take the admin. */
  get actionItems(): {
    key: string;
    label: string;
    count: number;
    icon: string;
    tone: string;
    link: string[];
  }[] {
    const a = this.overview?.action_items;
    return this.memoize('actionItems', [a, this.canReturns], () =>
      a ? this.buildActionItems(a) : [],
    );
  }

  private buildActionItems(a: any) {
    const items = [
      {
        key: 'to_confirm',
        label: 'To confirm',
        count: a.to_confirm,
        icon: 'pending_actions',
        tone: 'amber',
        link: ['/inventory/orders/pending'],
      },
      {
        key: 'to_pack',
        label: 'To pack',
        count: a.to_pack,
        icon: 'inventory',
        tone: 'blue',
        // Matches the backend count: confirmed + processing.
        link: ['/inventory/orders/confirmed,processing'],
      },
      {
        key: 'to_ship',
        label: 'Ready to ship',
        count: a.to_ship,
        icon: 'local_shipping',
        tone: 'indigo',
        link: ['/inventory/orders/packed'],
      },
      {
        key: 'cancel_requests',
        label: 'Cancel requests',
        count: a.cancel_requests,
        icon: 'block',
        tone: 'red',
        link: ['/inventory/orders/cancel_requested'],
      },
      {
        key: 'failed_bookings',
        label: 'Booking failed',
        count: a.failed_bookings,
        icon: 'report',
        tone: 'red',
        link: ['/inventory/orders'],
      },
    ];
    if (this.canReturns) {
      items.push({
        key: 'return_requests',
        label: 'Returns to review',
        count: a.return_requests,
        icon: 'assignment_return',
        tone: 'purple',
        link: ['/inventory/orders/returns'],
      });
    }
    return items;
  }

  get pendingActionCount(): number {
    return this.actionItems.reduce((n, i) => n + (i.count || 0), 0);
  }

  get paymentMix(): {
    type: string;
    label: string;
    orders: number;
    revenue: number;
    share: number;
    color: string;
  }[] {
    const rows = this.overview?.payment_mix ?? [];
    return this.memoize('paymentMix', [this.overview?.payment_mix], () => {
      const total =
        rows.reduce((n: number, r: any) => n + (r.orders || 0), 0) || 1;
      return rows.map((r: any) => ({
        type: r.type,
        label: PAYMENT_TYPE_LABELS[r.type] ?? r.type,
        orders: r.orders,
        revenue: r.revenue,
        share: Math.round((r.orders / total) * 1000) / 10,
        color: PAYMENT_TYPE_COLORS[r.type] ?? '#94a3b8',
      }));
    });
  }

  // Template getters that build fresh arrays on every change detection make
  // *ngFor tear down and re-insert their DOM each cycle. On real iOS/Android
  // devices a tap's touchstart/mouseover already runs change detection, and
  // WebKit treats the resulting "new visible content" as a hover — the click
  // is swallowed, so links, the menu button and the filter selects looked
  // dead on phones. Returning the same array until the inputs change keeps
  // the DOM stable between cycles.
  private memoCache = new Map<string, { deps: unknown[]; value: any }>();
  private memoize<T>(key: string, deps: unknown[], compute: () => T): T {
    const hit = this.memoCache.get(key);
    if (hit && hit.deps.every((d, i) => d === deps[i])) return hit.value;
    const value = compute();
    this.memoCache.set(key, { deps, value });
    return value;
  }

  paymentTypeLabel(type: string): string {
    return PAYMENT_TYPE_LABELS[type] ?? type;
  }

  fetchOrderStats(from: string, to: string) {
    const params = this.filterParams(from, to);
    this.inventoryService.orderStats(params).subscribe((res: any) => {
      this.data.status = res?.data ?? [];
      this.data.total = this.data.status.reduce(
        (sum: number, item: any) => sum + (item?.count ?? 0),
        0,
      );
      this.buildStatusChart();
    });
  }

  fetchProductStats(from: string, to: string) {
    // Stock/category counts stay all-time snapshots server-side; only
    // total_customers is scoped to the selected from/to range (new signups
    // in that window), same standard as the Orders/Revenue cards.
    const params = new URLSearchParams({ from, to });
    this.inventoryService.productStats(params).subscribe((res: any) => {
      this.product = res?.data ?? this.product;
    });
  }

  fetchPerformance(from: string, to: string) {
    const params = this.filterParams(from, to, { compare: this.compare });
    this.inventoryService.orderPerformance(params).subscribe({
      next: (res: any) => {
        this.performance = res?.data ?? {};
      },
      error: () => {},
    });
  }

  fetchLeaderboard(type: 'product' | 'category', from: string, to: string) {
    const params = this.filterParams(from, to, { type, limit: '5' });
    this.inventoryService.orderLeaderboard(params).subscribe({
      next: (res: any) => {
        if (type === 'product') {
          this.leaderboardProducts = res?.data ?? [];
          this.leaderboardProductsMeta = res?.meta ?? {};
        } else {
          this.leaderboardCategories = res?.data ?? [];
          this.leaderboardCategoriesMeta = res?.meta ?? {};
        }
      },
      error: () => {},
    });
  }

  leaderboardMoreCount(rows: any[], meta: any): number {
    const distinctCount = Number(meta?.distinct_count) || 0;
    const shown = rows?.length || 0;
    return Math.max(distinctCount - shown, 0);
  }

  fetchOrderTrend(from: string, to: string) {
    this.trendLoading = true;
    const params = this.filterParams(from, to);
    this.inventoryService.orderTrend(params).subscribe({
      next: (res: any) => {
        this.buildTrendChart(res?.data ?? [], res?.meta?.group_by ?? 'day');
        this.trendLoading = false;
      },
      error: () => {
        this.trendLoading = false;
      },
    });
  }

  deltaClass(pct: number | undefined | null): string {
    if (pct === undefined || pct === null) return '';
    return pct >= 0 ? 'delta-positive' : 'delta-negative';
  }

  formatDelta(pct: number | undefined | null): string {
    if (pct === undefined || pct === null || !isFinite(pct)) return '—';
    const rounded = Math.round(pct);
    return `${rounded > 0 ? '+' : ''}${rounded}%`;
  }

  private buildTrendChart(rows: any[], groupBy: 'day' | 'month' = 'day') {
    const categories = rows.map((row) =>
      groupBy === 'month'
        ? new Date(row.date + '-02').toLocaleDateString('en-IN', {
            month: 'short',
            year: 'numeric',
          })
        : new Date(row.date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
          }),
    );
    const revenue = rows.map((row) => row.revenue ?? 0);
    const orders = rows.map((row) => row.orders ?? 0);

    this.trendChartOptions = {
      chart: {
        type: 'areaspline',
        height: 320,
        style: { fontFamily: CHART_FONT },
        backgroundColor: 'var(--bg-surface)',
      },
      title: { text: undefined },
      credits: { enabled: false },
      xAxis: {
        categories,
        tickInterval: Math.ceil(categories.length / 10),
        lineColor: 'var(--border-color)',
        labels: { style: { color: 'var(--text-secondary)', fontSize: '11px' } },
      },
      yAxis: [
        {
          title: { text: undefined },
          labels: {
            formatter() {
              return '₹' + formatNumber(this.value as number);
            },
            style: { color: 'var(--text-secondary)', fontSize: '11px' },
          },
          gridLineColor: 'var(--bg-surface-alt)',
        },
        {
          title: { text: undefined },
          labels: {
            style: { color: 'var(--text-secondary)', fontSize: '11px' },
          },
          opposite: true,
          gridLineWidth: 0,
        },
      ],
      legend: {
        itemStyle: {
          color: 'var(--text-primary)',
          fontWeight: '500',
          fontSize: '12px',
        },
      },
      tooltip: {
        shared: true,
        valuePrefix: '',
        borderRadius: 8,
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-color)',
        style: { fontSize: '12px', color: 'var(--text-primary)' },
      },
      plotOptions: {
        areaspline: {
          fillOpacity: 0.12,
          marker: { enabled: false, symbol: 'circle' },
          lineWidth: 2.5,
        },
        column: {
          borderRadius: 3,
          borderWidth: 0,
          maxPointWidth: 18,
        },
      },
      series: [
        {
          type: 'areaspline',
          name: 'Revenue',
          data: revenue,
          color: '#2563eb',
          yAxis: 0,
          tooltip: { valuePrefix: '₹' },
        },
        {
          type: 'column',
          name: 'Orders',
          data: orders,
          color: '#a7c4fb',
          yAxis: 1,
        },
      ],
    };
  }

  statusColor = statusColor;

  private buildStatusChart() {
    const rows = this.data.status ?? [];
    const points = rows.map((row: any) => ({
      name: this.toTitleCase(row.order_status),
      y: row.count,
      color: statusColor(row.order_status),
    }));

    this.statusChartOptions = {
      chart: {
        type: 'pie',
        height: 180,
        style: { fontFamily: CHART_FONT },
        backgroundColor: 'var(--bg-surface)',
      },
      title: { text: undefined },
      credits: { enabled: false },
      tooltip: {
        pointFormat: '<b>{point.y}</b> orders ({point.percentage:.1f}%)',
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-color)',
        style: { color: 'var(--text-primary)' },
      },
      plotOptions: {
        pie: {
          innerSize: '68%',
          borderWidth: 2,
          borderColor: 'var(--bg-surface)',
          dataLabels: { enabled: false },
        },
      },
      legend: {
        layout: 'vertical',
        align: 'right',
        verticalAlign: 'middle',
        itemStyle: {
          color: 'var(--text-primary)',
          fontWeight: '500',
          fontSize: '12px',
        },
      },
      series: [
        {
          type: 'pie',
          name: 'Orders',
          data: points,
        },
      ],
    };
  }

  // ── Geographic breakdown (state map + demographics) ───────────────────
  fetchGeoStats(from: string, to: string) {
    const params = this.filterParams(from, to);
    this.inventoryService.orderGeoStats(params).subscribe({
      next: (res: any) => {
        this.geoStats = res?.data ?? [];
        this.ensureMapDataThenBuild();
      },
      error: () => {
        this.geoStats = [];
      },
    });
  }

  selectGeoMetric(metric: GeoMetric) {
    this.geoMetric = metric;
    this.buildGeoMap();
  }

  get topGeoStates(): any[] {
    return this.memoize('topGeoStates', [this.geoStats, this.geoMetric], () =>
      [...this.geoStats]
        .sort((a, b) => (b[this.geoMetric] ?? 0) - (a[this.geoMetric] ?? 0))
        .slice(0, 8),
    );
  }

  geoMetricLabel(): string {
    return (
      this.geoMetricOptions.find((o) => o.value === this.geoMetric)?.label ?? ''
    );
  }

  formatGeoValue(row: any): string {
    const value = row?.[this.geoMetric] ?? 0;
    if (this.geoMetric === 'revenue') {
      return '₹' + formatNumber(value);
    }
    return formatNumber(value);
  }

  private ensureMapDataThenBuild() {
    if (this.indiaMapData) {
      this.buildGeoMap();
      return;
    }
    this.http.get('assets/maps/in-all.topo.json').subscribe({
      next: (topology: any) => {
        this.indiaMapData = topology;
        this.buildGeoMap();
      },
      error: () => {
        // Map asset failed to load — the ranked list still renders from
        // geoStats, so the geographic breakdown isn't a total loss.
      },
    });
  }

  private buildGeoMap() {
    if (!this.indiaMapData) return;

    const metric = this.geoMetric;
    const mapData = this.geoStats.map((row) => ({
      'iso3166-2': row.state_code,
      name: row.state_name,
      value: row[metric] ?? 0,
    }));

    const isCurrency = metric === 'revenue';

    this.geoMapOptions = {
      chart: {
        map: this.indiaMapData,
        height: 340,
        style: { fontFamily: CHART_FONT },
        backgroundColor: 'var(--bg-surface)',
      },
      title: { text: undefined },
      credits: { enabled: false },
      mapNavigation: {
        enabled: true,
        buttonOptions: { verticalAlign: 'bottom' },
      },
      colorAxis: {
        min: 0,
        minColor: 'var(--bg-surface-alt)',
        maxColor: '#2563eb',
      },
      legend: {
        layout: 'horizontal',
        align: 'center',
        verticalAlign: 'bottom',
        itemStyle: { color: 'var(--text-secondary)', fontSize: '11px' },
      },
      tooltip: {
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-color)',
        style: { color: 'var(--text-primary)' },
        formatter(): string {
          const point: any = this;
          const value = isCurrency
            ? '₹' + formatNumber(point.value ?? 0)
            : formatNumber(point.value ?? 0);
          return `<b>${point.name}</b><br/>${value}`;
        },
      },
      series: [
        {
          type: 'map',
          name: this.geoMetricLabel(),
          data: mapData,
          joinBy: ['iso3166-2', 'iso3166-2'],
          nullColor: 'var(--bg-surface-alt)',
          borderColor: 'var(--border-color)',
          borderWidth: 0.5,
          states: {
            hover: { color: '#1d4ed8' },
          },
        } as any,
      ],
    };
  }

  toTitleCase(value: string): string {
    return (value || '')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
