import { Directive, Input, OnChanges, HostBinding } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Directive({
  selector: '[truncateList]',
  standalone: true,
})
export class TruncateListDirective implements OnChanges {
  @Input('truncateList') items: any[] = [];
  @Input() labelKey: string = 'name';
  @Input() limit: number = 2;

  @HostBinding('innerHTML') displayText: SafeHtml = '';
  @HostBinding('attr.title') tooltipText: string | null = null;
  @HostBinding('class') hostClass = 'truncate-list';

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(): void {
    if (!Array.isArray(this.items) || this.items.length === 0) {
      this.displayText = '';
      this.tooltipText = null;
      return;
    }

    const values = this.items
      .map((item) => item?.[this.labelKey])
      .filter(Boolean);

    const visible = values.slice(0, this.limit);
    const hiddenCount = values.length - visible.length;

    const html =
      visible.join(', ') +
      (hiddenCount > 0
        ? ` <span class="text-blue-600 cursor-pointer">+${hiddenCount} more</span>`
        : '');

    this.displayText = this.sanitizer.bypassSecurityTrustHtml(html);

    // Native tooltip (works everywhere)
    this.tooltipText = hiddenCount > 0 ? values.join(', ') : null;
  }
}
