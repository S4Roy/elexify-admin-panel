import { Location, NgFor, NgIf } from '@angular/common';
import { Component, Inject, Optional } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute } from '@angular/router';
import { PageService } from 'app/core/services/page.service';
import { MenuComponent } from 'app/layout/home-layout/includes/menu/menu.component';
import { PaginationComponent } from 'app/layout/home-layout/includes/pagination/pagination.component';
import { ToastrService } from 'ngx-toastr';
import * as Global from 'app/global';
import { MatSelectModule } from '@angular/material/select';
import { InventoryService } from 'app/core/services/inventory.service';
import FilterOptions from 'app/core/models/FilterOptions';
import PaginationOptions from 'app/core/models/PaginationOptions';
import { NgSelectModule } from '@ng-select/ng-select';
import {
  Subject,
  debounceTime,
  distinctUntilChanged,
  startWith,
  takeUntil,
} from 'rxjs';
import { MediaComponent } from '../../../settings/media/media.component';
import { MatButtonModule } from '@angular/material/button';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import {
  ClassicEditor,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Subscript,
  Superscript,
  Essentials,
  Paragraph,
  Heading,
  Link,
  BlockQuote,
  Code,
  CodeBlock,
  List,
} from 'ckeditor5';
import { HelpersService } from 'app/core/services/helpers.service';
import { SanitizeService } from 'app/core/services/sanitize.service';
import { SafeResourceUrl } from '@angular/platform-browser';
import { MatCheckboxModule } from '@angular/material/checkbox';
@Component({
  selector: 'app-new-category',
  imports: [
    ReactiveFormsModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MenuComponent,
    NgFor,
    MatTooltipModule,
    MatSelectModule,
    MatDialogModule,
    NgIf,
    NgSelectModule,
    MatIconModule,
    MatButtonModule,
    CKEditorModule,
    MatCheckboxModule,
  ],
  templateUrl: './new-category.component.html',
  styleUrl: './new-category.component.scss',
})
export class NewCategoryComponent {
  Global = Global;
  formGroup!: FormGroup;
  categories: any = [];
  paginationOption: PaginationOptions;
  filterOption: FilterOptions;
  searchSubject = new Subject<any>();
  public Editor = ClassicEditor;
  iframeUrl: SafeResourceUrl | null = null;
  private destroy$ = new Subject<void>();

