import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { InventoryService } from 'app/core/services/inventory.service';
import * as Global from 'app/global';
import * as Highcharts from 'highcharts';
import { HighchartsChartComponent } from 'highcharts-angular';

const CHART_FONT = 'Rethink Sans, sans-serif';

function donutOptions(overrides: Highcharts.Options): Highcharts.Options {
  return {
    chart: {
      type: 'pie',
      height: 220,
      style: { fontFamily: CHART_FONT },
      backgroundColor: 'var(--bg-surface)',
    },
    title: { text: undefined },
    credits: { enabled: false },
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
        color: 'var(--text-secondary)',
        fontWeight: '500',
        fontSize: '12px',
      },
    },
    // `overrides.tooltip` (set by every caller) replaces this wholesale —
    // spread is shallow — so background/border/text theming lives directly
    // on each caller's tooltip object below, not here.
    ...overrides,
  };
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgFor, NgIf, RouterLink, MatIconModule, HighchartsChartComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent {
  Global = Global;
  data: any = { status: [], total: 0 };
  product: any = {
    total_products: 0,
    low_stock: 0,
    out_of_stock: 0,
    total_categories: 0,
    simple_products: 0,
    variable_products: 0,
  };

  stockChartOptions: Highcharts.Options = {};
  productTypeChartOptions: Highcharts.Options = {};
  statusChartOptions: Highcharts.Options = {};

  // Mirrors data.status (used for the Orders-by-Status list) — the two
  // stock/product-type charts have no equivalent list otherwise, so in the
  // 3-column chart row they'd render shorter than the Orders card and
  // leave a dead gap under them. Also genuinely useful: exact counts
  // alongside the proportions the donut shows.
  stockBreakdown: { label: string; count: number; color: string }[] = [];
  productTypeBreakdown: { label: string; count: number; color: string }[] = [];

  constructor(private inventoryService: InventoryService) {}

  ngOnInit() {
    this.fetchOrderStats();
    this.fetchProductStats();
  }

  fetchOrderStats() {
    this.inventoryService
      .orderStats(new URLSearchParams())
      .subscribe((res: any) => {
        // Sorted largest-first so the statuses that actually matter (e.g.
        // Cancelled/Delivered in the thousands) surface above long-tail
        // ones (e.g. Return Initiated: 5) instead of whatever order the
        // API happens to return.
        this.data.status = (res?.data ?? [])
          .slice()
          .sort((a: any, b: any) => (b?.count ?? 0) - (a?.count ?? 0));
        this.data.total = this.data.status.reduce(
          (sum: number, item: any) => sum + (item?.count ?? 0),
          0,
        );
        this.buildStatusChart();
      });
  }

  // Top-N cap for the status list — an unbounded list (Elexify has 15
  // order statuses) forces the whole 3-column chart row to stretch to
  // its height via CSS grid's default row-stretch, leaving a large dead
  // gap under the shorter Stock Health / Simple vs Variable cards.
  private static readonly STATUS_LIST_LIMIT = 6;

  get topOrderStatuses(): any[] {
    return this.data.status.slice(0, DashboardComponent.STATUS_LIST_LIMIT);
  }

  get orderStatusMoreCount(): number {
    return Math.max(
      this.data.status.length - DashboardComponent.STATUS_LIST_LIMIT,
      0,
    );
  }

  fetchProductStats() {
    this.inventoryService
      .productStats(new URLSearchParams())
      .subscribe((res: any) => {
        this.product = res?.data ?? this.product;
        this.buildStockChart();
        this.buildProductTypeChart();
      });
  }

  private buildStockChart() {
    const lowStock = this.product?.low_stock || 0;
    const outOfStock = this.product?.out_of_stock || 0;
    const inStock = Math.max(
      (this.product?.total_products || 0) - lowStock - outOfStock,
      0,
    );

    this.stockBreakdown = [
      { label: 'In Stock', count: inStock, color: '#22c55e' },
      { label: 'Low Stock', count: lowStock, color: '#f59e0b' },
      { label: 'Out of Stock', count: outOfStock, color: '#ef4444' },
    ];

    this.stockChartOptions = donutOptions({
      tooltip: {
        pointFormat: '<b>{point.y}</b> products ({point.percentage:.1f}%)',
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-color)',
        style: { color: 'var(--text-primary)' },
      },
      series: [
        {
          type: 'pie',
          name: 'Products',
          data: [
            { name: 'In Stock', y: inStock, color: '#22c55e' },
            { name: 'Low Stock', y: lowStock, color: '#f59e0b' },
            { name: 'Out of Stock', y: outOfStock, color: '#ef4444' },
          ],
        },
      ],
    });
  }

  private buildProductTypeChart() {
    this.productTypeBreakdown = [
      {
        label: 'Simple',
        count: this.product?.simple_products || 0,
        color: '#2563eb',
      },
      {
        label: 'Variable',
        count: this.product?.variable_products || 0,
        color: '#a78bfa',
      },
    ];

    this.productTypeChartOptions = donutOptions({
      tooltip: {
        pointFormat: '<b>{point.y}</b> products ({point.percentage:.1f}%)',
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-color)',
        style: { color: 'var(--text-primary)' },
      },
      series: [
        {
          type: 'pie',
          name: 'Products',
          data: [
            {
              name: 'Simple',
              y: this.product?.simple_products || 0,
              color: '#2563eb',
            },
            {
              name: 'Variable',
              y: this.product?.variable_products || 0,
              color: '#a78bfa',
            },
          ],
        },
      ],
    });
  }

  private buildStatusChart() {
    const rows = this.data.status ?? [];
    const points = rows.map((row: any) => ({
      name: this.toTitleCase(row.order_status),
      y: row.count,
      color: Global.statusColor(row.order_status),
    }));

    this.statusChartOptions = donutOptions({
      tooltip: {
        pointFormat: '<b>{point.y}</b> orders ({point.percentage:.1f}%)',
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-color)',
        style: { color: 'var(--text-primary)' },
      },
      series: [{ type: 'pie', name: 'Orders', data: points }],
    });
  }

  toTitleCase(value: string): string {
    return (value || '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
