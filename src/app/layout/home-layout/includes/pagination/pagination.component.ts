import { NgFor, NgIf } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import * as Global from '../../../../global';
import { DeviceDetectorService } from 'app/core/services/device-detector.service';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export const ELLIPSIS = '…';

@Component({
  selector: 'pagination',
  standalone: true,
  imports: [NgFor, NgIf, MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss',
})
export class PaginationComponent implements OnChanges {
  @Input() pagination: any = Global.resetPaginationOptions();
  @Output() pageChange = new EventEmitter<number>();
  constructor(public device: DeviceDetectorService) {}
  public value = 1;
  public pageItems: (number | typeof ELLIPSIS)[] = [];
  readonly ELLIPSIS = ELLIPSIS;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pagination']) {
      // Reset current page if pagination input changes
      this.value = this.pagination.page || 1;
      this.updateVisiblePages();
    }
  }

  public selectPage(page: number): void {
    if (page < 1 || page > this.pagination.totalPages) return;

    this.value = page;
    this.updateVisiblePages();
    this.pageChange.emit(this.value);
  }

  private updateVisiblePages(): void {
    const totalPages = this.pagination.totalPages || 1;
    const current = this.value;
    const siblingCount = 1; // pages shown on either side of the current page

    if (totalPages <= siblingCount * 2 + 5) {
      this.pageItems = Array.from({ length: totalPages }, (_, i) => i + 1);
      return;
    }

    let start = Math.max(current - siblingCount, 2);
    let end = Math.min(current + siblingCount, totalPages - 1);

    if (current <= siblingCount + 3) {
      start = 2;
      end = siblingCount * 2 + 3;
    } else if (current >= totalPages - (siblingCount + 2)) {
      start = totalPages - (siblingCount * 2 + 2);
      end = totalPages - 1;
    }

    const items: (number | typeof ELLIPSIS)[] = [1];
    if (start > 2) items.push(ELLIPSIS);
    for (let page = start; page <= end; page++) items.push(page);
    if (end < totalPages - 1) items.push(ELLIPSIS);
    items.push(totalPages);

    this.pageItems = items;
  }
}
