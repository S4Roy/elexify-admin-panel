import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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
export class ReconciliationComponent implements OnInit {
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
    return !!this.auditId && !this.applied && !this.applying &&
      this.confirmationText.trim() === this.requiredConfirmation;
  }

  runAudit(): void {
    if (!this.selectedFile || this.auditing) return;
    this.auditing = true;
    this.report = null;
    this.auditId = null;
    this.applied = false;
    this.confirmationText = '';
    this.inventoryService.auditReconciliation(this.selectedFile).subscribe({
      next: (res: any) => {
        this.auditing = false;
        this.auditId = res?.data?.audit_id || null;
        this.filename = res?.data?.filename || this.selectedFile?.name || null;
        this.report = res?.data?.report || null;
        this.toastr.success('Audit complete — review the report below before applying.');
        this.loadHistory();
      },
      error: () => { this.auditing = false; },
    });
  }

  applyChanges(): void {
    if (!this.canApply || !this.auditId) return;
    this.applying = true;
    this.inventoryService.applyReconciliation({
      audit_id: this.auditId,
      confirmation: this.confirmationText.trim(),
    }).subscribe({
      next: (res: any) => {
        this.applying = false;
        this.applied = true;
        this.report = res?.data?.report || this.report;
        this.toastr.success('Reconciliation applied.');
        this.loadHistory();
      },
      error: () => { this.applying = false; },
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
