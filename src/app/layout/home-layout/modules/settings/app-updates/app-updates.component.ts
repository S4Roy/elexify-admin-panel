import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ToastrService } from 'ngx-toastr';
import { PermissionDirective } from 'app/core/directives/permission.directive';
import { ApiService } from 'app/core/services/api.service';
import { DialogService } from 'app/core/services/dialog.service';

type Platform = 'android' | 'ios';
const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const compare = (a: string, b: string) => {
  const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  return 0;
};

@Component({
  selector: 'app-app-updates',
  imports: [DatePipe, NgFor, NgIf, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSlideToggleModule, PermissionDirective],
  templateUrl: './app-updates.component.html',
})
export class AppUpdatesComponent implements OnInit {
  readonly platforms: { key: Platform; label: string }[] = [
    { key: 'android', label: 'Android' },
    { key: 'ios', label: 'iOS' },
  ];
  forms: Record<Platform, FormGroup>;
  info: Partial<Record<Platform, any>> = {};
  saving: Partial<Record<Platform, boolean>> = {};
  loading = true;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private toastr: ToastrService,
    private dialogService: DialogService,
  ) {
    const form = () => this.fb.group({
      enabled: [false],
      latest_version: ['0.0.0', [Validators.required, Validators.pattern(VERSION)]],
      minimum_version: ['0.0.0', [Validators.required, Validators.pattern(VERSION)]],
      store_url: [''],
      title: ['', Validators.maxLength(80)],
      message: ['', Validators.maxLength(300)],
      remind_after_hours: [24, [Validators.required, Validators.min(0), Validators.max(720)]],
      show_on_website: [false],
    });
    this.forms = { android: form(), ios: form() };
  }

  ngOnInit() {
    this.api.mobileUpdatePolicies().subscribe({
      next: (res: any) => {
        for (const item of res?.data ?? []) this.apply(item);
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  private apply(item: any) {
    const platform = item.platform as Platform;
    this.info[platform] = item;
    this.forms[platform].reset({
      enabled: item.enabled,
      latest_version: item.latest_version,
      minimum_version: item.minimum_version,
      store_url: item.store_url ?? '',
      title: item.title ?? '',
      message: item.message ?? '',
      remind_after_hours: item.remind_after_hours ?? 24,
      show_on_website: item.show_on_website ?? false,
    });
  }

  /** Plain-language summary of what users on each version will see. */
  summary(platform: Platform): string {
    const v = this.forms[platform].value;
    if (!v.enabled) return 'Off — no update prompts are shown.';
    if (!VERSION.test(v.latest_version) || !VERSION.test(v.minimum_version)) return 'Enter valid versions.';
    const forced = v.minimum_version !== '0.0.0'
      ? `Versions below ${v.minimum_version} must update (cannot skip).`
      : 'No forced update.';
    const optional = compare(v.minimum_version, v.latest_version) < 0
      ? ` Versions ${v.minimum_version} up to below ${v.latest_version} see an optional update with "Later"${Number(v.remind_after_hours) > 0 ? `, offered again after ${v.remind_after_hours}h` : ', shown once per release'}.`
      : '';
    return forced + optional;
  }

  /** Store link customers download from, once it is valid. */
  storeLink(platform: Platform): string | null {
    const url = platform === 'android' ? this.info.android?.store_url : this.forms.ios.value.store_url;
    return url && /^https:\/\//.test(url) ? url : null;
  }

  copyLink(platform: Platform) {
    const url = this.storeLink(platform);
    if (!url) return;
    navigator.clipboard?.writeText(url).then(
      () => this.toastr.success('Download link copied.'),
      () => this.toastr.error('Unable to copy. Select the link and copy it instead.'),
    );
  }

  save(platform: Platform) {
    const form = this.forms[platform];
    form.markAllAsTouched();
    if (form.invalid) return;
    const v = form.getRawValue();
    if (compare(v.minimum_version, v.latest_version) > 0) {
      this.toastr.error('Minimum version cannot be higher than the latest version.');
      return;
    }
    const label = platform === 'ios' ? 'iOS' : 'Android';
    const forcing = v.enabled && v.minimum_version !== '0.0.0'
      && (v.minimum_version !== this.info[platform]?.minimum_version || !this.info[platform]?.live?.enabled);
    if (!forcing) {
      this.persist(platform, v);
      return;
    }
    this.dialogService
      .confirmDialog({
        title: 'Force update?',
        message: `Every ${label} user below ${v.minimum_version} will have to update before they can use the app. Make sure ${v.minimum_version} is live in the store first.`,
        cancelText: 'Cancel',
        saveText: 'Force update',
      })
      .subscribe((result: any) => {
        if (result?.confirm) this.persist(platform, v);
      });
  }

  private persist(platform: Platform, v: any) {
    this.saving[platform] = true;
    this.api.updateMobileUpdatePolicy(platform, { ...v, remind_after_hours: Number(v.remind_after_hours) }).subscribe({
      next: (res: any) => {
        this.saving[platform] = false;
        this.apply(res.data);
        this.toastr.success(res?.message || 'Saved.');
      },
      error: () => (this.saving[platform] = false),
    });
  }
}
