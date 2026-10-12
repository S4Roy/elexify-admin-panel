import { CurrencyPipe, DecimalPipe, NgClass, NgFor, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import * as Highcharts from 'highcharts';
import { HighchartsChartComponent } from 'highcharts-angular';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { ApiService } from 'app/core/services/api.service';
import { ExportDownloadService } from 'app/core/services/export-download.service';
import { HelpersService } from 'app/core/services/helpers.service';
import { EmptyStateComponent } from '../../includes/empty-state/empty-state.component';
import { PaginationComponent } from '../../includes/pagination/pagination.component';

type Preset = 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month' | 'this_year' | 'custom';
interface ReportColumn { key: string; header: string; kind: 'text' | 'int' | 'money' | 'pct' }
interface ReportDef { type: string; title: string; description: string; columns: ReportColumn[]; searchable: boolean }

const PRESETS: { value: Preset; label: string }[] = [
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'this_year', label: 'This year' },
  { value: 'custom', label: 'Custom' },
];
const CHART_FONT = 'Rethink Sans, sans-serif';
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Sales reports (backend services/reports): one generic table per report,
// driven by the column definitions the API returns, plus KPI tiles and a
// chart for sales over time. Filters live in the URL so a report can be
// bookmarked or shared.
@Component({
  selector: 'app-reports',
  imports: [NgIf, NgFor, NgClass, NgSwitch, NgSwitchCase, NgSwitchDefault, FormsModule, CurrencyPipe, DecimalPipe, RouterLink, HighchartsChartComponent, EmptyStateComponent, PaginationComponent],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class ReportsComponent implements OnInit, OnDestroy {
  readonly presets = PRESETS;
  reports: ReportDef[] = [];
  type = 'sales';
  preset: Preset = 'last_30_days';
  customFrom = '';
  customTo = '';
  groupBy: 'day' | 'week' | 'month' = 'day';
  channel = '';
  payment = '';
  search = '';
  page = 1;

  loading = false;
  exporting = false;
  data: any = null;
  chartOptions: Highcharts.Options = {};
  private search$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private exportDownload: ExportDownloadService,
    private route: ActivatedRoute,
    private router: Router,
    public helperService: HelpersService,
  ) {}

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    this.type = q.get('type') || 'sales';
    this.preset = (PRESETS.some((p) => p.value === q.get('preset')) ? q.get('preset') : 'last_30_days') as Preset;
    this.customFrom = q.get('from') || '';
    this.customTo = q.get('to') || '';
    this.groupBy = (['day', 'week', 'month'].includes(q.get('group_by') || '') ? q.get('group_by') : 'day') as any;
    this.channel = q.get('channel') || '';
    this.payment = q.get('payment') || '';

    if (this.helperService.can('orders.export')) this.helperService.setExportAction({ label: 'Export', icon: 'download' });
    this.helperService.exportActionClick$.pipe(takeUntil(this.destroy$)).subscribe(() => this.exportReport());
    this.search$.pipe(debounceTime(350), takeUntil(this.destroy$)).subscribe(() => {
      this.page = 1;
      this.fetch();
    });
    this.apiService.reportList().subscribe({
      next: (res: any) => {
        this.reports = res?.data ?? [];
        if (!this.reports.some((r) => r.type === this.type)) this.type = 'sales';
        this.fetch();
      },
    });
  }

  ngOnDestroy(): void {
    this.helperService.clearExportAction();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get current(): ReportDef | undefined {
    return this.reports.find((r) => r.type === this.type);
  }

  get columns(): ReportColumn[] {
    return this.data?.columns ?? this.current?.columns ?? [];
  }

  get range(): { from: string; to: string } {
    const today = new Date();
    const daysAgo = (n: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - n);
    switch (this.preset) {
      case 'last_7_days': return { from: iso(daysAgo(6)), to: iso(today) };
      case 'this_month': return { from: iso(new Date(today.getFullYear(), today.getMonth(), 1)), to: iso(today) };
      case 'last_month': return {
        from: iso(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
        to: iso(new Date(today.getFullYear(), today.getMonth(), 0)),
      };
      case 'this_year': return { from: iso(new Date(today.getFullYear(), 0, 1)), to: iso(today) };
      case 'custom': return { from: this.customFrom || iso(daysAgo(29)), to: this.customTo || iso(today) };
      default: return { from: iso(daysAgo(29)), to: iso(today) };
    }
  }

  private params(): URLSearchParams {
    const { from, to } = this.range;
    const params = new URLSearchParams({ from, to });
    if (this.channel) params.set('channel', this.channel);
    if (this.payment) params.set('payment', this.payment);
    if (this.type === 'sales') params.set('group_by', this.groupBy);
    if (this.current?.searchable && this.search.trim()) params.set('search', this.search.trim());
    return params;
  }

  private syncUrl(): void {
    const { from, to } = this.range;
    this.router.navigate([], {
      relativeTo: this.route,
      replaceUrl: true,
      queryParams: {
        type: this.type,
        preset: this.preset,
        from: this.preset === 'custom' ? from : null,
        to: this.preset === 'custom' ? to : null,
        group_by: this.type === 'sales' ? this.groupBy : null,
        channel: this.channel || null,
        payment: this.payment || null,
      },
    });
  }

  selectReport(type: string): void {
    if (type === this.type) return;
    this.type = type;
    this.search = '';
    this.page = 1;
    this.data = null;
    this.fetch();
  }

  applyFilters(): void {
    if (this.preset === 'custom' && this.customFrom && this.customTo && this.customFrom > this.customTo) return;
    this.page = 1;
    this.fetch();
  }

  onSearch(value: string): void {
    this.search = value;
    this.search$.next(value);
  }

  onPageChange(page: number): void {
    this.page = page;
    this.fetch();
  }

  fetch(): void {
    this.loading = true;
    this.syncUrl();
    const params = this.params();
    params.set('page', String(this.page));
    params.set('limit', '25');
    const type = this.type;
    this.apiService.report(type, params).subscribe({
      next: (res: any) => {
        if (type !== this.type) return;
        this.data = res?.data ?? null;
        this.buildChart();
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  exportReport(): void {
    if (this.exporting) return;
    this.exporting = true;
    this.exportDownload.download(this.apiService.exportReport(this.type, this.params()), `${this.type.replace(/_/g, '-')}-report`, () => (this.exporting = false));
  }

  get paginationOption(): any {
    const p = this.data?.pagination;
    return p ? { ...p, docs: this.data.rows } : null;
  }

  isNumeric(column: ReportColumn): boolean {
    return column.kind !== 'text';
  }

  // KPI tiles for the sales report.
  get kpis(): { label: string; value: number; kind: 'money' | 'int'; hint?: string }[] {
    const t = this.data?.totals;
    if (this.type !== 'sales' || !t) return [];
    return [
      { label: 'Net sales', value: t.net_sales, kind: 'money', hint: 'After discounts, incl. shipping & fees' },
      { label: 'Orders', value: t.orders, kind: 'int' },
      { label: 'Avg. order value', value: t.avg_order_value, kind: 'money' },
      { label: 'Items sold', value: t.items, kind: 'int' },
      { label: 'Coupon discounts', value: t.discounts, kind: 'money' },
      { label: 'Refunds', value: t.refunds, kind: 'money' },
      { label: 'Cancelled / returned', value: t.cancelled_orders, kind: 'int', hint: `${this.formatMoney(t.cancelled_value)} not counted in sales` },
    ];
  }

  private formatMoney(value: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
  }

  private buildChart(): void {
    if (this.type !== 'sales' || !this.data?.rows?.length) {
      this.chartOptions = {};
      return;
    }
    const rows = this.data.rows;
    this.chartOptions = {
      chart: { height: 300, style: { fontFamily: CHART_FONT }, backgroundColor: 'transparent' },
      title: { text: undefined },
      credits: { enabled: false },
      xAxis: { categories: rows.map((r: any) => r.period), labels: { step: Math.ceil(rows.length / 12) } },
      yAxis: [
        { title: { text: 'Net sales (₹)' }, min: 0 },
        { title: { text: 'Orders' }, opposite: true, min: 0, allowDecimals: false },
      ],
      tooltip: { shared: true },
      legend: { align: 'left', verticalAlign: 'top' },
      series: [
        { type: 'column', name: 'Net sales', data: rows.map((r: any) => r.net_sales), color: '#2563eb', tooltip: { valuePrefix: '₹' } },
        { type: 'spline', name: 'Orders', yAxis: 1, data: rows.map((r: any) => r.orders), color: '#f59e0b' },
      ],
    };
  }
}
