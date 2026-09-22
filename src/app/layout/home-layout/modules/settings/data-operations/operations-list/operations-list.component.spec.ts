import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { OperationsListComponent } from './operations-list.component';
import { sharedTestProviders } from '../../../../../../../testing/shared-test-providers';
import { ApiService } from 'app/core/services/api.service';
import { HelpersService } from 'app/core/services/helpers.service';
import { DataOperation } from '../data-operations.models';

const MOCK_OPERATIONS: DataOperation[] = [
  {
    key: 'email-templates',
    name: 'Email Templates Seed',
    type: 'SEEDER',
    category: 'Content',
    version: '1',
    required: true,
    risk: 'LOW',
    supportsDryRun: true,
    health: { status: 'HEALTHY', expected: 10, valid: 10, missing: 0 },
    lastExecution: { status: 'SUCCESS', completed_at: '2026-01-01T00:00:00Z' },
  } as DataOperation,
  {
    key: 'orders-migration',
    name: 'Orders Schema Migration',
    type: 'MIGRATION',
    category: 'Orders',
    version: '2',
    required: true,
    risk: 'HIGH',
    supportsDryRun: false,
    health: { status: 'MISSING', expected: 5, valid: 2, missing: 3 },
    lastExecution: null,
  } as DataOperation,
  {
    key: 'inventory-backfill',
    name: 'Inventory Backfill',
    type: 'BACKFILL',
    category: 'Inventory',
    version: '1',
    required: false,
    risk: 'MEDIUM',
    supportsDryRun: true,
    health: null,
    lastExecution: { status: 'FAILED', completed_at: '2026-01-02T00:00:00Z' },
  } as DataOperation,
];

describe('OperationsListComponent', () => {
  let component: OperationsListComponent;
  let fixture: ComponentFixture<OperationsListComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OperationsListComponent],
      providers: [...sharedTestProviders()],
    }).compileComponents();

    fixture = TestBed.createComponent(OperationsListComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function flushList() {
    fixture.detectChanges();
    const req = httpMock.expectOne((r) => r.url.includes('admin/data-operations') && !r.url.includes('/executions'));
    req.flush({ status: true, message: 'ok', data: { environment: 'test', operations: MOCK_OPERATIONS } });
    fixture.detectChanges();
  }

  it('renders a row for every operation returned by the list endpoint', () => {
    flushList();
    expect(component.operations.length).toBe(3);
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(3);
  });

  it('filters rows by type when a tab is selected', () => {
    flushList();

    component.setTab('SEEDER');
    expect(component.filteredOperations.length).toBe(1);
    expect(component.filteredOperations[0].key).toBe('email-templates');

    component.setTab('MIGRATION');
    expect(component.filteredOperations.length).toBe(1);
    expect(component.filteredOperations[0].key).toBe('orders-migration');

    component.setTab('BACKFILL_REPAIR');
    expect(component.filteredOperations.length).toBe(1);
    expect(component.filteredOperations[0].key).toBe('inventory-backfill');

    component.setTab('ALL');
    expect(component.filteredOperations.length).toBe(3);
  });

  it('shows the Run action only for superadmins', () => {
    const helpers = TestBed.inject(HelpersService);
    spyOn(helpers, 'can').and.returnValue(false);
    flushList();
    expect(component.canExecute({ type: 'SEEDER' } as any)).toBeFalse();
  });
});
