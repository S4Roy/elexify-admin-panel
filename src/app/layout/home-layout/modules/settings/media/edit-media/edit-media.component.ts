import { NgIf } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';
import { InventoryService } from 'app/core/services/inventory.service';

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
];

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];

@Component({
  selector: 'app-edit-media',
  standalone: true,
  imports: [
    NgIf,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    FormsModule,
    ImageCropperComponent,
  ],
  templateUrl: './edit-media.component.html',
})
export class EditMediaComponent {
  item: any;
  altText: string = '';
  croppedBlob: Blob | null = null;
  saving: boolean = false;
  imageLoadFailed: boolean = false;

  // Set once the user picks a replacement file. For images, the cropper
  // then loads from this local file instead of the existing (possibly
  // CORS-blocked) remote URL, and the crop of it becomes the new saved
  // image. For videos there's no cropper — the picked file is sent as-is.
  imageChangedEvent: Event | null = null;
  replacementVideoFile: File | null = null;
  replacementFileName: string | null = null;

  constructor(
    private inventoryService: InventoryService,
    private toastr: ToastrService,
    private dialogRef: MatDialogRef<EditMediaComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.item = data?.item;
    this.altText = this.item?.alt_text || '';
  }

  onImageCropped(event: ImageCroppedEvent) {
    this.croppedBlob = event.blob ?? null;
  }

  onLoadImageFailed() {
    this.imageLoadFailed = true;
  }

  onReplaceFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const isVideo = this.item?.type === 'video';
    const allowed = isVideo ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES;
    if (!allowed.includes(file.type)) {
      this.toastr.error(
        isVideo ? 'Unsupported video format.' : 'Unsupported image format.'
      );
      input.value = '';
      return;
    }

    this.replacementFileName = file.name;
    if (isVideo) {
      this.replacementVideoFile = file;
    } else {
      this.imageLoadFailed = false;
      this.croppedBlob = null;
      this.imageChangedEvent = event;
    }
  }

  cancel() {
    this.dialogRef.close(false);
  }

  save() {
    if (this.saving) return;
    const payload: any = {
      _id: this.item._id,
      alt_text: this.altText ?? '',
    };
    if (this.item?.type === 'video') {
      if (this.replacementVideoFile) {
        payload.file = this.replacementVideoFile;
      }
    } else if (this.croppedBlob) {
      payload.file = this.croppedBlob;
    }
    this.saving = true;
    this.inventoryService.submitMedia(payload).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message ?? 'Media updated');
        this.saving = false;
        this.dialogRef.close(true);
      },
      error: () => {
        this.saving = false;
      },
    });
  }
}
