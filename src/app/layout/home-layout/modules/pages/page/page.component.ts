import { Component } from '@angular/core';
import { HelpersService } from '../../../../../core/services/helpers.service';
import { ActivatedRoute } from '@angular/router';
import { PageService } from '../../../../../core/services/page.service';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import * as Global from '../../../../../global';
import { ToastrService } from 'ngx-toastr';
import { Editor, NgxEditorModule } from 'ngx-editor';
import { NgIf, NgFor } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { NgSelectModule } from '@ng-select/ng-select';
import { MenuComponent } from '../../../includes/menu/menu.component';
@Component({
  selector: 'app-page',
  imports: [
    MatIconModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    NgIf,
    MenuComponent,
    NgSelectModule,
    NgxEditorModule,
  ],
  templateUrl: './page.component.html',
  styleUrl: './page.component.scss',
})
export class PageComponent {
  Global = Global;
  pageData: any = null;
  page_type: any = null;
  aboutTextEditor!: Editor;

  bannerForm: FormGroup;
  aboutTextForm: FormGroup;
  middleAboutTextForm!: FormGroup;
  bottomAboutTextForm!: FormGroup;
  careerAboutTextForm!: FormGroup;
  contactUsAboutTextForm!: FormGroup;
  constructor(
    private helperService: HelpersService,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    public toastr: ToastrService,
    private pageService: PageService
  ) {
    this.aboutTextEditor = new Editor();
    this.route.params.subscribe((params) => {
      this.page_type = params['page_type']; // Get the current page_type
      this.fetchPageSiteInfo();
    });
    this.bannerForm = this.fb.group({
      id: [null, Validators.required],
      display_text: [null, Validators.required],
      file: [null],
      file_preview: [null],
    });
    this.aboutTextForm = this.fb.group({
      id: [null, Validators.required],
      heading_txt_1: [null],
      heading_txt: [null, Validators.required],
      description: [''],
      count_data: [null],
      count_data_txt: [null],
      count_data_1_data: [null],
      count_data_1_txt: [null],
      count_data_2_data: [null],
      count_data_2_txt: [null],
      is_fdel: ['n'],
      file: [null],
      file_1: [null],
      file_preview: [null],
      file_preview_1: [null],
    });
    this.middleAboutTextForm = this.fb.group({
      id: [null, Validators.required],
      heading: [null, Validators.required],
      description: ['', Validators.required],
      button_name: [null],
      details_link: [null],
    });
    this.careerAboutTextForm = this.fb.group({
      id: [null, Validators.required],
      heading_txt: [null, Validators.required],
      sub_heading_txt: [null, Validators.required],
      role_data: [null, Validators.required],
      role_data_txt: [null, Validators.required],
      location_data: [null, Validators.required],
      location_data_txt: [null, Validators.required],
      txt_heading_1: [null, Validators.required],
      text_1: [null, Validators.required],
      hr_email: [null, Validators.required],
    });
    this.contactUsAboutTextForm = this.fb.group({
      id: [null, Validators.required],
      title: [null, Validators.required],
      heading_txt: [null, Validators.required],
      sub_heading_txt: [null, Validators.required],
      phone: [null],
      mobile: [null],
      fax: [null],
      email: [null],
      main_office_address: [null],
      map_link: [null],
    });
    this.initBottomTextForm();
  }
  initBottomTextForm() {
    this.bottomAboutTextForm = this.fb.group({
      id: [null, Validators.required],
      heading: [null],
      sub_heading_txt: [null],
      list_content_title: [null],
      list_content_text_1: [null],
      list_content_1_title: [null],
      list_content_1_text_1: [null],
      list_content_2_title: [null],
      list_content_2_text_1: [null],
      list_content_3_title: [null],
      list_content_3_text_1: [null],
      is_fdel: ['n'],
      is_fdel_1: ['n'],
      is_fdel_2: ['n'],
      is_fdel_3: ['n'],
      file: [null],
      file_1: [null],
      file_2: [null],
      file_3: [null],
      file_preview: [null],
      file_preview_1: [null],
      file_preview_2: [null],
      file_preview_3: [null],
    });
  }
  fetchPageSiteInfo() {
    let params = new URLSearchParams();
    params.set('page_name', this.page_type);
    this.pageService.pageContentInfo(params).subscribe({
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
          heading_txt_1: this.pageData?.about_text?.heading_txt_1 ?? null,
          heading_txt: this.pageData?.about_text?.heading_txt ?? null,
          description:
            this.pageData?.about_text?.description ??
            this.pageData?.about_text?.sub_heading_txt ??
            null,
          file_preview: this.pageData?.about_text?.file_path
            ? Global.BACKEND_URL + this.pageData?.about_text?.file_path
            : null,
          file_preview_1: this.pageData?.about_text?.file_path_1
            ? Global.BACKEND_URL + this.pageData?.about_text?.file_path_1
            : null,
          is_fdel: 'n',
          count_data: this.pageData?.about_text?.count_data?.label_count,
          count_data_txt: this.pageData?.about_text?.count_data?.label_name,
          count_data_1_data:
            this.pageData?.about_text?.count_data_1?.label_count,
          count_data_1_txt: this.pageData?.about_text?.count_data_1?.label_name,
          count_data_2_data:
            this.pageData?.about_text?.count_data_2?.label_count,
          count_data_2_txt: this.pageData?.about_text?.count_data_2?.label_name,
        });
        this.middleAboutTextForm.patchValue({
          id: this.pageData?.middle_content?.id ?? null,
          heading: this.pageData?.middle_content?.heading ?? null,
          description: this.pageData?.middle_content?.description ?? null,
          button_name: this.pageData?.middle_content?.button_name ?? null,
          details_link: this.pageData?.middle_content?.details_link ?? null,
        });
        this.bottomAboutTextForm.patchValue({
          id: this.pageData?.bottom_content?.id ?? null,
          heading: this.pageData?.bottom_content?.heading ?? null,
          sub_heading_txt:
            this.pageData?.bottom_content?.sub_heading_txt ?? null,

          list_content_title:
            this.pageData?.bottom_content?.list_content?.title,
          list_content_text_1:
            this.pageData?.bottom_content?.list_content?.text_1,
          list_content_1_title:
            this.pageData?.bottom_content?.list_content_1?.title,
          list_content_1_text_1:
            this.pageData?.bottom_content?.list_content_1?.text_1,
          list_content_2_title:
            this.pageData?.bottom_content?.list_content_2?.title,
          list_content_2_text_1:
            this.pageData?.bottom_content?.list_content_2?.text_1,
          list_content_3_title:
            this.pageData?.bottom_content?.list_content_3?.title,
          list_content_3_text_1:
            this.pageData?.bottom_content?.list_content_3?.text_1,

          is_fdel: 'n',
          is_fdel_1: 'n',
          is_fdel_2: 'n',
          is_fdel_3: 'n',
          file_preview: this.pageData?.bottom_content?.list_content?.file_path
            ? Global.BACKEND_URL +
              this.pageData?.bottom_content?.list_content?.file_path
            : null,
          file_preview_1: this.pageData?.bottom_content?.list_content_1
            ?.file_path
            ? Global.BACKEND_URL +
              this.pageData?.bottom_content?.list_content_1?.file_path
            : null,
          file_preview_2: this.pageData?.bottom_content?.list_content_2
            ?.file_path
            ? Global.BACKEND_URL +
              this.pageData?.bottom_content?.list_content_2?.file_path
            : null,
          file_preview_3: this.pageData?.bottom_content?.list_content_3
            ?.file_path
            ? Global.BACKEND_URL +
              this.pageData?.bottom_content?.list_content_3?.file_path
            : null,
        });
        if (this.page_type === 'career') {
          this.careerAboutTextForm.patchValue({
            id: this.pageData?.about_text?.id ?? null,
            heading_txt: this.pageData?.about_text?.heading_txt ?? null,
            sub_heading_txt: this.pageData?.about_text?.sub_heading_txt ?? null,
            role_data: this.pageData?.about_text?.role?.count
              ? String(this.pageData?.about_text?.role?.count)
              : null,
            role_data_txt: this.pageData?.about_text?.role?.text_name ?? null,
            location_data: this.pageData?.about_text?.location?.count
              ? String(this.pageData?.about_text?.location?.count)
              : null,
            location_data_txt:
              this.pageData?.about_text?.location?.text_name ?? null,
            txt_heading_1: this.pageData?.about_text?.txt_heading_1 ?? null,
            text_1: this.pageData?.about_text?.text_1 ?? null,
            hr_email: this.pageData?.about_text?.hr_email ?? null,
          });
        }
        if (this.page_type === 'contact_us') {
          this.contactUsAboutTextForm.patchValue({
            id: this.pageData?.contact_info?.id ?? null,
            title: this.pageData?.contact_info?.title ?? null,
            heading_txt: this.pageData?.contact_info?.heading_txt ?? null,
            sub_heading_txt:
              this.pageData?.contact_info?.sub_heading_txt ?? null,
            phone: this.pageData?.contact_info?.phone ?? null,
            mobile: this.pageData?.contact_info?.mobile ?? null,
            fax: this.pageData?.contact_info?.fax ?? null,
            email: this.pageData?.contact_info?.email ?? null,
            main_office_address:
              this.pageData?.contact_info?.office_address?.main_office
                ?.address ?? null,
            map_link:
              this.pageData?.contact_info?.office_address?.main_office
                ?.map_link ?? null,
          });
        }
      },
      error: (err: any) => {},
    });
  }
  onBannerSubmit() {
    this.bannerForm.markAllAsTouched();
    if (this.bannerForm.valid) {
      this.bannerForm.disable();
      let formData = this.bannerForm.getRawValue();
      formData.page_name = this.page_type;
      delete formData.file_preview;
      if (!formData?.file) {
        delete formData.file;
      }
      this.pageService.pageContentSaveBanner(formData).subscribe({
        next: (res: any) => {
          this.bannerForm.enable();
          this.bannerForm.reset();
          this.fetchPageSiteInfo();
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
      formData.page_name = this.page_type;
      delete formData.file_preview;
      delete formData.file_preview_1;
      if (!formData?.file) {
        delete formData.file;
      }
      if (!formData?.file_1) {
        delete formData.file_1;
      }
      this.pageService.pageContentSaveText(formData).subscribe({
        next: (res: any) => {
          this.aboutTextForm.reset();

          this.fetchPageSiteInfo();
          this.toastr.success(`Updated Successfully`);
          this.aboutTextForm.enable();
        },
        error: (err: any) => {
          this.aboutTextForm.enable();
        },
      });
    }
  }
  onAwardsTextSubmit() {
    this.aboutTextForm.markAllAsTouched();
    if (this.aboutTextForm.valid) {
      this.aboutTextForm.disable();
      let formData: any = {
        id: this.aboutTextForm.getRawValue().id,
        page_name: this.page_type,
        heading_txt: this.aboutTextForm.getRawValue().heading_txt,
        sub_heading_txt: this.aboutTextForm.getRawValue().description,
      };
      if (this.aboutTextForm.getRawValue()?.file) {
        formData.file = this.aboutTextForm.getRawValue()?.file;
      }
      if (this.aboutTextForm.getRawValue()?.file_1) {
        formData.file_1 = this.aboutTextForm.getRawValue()?.file_1;
      }
      this.pageService.pageContentMediaSaveText(formData).subscribe({
        next: (res: any) => {
          this.aboutTextForm.reset();

          this.fetchPageSiteInfo();
          this.toastr.success(`Updated Successfully`);
          this.aboutTextForm.enable();
        },
        error: (err: any) => {
          this.aboutTextForm.enable();
        },
      });
    }
  }
  onGalleryTextSubmit() {
    this.aboutTextForm.markAllAsTouched();
    if (this.aboutTextForm.valid) {
      this.aboutTextForm.disable();
      let formData: any = {
        id: this.aboutTextForm.getRawValue().id,
        heading_txt: this.aboutTextForm.getRawValue().heading_txt,
      };

      this.pageService.pageContentSaveGalleryText(formData).subscribe({
        next: (res: any) => {
          this.aboutTextForm.reset();

          this.fetchPageSiteInfo();
          this.toastr.success(`Updated Successfully`);
          this.aboutTextForm.enable();
        },
        error: (err: any) => {
          this.aboutTextForm.enable();
        },
      });
    }
  }
  onFAQTextSubmit() {
    this.aboutTextForm.markAllAsTouched();
    if (this.aboutTextForm.valid) {
      this.aboutTextForm.disable();
      let formData = {
        id: this.aboutTextForm.getRawValue().id,
        heading_txt: this.aboutTextForm.getRawValue().heading_txt,
        sub_heading_txt: this.aboutTextForm.getRawValue().description,
      };

      this.pageService.pageContentSaveFaqText(formData).subscribe({
        next: (res: any) => {
          this.aboutTextForm.reset();

          this.fetchPageSiteInfo();
          this.toastr.success(`Updated Successfully`);
          this.aboutTextForm.enable();
        },
        error: (err: any) => {
          this.aboutTextForm.enable();
        },
      });
    }
  } 
  onClienteleTextSubmit() {
    this.aboutTextForm.markAllAsTouched();
    if (this.aboutTextForm.valid) {
      this.aboutTextForm.disable();
      let formData = {
        id: this.aboutTextForm.getRawValue().id,
        heading_txt: this.aboutTextForm.getRawValue().heading_txt,
        sub_heading_txt: this.aboutTextForm.getRawValue().description,
      };

      this.pageService.pageContentSaveClienteleText(formData).subscribe({
        next: (res: any) => {
          this.aboutTextForm.reset();

          this.fetchPageSiteInfo();
          this.toastr.success(`Updated Successfully`);
          this.aboutTextForm.enable();
        },
        error: (err: any) => {
          this.aboutTextForm.enable();
        },
      });
    }
  }
  onContactTextSubmit() {
    this.aboutTextForm.markAllAsTouched();
    if (this.aboutTextForm.valid) {
      this.aboutTextForm.disable();
      let formData = {
        id: this.aboutTextForm.getRawValue().id,
        heading_txt: this.aboutTextForm.getRawValue().heading_txt,
        sub_heading_txt: this.aboutTextForm.getRawValue().description,
      };

      this.pageService.pageContentSaveContactUsText(formData).subscribe({
        next: (res: any) => {
          this.aboutTextForm.reset();

          this.fetchPageSiteInfo();
          this.toastr.success(`Updated Successfully`);
          this.aboutTextForm.enable();
        },
        error: (err: any) => {
          this.aboutTextForm.enable();
        },
      });
    }
  }
  onMiddleTextSubmit() {
    this.middleAboutTextForm.markAllAsTouched();
    if (this.middleAboutTextForm.valid) {
      this.middleAboutTextForm.disable();
      let formData = this.middleAboutTextForm.getRawValue();
      formData.page_name = this.page_type;
      this.pageService.pageContentSaveMiddleText(formData).subscribe({
        next: (res: any) => {
          this.middleAboutTextForm.reset();

          this.fetchPageSiteInfo();
          this.toastr.success(`Updated Successfully`);
          this.middleAboutTextForm.enable();
        },
        error: (err: any) => {
          this.middleAboutTextForm.enable();
        },
      });
    }
  }
  onBottomTextSubmit() {
    this.bottomAboutTextForm.markAllAsTouched();
    if (this.bottomAboutTextForm.valid) {
      this.bottomAboutTextForm.disable();
      let formData = this.bottomAboutTextForm.getRawValue();
      formData.page_name = this.page_type;
      delete formData.file_preview;
      delete formData.file_preview_1;
      delete formData.file_preview_2;
      delete formData.file_preview_3;
      if (!formData?.file) {
        delete formData.file;
      }
      if (!formData?.file_1) {
        delete formData.file_1;
      }
      if (!formData?.file_2) {
        delete formData.file_2;
      }
      if (!formData?.file_3) {
        delete formData.file_3;
      }
      this.pageService.pageContentBottomSaveText(formData).subscribe({
        next: (res: any) => {
          this.bottomAboutTextForm.reset();

          this.fetchPageSiteInfo();
          this.toastr.success(`Updated Successfully`);
          this.bottomAboutTextForm.enable();
        },
        error: (err: any) => {
          this.bottomAboutTextForm.enable();
        },
      });
    }
  }
  onCareerTextSubmit() {
    this.careerAboutTextForm.markAllAsTouched();
    if (this.careerAboutTextForm.valid) {
      this.careerAboutTextForm.disable();
      let formData = this.careerAboutTextForm.getRawValue();

      this.pageService.pageContentSaveCareerText(formData).subscribe({
        next: (res: any) => {
          this.careerAboutTextForm.reset();

          this.fetchPageSiteInfo();
          this.toastr.success(`Updated Successfully`);
          this.careerAboutTextForm.enable();
        },
        error: (err: any) => {
          this.careerAboutTextForm.enable();
        },
      });
    }
  }
  onContactUsInfoTextSubmit() {
    this.contactUsAboutTextForm.markAllAsTouched();
    if (this.contactUsAboutTextForm.valid) {
      this.contactUsAboutTextForm.disable();
      let formData = this.contactUsAboutTextForm.getRawValue();

      this.pageService.pageContentSaveContactUsInfoText(formData).subscribe({
        next: (res: any) => {
          this.contactUsAboutTextForm.reset();

          this.fetchPageSiteInfo();
          this.toastr.success(`Updated Successfully`);
          this.contactUsAboutTextForm.enable();
        },
        error: (err: any) => {
          this.contactUsAboutTextForm.enable();
        },
      });
    }
  }
}
