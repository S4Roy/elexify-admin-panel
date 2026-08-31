import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ApiService } from 'app/core/services/api.service';

type RangeOption = 'today' | '7d' | '30d';

@Component({
  selector: 'app-notification-dashboard',
  imports: [NgIf, NgFor, NgClass, RouterModule],
  templateUrl: './notification-dashboard.component.html',
  styleUrl: './notification-dashboard.component.scss',
})
export class NotificationDashboardComponent implements OnInit {
  range: RangeOption = 'today';
  rangeOptions: { value: RangeOption; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
  ];
  loading = true;
  byStatus: Record<string, number> = {};
  byChannel: Record<string, number> = {};

  // Fixed row order so the summary always renders every known status/channel
  // even when the backend omits a zero-count key.
  statusRows = [
    'QUEUED',
    'SENDING',
    'SENT',
    'DELIVERED',
    'FAILED',
    'RETRYING',
    'DEAD_LETTER',
  ];
  channelRows = ['email', 'sms', 'whatsapp', 'push'];

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.fetchSummary();
  }

  setRange(range: RangeOption) {
    if (this.range === range) return;
    this.range = range;
    this.fetchSummary();
  }

  fetchSummary() {
    this.loading = true;
    this.apiService.notificationSummary(this.range).subscribe({
      next: (res: any) => {
        this.byStatus = res?.data?.by_status ?? {};
        this.byChannel = res?.data?.by_channel ?? {};
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  statusClass(status: string): string {
    return status.toLowerCase();
  }

  countFor(map: Record<string, number>, key: string): number {
    return map[key] ?? 0;
  }
}
