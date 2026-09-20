// Shared shapes for the Data Operations (Seeder / Migration / Backfill /
// Repair) admin screens. Mirrors the backend registry contract documented
// in the architecture plan for `admin/data-operations*`. The backend for
// this is being built in parallel and was not available while this was
// written — these interfaces are our best-effort mirror of the agreed
// contract, not a verified response shape.

export type DataOperationType =
  | 'SEEDER'
  | 'MIGRATION'
  | 'BACKFILL'
  | 'REPAIR';

export type DataOperationRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type HealthStatus =
  | 'HEALTHY'
  | 'WARNING'
  | 'MISSING'
  | 'ERROR'
  | 'NOT_APPLICABLE';

export type ExecutionStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'SUCCESS'
  | 'PARTIAL'
  | 'FAILED'
  | 'CANCELLED';

export interface OperationHealth {
  status: HealthStatus;
  expected?: number;
  valid?: number;
  missing?: number;
}

export interface ExecutionSummary {
  status: ExecutionStatus;
  completed_at?: string | null;
  result?: Record<string, any> | null;
}

export interface DataOperation {
  key: string;
  name: string;
  description?: string;
  type: DataOperationType;
  category?: string;
  version?: string | number;
  required?: boolean;
  idempotent?: boolean;
  risk: DataOperationRisk;
  allowedEnvironments?: string[];
  // The list endpoint returns plain dependency keys; the detail endpoint
  // returns {key, name, satisfied} so the UI can flag an unsatisfied
  // dependency without a second round trip.
  dependencies?: (string | { key: string; name: string; satisfied: boolean })[];
  supportsDryRun?: boolean;
  requiresConfirmation?: boolean;
  health?: OperationHealth | null;
  lastExecution?: ExecutionSummary | null;
  previousExecutions?: ExecutionListItem[];
}

export interface DryRunResult {
  status?: ExecutionStatus;
  error?: { safe_message?: string } | null;
  execution_id: string;
  result: {
    summary?: Record<string, { total: number; missing: number; existing: number; blocked: number }>;
    issues?: { type: string; sourceId: string; reason: string }[];
    blocked?: number;
    wouldInsert?: number;
    wouldUpdate?: number;
    wouldSkip?: number;
    wouldDelete?: number;
  };
  logs: ExecutionLogLine[];
}

export interface ExecutionLogLine {
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  timestamp: string;
  stage?: string;
}

export interface ExecutionListItem {
  execution_id: string;
  operation_key?: string;
  operation_name?: string;
  status: ExecutionStatus;
  started_at?: string;
  completed_at?: string | null;
  duration_ms?: number | null;
  trigger_source?: string;
  triggered_by?: string;
}

export interface ExecutionDetail {
  execution_id: string;
  operation_key: string;
  operation_name: string;
  operation_type: DataOperationType;
  operation_version?: string | number;
  environment: string;
  status: ExecutionStatus;
  trigger_source?: string;
  triggered_by?: string;
  started_at?: string;
  completed_at?: string | null;
  duration_ms?: number | null;
  dry_run?: boolean;
  result?: {
    inserted?: number;
    updated?: number;
    skipped?: number;
    deleted?: number;
    warnings?: number;
  } | null;
  error?: { code: string; safe_message: string } | null;
}
