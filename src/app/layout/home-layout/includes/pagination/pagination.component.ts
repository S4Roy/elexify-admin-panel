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
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'pagination',
  standalone: true,
  imports: [NgFor, NgIf, MatButtonModule, MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss',
})
export class PaginationComponent implements OnChanges {
  @Input() pagination: any = Global.resetPaginationOptions();
  @Output() pageChange = new EventEmitter<number>();
  constructor(public device: DeviceDetectorService) {}
  public value = 1;
  public visiblePages: number[] = [];

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
    const maxVisible = Math.min(totalPages, 5); // show 5 pages max
    let start = Math.max(this.value - Math.floor(maxVisible / 2), 1);
    let end = start + maxVisible - 1;

    if (end > totalPages) {
      end = totalPages;
      start = Math.max(end - maxVisible + 1, 1);
    }

    this.visiblePages = Array.from(
      { length: end - start + 1 },
      (_, i) => start + i
    );
  }
}
