import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RunConfirmationDialogComponent } from './run-confirmation-dialog.component';
import {
  sharedTestProviders,
  matDialogRefStub,
  matDialogDataProvider,
} from '../../../../../testing/shared-test-providers';
import { DataOperation } from 'app/layout/home-layout/modules/settings/data-operations/data-operations.models';

function makeOperation(overrides: Partial<DataOperation> = {}): DataOperation {
  return {
    key: 'email-templates',
    name: 'Email Templates Seed',
    type: 'SEEDER',
    risk: 'LOW',
    ...overrides,
  } as DataOperation;
}

describe('RunConfirmationDialogComponent', () => {
  let component: RunConfirmationDialogComponent;
  let fixture: ComponentFixture<RunConfirmationDialogComponent>;

  function setup(data: any) {
    TestBed.configureTestingModule({
      imports: [RunConfirmationDialogComponent],
      providers: [...sharedTestProviders(), matDialogRefStub(), matDialogDataProvider(data)],
    }).compileComponents();

    fixture = TestBed.createComponent(RunConfirmationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create', () => {
    setup({ operation: makeOperation(), environment: 'staging' });
    expect(component).toBeTruthy();
  });

  it('enables Run immediately for a LOW-risk operation in a non-production environment', () => {
    setup({ operation: makeOperation({ risk: 'LOW' }), environment: 'staging' });
    expect(component.requiresTypedConfirmation).toBeFalse();
    expect(component.canRun).toBeTrue();
  });

  it('disables Run until the exact "RUN PRODUCTION" phrase is typed for a HIGH-risk production operation', () => {
    setup({ operation: makeOperation({ risk: 'HIGH' }), environment: 'production' });
    expect(component.requiresTypedConfirmation).toBeTrue();
    expect(component.canRun).toBeFalse();

    component.typedConfirmation = 'run production';
    expect(component.canRun).toBeFalse();

    component.typedConfirmation = 'RUN PRODUCTION';
    expect(component.canRun).toBeTrue();
  });

  it('disables Run until the exact phrase is typed for a CRITICAL-risk production operation', () => {
    setup({ operation: makeOperation({ risk: 'CRITICAL' }), environment: 'production' });
    expect(component.canRun).toBeFalse();
    component.typedConfirmation = 'RUN PRODUCTION';
    expect(component.canRun).toBeTrue();
  });

  it('does not close with confirmed:true when onRun is called while gated', () => {
    setup({ operation: makeOperation({ risk: 'HIGH' }), environment: 'production' });
    component.onRun();
    expect(component.dialogRef.close).not.toHaveBeenCalled();
  });

  it('closes with the typed confirmation once unlocked', () => {
    setup({ operation: makeOperation({ risk: 'HIGH' }), environment: 'production' });
    component.typedConfirmation = 'RUN PRODUCTION';
    component.onRun();
    expect(component.dialogRef.close).toHaveBeenCalledWith({
      confirmed: true,
      confirmation: 'RUN PRODUCTION',
    });
  });

  it('prefers dry-run counts in the impact text when available', () => {
    setup({
      operation: makeOperation({ risk: 'LOW' }),
      environment: 'staging',
      dryRunResult: {
        execution_id: 'x',
        result: { wouldInsert: 3, wouldUpdate: 1 },
        logs: [],
      },
    });
    expect(component.impactText).toContain('insert 3');
    expect(component.impactText).toContain('update 1');
  });
});
