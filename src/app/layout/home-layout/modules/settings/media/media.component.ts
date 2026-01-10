import { NgFor, NgIf } from '@angular/common';
import { Component, Inject, Optional, ViewChild } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import PaginationOptions from 'app/core/models/PaginationOptions';
import { InventoryService } from 'app/core/services/inventory.service';
import { HelpersService } from 'app/core/services/helpers.service';
import { PaginationComponent } from 'app/layout/home-layout/includes/pagination/pagination.component';
import { MenuComponent } from 'app/layout/home-layout/includes/menu/menu.component';
import * as Global from 'app/global';
import { ActivatedRoute, RouterLink } from '@angular/router';
import FilterOptions from 'app/core/models/FilterOptions';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { MatTabGroup, MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { combineLatest, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-media',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    PaginationComponent,
    MatIconModule,
    MatDialogModule,
    MatTabsModule,
    MatButtonModule,
  ],
  templateUrl: './media.component.html',
  styleUrl: './media.component.scss',
})
export class MediaComponent {
  @ViewChild('mediaTabs') mediaTabs!: MatTabGroup;

  Global = Global;
  allowed_types: any[] = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
  ];
  selected: any[] = [];
  selectedMedia: any[] = [];
  item_list: any[] = [];
  paginationOption: PaginationOptions;
  filterOption: FilterOptions;
  formGroup!: FormGroup;

  permissions: string[] = ['add', 'edit', 'delete'];
  video_allow: boolean = false;
  constructor(
    private dialog: MatDialog,
    private inventoryService: InventoryService,
    private helperService: HelpersService,
    private route: ActivatedRoute,
    public toastr: ToastrService,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any,
    @Optional() private dialogRef: MatDialogRef<MediaComponent>,
    private fb: FormBuilder
  ) {
    this.paginationOption = Global.resetPaginationOptions();
    this.filterOption = Global.resetTableFilterOptions();
    this.paginationOption.limit = 12; // Default limit

    if (this.data) {
      this.formGroup = this.fb.group({
        file: [null, [Validators.required]],
        file_name: [null],
        ref_type: [this.data?.ref_type ?? '', [Validators.required]],
      });
      if (this.data.video_allow) {
        this.video_allow = true;
      }
      if (this.video_allow) {
        this.allowed_types.push('video/mp4', 'video/webm');
      }
      this.switchToTab(1); // Default to media library tab

      if (this.data?.selectedFiles) {
        this.selectedMedia = this.data.selectedFiles;
        this.selected = this.data.selectedFiles.map((file: any) => file._id);
      }
    }

    combineLatest([
      this.route.paramMap,
      this.helperService.searchKey$,
    ]).subscribe(([params, searchKey]) => {
      this.filterOption = Global.resetTableFilterOptions();
      this.filterOption.slug = params.get('slug');
      this.filterOption.search_key = searchKey;
      this.paginationOption.page = 1;
      this.fetchMediaList(false); // reset list
    });
  }

  ngOnInit(): void {
    this.formGroup
      .get('file')
      ?.valueChanges.pipe(debounceTime(500), distinctUntilChanged())
      .subscribe((value: any) => {
        if (value && this.formGroup.valid) {
          this.submitMedia();
        }
      });
  }

  fetchMediaList(append = false) {
    const params = new URLSearchParams();
    if (this.paginationOption.limit) {
      params.set('limit', String(this.paginationOption.limit));
    }
    if (this.paginationOption.page) {
      params.set('page', String(this.paginationOption.page));
    }
    if (this.filterOption.slug) {
      params.set('slug', this.filterOption.slug);
    }
    if (this.filterOption.search_key) {
      params.set('search_key', this.filterOption.search_key);
    }
    if (this.data?.ref_type) {
      params.set('reference_type', this.data?.ref_type);
    }

    this.inventoryService.mediaList(params).subscribe({
      next: (res: any) => {
        this.item_list = append
          ? [...this.item_list, ...(res?.data?.docs ?? [])]
          : res?.data?.docs ?? [];
        this.paginationOption = { ...res?.data };
      },
      error: (err) => {
        this.toastr.error('Failed to fetch media');
      },
    });
  }

  onPageChange(page: number) {
    this.paginationOption.page = page;
    this.fetchMediaList(false); // reset list on page change
  }

  onLoadMore() {
    this.paginationOption.page += 1;
    this.fetchMediaList(true); // append results
  }

  onMediaSelect(item: any) {
    const isMultiple = this.data?.multiple;

    if (!isMultiple) {
      this.selectedMedia = [item];
      this.selected = [item._id];
    } else {
      const media = this.selectedMedia.find(
        (media: any) => media._id === item._id
      );

      if (media) {
        this.selectedMedia = this.selectedMedia.filter(
          (media: any) => media._id !== item._id
        );
        this.selected = this.selected.filter((id: any) => id !== item._id);
      } else {
        this.selectedMedia.push(item);
        this.selected.push(item._id);
      }
    }

    console.log('Selected Media:', this.selectedMedia);
  }

  addToGallery() {
    if (this.selectedMedia.length > 0 && this.dialogRef) {
      this.dialogRef.close(this.selectedMedia);
    }
  }

  switchToTab(index: number): void {
    if (this.mediaTabs) {
      this.mediaTabs.selectedIndex = index;
    }
  }

  closeDialog() {
    this.dialogRef?.close();
  }

  deleteItem(item: any) {
    this.inventoryService.deleteMedia({ _id: item._id }).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.body?.message);
        this.fetchMediaList(false);
      },
      error: () => {
        this.toastr.error('Failed to delete media');
      },
    });
  }

  submitMedia() {
    if (this.formGroup.valid) {
      this.inventoryService.submitMedia(this.formGroup.value).subscribe({
        next: (res: any) => {
          this.toastr.success(res?.message);
          this.fetchMediaList(false);
          this.switchToTab(1); // Media Library
          this.onMediaSelect(res?.data); // Auto-select uploaded media
        },
        error: () => {
          this.toastr.error('Failed to upload media');
        },
      });
    } else {
      this.formGroup.markAllAsTouched();
    }
  }
}
