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
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { MediaComponent } from '../../../settings/media/media.component';
import { MatButtonModule } from '@angular/material/button';
import { HelpersService } from 'app/core/services/helpers.service';
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
  category_id: any = null;
  constructor(
    private fb: FormBuilder,
    public toastr: ToastrService,
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
      is_featured: [false],
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
      default:
        this.formGroup.patchValue({
          image_url: null,
          image: null,
        });
        break;
    }
  }
}
