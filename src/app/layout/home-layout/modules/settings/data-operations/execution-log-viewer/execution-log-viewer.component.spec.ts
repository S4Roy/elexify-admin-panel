import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { ExecutionLogViewerComponent } from './execution-log-viewer.component';
import {
  sharedTestProviders,
  activatedRouteStub,
} from '../../../../../../../testing/shared-test-providers';
import { ExecutionLogLine } from '../data-operations.models';

const LOGS: ExecutionLogLine[] = [
  { level: 'INFO', message: 'Starting run', timestamp: '2026-01-01T00:00:00Z' },
  { level: 'WARN', message: 'Skipping duplicate row', timestamp: '2026-01-01T00:00:01Z' },
  { level: 'ERROR', message: 'Could not connect to provider', timestamp: '2026-01-01T00:00:02Z' },
];

function detailResponse(status: string) {
  return {
    status: true,
    message: 'ok',
    data: {
      execution_id: 'exec-1',
      operation_key: 'email-templates',
      operation_name: 'Email Templates Seed',
      operation_type: 'SEEDER',
      operation_version: '1',
      environment: 'staging',
      status,
      started_at: '2026-01-01T00:00:00Z',
      completed_at: status === 'RUNNING' ? null : '2026-01-01T00:01:00Z',
      duration_ms: status === 'RUNNING' ? null : 60000,
    },
  };
}

describe('ExecutionLogViewerComponent', () => {
  let component: ExecutionLogViewerComponent;
  let fixture: ComponentFixture<ExecutionLogViewerComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExecutionLogViewerComponent],
      providers: [
        ...sharedTestProviders(),
        activatedRouteStub({ paramMap: { id: 'exec-1' } }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExecutionLogViewerComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('filters logs by level', () => {
    component.logs = LOGS;
    component.showWarn = false;
    component.showError = false;
    expect(component.filteredLogs.length).toBe(1);
    expect(component.filteredLogs[0].level).toBe('INFO');
  });

  it('filters logs by search text', () => {
    component.logs = LOGS;
    component.searchText = 'duplicate';
    expect(component.filteredLogs.length).toBe(1);
    expect(component.filteredLogs[0].message).toContain('duplicate');
  });

  it('starts polling while status is RUNNING and stops once terminal', fakeAsync(() => {
    fixture.detectChanges(); // triggers initial fetch via paramMap

    const detailReq1 = httpMock.expectOne((r) => r.url.includes('executions/exec-1') && !r.url.includes('/logs'));
    detailReq1.flush(detailResponse('RUNNING'));

    const logsReq1 = httpMock.expectOne((r) => r.url.includes('executions/exec-1/logs'));
    logsReq1.flush({ status: true, message: 'ok', data: { logs: LOGS } });

    expect(component.execution?.status).toBe('RUNNING');

    // Poll tick #1 while still running.
    tick(2000);
    const detailReq2 = httpMock.expectOne((r) => r.url.includes('executions/exec-1') && !r.url.includes('/logs'));
    detailReq2.flush(detailResponse('SUCCESS'));
    const logsReq2 = httpMock.expectOne((r) => r.url.includes('executions/exec-1/logs'));
    logsReq2.flush({ status: true, message: 'ok', data: { logs: LOGS } });

    expect(component.execution?.status).toBe('SUCCESS');
    expect(component.isTerminal).toBeTrue();

    // No further requests should fire once terminal — advancing time must
    // not produce another poll tick.
    tick(4000);
    httpMock.expectNone((r) => r.url.includes('executions/exec-1'));

    component.ngOnDestroy();
  }));
});
