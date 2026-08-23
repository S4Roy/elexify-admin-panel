import { CommonModule, NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import * as Global from 'app/global';
import { InventoryService } from 'app/core/services/inventory.service';
import { DialogService } from 'app/core/services/dialog.service';
import { HelpersService } from 'app/core/services/helpers.service';
import { ConfirmDialogData } from 'app/layout/home-layout/includes/confirm-dialog/confirm-dialog.component';
import { PaginationComponent } from 'app/layout/home-layout/includes/pagination/pagination.component';
import { EmptyStateComponent } from 'app/layout/home-layout/includes/empty-state/empty-state.component';

const FILTER_OPTIONS = [
  { value: 'missing_title', label: 'Missing Title' },
  { value: 'missing_description', label: 'Missing Description' },
  { value: 'missing_keyword', label: 'Missing Focus Keyword' },
  { value: 'duplicate_title', label: 'Duplicate Title' },
  { value: 'duplicate_description', label: 'Duplicate Description' },
  { value: 'poor', label: 'Poor' },
  { value: 'needs_improvement', label: 'Needs Improvement' },
  { value: 'good', label: 'Good' },
];

@Component({
  selector: 'app-seo-manager',
  imports: [
    CommonModule,
    NgFor,
    NgIf,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatTooltipModule,
    PaginationComponent,
    EmptyStateComponent,
  ],
  templateUrl: './seo-manager.component.html',
  styleUrl: './seo-manager.component.scss',
})
export class SeoManagerComponent implements OnInit, OnDestroy {
  Global = Global;
  filterOptions = FILTER_OPTIONS;
  item_list: any[] = [];
  paginationOption: any;
  activeFilter: string | null = null;
  searchKey: string = '';
  selected = new Set<string>();
  loading = false;
  bulkGenerating = false;
  rowBusy = new Set<string>();

  private destroy$ = new Subject<void>();

  constructor(
    private inventoryService: InventoryService,
    private dialogService: DialogService,
    private toastr: ToastrService,
    private helperService: HelpersService
  ) {
    this.paginationOption = Global.resetPaginationOptions();
  }

  ngOnInit(): void {
    this.helperService.searchKey$
      .pipe(takeUntil(this.destroy$))
      .subscribe((term: any) => {
        this.searchKey = term ?? '';
        this.paginationOption.page = 1;
        this.fetchList();
      });
    this.fetchList();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setFilter(value: string | null) {
    this.activeFilter = this.activeFilter === value ? null : value;
    this.helperService.setFilterButton(this.activeFilter ? 1 : 0);
    this.paginationOption.page = 1;
    this.selected.clear();
    this.fetchList();
  }

  fetchList() {
    const params = new URLSearchParams();
    params.set('page', String(this.paginationOption.page || 1));
    params.set('limit', String(this.paginationOption.limit || 20));
    if (this.searchKey) params.set('search', this.searchKey);
    if (this.activeFilter) params.set('filter', this.activeFilter);
    this.loading = true;
    this.inventoryService.productSeoReport(params).subscribe({
      next: (res: any) => {
        this.item_list = res?.data?.docs ?? [];
        this.paginationOption = {
          ...this.paginationOption,
          ...res?.data,
        };
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  onPageChange(page: number) {
    this.paginationOption.page = page;
    this.fetchList();
  }

  rowId(row: any): string {
    return row?.product?._id;
  }

  isSelected(row: any): boolean {
    return this.selected.has(this.rowId(row));
  }

  toggleSelect(row: any) {
    const id = this.rowId(row);
    if (!id) return;
    if (this.selected.has(id)) this.selected.delete(id);
    else this.selected.add(id);
  }

  get allSelected(): boolean {
    return (
      this.item_list.length > 0 &&
      this.item_list.every((row) => this.selected.has(this.rowId(row)))
    );
  }

  toggleSelectAll() {
    if (this.allSelected) {
      this.item_list.forEach((row) => this.selected.delete(this.rowId(row)));
    } else {
      this.item_list.forEach((row) => this.selected.add(this.rowId(row)));
    }
  }

  hasTitle(row: any): boolean {
    return !!row?.seo?.meta_title;
  }
  hasDescription(row: any): boolean {
    return !!row?.seo?.meta_description;
  }
  hasFocusKeyword(row: any): boolean {
    return !!row?.seo?.focus_keyword;
  }

  scoreChipClass(status: string | undefined): string {
    switch (status) {
      case 'Good':
        return 'chip chip-good';
      case 'Needs Improvement':
        return 'chip chip-warn';
      case 'Poor':
        return 'chip chip-bad';
      default:
        return 'chip';
    }
  }

  generateOne(row: any, overwrite: boolean = false) {
    const id = this.rowId(row);
    if (!id) return;
    this.rowBusy.add(id);
    this.inventoryService.productSeoGenerate(id, overwrite).subscribe({
      next: (res: any) => {
        this.rowBusy.delete(id);
        row.seo = res?.data?.seo ?? row.seo;
        row.score = res?.data?.score ?? row.score;
        this.toastr.success(res?.message ?? 'SEO details generated');
      },
      error: () => {
        this.rowBusy.delete(id);
      },
    });
  }

  regenerateOne(row: any) {
    const id = this.rowId(row);
    if (!id) return;
    const dialogData: ConfirmDialogData = {
      title: 'Regenerate & Replace?',
      message: `This will overwrite the current SEO fields for "${
        row?.product?.name ?? 'this product'
      }" — including any manually edited values. This cannot be undone.`,
      cancelText: 'Cancel',
      saveText: 'Regenerate & Replace',
    };
    this.dialogService.confirmDialog(dialogData).subscribe((result: any) => {
      if (result?.confirm) {
        this.generateOne(row, true);
      }
    });
  }

  bulkGenerate() {
    if (!this.selected.size) {
      this.toastr.error('Select at least one product');
      return;
    }
    this.bulkGenerating = true;
    this.inventoryService
      .productSeoBulkGenerate({
        product_ids: Array.from(this.selected),
        overwrite: false,
      })
      .subscribe({
        next: (res: any) => {
          this.bulkGenerating = false;
          const data = res?.data;
          this.toastr.success(
            res?.message ??
              `Processed ${data?.processed ?? 0}, skipped ${
                data?.skipped ?? 0
              }, failed ${data?.failed?.length ?? 0}`
          );
          this.selected.clear();
          this.fetchList();
        },
        error: () => {
          this.bulkGenerating = false;
        },
      });
  }

  private csvEscape(value: any): string {
    const str = value === null || value === undefined ? '' : String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  exportCsv() {
    if (!this.item_list.length) {
      this.toastr.error('No SEO data to export');
      return;
    }
    const header = [
      'Product',
      'SEO Title',
      'Description',
      'Focus Keyword',
      'Score',
      'Status',
    ];
    const rows = this.item_list.map((row) => [
      row?.product?.name ?? '',
      this.hasTitle(row) ? 'Complete' : 'Missing',
      this.hasDescription(row) ? 'Complete' : 'Missing',
      this.hasFocusKeyword(row) ? 'Set' : 'Missing',
      row?.score?.score ?? '',
      row?.score?.status ?? '',
    ]);
    const csv = [header, ...rows]
      .map((line) => line.map((cell) => this.csvEscape(cell)).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `seo-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
