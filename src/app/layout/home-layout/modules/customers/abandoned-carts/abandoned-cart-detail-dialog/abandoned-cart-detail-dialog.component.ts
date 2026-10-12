import { CurrencyPipe, DatePipe, NgClass, NgFor, NgIf, TitleCasePipe } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';

export interface AbandonedCartDetailDialogData {
  entry: any;
  canSend: boolean;
}

const CHANNEL_LABELS: Record<string, string> = { email: 'Email', whatsapp: 'WhatsApp', push: 'App push', sms: 'SMS' };

@Component({
  selector: 'app-abandoned-cart-detail-dialog',
  imports: [MatDialogModule, NgIf, NgFor, NgClass, DatePipe, CurrencyPipe, TitleCasePipe, RouterLink],
  templateUrl: './abandoned-cart-detail-dialog.component.html',
  styleUrl: './abandoned-cart-detail-dialog.component.scss',
})
export class AbandonedCartDetailDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: AbandonedCartDetailDialogData) {}

  get entry(): any {
    return this.data?.entry ?? {};
  }

  get customerMobile(): string {
    const c = this.entry?.customer;
    return c?.mobile ? [c.phone_code, c.mobile].filter(Boolean).join(' ') : '—';
  }

  get reachableChannels(): string {
    const r = this.entry?.reachable || {};
    const on = ['email', 'whatsapp', 'push'].filter((c) => r[c]).map((c) => CHANNEL_LABELS[c]);
    return on.length ? on.join(', ') : 'None — customer hasn\'t opted in';
  }

  get closedLabel(): string {
    const reason = this.entry?.closed_reason;
    if (reason === 'cart_emptied') return 'Customer emptied the cart';
    if (reason === 'stale') return 'No activity within the tracking window';
    return '';
  }

  channelList(channels: string[] = []): string {
    return channels.map((c) => CHANNEL_LABELS[c] ?? c).join(', ');
  }
}
