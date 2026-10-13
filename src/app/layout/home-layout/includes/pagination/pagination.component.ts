import { FormsModule } from '@angular/forms';
import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  ElementRef,
  HostListener,
  ViewChild,
  Input,
  Output,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import * as Global from '../../../../global';
import { DeviceDetectorService } from 'app/core/services/device-detector.service';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'pagination',
  standalone: true,
  imports: [DecimalPipe, NgFor, NgIf, FormsModule, MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss',
})
export class PaginationComponent implements OnChanges {
  @Input() pagination: any = Global.resetPaginationOptions();
  @Input() pageSizeOptions: readonly number[] = [10, 25, 50, 100];
  @Output() pageSizeChange = new EventEmitter<number>();
  @Output() pageChange = new EventEmitter<number>();
  constructor(public device: DeviceDetectorService) {}
  public value = 1;
  pageError = '';
  @ViewChild('jumpMenu') jumpMenu?: ElementRef<HTMLDetailsElement>;

  @HostListener('document:click', ['$event.target'])
  closeJumpMenu(target: EventTarget | null): void {
    const menu = this.jumpMenu?.nativeElement;
    if (menu?.open && target instanceof Node && !menu.contains(target)) menu.open = false;
  }


  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pagination']) {
      // Reset current page if pagination input changes
      this.value = this.pagination.page || 1;
    }
  }

  get visiblePages(): (number | string)[] {
    const total = this.pagination?.totalPages || 1;
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    const start = Math.max(2, Math.min(this.value - 1, total - 3));
    const end = Math.min(total - 1, Math.max(this.value + 1, 3));
    const pages: (number | string)[] = [1];
    if (start > 2) pages.push('…');
    for (let page = start; page <= end; page++) pages.push(page);
    if (end < total - 1) pages.push('…');
    pages.push(total);
    return pages;
  }

  get pageSize(): number {
    const limit = Number(this.pagination?.limit);
    return Number.isSafeInteger(limit) && limit > 0 ? limit : 50;
  }

  get availablePageSizes(): number[] {
    return [...new Set([...this.pageSizeOptions, this.pageSize])]
      .filter(size => Number.isSafeInteger(size) && size > 0)
      .sort((a, b) => a - b);
  }

  get rangeStart(): number {
    return this.pagination?.totalDocs > 0
      ? Math.min((Math.max(1, this.pagination.page || 1) - 1) * this.pageSize + 1, this.pagination.totalDocs)
      : 0;
  }

  get rangeEnd(): number {
    return Math.min(Math.max(1, this.pagination?.page || 1) * this.pageSize, this.pagination?.totalDocs || 0);
  }

  selectPageSize(rawSize: string | number): void {
    const size = Number(rawSize);
    if (!this.availablePageSizes.includes(size) || size === this.pageSize) return;
    // The parent owns the limit and reload. Emit once to avoid duplicate requests.
    this.value = 1;
    this.pageSizeChange.emit(size);
  }

  submitPageJump(input: HTMLInputElement): void {
    const text = input.value.trim();
    const page = Number(text);
    if (!/^\d+$/.test(text) || !Number.isSafeInteger(page) || page < 1 || page > this.pagination.totalPages) {
      this.pageError = `Enter a page between 1 and ${this.pagination.totalPages}.`;
      return;
    }
    this.pageError = '';
    this.jumpToPage(input);
    if (this.jumpMenu) this.jumpMenu.nativeElement.open = false;
  }

  jumpToPage(input: HTMLInputElement): void {
    const text = input.value.trim();
    const page = Number(text);
    if (/^\d+$/.test(text) && Number.isSafeInteger(page)) this.selectPage(page);
    input.value = String(this.value);
  }

  public selectPage(page: number): void {
    if (!Number.isSafeInteger(page) || page < 1 || page > this.pagination.totalPages || page === this.value) return;

    this.value = page;
    this.pageChange.emit(this.value);
  }

}
