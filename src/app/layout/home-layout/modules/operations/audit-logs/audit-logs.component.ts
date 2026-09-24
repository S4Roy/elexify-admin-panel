import { DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';
import { ApiService } from 'app/core/services/api.service';
import { HelpersService } from 'app/core/services/helpers.service';
import { ExportDownloadService } from 'app/core/services/export-download.service';
import * as Global from 'app/global';
import FilterOptions from 'app/core/models/FilterOptions';
import { FilterFieldDef } from 'app/core/models/FilterFieldDef';
import PaginationOptions from 'app/core/models/PaginationOptions';
import { FilterDrawerComponent } from '../../../includes/filter-drawer/filter-drawer.component';
import { PaginationComponent } from '../../../includes/pagination/pagination.component';
import { EmptyStateComponent } from '../../../includes/empty-state/empty-state.component';
import { AuditLogDetailDialogComponent } from './audit-log-detail-dialog/audit-log-detail-dialog.component';

// Buckets events by their prefix (RBAC_, ORDER_, SYSTEM_, ...) purely for
// badge coloring — matches how the schema enum in models/AuditLog.js
// groups its ~40 event names, without hardcoding every one here.
const CATEGORY_STYLES: Record<string, string> = {
  RBAC: 'bg-purple-100 text-purple-800',
  SYSTEM: 'bg-amber-100 text-amber-800',
  ORDER: 'bg-blue-100 text-blue-800',
  RETURN: 'bg-blue-100 text-blue-800',
  ZOHO: 'bg-teal-100 text-teal-800',
  CUSTOMER: 'bg-green-100 text-green-800',
  EMAIL: 'bg-indigo-100 text-indigo-800',
  SMS: 'bg-indigo-100 text-indigo-800',
  INTEGRATION: 'bg-rose-100 text-rose-700',
  AUDIT: 'bg-gray-100 text-gray-700',
  ADMIN: 'bg-slate-100 text-slate-700',
};
// Failed/locked security events get a red badge regardless of their
// domain prefix, so they stand out from routine change events at a glance.
const WARNING_EVENT_PATTERN = /_(FAILED|LOCKED)$/;
const WARNING_STYLE = 'bg-red-100 text-red-800';

@Component({
  selector: 'app-audit-logs',
  imports: [NgIf, NgFor, NgClass, DatePipe, PaginationComponent, EmptyStateComponent],
  templateUrl: './audit-logs.component.html',
  styleUrl: './audit-logs.component.scss',
})
export class AuditLogsComponent implements OnInit, OnDestroy {
  private exportDownload = inject(ExportDownloadService);

  itemList: any[] = [];
  paginationOption: PaginationOptions;
  loading = true;
  exporting = false;

  filterOption: FilterOptions;
  filterValues: Record<string, any> = {
    event: [],
    search_key: null,
    from_date: null,
    to_date: null,
  };
  private eventOptions: { value: string; label: string }[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private dialog: MatDialog,
    private apiService: ApiService,
    public helperService: HelpersService,
  ) {
    this.paginationOption = Global.resetPaginationOptions();
    this.filterOption = Global.resetTableFilterOptions();
  }

  ngOnInit(): void {
    this.helperService.filterButtonClick$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.openFilters());
    if (this.helperService.can('audit_log.view')) this.helperService.setExportAction({ label: 'Export', icon: 'download' });
    this.helperService.exportActionClick$.pipe(takeUntil(this.destroy$)).subscribe(() => this.exportList());
    this.updateFilterButton();
    this.loadEventOptions();
    this.fetchList();
  }

  ngOnDestroy(): void {
    this.helperService.clearFilterButton();
    this.helperService.clearExportAction();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadEventOptions(): void {
    this.apiService.auditLogEvents().subscribe({
      next: (res: any) => {
        this.eventOptions = (res?.data ?? []).map((value: string) => ({ value, label: Global.humanize(value) }));
      },
    });
  }

  get filterFields(): FilterFieldDef[] {
    return [
      {
        key: 'event',
        label: 'Event',
        type: 'multiselect',
        placeholder: 'All events',
        showCheckboxes: true,
        options: this.eventOptions,
      },
      {
        key: 'search_key',
        label: 'Search',
        type: 'text',
        placeholder: 'Actor, target, reason or event…',
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
    if (this.filterValues['event']?.length) count++;
    if (this.filterValues['search_key']) count++;
    if (this.filterValues['from_date'] || this.filterValues['to_date']) count++;
    return count;
  }

  updateFilterButton(): void {
    this.helperService.setFilterButton(this.filterCount());
  }

  openFilters(): void {
    this.dialog
      .open(FilterDrawerComponent, {
        data: { fields: this.filterFields, values: { ...this.filterValues } },
      })
      .afterClosed()
      .subscribe((result: Record<string, any> | undefined) => {
        if (!result) return;
        this.filterValues = result;
        this.filterOption.event = this.filterValues['event']?.length ? this.filterValues['event'].join(',') : null;
        this.filterOption.search_key = this.filterValues['search_key'] || null;
        this.filterOption.from_date = this.filterValues['from_date'] || null;
        this.filterOption.to_date = this.filterValues['to_date'] || null;
        this.paginationOption.page = 1;
        this.fetchList();
        this.updateFilterButton();
      });
  }

  private buildParams(): URLSearchParams {
    const params = new URLSearchParams();
    if (this.filterOption.event) params.set('event', this.filterOption.event);
    if (this.filterOption.search_key) params.set('search', this.filterOption.search_key);
    if (this.filterOption.from_date) params.set('from', this.filterOption.from_date);
    if (this.filterOption.to_date) params.set('to', this.filterOption.to_date);
    return params;
  }

  fetchList() {
    this.loading = true;
    const params = this.buildParams();
    if (this.paginationOption.limit) params.set('limit', String(this.paginationOption.limit));
    if (this.paginationOption.page) params.set('page', String(this.paginationOption.page));

    this.apiService.auditLogs(params).subscribe({
      next: (res: any) => {
        this.itemList = res?.data?.docs ?? [];
        this.paginationOption = { ...res?.data };
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  exportList(): void {
    if (this.exporting) return;
    this.exporting = true;
    this.exportDownload.download(this.apiService.exportAuditLogs(this.buildParams()), 'audit-logs', () => (this.exporting = false));
  }

  onPageChange(page: number) {
    this.paginationOption.page = page;
    this.fetchList();
  }

  categoryClass(event: string): string {
    if (WARNING_EVENT_PATTERN.test(event || '')) return WARNING_STYLE;
    const prefix = (event || '').split('_')[0];
    return CATEGORY_STYLES[prefix] ?? 'bg-gray-100 text-gray-600';
  }

  eventLabel(event: string): string {
    return Global.humanize(event || '');
  }

  viewDetails(item: any): void {
    this.dialog.open(AuditLogDetailDialogComponent, {
      width: '640px',
      maxWidth: '96vw',
      maxHeight: '90vh',
      data: { entry: item },
    });
  }
}
