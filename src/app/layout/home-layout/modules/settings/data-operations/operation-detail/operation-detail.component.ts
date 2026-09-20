import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'app/core/services/api.service';
import { HelpersService } from 'app/core/services/helpers.service';
import { environment } from '../../../../../../../environments/environment';
import {
  RunConfirmationDialogComponent,
  RunConfirmationDialogData,
} from 'app/layout/home-layout/includes/run-confirmation-dialog/run-confirmation-dialog.component';
import { DataOperation, DryRunResult, ExecutionListItem } from '../data-operations.models';

// Never render a raw description string verbatim if it happens to contain
// something path-shaped (e.g. a leaked `/scripts/...` reference from an
// older CLI-oriented description) — strip anything that looks like a
// filesystem path before it reaches the template.
function sanitizeDescription(text: string | undefined | null): string {
  if (!text) return '';
  return text.replace(/(?:[a-zA-Z]:)?(?:\/[\w.-]+){2,}/g, '[path removed]');
}

@Component({
  selector: 'app-data-operation-detail',
  imports: [NgIf, NgFor, DatePipe, RouterModule],
  templateUrl: './operation-detail.component.html',
  styleUrl: './operation-detail.component.scss',
})
export class OperationDetailComponent implements OnInit {
  operation: DataOperation | null = null;
  loading = true;
  runningAction = false;
  dryRunResult: DryRunResult | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private dialog: MatDialog,
    private toastr: ToastrService,
    public helperService: HelpersService,
  ) {}

  get isLegacyImport(): boolean {
    return this.operation?.key === 'woocommerce-missing-data';
  }

  get importSummary() {
    return Object.entries(this.dryRunResult?.result?.summary ?? {}).map(([kind, counts]) => ({ kind, ...counts }));
  }

  get canImport(): boolean {
    return !this.isLegacyImport || (this.dryRunResult?.status === 'SUCCESS' && (this.dryRunResult?.result?.wouldInsert ?? 0) > 0);
  }

  get isSuperadmin(): boolean {
    return this.helperService.role() === 'superadmin';
  }

  get safeDescription(): string {
    return sanitizeDescription(this.operation?.description);
  }

  get previousExecutions(): ExecutionListItem[] {
    return this.operation?.previousExecutions ?? [];
  }

  ngOnInit(): void {
    // A dry-run result navigated in from the list screen (router state)
    // seeds the impact text shown in the run-confirmation dialog without
    // an extra round trip.
    const navState = this.router.getCurrentNavigation()?.extras?.state as
      | { dryRunResult?: DryRunResult }
      | undefined;
    this.dryRunResult = navState?.dryRunResult ?? (history.state?.dryRunResult ?? null);

    this.route.paramMap.subscribe((params) => {
      const key = params.get('key');
      if (key) this.fetch(key);
    });
  }

  fetch(key: string): void {
    this.loading = true;
    this.apiService.dataOperationDetail(key).subscribe({
      next: (res: any) => {
        this.operation = res?.data ?? null;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  // The detail endpoint returns {key, name, satisfied}; normalized here so
  // the template doesn't have to narrow the string|object union itself.
  dependencyView(dep: NonNullable<DataOperation['dependencies']>[number]): {
    key: string;
    name: string;
    satisfied: boolean | null;
  } {
    if (typeof dep === 'string') return { key: dep, name: dep, satisfied: null };
    return dep;
  }

  viewDependency(key: string): void {
    this.router.navigateByUrl(`/settings/data-operations/operations/${key}`);
  }

  viewExecution(executionId: string): void {
    this.router.navigateByUrl(`/settings/data-operations/executions/${executionId}`);
  }

  dryRun(): void {
    if (!this.operation) return;
    this.runningAction = true;
    this.apiService.dataOperationDryRun(this.operation.key).subscribe({
      next: (res: any) => {
        this.runningAction = false;
        this.dryRunResult = res?.data ?? null;
        if (this.dryRunResult?.status === 'FAILED') {
          this.toastr.error(this.dryRunResult.error?.safe_message || 'Audit failed.');
        } else {
          this.toastr.info(this.isLegacyImport ? 'Audit complete. Review the results before importing.' : 'Dry run complete.');
        }
      },
      error: (err: any) => {
        this.runningAction = false;
        this.toastr.error(err?.error?.message || 'Dry run failed.');
      },
    });
  }

  run(): void {
    if (!this.operation || !this.canImport || this.runningAction) return;
    const data: RunConfirmationDialogData = {
      operation: this.operation,
      environment: environment.production ? 'production' : 'development',
      dryRunResult: this.dryRunResult,
    };
    this.dialog
      .open(RunConfirmationDialogComponent, { data, disableClose: true })
      .afterClosed()
      .subscribe((result: any) => {
        if (!result?.confirmed || !this.operation) return;
        this.executeRun(result.confirmation);
      });
  }

  private executeRun(confirmation?: string): void {
    if (!this.operation) return;
    this.runningAction = true;
    this.apiService.runDataOperation(this.operation.key, confirmation).subscribe({
      next: (res: any) => {
        this.runningAction = false;
        const executionId = res?.data?.execution_id;
        this.dryRunResult = null;
        if (res?.data?.status === 'SUCCESS') this.toastr.success('Operation complete.');
        else this.toastr.error(res?.data?.error?.safe_message || 'Operation did not complete. Review the execution log.');
        if (executionId) {
          this.router.navigateByUrl(`/settings/data-operations/executions/${executionId}`);
        }
      },
      error: (err: any) => {
        this.runningAction = false;
        const code = err?.error?.code;
        if (code === 'OPERATION_ALREADY_RUNNING') {
          this.toastr.error('This operation is already running.');
        } else if (code === 'OPERATION_NOT_ALLOWED_IN_ENVIRONMENT') {
          this.toastr.error('This operation is not allowed in this environment.');
        } else {
          this.toastr.error(err?.error?.message || 'Failed to start operation.');
        }
      },
    });
  }

  retry(): void {
    // Idempotent-only affordance — re-opens the normal run flow, there is
    // no dedicated retry endpoint in the contract.
    this.run();
  }
}
