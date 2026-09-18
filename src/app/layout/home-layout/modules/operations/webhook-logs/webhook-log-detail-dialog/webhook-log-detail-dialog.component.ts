import { DatePipe, JsonPipe, NgIf } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface WebhookLogDetailDialogData {
  entry: any;
}

@Component({
  selector: 'app-webhook-log-detail-dialog',
  imports: [MatDialogModule, NgIf, DatePipe, JsonPipe],
  templateUrl: './webhook-log-detail-dialog.component.html',
  styleUrl: './webhook-log-detail-dialog.component.scss',
})
export class WebhookLogDetailDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: WebhookLogDetailDialogData) {}

  get entry(): any {
    return this.data?.entry ?? {};
  }
}
