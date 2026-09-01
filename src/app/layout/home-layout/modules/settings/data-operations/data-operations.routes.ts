import { Routes } from '@angular/router';
import { OverviewComponent } from './overview/overview.component';
import { OperationsListComponent } from './operations-list/operations-list.component';
import { OperationDetailComponent } from './operation-detail/operation-detail.component';
import { ExecutionHistoryComponent } from './execution-history/execution-history.component';
import { ExecutionLogViewerComponent } from './execution-log-viewer/execution-log-viewer.component';

// Registered under /settings/data-operations from settings.routes.ts,
// which already inherits the parent `authGuard` applied to the whole
// home-layout tree — no separate guard is added here (see report: this
// app has no finer-grained "seeder-execute" permission guard, only the
// role check surfaced client-side in HelpersService.role()).
//
// The landing route ('') resolves to the cards-only Overview screen so an
// admin sees system health at a glance before drilling into the full
// operations table.
export const routes: Routes = [
  {
    path: '',
    data: { pageTitle: 'Data Operations', breadcrumb: 'Overview' },
    component: OverviewComponent,
  },
  {
    path: 'operations',
    data: { pageTitle: 'Data Operations', breadcrumb: 'Operations' },
    component: OperationsListComponent,
  },
  {
    path: 'operations/:key',
    data: { pageTitle: 'Operation Detail', breadcrumb: 'Operation Detail' },
    component: OperationDetailComponent,
  },
  {
    path: 'executions',
    data: { pageTitle: 'Execution History', breadcrumb: 'Execution History' },
    component: ExecutionHistoryComponent,
  },
  {
    path: 'executions/:id',
    data: { pageTitle: 'Execution Logs', breadcrumb: 'Execution Logs' },
    component: ExecutionLogViewerComponent,
  },
];
