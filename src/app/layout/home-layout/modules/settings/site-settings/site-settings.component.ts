import { NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ApiService } from 'app/core/services/api.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import * as Global from 'src/app/global';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AmountNumberDirective } from 'app/core/directives/amount-number.directive';

@Component({
  selector: 'app-site-settings',
  imports: [
    ReactiveFormsModule,
    NgFor,
    NgIf,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    AmountNumberDirective,
  ],
  templateUrl: './site-settings.component.html',
  styleUrl: './site-settings.component.scss',
})
export class SiteSettingsComponent {
  Global = Global;
  settingsForm: FormGroup;

  constructor(
    private formBuilder: FormBuilder,
    private adminService: ApiService,
    private toastr: ToastrService,
    private spinner: NgxSpinnerService
  ) {
    this.settingsForm = formBuilder.group({
      settings: this.formBuilder.array([]),
    });
  }

  async ngOnInit() {
    await this.fetchSiteSettings();
  }

  fetchSiteSettings({ loading = <boolean>true } = {}) {
    return new Promise((resolve, reject) => {
      if (loading == true) this.spinner.show();
      this.adminService
        .fetchSiteSettings({
          // Payload goes here
        })
        .subscribe(
          (res: any) => {
            if (loading == true) this.spinner.hide();

            const data = res.data;
            if (res.status == 'success') {
              let site_settings = data ?? [];
              site_settings.forEach((setting: any) => {
                this.addFormRows('settings', {
                  label: setting.label,
                  type: setting.type,
                  slug: setting.slug,
                  value: setting.value,
                });
              });

              resolve(true);
            } else {
              this.toastr.error(res.message);
              resolve(false);
            }
          },
          (err) => {
            if (loading == true) this.spinner.hide();
            resolve(false);
          }
        );
    });
  }

  submitSiteSettings(event: any, slug: any) {
    const index = Global.fetchFormGroupIndexOfControl(
      this.settingsForm,
      'settings',
      'slug',
      slug
    );
    if (index !== false) {
      let control =
        Global.getFormGroupArray(this.settingsForm, 'settings')[index] ?? null;
      if (control) {
        control.markAllAsTouched();
        if (control.valid) {
          event.target.classList.add('btn-loading');
          event.target.disabled = true;
          this.adminService
            .updateSiteSettings({
              slug: control?.value?.slug ?? null,
              value: control?.value?.value ?? null,
            })
            .subscribe(async (res) => {
              const data = res.data;
              Global.resetFormGroupArrRow(this.settingsForm, 'settings');
              await this.fetchSiteSettings({ loading: false });
              this.toastr.success(res.message);
            });
        }
      }
    }
  }

  initFormRows(type: any, data: any = null) {
    switch (type) {
      case 'settings':
        return this.formBuilder.group({
          type: [data?.type ?? null],
          label: [data?.label ?? null],
          slug: [data?.slug ?? null, [Validators.required]],
          value: [data?.value ?? null, [Validators.required]],
        });
        break;

      default:
        return this.formBuilder.group({});
        break;
    }
  }

  addFormRows(type: any, data: any = null) {
    const control = <FormArray>this.settingsForm.get(type);
    switch (type) {
      case 'settings':
        control.push(this.initFormRows('settings', data));
        break;
    }
  }
}
