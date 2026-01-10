import { Component } from '@angular/core';
import { InfoCardComponent } from '../../../includes/info-card/info-card.component';
import { TaggedSectionComponent } from '../../../includes/tagged-section/tagged-section.component';
import { MenuComponent } from '../../../includes/menu/menu.component';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { PartnersComponent } from '../../../includes/master/partners/partners.component';
import { PageService } from '../../../../../core/services/page.service';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import * as Global from '../../../../../global';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { Editor, NgxEditorModule } from 'ngx-editor';
@Component({
  selector: 'app-about',
  imports: [
    MatIconModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    NgIf,
    MenuComponent,
    NgSelectModule,
    NgFor,
    NgxEditorModule,
    CommonModule,
  ],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
})
export class AboutComponent {
  Global = Global;
  pageData: any = null;
  bannerForm: FormGroup;
  aboutTextForm: FormGroup;
  partnerForm: FormGroup;
  news_list: any = [];
  partner_list: any = [];
  excellenceForm: FormGroup;
  newsEvetsForm: FormGroup;
  careerCtaForm: FormGroup;
  editor!: Editor;
  constructor(
    private pageService: PageService,
    private fb: FormBuilder,
    public toastr: ToastrService
  ) {
    this.editor = new Editor();
    this.bannerForm = this.fb.group({
      id: [null, Validators.required],
      display_text: [null, Validators.required],
      file: [null],
      file_preview: [null],
    });
    this.aboutTextForm = this.fb.group({
      id: [null, Validators.required],
      title: [null, Validators.required],
      heading_txt: [null, Validators.required],
      sub_heading_txt: [null, Validators.required],
      content: [null, Validators.required],
      is_fdel: ['n'],
      file: [null],
      file_preview: [null],
    });
    this.partnerForm = this.fb.group({
      id: [null, Validators.required],
      display_text: [null, Validators.required],
      parters: [],
    });
    this.excellenceForm = this.fb.group({
      id: [null, Validators.required],
      heading: [null, Validators.required],
      content: [null, Validators.required],
      list_title: [null, Validators.required],
      list_description: [null, Validators.required],
      list_title_1: [null, Validators.required],
      list_description_1: [null, Validators.required],
      list_title_2: [null, Validators.required],
      list_description_2: [null, Validators.required],
      subject: [null, Validators.required],
      description: ['', Validators.required],
      is_fdel: ['n'],
      is_fdel_1: ['n'],
      file: [null],
      file_preview: [null],
      file_1: [null],
      file_1_preview: [null],
    });
    this.newsEvetsForm = this.fb.group({
      id: [null, Validators.required],
      news_event: [null],
    });
    this.careerCtaForm = this.fb.group({
      id: [null, Validators.required],
      heading: [null, Validators.required],
      content: [null, Validators.required],
      botton_txt: [null, Validators.required],
      detail_link: [null, Validators.required],
      files: this.fb.array([]),
      files_preview: this.fb.array([]),
    });
    this.fetchNewsEventsList();
    this.fetchPartnerList();
    this.fetchAboutPage();
  }
  get files(): FormArray {
    return this.careerCtaForm.get('files') as FormArray;
  }
  get files_preview(): FormArray {
    return this.careerCtaForm.get('files_preview') as FormArray;
  }
  fetchAboutPage() {
    this.pageService.fetchAboutPage().subscribe({
      next: (res: any) => {
        this.pageData = res;
        this.bannerForm.patchValue({
          id: this.pageData?.banner?.id ?? null,
          display_text: this.pageData?.banner?.display_text ?? null,
          file_preview: this.pageData?.banner?.file_path
            ? Global.BACKEND_URL + this.pageData?.banner?.file_path
            : null,
          is_fdel: ['n'],
        });
        this.aboutTextForm.patchValue({
          id: this.pageData?.about_text?.id ?? null,
          title: this.pageData?.about_text?.title ?? null,
          heading_txt: this.pageData?.about_text?.heading_txt ?? null,
          sub_heading_txt: this.pageData?.about_text?.sub_heading_txt ?? null,
          content: this.pageData?.about_text?.content ?? null,
          file_preview: this.pageData?.about_text?.file_path
            ? Global.BACKEND_URL + this.pageData?.about_text?.file_path
            : null,
        });
        this.partnerForm.patchValue({
          id: this.pageData?.partner_text?.id ?? null,
          display_text: this.pageData?.partner_text?.display_text ?? null,
          parters: this.pageData?.partner_text?.partner_list ?? [],
        });

        this.excellenceForm.patchValue({
          id: this.pageData?.main_content?.id ?? null,
          heading: this.pageData?.main_content?.heading ?? null,
          content: this.pageData?.main_content?.content ?? null,
          description: this.pageData?.main_content?.description ?? null,
          subject: this.pageData?.main_content?.subject ?? null,
          file_preview: this.pageData?.main_content?.file_path
            ? Global.BACKEND_URL + this.pageData?.main_content?.file_path
            : null,
          file_1_preview: this.pageData?.main_content?.file_path_1
            ? Global.BACKEND_URL + this.pageData?.main_content?.file_path_1
            : null,
          is_fdel: ['n'],
          is_fdel_1: ['n'],
        });
        this.pageData?.main_content?.list_of_content.forEach(
          (element: any, index: number) => {
            switch (index) {
              case 0:
                this.excellenceForm.patchValue({
                  list_title: element?.title,
                  list_description: element?.description,
                });
                break;
              case 1:
                this.excellenceForm.patchValue({
                  list_title_1: element?.title,
                  list_description_1: element?.description,
                });
                break;
              case 2:
                this.excellenceForm.patchValue({
                  list_title_2: element?.title,
                  list_description_2: element?.description,
                });
                break;
              default:
                break;
            }
          }
        );
        this.newsEvetsForm.patchValue({
          id: this.pageData?.news_event?.id ?? null,
          news_event: this.pageData?.news_event?.list ?? [],
        });
        this.files_preview.clear();
        this.pageData?.career_cta?.files?.forEach((file: any) => {
          let url = Global.BACKEND_URL + file?.file_path;
          this.files_preview.push(
            this.fb.group({
              file_path: url,
              id: file?.image_id,
            })
          );
        });
        this.careerCtaForm.patchValue({
          id: this.pageData?.career_cta?.id ?? null,
          botton_txt: this.pageData?.career_cta?.botton_txt ?? null,
          content: this.pageData?.career_cta?.content ?? null,
          detail_link: this.pageData?.career_cta?.detail_link ?? null,
          heading: this.pageData?.career_cta?.heading ?? null,
        });
      },
    });
  }
  onBannerSubmit() {
    this.bannerForm.markAllAsTouched();
    if (this.bannerForm.valid) {
      this.bannerForm.disable();
      let formData = this.bannerForm.getRawValue();
      delete formData.file_preview;
      if (!formData?.file) {
        delete formData.file;
      }
      this.pageService.saveAboutUsBanner(formData).subscribe({
        next: (res: any) => {
          this.fetchAboutPage();
          this.bannerForm.enable();
          this.toastr.success(`Banner Updated Successfully`);
        },
        error: (err: any) => {
          this.bannerForm.enable();
        },
      });
    }
  }
  onTextSubmit() {
    this.aboutTextForm.markAllAsTouched();
    if (this.aboutTextForm.valid) {
      this.aboutTextForm.disable();
      let formData = this.aboutTextForm.getRawValue();
      delete formData.file_preview;
      if (!formData?.file) {
        delete formData.file;
      }
      this.pageService.saveAboutUsText(formData).subscribe({
        next: (res: any) => {
          this.aboutTextForm.reset();

          this.fetchAboutPage();
          this.toastr.success(`Updated Successfully`);
          this.aboutTextForm.enable();
        },
        error: (err: any) => {
          this.aboutTextForm.enable();
        },
      });
    }
  }
  onPartnerSubmit() {
    this.partnerForm.markAllAsTouched();
    if (this.partnerForm.valid) {
      this.partnerForm.disable();
      let formData = this.partnerForm.getRawValue();
      this.pageService.saveAboutUsPartner(formData).subscribe({
        next: (res: any) => {
          this.fetchAboutPage();
          this.partnerForm.reset();
          this.partnerForm.enable();
          this.toastr.success(`Updated Successfully`);
        },
        error: (err: any) => {
          this.partnerForm.enable();
        },
      });
    }
  }
  onNewsEvetsFormSubmit() {
    this.newsEvetsForm.markAllAsTouched();
    if (this.newsEvetsForm.valid) {
      this.newsEvetsForm.disable();
      let formData = this.newsEvetsForm.getRawValue();
      this.pageService.saveAboutUsNewsEvent(formData).subscribe({
        next: (res: any) => {
          this.fetchAboutPage();
          this.newsEvetsForm.reset();
          this.newsEvetsForm.enable();
          this.toastr.success(`Updated Successfully`);
        },
        error: (err: any) => {
          this.newsEvetsForm.enable();
        },
      });
    }
  }
  fetchPartnerList() {
    // let params = new URLSearchParams();
    // params.set('limit', '100');
    this.pageService.partnerList().subscribe({
      next: (res: any) => {
        const { results, limit, page, total_pages, total_records } = res;
        this.partner_list = results ?? [];
      },
      error: (err) => {},
    });
  }
  fetchNewsEventsList() {
    // let params = new URLSearchParams();
    // params.set('limit', '100');
    this.pageService.newsEventsList().subscribe({
      next: (res: any) => {
        const { results, limit, page, total_pages, total_records } = res;
        this.news_list = results ?? [];
      },
      error: (err) => {},
    });
  }
  excellenceFormSubmit() {
    this.excellenceForm.markAllAsTouched();
    if (this.excellenceForm.valid) {
      this.excellenceForm.disable();
      let formData = this.excellenceForm.getRawValue();
      delete formData.file_1_preview;
      delete formData.file_preview;
      if (!formData?.file) {
        delete formData.file;
      }
      if (!formData?.file_1) {
        delete formData.file_1;
      }
      this.pageService.saveAboutUsBuisnessExecellence(formData).subscribe({
        next: (res: any) => {
          this.fetchAboutPage();
          this.excellenceForm.reset();
          this.excellenceForm.enable();
          this.toastr.success(`Updated Successfully`);
        },
        error: (err: any) => {
          this.excellenceForm.enable();
        },
      });
    }
  }
  onCareerCtaFormSubmit() {
    this.careerCtaForm.markAllAsTouched();

    if (this.careerCtaForm.valid) {
      this.careerCtaForm.disable();
      let rawformData = this.careerCtaForm.getRawValue();
      delete rawformData.files;
      delete rawformData.files_preview;
      let formData: FormData = new FormData();
      for (let key in rawformData) {
        formData.append(key, rawformData[key]);
      }
      if (this.files.value?.length) {
        for (let i = 0; i < this.files.value.length; i++) {
          const file = this.files.value[i]; // Get the file at the current index
          // const key = `files[${i}]`; // Create a unique key for each file

          // Append the file to FormData
          formData.append('files', file);
        }
      }
      this.pageService.saveCareerCta(formData).subscribe({
        next: (res: any) => {
          this.fetchAboutPage();
          this.careerCtaForm.reset();
          this.careerCtaForm.enable();
          this.toastr.success(`Updated Successfully`);
        },
        error: (err: any) => {
          this.careerCtaForm.enable();
        },
      });
    }
  }
  deleteItem(item: any) {
    this.careerCtaForm.reset();
    this.files.clear();
    this.files_preview.clear();
    this.pageService
      .deleteCareerCtaImage({
        id: item.id,
        setting_id: this.pageData?.career_cta?.id,
      })
      .subscribe({
        next: (res: any) => {
          this.toastr.success(`Deleted Successfully`);
          this.fetchAboutPage();
        },
        error: (err: any) => {},
      });
  }
}
