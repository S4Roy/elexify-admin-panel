import { NgIf, NgFor, CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormGroup, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { NgSelectModule } from '@ng-select/ng-select';
import { ToastrService } from 'ngx-toastr';
import * as Global from '../../../../../global';
import { PageService } from 'app/core/services/page.service';
import FilterOptions from 'app/core/models/FilterOptions';
import PaginationOptions from 'app/core/models/PaginationOptions';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { InventoryService } from 'app/core/services/inventory.service';
import { ApiService } from 'app/core/services/api.service';
import { BannersComponent } from '../banners/banners.component';

@Component({
  selector: 'app-home',
  imports: [
    MatIconModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    NgIf,
    NgSelectModule,
    NgFor,
    CommonModule,
    BannersComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  Global = Global;
  formGroup: FormGroup;
  categories: any = [];
  paginationOption: PaginationOptions;
  filterOption: FilterOptions;
  searchSubject = new Subject<any>();

  constructor(
    private fb: FormBuilder,
    public toastr: ToastrService,
    private pageService: PageService,
    private inventoryService: InventoryService,
    private apiService: ApiService
  ) {
    this.getPage();
    this.paginationOption = Global.resetPaginationOptions();
    this.filterOption = Global.resetTableFilterOptions();
    this.formGroup = this.fb.group({
      categories: [],
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
        this.filterOption._id = '';
        this.filterOption.search_key = data?.term ?? '';
        this.fetchCategoryList();
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
    params.set('type', 'parent');
    if (this.filterOption._id) {
      params.set('id_includes', this.filterOption._id);
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
      this.apiService
        .submitPageContent({
          slug: 'home',
          title: 'Home Page Content',
          content: '',
          extra: formData,
        })
        .subscribe({
          next: (res: any) => {
            this.getPage();
            this.formGroup.reset();
            this.formGroup.enable();
            this.toastr.success(`Updated Successfully`);
          },
          error: (err: any) => {
            this.formGroup.enable();
          },
        });
    }
  }
  getPage() {
    this.apiService.getPage('home').subscribe({
      next: (res: any) => {
        const pageData = res?.data;
        this.formGroup.patchValue({
          categories: pageData?.extra?.categories ?? [],
        });
        if (pageData?.extra?.categories?.length) {
          this.filterOption._id = pageData?.extra?.categories.join(',');
        }
        this.fetchCategoryList();
      },
    });
  }
  loadMoreItems() {
    if (this.paginationOption.hasNextPage) {
      this.paginationOption.page = this.paginationOption.nextPage;
      this.fetchCategoryList();
    }
  }
}
