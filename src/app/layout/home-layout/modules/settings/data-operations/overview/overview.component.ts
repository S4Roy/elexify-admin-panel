import { NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from 'app/core/services/api.service';
import { environment } from '../../../../../../../environments/environment';
import { DataOperation } from '../data-operations.models';

// Cards-only landing view for Data Operations. There is no dedicated
// overview endpoint on the backend — every number here is derived
// client-side from the list endpoint's embedded `health` / `lastExecution`
// fields, so a single GET covers the whole page.
@Component({
  selector: 'app-data-operations-overview',
  imports: [NgIf],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss',
})
export class OverviewComponent implements OnInit {
  loading = true;
  environmentName = environment.production ? 'production' : 'development';
  appVersion = (environment as any).APP_VERSION || 'n/a';

  healthyCount = 0;
  missingCount = 0;
  seedersCurrent = 0;
  seedersPending = 0;
  migrationsApplied = 0;
  migrationsPending = 0;
  recentFailures = 0;

  constructor(
    private apiService: ApiService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.fetch();
  }

  fetch(): void {
    this.loading = true;
    this.apiService.dataOperationList().subscribe({
      next: (res: any) => {
        const operations: DataOperation[] = res?.data ?? [];
        this.computeCards(operations);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private computeCards(operations: DataOperation[]): void {
    this.healthyCount = 0;
    this.missingCount = 0;
    this.seedersCurrent = 0;
    this.seedersPending = 0;
    this.migrationsApplied = 0;
    this.migrationsPending = 0;
    this.recentFailures = 0;

    for (const op of operations) {
      const health = op.health;
      if (health) {
        if (health.status === 'HEALTHY') this.healthyCount++;
        else if (health.status === 'MISSING' || health.status === 'ERROR' || health.status === 'WARNING') {
          this.missingCount++;
        }
      }

      const lastStatus = op.lastExecution?.status;
      const isCurrent = lastStatus === 'SUCCESS' || health?.status === 'HEALTHY';

      if (op.type === 'SEEDER') {
        if (isCurrent) this.seedersCurrent++;
        else this.seedersPending++;
      }
      if (op.type === 'MIGRATION') {
        if (isCurrent) this.migrationsApplied++;
        else this.migrationsPending++;
      }

      if (lastStatus === 'FAILED') this.recentFailures++;
    }
  }

  goToOperations(): void {
    this.router.navigateByUrl('/settings/data-operations/operations');
  }

  goToExecutions(): void {
    this.router.navigateByUrl('/settings/data-operations/executions');
  }
}
