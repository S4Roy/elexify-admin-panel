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
import { MatDialog } from '@angular/material/dialog';
import { MediaComponent } from '../../settings/media/media.component';

@Component({
  selector: 'app-why-choose-elexify',
  imports: [
    MatIconModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    NgIf,
    NgSelectModule,
    NgFor,
    CommonModule,
  ],
  templateUrl: './why-choose-elexify.component.html',
  styleUrl: './why-choose-elexify.component.scss',
})
export class WhyChooseElexifyComponent {
  Global = Global;
  formGroup: FormGroup;
  images: any = [];
  paginationOption: PaginationOptions;
  filterOption: FilterOptions;
  searchSubject = new Subject<any>();

  constructor(
    private fb: FormBuilder,
    public toastr: ToastrService,
    private pageService: PageService,
    private inventoryService: InventoryService,
    private apiService: ApiService,
    private dialog: MatDialog
  ) {
    this.getPage();
    this.paginationOption = Global.resetPaginationOptions();
    this.filterOption = Global.resetTableFilterOptions();
    this.formGroup = this.fb.group({
      images: [],
    });
  }
  ngOnInit(): void {
    this.searchSubject
      .pipe(
        debounceTime(300), // Adjust debounce time as needed
        distinctUntilChanged()
      )
      .subscribe((data: any) => {
        this.images = [];
        this.paginationOption = Global.resetPaginationOptions();
        this.filterOption = Global.resetTableFilterOptions();
        this.filterOption._id = '';
        this.filterOption.search_key = data?.term ?? '';
        this.fetchMediaList();
      });
  }
  fetchMediaList() {
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
    if (this.filterOption._id) {
      params.set('id_includes', this.filterOption._id);
    }
    this.inventoryService.mediaList(params).subscribe({
      next: (res: any) => {
        this.images = [...this.images, ...res?.data?.docs];
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
          slug: 'why-elexify',
          title: 'Why Choose Elexify Industries',
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
  chooseFile() {
    this.dialog
      .open(MediaComponent, {
        disableClose: true,
        width: '80%',
        height: '80%',
        data: {
          ref_type: 'why-choose-us',
          multiple: false,
          selectedFiles: [],
        },
      })
      .afterClosed()
      .subscribe((res: any) => {
        if (res) {
          this.images = [];
          let ids = res
            .filter((file: any) => file?._id) // keep only valid ones
            .map((file: any) => file._id) // extract _id
            .join(',');

          this.filterOption._id = ids;

          this.fetchMediaList();
        }
      });
  }
  getPage() {
    this.apiService.getPage('why-elexify').subscribe({
      next: (res: any) => {
        const pageData = res?.data;
        this.formGroup.patchValue({
          images: pageData?.extra?.images ?? [],
        });
        this.filterOption._id = pageData?.extra?.images.join(',');
        this.fetchMediaList();
      },
    });
  }
  loadMoreItems() {
    if (this.paginationOption.hasNextPage) {
      this.paginationOption.page = this.paginationOption.nextPage;
      this.fetchMediaList();
    }
  }
}
