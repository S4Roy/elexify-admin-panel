import { DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ApiService } from 'app/core/services/api.service';
import { ExecutionDetail, ExecutionLogLine, ExecutionStatus } from '../data-operations.models';

const TERMINAL_STATUSES: ExecutionStatus[] = ['SUCCESS', 'PARTIAL', 'FAILED', 'CANCELLED'];
const POLL_INTERVAL_MS = 2000;

// Full-page log viewer (not a drawer) so an execution's logs get a
// shareable, bookmarkable URL — consistent with every other detail screen
// in this app being a route rather than an overlay. Polls execution
// detail + logs every 2s only while the run is QUEUED/RUNNING, and stops
// the moment status goes terminal.
@Component({
  selector: 'app-data-operation-execution-log-viewer',
  imports: [NgIf, NgFor, NgClass, DatePipe, FormsModule],
  templateUrl: './execution-log-viewer.component.html',
  styleUrl: './execution-log-viewer.component.scss',
})
export class ExecutionLogViewerComponent implements OnInit, OnDestroy {
  executionId: string | null = null;
  execution: ExecutionDetail | null = null;
  logs: ExecutionLogLine[] = [];
  loading = true;

  showInfo = true;
  showWarn = true;
  showError = true;
  searchText = '';

  private pollSub: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.executionId = id;
        this.fetchOnce();
      }
    });
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  get isTerminal(): boolean {
    return !this.execution || TERMINAL_STATUSES.includes(this.execution.status);
  }

  get filteredLogs(): ExecutionLogLine[] {
    const search = this.searchText.trim().toLowerCase();
    return this.logs.filter((line) => {
      const levelOk =
        (line.level === 'INFO' && this.showInfo) ||
        (line.level === 'WARN' && this.showWarn) ||
        (line.level === 'ERROR' && this.showError);
      if (!levelOk) return false;
      if (!search) return true;
      return line.message.toLowerCase().includes(search);
    });
  }

  private fetchOnce(): void {
    if (!this.executionId) return;
    this.loading = true;
    this.apiService.dataOperationExecutionDetail(this.executionId).subscribe({
      next: (res: any) => {
        this.execution = res?.data ?? null;
        this.loading = false;
        this.fetchLogs();
        this.maybeStartPolling();
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private fetchLogs(): void {
    if (!this.executionId) return;
    this.apiService.dataOperationExecutionLogs(this.executionId).subscribe({
      next: (res: any) => {
        this.logs = res?.data?.logs ?? [];
      },
      error: () => {},
    });
  }

  private maybeStartPolling(): void {
    if (this.isTerminal) {
      this.stopPolling();
      return;
    }
    if (this.pollSub) return; // already polling

    this.pollSub = interval(POLL_INTERVAL_MS)
      .pipe(switchMap(() => this.apiService.dataOperationExecutionDetail(this.executionId!)))
      .subscribe({
        next: (res: any) => {
          this.execution = res?.data ?? this.execution;
          this.fetchLogs();
          if (this.isTerminal) {
            this.stopPolling();
          }
        },
        error: () => {
          this.stopPolling();
        },
      });
  }

  private stopPolling(): void {
    if (this.pollSub) {
      this.pollSub.unsubscribe();
      this.pollSub = null;
    }
  }

  goToOperation(): void {
    if (this.execution?.operation_key) {
      this.router.navigateByUrl(`/settings/data-operations/operations/${this.execution.operation_key}`);
    }
  }

  copyLogs(): void {
    const text = this.filteredLogs
      .map((line) => `[${line.timestamp}] ${line.level} ${line.message}`)
      .join('\n');
    navigator.clipboard
      .writeText(text)
      .then(() => this.toastr.success('Logs copied to clipboard.'))
      .catch(() => this.toastr.error('Could not copy logs.'));
  }
}
