import { DatePipe, JsonPipe, NgIf } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import * as Global from 'app/global';

export interface AuditLogDetailDialogData {
  entry: any;
}

@Component({
  selector: 'app-audit-log-detail-dialog',
  imports: [MatDialogModule, NgIf, DatePipe, JsonPipe],
  templateUrl: './audit-log-detail-dialog.component.html',
  styleUrl: './audit-log-detail-dialog.component.scss',
})
export class AuditLogDetailDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: AuditLogDetailDialogData) {}

  get entry(): any {
    return this.data?.entry ?? {};
  }

  get eventLabel(): string {
    return Global.humanize(this.entry?.event || '');
  }
}
