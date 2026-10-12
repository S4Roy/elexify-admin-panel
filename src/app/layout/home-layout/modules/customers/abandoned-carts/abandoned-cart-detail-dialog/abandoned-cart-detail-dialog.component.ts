import { CurrencyPipe, DatePipe, NgClass, NgFor, NgIf, TitleCasePipe } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { customerAvatarColor, customerInitials } from '../abandoned-cart.utils';

export interface AbandonedCartDetailDialogData {
  entry: any;
  canSend: boolean;
}

const CHANNEL_LABELS: Record<string, string> = { email: 'Email', whatsapp: 'WhatsApp', push: 'App push', sms: 'SMS' };

@Component({
  selector: 'app-abandoned-cart-detail-dialog',
  imports: [MatDialogModule, NgIf, NgFor, NgClass, DatePipe, CurrencyPipe, TitleCasePipe, RouterLink, MatIconModule],
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

  get initials(): string {
    return customerInitials(this.entry?.customer?.name);
  }

  get avatarColor(): string {
    return this.entry?.customer ? customerAvatarColor(this.entry.customer.name) : '#9ca3af';
  }

  get channels(): { label: string; on: boolean }[] {
    const r = this.entry?.reachable || {};
    return ['email', 'whatsapp', 'push'].map((c) => ({ label: CHANNEL_LABELS[c], on: !!r[c] }));
  }

  get isReachable(): boolean {
    return this.channels.some((c) => c.on);
  }

  get sentCount(): number {
    return (this.entry?.reminders || []).filter((r: any) => r.channels?.length).length;
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
