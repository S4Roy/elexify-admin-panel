import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'app/core/services/api.service';
import { HelpersService } from 'app/core/services/helpers.service';
import { environment } from '../../../../../../../environments/environment';
import { EmptyStateComponent } from 'app/layout/home-layout/includes/empty-state/empty-state.component';
import {
  RunConfirmationDialogComponent,
  RunConfirmationDialogData,
} from 'app/layout/home-layout/includes/run-confirmation-dialog/run-confirmation-dialog.component';
import { DataOperation, DataOperationType, DryRunResult } from '../data-operations.models';

type TabKey = 'ALL' | 'SEEDER' | 'MIGRATION' | 'BACKFILL_REPAIR';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'SEEDER', label: 'Seeders' },
  { key: 'MIGRATION', label: 'Migrations' },
  { key: 'BACKFILL_REPAIR', label: 'Backfills & Repairs' },
];

// Registry-driven table of every seed/migration/backfill/repair script.
// Only superadmins get Run/Dry Run — everyone else sees the same table but
// with those actions hidden, mirroring the client-side role check used by
// the email-templates screen (real enforcement stays server-side).
@Component({
  selector: 'app-data-operations-list',
  imports: [NgFor, NgIf, DatePipe, EmptyStateComponent],
  templateUrl: './operations-list.component.html',
  styleUrl: './operations-list.component.scss',
})
export class OperationsListComponent implements OnInit {
  tabs = TABS;
  activeTab: TabKey = 'ALL';
  operations: DataOperation[] = [];
  loading = true;
  runningKey: string | null = null;

  constructor(
    private apiService: ApiService,
    private dialog: MatDialog,
    private router: Router,
    private toastr: ToastrService,
    public helperService: HelpersService,
  ) {}

  get isSuperadmin(): boolean {
    return this.helperService.role() === 'superadmin';
  }

  ngOnInit(): void {
    this.fetchList();
  }

  fetchList(): void {
    this.loading = true;
    this.apiService.dataOperationList().subscribe({
      next: (res: any) => {
        this.operations = res?.data ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  setTab(key: TabKey): void {
    this.activeTab = key;
  }

  get filteredOperations(): DataOperation[] {
    if (this.activeTab === 'ALL') return this.operations;
    if (this.activeTab === 'BACKFILL_REPAIR') {
      return this.operations.filter(
        (op) => op.type === 'BACKFILL' || op.type === 'REPAIR',
      );
    }
    return this.operations.filter((op) => op.type === (this.activeTab as DataOperationType));
  }

  viewOperation(op: DataOperation): void {
    this.router.navigateByUrl(`/settings/data-operations/operations/${op.key}`);
  }

  viewHealthText(op: DataOperation): string {
    if (!op.health) return '—';
    return op.health.status;
  }

  lastRunText(op: DataOperation): string | null {
    return op.lastExecution?.completed_at ?? null;
  }

  lastResultText(op: DataOperation): string {
    return op.lastExecution?.status ?? '—';
  }

  dryRun(op: DataOperation, event: Event): void {
    event.stopPropagation();
    this.runningKey = op.key;
    this.apiService.dataOperationDryRun(op.key).subscribe({
      next: (res: any) => {
        this.runningKey = null;
        const dryRunResult: DryRunResult = res?.data;
        this.toastr.info(`Dry run complete for "${op.name}" — see details for the log.`);
        this.router.navigateByUrl(`/settings/data-operations/operations/${op.key}`, {
          state: { dryRunResult },
        });
      },
      error: (err: any) => {
        this.runningKey = null;
        this.toastr.error(err?.error?.message || 'Dry run failed.');
      },
    });
  }

  run(op: DataOperation, event: Event): void {
    event.stopPropagation();
    const data: RunConfirmationDialogData = {
      operation: op,
      environment: environment.production ? 'production' : 'development',
    };
    this.dialog
      .open(RunConfirmationDialogComponent, { data, disableClose: true })
      .afterClosed()
      .subscribe((result: any) => {
        if (!result?.confirmed) return;
        this.executeRun(op, result.confirmation);
      });
  }

  private executeRun(op: DataOperation, confirmation?: string): void {
    this.runningKey = op.key;
    this.apiService.runDataOperation(op.key, confirmation).subscribe({
      next: (res: any) => {
        this.runningKey = null;
        const executionId = res?.data?.execution_id;
        this.toastr.success(`"${op.name}" started.`);
        if (executionId) {
          this.router.navigateByUrl(`/settings/data-operations/executions/${executionId}`);
        } else {
          this.fetchList();
        }
      },
      error: (err: any) => {
        this.runningKey = null;
        const code = err?.error?.code;
        if (code === 'OPERATION_ALREADY_RUNNING') {
          this.toastr.error(`"${op.name}" is already running.`);
        } else if (code === 'OPERATION_NOT_ALLOWED_IN_ENVIRONMENT') {
          this.toastr.error(`"${op.name}" is not allowed in this environment.`);
        } else {
          this.toastr.error(err?.error?.message || 'Failed to start operation.');
        }
        this.fetchList();
      },
    });
  }
}
