import { DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from 'app/core/services/api.service';
import { EmptyStateComponent } from 'app/layout/home-layout/includes/empty-state/empty-state.component';
import { ExecutionListItem } from '../data-operations.models';

function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remSeconds}s`;
}

// Global execution history, or scoped to one operation via ?key= — used
// both as its own /settings/data-operations/executions route and linked
// to from operation-detail.
@Component({
  selector: 'app-data-operation-execution-history',
  imports: [NgFor, NgIf, NgClass, DatePipe, EmptyStateComponent],
  templateUrl: './execution-history.component.html',
  styleUrl: './execution-history.component.scss',
})
export class ExecutionHistoryComponent implements OnInit {
  executions: ExecutionListItem[] = [];
  loading = true;
  operationKey: string | null = null;
  formatDuration = formatDuration;

  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.operationKey = params.get('key');
      this.fetch();
    });
  }

  fetch(): void {
    this.loading = true;
    const params = new URLSearchParams();
    if (this.operationKey) params.set('operation_key', this.operationKey);
    this.apiService.dataOperationExecutionList(params).subscribe({
      next: (res: any) => {
        this.executions = res?.data ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  viewLogs(executionId: string): void {
    this.router.navigateByUrl(`/settings/data-operations/executions/${executionId}`);
  }

  statusClass(status: string): string {
    return `status-${(status || '').toLowerCase()}`;
  }
}
