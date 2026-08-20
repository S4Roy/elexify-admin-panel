import { NgFor, NgIf, NgTemplateOutlet } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  Inject,
  OnDestroy,
  Optional,
  ViewChild,
} from '@angular/core';
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
import * as Global from 'app/global';
import { ActivatedRoute } from '@angular/router';
import FilterOptions from 'app/core/models/FilterOptions';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { MatTabGroup, MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  Subject,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
} from 'rxjs';
import { EditMediaComponent } from './edit-media/edit-media.component';
import { MediaLightboxComponent } from './media-lightbox/media-lightbox.component';
import { DialogService } from 'app/core/services/dialog.service';
import { ConfirmDialogData } from 'app/layout/home-layout/includes/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-media',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    NgTemplateOutlet,
    PaginationComponent,
    MatIconModule,
    MatDialogModule,
    MatTabsModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './media.component.html',
  styleUrl: './media.component.scss',
})
export class MediaComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mediaTabs') mediaTabs!: MatTabGroup;
  @ViewChild('scrollSentinel') scrollSentinel?: ElementRef<HTMLElement>;
  @ViewChild('mediaScrollContainer')
  mediaScrollContainer?: ElementRef<HTMLElement>;

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
  // Stricter than video_allow: restricts the picker to videos only (upload
  // allow-list, library filter locked to "video", image items disabled) —
  // for contexts where an image would silently be the wrong media type
  // rather than just an extra option.
  video_only: boolean = false;
  // Mirror of video_only for image-only contexts — makes the restriction
  // explicit instead of relying on "video_only/video_allow both false"
  // defaulting to images-only, which would silently stop being image-only
  // if that default ever changes.
  image_only: boolean = false;

  // Media Library tab: local search + type/reference filters (independent
  // of the global topbar search, which the dialog overlay makes unreachable)
  mediaSearchTerm: string = '';
  mediaTypeFilter: string = ''; // '' = All, 'image', 'video'
  mediaReferenceTypeFilter: string = ''; // '' = All, else e.g. 'products'
  mediaUnusedFilter: boolean = false; // show only media not referenced anywhere
  readonly referenceTypeOptions: { value: string; label: string }[] = [
    { value: 'products', label: 'Products' },
    { value: 'categories', label: 'Categories' },
    { value: 'brands', label: 'Brands' },
    { value: 'blogs', label: 'Blogs' },
    { value: 'attributes', label: 'Attributes' },
    { value: 'banners', label: 'Banners' },
    { value: 'tags', label: 'Tags' },
    // { value: 'why-choose-us', label: 'Why Choose Us' },
  ];
  private mediaSearch$ = new Subject<string>();

  // Infinite scroll (replaces the old "Load More" button)
  isLoadingMore: boolean = false;
  private intersectionObserver?: IntersectionObserver;

  // "Used in" lookup — lazily fetched per item on click, cached per media id
  usageOpenId: string | null = null;
  usageCache: Record<string, 'loading' | 'error' | any[]> = {};

  constructor(
    private dialog: MatDialog,
    private inventoryService: InventoryService,
    private helperService: HelpersService,
    private route: ActivatedRoute,
    public toastr: ToastrService,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any,
    @Optional() private dialogRef: MatDialogRef<MediaComponent>,
    private fb: FormBuilder,
    private dialogService: DialogService
  ) {
    this.paginationOption = Global.resetPaginationOptions();
    this.filterOption = Global.resetTableFilterOptions();
    this.paginationOption.limit = 18; // Default limit

    if (this.data) {
      this.formGroup = this.fb.group({
        file: [null, [Validators.required]],
        file_name: [null],
        ref_type: [this.data?.ref_type ?? '', [Validators.required]],
      });
      // Default the library filter to the current context (e.g. "products"
      // when adding a product image), but the user can widen it to "All"
      // or another type to reuse media uploaded elsewhere.
      this.mediaReferenceTypeFilter = this.data?.ref_type ?? '';
      if (this.data.video_only) {
        this.video_only = true;
        this.video_allow = true;
        this.allowed_types = ['video/mp4', 'video/webm'];
        this.mediaTypeFilter = 'video';
      } else if (this.data.image_only) {
        this.image_only = true;
        // allowed_types is already image-only by default; kept explicit
        // here (rather than left implicit) so the mode is self-documenting.
        this.mediaTypeFilter = 'image';
      } else {
        if (this.data.video_allow) {
          this.video_allow = true;
        }
        if (this.video_allow) {
          this.allowed_types.push('video/mp4', 'video/webm');
        }
      }
      this.switchToTab(1); // Default to media library tab

      if (this.data?.selectedFiles) {
        this.selectedMedia = this.data.selectedFiles;
        this.selected = this.data.selectedFiles.map((file: any) => file._id);
      }

      // Dialog mode's initial fetch — deliberately NOT the combineLatest
      // below, which drives the global topbar search that's unreachable
      // from inside the dialog overlay (see the mediaSearchTerm comment
      // above). Reusing it here meant the dialog's list silently inherited
      // whatever search term was last typed into that global search on
      // some unrelated page — e.g. upload an image from here, and it
      // wouldn't appear in the library tab because a stale term from
      // elsewhere in the app was still filtering everything out.
      this.fetchMediaList(false);
    } else {
      this.paginationOption.limit = 24; // Default limit for non-dialog view

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

    this.mediaSearch$
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe((value) => {
        this.filterOption.search_key = value;
        this.paginationOption.page = 1;
        this.fetchMediaList(false);
      });
  }

  ngOnInit(): void {
    // formGroup only exists in dialog mode (see constructor) — the
    // standalone Settings > Media page has no upload form to wire up.
    if (!this.formGroup) return;
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
    if (this.mediaReferenceTypeFilter) {
      params.set('reference_type', this.mediaReferenceTypeFilter);
    }
    if (this.mediaTypeFilter) {
      params.set('type', this.mediaTypeFilter);
    }
    if (this.mediaUnusedFilter) {
      params.set('unused', 'true');
    }

    if (append) {
      this.isLoadingMore = true;
    }
    this.inventoryService.mediaList(params).subscribe({
      next: (res: any) => {
        this.item_list = append
          ? [...this.item_list, ...(res?.data?.docs ?? [])]
          : res?.data?.docs ?? [];
        this.paginationOption = { ...res?.data };
        this.isLoadingMore = false;
      },
      error: (err) => {
        this.toastr.error('Failed to fetch media');
        this.isLoadingMore = false;
      },
    });
  }

  onPageChange(page: number) {
    this.paginationOption.page = page;
    this.fetchMediaList(false); // reset list on page change
  }

  onLoadMore() {
    if (this.isLoadingMore || !this.paginationOption?.hasNextPage) return;
    this.paginationOption.page += 1;
    this.fetchMediaList(true); // append results
  }

  ngAfterViewInit(): void {
    if (!this.scrollSentinel) return;
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          this.onLoadMore();
        }
      },
      {
        root: this.mediaScrollContainer?.nativeElement ?? null,
        rootMargin: '150px',
      }
    );
    this.intersectionObserver.observe(this.scrollSentinel.nativeElement);
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
  }

  onMediaSearchInput(value: string) {
    this.mediaSearchTerm = value;
    this.mediaSearch$.next(value);
  }

  onMediaTypeFilterChange(value: string) {
    this.mediaTypeFilter = value;
    this.paginationOption.page = 1;
    this.fetchMediaList(false);
  }

  onMediaReferenceTypeFilterChange(value: string) {
    this.mediaReferenceTypeFilter = value;
    this.paginationOption.page = 1;
    this.fetchMediaList(false);
  }

  onMediaUnusedFilterChange(checked: boolean) {
    this.mediaUnusedFilter = checked;
    this.paginationOption.page = 1;
    this.fetchMediaList(false);
  }

  // Close the "used in" popover on any click outside it/its trigger button
  // (both stopPropagation, so only genuine outside clicks reach here).
  @HostListener('document:click')
  onDocumentClick() {
    this.usageOpenId = null;
  }

  // "Used in" — lazily fetched per item, cached so repeated toggles don't
  // re-hit the API.
  isUsageList(id: string): boolean {
    return Array.isArray(this.usageCache[id]);
  }

  getUsageItems(id: string): any[] {
    const value = this.usageCache[id];
    return Array.isArray(value) ? value : [];
  }

  toggleUsage(item: any, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    if (this.usageOpenId === item._id) {
      this.usageOpenId = null;
      return;
    }
    this.usageOpenId = item._id;
    if (this.usageCache[item._id]) return; // already fetched/loading
    this.usageCache[item._id] = 'loading';
    this.inventoryService.mediaUsage(item._id).subscribe({
      next: (res: any) => {
        this.usageCache[item._id] = res?.data?.items ?? [];
      },
      error: () => {
        this.usageCache[item._id] = 'error';
      },
    });
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

  deleteItem(item: any, event?: Event) {
    event?.stopPropagation();
    const dialogData: ConfirmDialogData = {
      title: 'Are you sure?',
      message: "You won't be able to revert this!",
      cancelText: 'Cancel',
      saveText: 'Delete',
    };
    this.dialogService.confirmDialog(dialogData).subscribe((result: any) => {
      if (result?.confirm) {
        this.inventoryService.deleteMedia({ _id: item._id }).subscribe({
          next: (res: any) => {
            this.toastr.success(res?.body?.message ?? 'Media deleted');
            this.paginationOption.page = 1; // Reset to first page after deletion
            this.fetchMediaList(false);
          },
          // The global http interceptor already toasts the specific reason
          // (e.g. "still used in N place(s)") for failed requests — no need
          // to show a second, generic error here.
          error: () => {},
        });
      }
    });
  }

  // ── Edit media (alt text + crop-replace) — opens as its own stacked
  //    dialog rather than an in-place overlay, so the cropper gets a
  //    properly sized, unclipped surface to render into.
  openEditMedia(item: any, event: Event) {
    event.stopPropagation();
    this.usageOpenId = null;
    this.dialog
      .open(EditMediaComponent, {
        data: { item },
        width: '700px',
        maxWidth: '95vw',
      })
      .afterClosed()
      .subscribe((updated: boolean) => {
        if (updated) {
          this.paginationOption.page = 1; // Reset to first page after edit
          this.fetchMediaList(false);
        }
      });
  }

  // ── Full-screen viewer (view + Next/Previous) ─────────────────────────────
  openLightbox(item: any, event: Event) {
    event.stopPropagation();
    const index = this.item_list.indexOf(item);
    if (index === -1) return;
    this.dialog.open(MediaLightboxComponent, {
      data: { items: this.item_list, index },
      panelClass: 'media-lightbox-panel',
      maxWidth: '100vw',
      maxHeight: '100vh',
    });
  }

  submitMedia() {
    if (this.formGroup.valid) {
      this.inventoryService.submitMedia(this.formGroup.value).subscribe({
        next: (res: any) => {
          this.toastr.success(res?.message);
          this.paginationOption.page = 1; // Reset to first page after upload
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