  public config = {
    licenseKey: 'GPL', // Or 'GPL'.
    plugins: [Essentials, Paragraph, Heading, Bold, Italic, Link],
    toolbar: ['bold', 'heading', 'italic', 'link'],
  };
  category_id: any = null;
  constructor(
    private fb: FormBuilder,
    public toastr: ToastrService,
    public sanitize: SanitizeService,
    private route: ActivatedRoute,
    private inventoryService: InventoryService,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any,
    @Optional() private dialogRef: MatDialogRef<NewCategoryComponent>,
    private dialog: MatDialog,
    public location: Location
  ) {
    this.paginationOption = Global.resetPaginationOptions();
    this.filterOption = Global.resetTableFilterOptions();
    this.formGroup = this.fb.group({
      name: [null, Validators.compose([Validators.required])],
      description: [null],
      parent_category: [null, []],
      status: ['active', Validators.compose([Validators.required])],
      image: [null],
      image_url: [null],
      banner: [null],
      banner_url: [null],
      banner_type: [null],
      banner_tag_line: [null],
      details: this.fb.group({
        required: [false],
        block_1: this.fb.group({
          title: [''],
          heading: [''],
          description: [''],
          ruling_planet: [''],
          lord_deity: [''],
          chakra_activated: [''],
          external_url: [null],
        }),
        block_2: this.fb.group({
          title: [''],
          heading: [''],
          description: [''],
          beej_mantra: [''],
          recommended_chalisa: [''],
          energization_procedure: [''],
          image: [null],
          image_url: [null],
        }),
        block_3: this.fb.group({
          benefits: [''],
          who_should_wear: [''],
        }),
        block_4: this.fb.group({
          title: [''],
          heading: [''],
          description: [''],
          beej_mantra: [''],
          recommended_chalisa: [''],
          energization_procedure: [''],
          image: [null],
          image_url: [null],
          bg: [null],
          bg_url: [null],
        }),
        block_5: this.fb.group({
          title: [''],
          heading: [''],
          description: [''],
          image: [null],
          image_url: [null],
          bg: [null],
          bg_url: [null],
        }),
        block_6: this.fb.group({
          title: [''],
          heading: [''],
          description: [''],
          image: [null],
          image_url: [null],
        }),
        block_7: this.fb.group({
          title: [''],
          heading: [''],
          description: [''],
          image: [null],
          image_url: [null],
        }),
        block_8: this.fb.group({
          title: [''],
          heading: [''],
          description: [''],
          beej_mantra: [''],
          recommended_chalisa: [''],
          energization_procedure: [''],
          image: [null],
          image_url: [null],
          bg: [null],
          bg_url: [null],
        }),
      }),
    });
    this.route.params.subscribe((params: any) => {
      this.category_id = params?._id;
      if (this.category_id) {
        this.categoryDetails();
      }
    });
  }
  ngOnInit(): void {
    this.searchSubject
      .pipe(
        debounceTime(300), // Adjust debounce time as needed
        distinctUntilChanged()
      )
      .subscribe((data: any) => {
        this.categories = [];
        this.paginationOption = Global.resetPaginationOptions();
        this.filterOption = Global.resetTableFilterOptions();
        this.filterOption.search_key = data?.term ?? '';
        this.fetchCategoryList();
      });
    this.fetchCategoryList();
    const externalUrlControl = this.formGroup.get(
      'details.block_1.external_url'
    );

    externalUrlControl?.valueChanges
      .pipe(
        startWith(externalUrlControl?.value),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((val: string) => {
        if (!val) {
          this.iframeUrl = null;
          return;
        }
        const safe = this.sanitize.safeResourceUrl(val);
        this.iframeUrl = safe;
      });
  }
  categoryDetails() {
    const params = new URLSearchParams();
    params.set('id_includes', String(this.category_id));

    this.inventoryService.categoryList(params).subscribe({
      next: (res: any) => {
        const DATA = res?.data?.docs?.[0];
        if (!DATA) return;

        // Apply to form
        this.formGroup.patchValue(DATA);

        // Ensure parent_category object is available in the dropdown/list (avoid duplicates)
        if (DATA.parent_category) {
          const exists = this.categories.some(
            (c: any) => c._id === DATA.parent_category._id
          );
          if (!exists) {
            // put it at the top (or push depending on desired order)
            this.categories.unshift(DATA.parent_category);
          }
          this.formGroup.patchValue({
            parent_category: DATA.parent_category._id,
          });
        }
        if (DATA.image) {
          this.formGroup.patchValue({
            image: DATA.image._id,
            image_url: DATA.image.url,
          });
        }
        if (DATA.banner) {
          this.formGroup.patchValue({
            banner: DATA.banner._id,
            banner_url: DATA.banner.url,
            banner_type: DATA.banner.type,
          });
        }
        if (DATA.details.block_2.image) {
          this.formGroup.patchValue({
            details: {
              block_2: {
                image_url: DATA.details.block_2.image?.url,
                image: DATA.details.block_2.image?._id,
              },
            },
          });
        }
        this.formGroup.patchValue({
          details: {
            block_4: {
              image_url: DATA.details?.block_4?.image?.url,
              image: DATA.details?.block_4?.image?._id,
              bg_url: DATA.details?.block_4?.bg?.url,
              bg: DATA.details?.block_4?.bg?._id,
            },
            block_5: {
              image_url: DATA.details?.block_5?.image?.url,
              image: DATA.details?.block_5?.image?._id,
            },
            block_6: {
              image_url: DATA.details?.block_6?.image?.url,
              image: DATA.details?.block_6?.image?._id,
            },
            block_7: {
              image_url: DATA.details?.block_7?.image?.url,
              image: DATA.details?.block_7?.image?._id,
            },
            block_8: {
              image_url: DATA.details?.block_8?.image?.url,
              image: DATA.details?.block_8?.image?._id,
              bg_url: DATA.details?.block_8?.bg?.url,
              bg: DATA.details?.block_8?.bg?._id,
            },
          },
        });
        console.log(this.formGroup.value);
      },
      error: (err) => {
        // handle error if needed
        console.error('Failed to fetch category details', err);
      },
    });
  }

  fetchCategoryList() {
    let params = new URLSearchParams();
    if (this.paginationOption.page) {
      params.set('page', String(this.paginationOption.page));
    }
    if (this.filterOption.slug) {
      params.set('slug', this.filterOption.slug);
    }
    if (this.filterOption.search_key) {
      params.set('search_key', this.filterOption.search_key);
    }
    this.inventoryService.categoryList(params).subscribe({
      next: (res: any) => {
        this.categories = [...this.categories, ...res?.data?.docs];
        this.paginationOption = {
          ...res?.data,
        };
      },
      error: (err) => {},
    });
  }
  onSubmit() {
    this.formGroup.markAllAsTouched();
    if (this.formGroup.valid) {
      this.formGroup.disable();
      let formData = this.formGroup.getRawValue();
      if (this.category_id) {
        formData._id = this.category_id;
      }
      delete formData.banner_type;
      delete formData.banner_url;
      delete formData.image_url;

      this.inventoryService.submitCategory(formData).subscribe({
        next: (res: any) => {
          this.formGroup.enable();
          // this.dialogRef.close(res);
          this.location.back();
          this.toastr.success(res?.message);
        },
        error: (err: any) => {
          this.formGroup.enable();
        },
      });
    }
  }
  loadMoreItems() {
    if (this.paginationOption.hasNextPage) {
      this.paginationOption.page = this.paginationOption.nextPage;
      this.fetchCategoryList();
    }
  }
  chooseFile(type: any = null) {
    this.dialog
      .open(MediaComponent, {
        disableClose: true,
        width: '80%',
        height: '80%',
        data: {
          ref_type: 'categories',
          video_allow: type == 'banner' ? true : false,
          multiple: false,
          selectedFiles: [],
        },
      })
      .afterClosed()
      .subscribe((res: any) => {
        if (res) {
          res.forEach((file: any) => {
            // this.images.push(this.fb.group(file));
            switch (type) {
              case 'banner':
                this.formGroup.patchValue({
                  banner_url: file?.url,
                  banner: file?._id,
                  banner_type: file?.type,
                });
                break;
              case 'block_2':
                this.formGroup.patchValue({
                  details: {
                    block_2: {
                      image_url: file?.url,
                      image: file?._id,
                    },
                  },
                });
                break;
              case 'block_4':
                this.formGroup.patchValue({
                  details: {
                    block_4: {
                      image_url: file?.url,
                      image: file?._id,
                    },
                  },
                });
                break;
              case 'block_4_bg':
                this.formGroup.patchValue({
                  details: {
                    block_4: {
                      bg_url: file?.url,
                      bg: file?._id,
                    },
                  },
                });
                break;
              case 'block_5':
                this.formGroup.patchValue({
                  details: {
                    block_5: {
                      image_url: file?.url,
                      image: file?._id,
                    },
                  },
                });
                break;
              case 'block_6':
                this.formGroup.patchValue({
                  details: {
                    block_6: {
                      image_url: file?.url,
                      image: file?._id,
                    },
                  },
                });
                break;
              case 'block_7':
                this.formGroup.patchValue({
                  details: {
                    block_7: {
                      image_url: file?.url,
                      image: file?._id,
                    },
                  },
                });
                break;
              case 'block_8':
                this.formGroup.patchValue({
                  details: {
                    block_8: {
                      image_url: file?.url,
                      image: file?._id,
                    },
                  },
                });
                break;
              case 'block_8_bg':
                this.formGroup.patchValue({
                  details: {
                    block_8: {
                      bg_url: file?.url,
                      bg: file?._id,
                    },
                  },
                });
                break;
              default:
                this.formGroup.patchValue({
                  image_url: file?.url,
                  image: file?._id,
                });
                break;
            }
          });
        }
      });
  }
  removeImage(type: any = null) {
    switch (type) {
      case 'banner':
        this.formGroup.patchValue({
          banner_type: null,
          banner_url: null,
          banner: null,
        });
        break;
      case 'block_2':
        this.formGroup.patchValue({
          details: {
            block_2: {
              image_url: null,
              image: null,
            },
          },
        });
        break;
      case 'block_4':
        this.formGroup.patchValue({
          details: {
            block_4: {
              image_url: null,
              image: null,
            },
          },
        });
        break;
      case 'block_4_bg':
        this.formGroup.patchValue({
          details: {
            block_4: {
              bg_url: null,
              bg: null,
            },
          },
        });
        break;
      case 'block_5':
        this.formGroup.patchValue({
          details: {
            block_5: {
              image_url: null,
              image: null,
            },
          },
        });
        break;
      case 'block_6':
        this.formGroup.patchValue({
          details: {
            block_6: {
              image_url: null,
              image: null,
            },
          },
        });
        break;
      case 'block_7':
        this.formGroup.patchValue({
          details: {
            block_7: {
              image_url: null,
              image: null,
            },
          },
        });
        break;

      case 'block_8':
        this.formGroup.patchValue({
          details: {
            block_8: {
              image_url: null,
              image: null,
            },
          },
        });
        break;
      case 'block_8_bg':
        this.formGroup.patchValue({
          details: {
            block_8: {
              bg_url: null,
              bg: null,
            },
          },
        });
        break;
      default:
        this.formGroup.patchValue({
          image_url: null,
          image: null,
        });
        break;
    }
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
