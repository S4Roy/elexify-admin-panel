import { Pipe, PipeTransform } from '@angular/core';

// Compact relative time for table cells ("Just now", "5m ago", "3h ago",
// "2d ago", "4mo ago"). Pure, so it reflects the time the row rendered —
// pair it with a full date (tooltip or second line) where exactness matters.
@Pipe({ name: 'timeAgo' })
export class TimeAgoPipe implements PipeTransform {
  transform(value: string | Date | null | undefined, empty = '—'): string {
    if (!value) return empty;
    const mins = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
    if (Number.isNaN(mins)) return empty;
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return months < 12 ? `${months}mo ago` : `${Math.floor(days / 365)}y ago`;
  }
}
