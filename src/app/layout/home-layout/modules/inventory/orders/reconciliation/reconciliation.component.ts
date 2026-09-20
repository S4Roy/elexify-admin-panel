import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { InventoryService } from 'app/core/services/inventory.service';

const REQUIRED_CONFIRMATION = 'APPLY RECONCILIATION';

interface ReconciliationRow {
  type: 'package' | 'order';
  shiprocket_order_id: string;
  order_id?: string;
  package_id?: string;
  from: string;
  to: string;
}

interface UnmatchedRow {
  shiprocket_order_id: string;
  status: string;
  channel?: string;
}

interface ReconciliationCounters {
  total_rows: number;
  skipped_missing_fields: number;
  unsupported_status: number;
  package_matched_updated: number;
  package_matched_noop: number;
  order_matched_updated: number;
  order_matched_noop: number;
  order_matched_blocked: number;
  unmatched: number;
}

interface ReconciliationReport {
  apply: boolean;
  counters: ReconciliationCounters;
  applied: ReconciliationRow[];
  blocked: { shiprocket_order_id: string; order_id: string; reason: string }[];
  unmatched: UnmatchedRow[];
}

@Component({
  selector: 'app-reconciliation',
  standalone: true,
  imports: [NgIf, NgFor, FormsModule, DatePipe],
  templateUrl: './reconciliation.component.html',
})
export class ReconciliationComponent implements OnInit, OnDestroy {
  fetchingDetails = false;
  detailsProcessed = 0;
  detailsOutcomes: any[] = [];
  mode = 'force_status';
  auditMode = 'force_status';
  private destroyed = false;
  processed = 0;
  total = 0;
  outcomes: { reference: string; status: string; reason?: string }[] = [];
  ngOnDestroy(): void { this.destroyed = true; }
  selectedFile: File | null = null;
  auditing = false;
  applying = false;

  auditId: string | null = null;
  filename: string | null = null;
  report: ReconciliationReport | null = null;
  applied = false;
  confirmationText = '';
  readonly requiredConfirmation = REQUIRED_CONFIRMATION;

  historyLoading = false;
  history: any[] = [];

  constructor(
    private inventoryService: InventoryService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.loadHistory();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] || null;
  }

  get canApply(): boolean {
    return !!this.auditId && this.total > 0 && !this.applied && !this.applying && !this.auditing &&
      this.confirmationText.trim() === this.requiredConfirmation;
  }

  runAudit(): void {
    if (!this.selectedFile || this.auditing || this.applying || this.fetchingDetails) return;
    this.detailsProcessed = 0;
    this.detailsOutcomes = [];
    this.processed = 0;
    this.outcomes = [];
    this.auditing = true;
    this.report = null;
    this.auditId = null;
    this.applied = false;
    this.confirmationText = '';
    this.inventoryService.auditReconciliation(this.selectedFile, this.mode).subscribe({
      next: (res: any) => {
        this.auditing = false;
        this.auditMode = res?.data?.mode || this.mode;
        this.auditId = res?.data?.audit_id || null;
        this.filename = res?.data?.filename || this.selectedFile?.name || null;
        this.report = res?.data?.report || null;
        this.total = res?.data?.total || 0;
        this.toastr.success('Audit complete — review the report below before applying.');
        this.loadHistory();
      },
      error: () => { this.auditing = false; },
    });
  }

  applyChanges(): void {
    if (!this.canApply || !this.auditId) return;
    this.applying = true;
    this.applyNext();
  }

  private applyNext(): void {
    if (this.destroyed || !this.auditId) return;
    this.inventoryService.applyReconciliation({
      audit_id: this.auditId,
      confirmation: this.confirmationText.trim(),
    }).subscribe({
      next: (res: any) => {
        const result = res?.data;
        this.processed = result.cursor;
        if (result.outcome) this.outcomes.push(result.outcome);
        if (!result.done) {
          // Pace requests below the provider's published rate limit.
          setTimeout(() => this.applyNext(), this.auditMode === 'force_status' ? 0 : 1000);
          return;
        }
        this.applying = false;
        this.applied = true;
        this.toastr.success('Sync finished. Review the results for any blocked orders.');
        this.loadHistory();
      },
      error: () => { this.applying = false; this.loadHistory(); },
    });
  }

  resume(item: any): void {
    if (this.applying || this.fetchingDetails || this.auditing || item.processing) return;
    this.detailsProcessed = item.details_cursor || 0;
    this.detailsOutcomes = item.details_outcomes || [];
    this.auditMode = item.mode;
    this.mode = item.mode;
    this.auditId = item._id;
    this.filename = item.filename;
    this.report = item.dry_run_report;
    this.processed = item.cursor || 0;
    this.total = item.dry_run_report?.applied?.length || 0;
    this.outcomes = item.outcomes || [];
    this.applied = item.status === 'applied';
    this.confirmationText = '';
  }

  get detailsTotal(): number {
    return this.outcomes.filter(item => item.status === 'synced').length;
  }

  fetchShiprocketDetails(): void {
    if (!this.auditId || !this.applied || this.auditMode !== 'force_status' || this.fetchingDetails || this.detailsProcessed >= this.detailsTotal) return;
    this.fetchingDetails = true;
    this.fetchNextDetails();
  }

  private fetchNextDetails(): void {
    if (this.destroyed || !this.auditId) return;
    this.inventoryService.fetchReconciliationDetails(this.auditId).subscribe({
      next: (res: any) => {
        const data = res.data;
        this.detailsProcessed = data.cursor;
        if (data.outcome) this.detailsOutcomes.push(data.outcome);
        if (!data.done) {
          setTimeout(() => this.fetchNextDetails(), 1500);
          return;
        }
        this.fetchingDetails = false;
        this.toastr.success('Shiprocket details fetch finished. Review the results below.');
        this.loadHistory();
      },
      error: () => { this.fetchingDetails = false; this.loadHistory(); },
    });
  }

  loadHistory(): void {
    this.historyLoading = true;
    this.inventoryService.listReconciliationAudits().subscribe({
      next: (res: any) => {
        this.historyLoading = false;
        this.history = res?.data?.audits || [];
      },
      error: () => { this.historyLoading = false; },
    });
  }

  // Client-side only — lets the admin take the unmatched rows (orders with
  // no existing local Shiprocket link) into the "Link Shiprocket order"
  // action on each order's details page, one at a time.
  downloadUnmatchedCsv(): void {
    const rows = this.report?.unmatched || [];
    if (!rows.length) return;
    const header = 'shiprocket_order_id,status,channel';
    const lines = rows.map((r) => [r.shiprocket_order_id, r.status, r.channel || ''].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'unmatched-shiprocket-orders.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
}
