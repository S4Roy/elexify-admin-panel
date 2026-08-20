import { NgIf } from '@angular/common';
import { Component, HostListener, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-media-lightbox',
  standalone: true,
  imports: [NgIf, MatDialogModule, MatIconModule, MatButtonModule],
  templateUrl: './media-lightbox.component.html',
  styleUrl: './media-lightbox.component.scss',
})
export class MediaLightboxComponent {
  items: any[];
  index: number;

  constructor(
    private dialogRef: MatDialogRef<MediaLightboxComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.items = data?.items ?? [];
    this.index = data?.index ?? 0;
  }

  get current(): any {
    return this.items[this.index];
  }

  get hasPrev(): boolean {
    return this.index > 0;
  }

  get hasNext(): boolean {
    return this.index < this.items.length - 1;
  }

  prev(event?: Event) {
    event?.stopPropagation();
    if (this.hasPrev) this.index--;
  }

  next(event?: Event) {
    event?.stopPropagation();
    if (this.hasNext) this.index++;
  }

  close() {
    this.dialogRef.close();
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.prev();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.next();
    } else if (event.key === 'Escape') {
      this.close();
    }
  }
}
