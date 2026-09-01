import { DatePipe, KeyValuePipe, NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ApiService } from 'app/core/services/api.service';

interface RunLogLine {
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  timestamp: string;
}

type SeedRunType = 'seed' | 'upgrade';

// Lets an admin trigger the same seed/upgrade logic as the backend CLI
// scripts (scripts/seedEmailTemplates.js, upgradeEmailTemplatesToV2.js)
// on demand and watch the run's structured, leveled log inline — no shell
// access to the server needed.
@Component({
  selector: 'app-seed-run-dialog',
  imports: [MatDialogModule, NgIf, NgFor, DatePipe, KeyValuePipe],
  templateUrl: './seed-run-dialog.component.html',
  styleUrl: './seed-run-dialog.component.scss',
})
export class SeedRunDialogComponent {
  running = false;
  ranType: SeedRunType | null = null;
  logs: RunLogLine[] = [];
  summary: Record<string, number> | null = null;
  errorMessage: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<SeedRunDialogComponent>,
    private apiService: ApiService,
  ) {}

  run(type: SeedRunType) {
    this.running = true;
    this.ranType = type;
    this.logs = [];
    this.summary = null;
    this.errorMessage = null;

    this.apiService.runEmailTemplateSeed(type).subscribe({
      next: (res: any) => {
        this.logs = res?.data?.logs ?? [];
        this.summary = res?.data?.summary ?? null;
        this.running = false;
      },
      error: (err) => {
        this.errorMessage =
          err?.error?.message || 'Seed run failed. Check server logs.';
        this.running = false;
      },
    });
  }

  runAnother() {
    this.ranType = null;
    this.logs = [];
    this.summary = null;
    this.errorMessage = null;
  }

  close() {
    this.dialogRef.close();
  }
}
