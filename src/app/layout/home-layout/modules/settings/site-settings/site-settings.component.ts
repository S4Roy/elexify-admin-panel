import { NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from 'app/core/services/api.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import * as Global from 'src/app/global';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MediaComponent } from '../media/media.component';

// Settings whose value is a media URL rather than free text — rendered
// with the media picker instead of a plain input. Value is the picker mode:
// 'video' locks the picker to videos only, 'image' leaves it at the
// default image-only behavior.
const MEDIA_SETTING_SLUGS: Record<string, 'image' | 'video'> = {
  homepage_video_url: 'video',
  homepage_video_poster_url: 'image',
};

// Section headers — keyed by the backend's `type` field (see
// DbSeedingController.js's settings catalog for the canonical list).
// Order here is display order; any future `type` not listed falls back to
// its raw value (with a generic icon) and is appended at the end rather
// than disappearing.
//
// Ported from RudrakshaValley's site-settings page minus `cart_settings`/
// `currency_settings` — those back an abandoned-cart reminder job and an
// IP-based currency-detection fallback, neither of which exists anywhere
// in Elexify's backend — and minus `consultation_fee`, which priced RV's
// rudraksha/astrology consultation bookings and isn't a concept an
// electronics store has any use for. Seeding/exposing any of these would
// just give an admin a working-looking control with no code behind it.
const SECTION_META: Record<string, { label: string; icon: string }> = {
  site_info: { label: 'Site Info', icon: 'info' },
  contact_info: { label: 'Contact Info', icon: 'contact_phone' },
  social_links: { label: 'Social Links', icon: 'share' },
  homepage: { label: 'Homepage', icon: 'home' },
  product_info: { label: 'Product Settings', icon: 'inventory_2' },
};
const SECTION_ORDER = Object.keys(SECTION_META);

// Settings that are genuinely optional (a blank value is a valid, working
// state) — social links a store may not have set up yet, a secondary
// contact number, and the homepage reel/poster (seeded blank until an
// admin uploads real CDN-hosted media). Everything else stays required:
// leaving e.g. contact_email blank would silently break something on the
// storefront.
const OPTIONAL_SETTING_SLUGS = new Set([
  'social_instagram_url',
  'social_facebook_url',
  'social_youtube_url',
  'contact_mobile_2',
  'homepage_video_url',
  'homepage_video_poster_url',
]);

@Component({
  selector: 'app-site-settings',
  imports: [
    ReactiveFormsModule,
    NgFor,
    NgIf,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatDialogModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './site-settings.component.html',
  styleUrl: './site-settings.component.scss',
})
export class SiteSettingsComponent {
  Global = Global;
  settingsForm: FormGroup;
  mediaSettingSlugs = MEDIA_SETTING_SLUGS;

  constructor(
    private formBuilder: FormBuilder,
    private adminService: ApiService,
    private toastr: ToastrService,
    private spinner: NgxSpinnerService,
    private dialog: MatDialog
  ) {
    this.settingsForm = formBuilder.group({
      settings: this.formBuilder.array([]),
    });
  }

  // Groups the flat settings FormArray into labeled sections by `type`,
  // in SECTION_ORDER — the template renders one card per section instead
  // of one undifferentiated 2-column grid. Each row carries its own index
  // in the underlying FormArray.
  //
  // This is a plain property rebuilt explicitly by rebuildSections()
  // (called whenever the FormArray's rows change), NOT a getter. A getter
  // here would get re-invoked on every change-detection pass, and
  // returning a fresh array of fresh objects each time makes *ngFor's
  // default identity-based diffing see "everything changed" every single
  // cycle — tearing down and re-registering every formGroupName-bound
  // control forever, pinning the main thread.
  sections: {
    label: string;
    icon: string;
    items: { index: number; control: FormGroup }[];
  }[] = [];

  private rebuildSections() {
    const items = Global.getFormGroupArray(
      this.settingsForm,
      'settings'
    ) as FormGroup[];
    const byType = new Map<string, { index: number; control: FormGroup }[]>();
    items.forEach((control, index) => {
      const type = control.get('type')?.value || 'other';
      if (!byType.has(type)) byType.set(type, []);
      byType.get(type)!.push({ index, control });
    });
    const orderedTypes = [
      ...SECTION_ORDER.filter((t) => byType.has(t)),
      ...[...byType.keys()].filter((t) => !SECTION_ORDER.includes(t)),
    ];
    this.sections = orderedTypes.map((type) => ({
      label: SECTION_META[type]?.label || type,
      icon: SECTION_META[type]?.icon || 'settings',
      items: byType.get(type)!,
    }));
  }

  trackSection = (_: number, section: { label: string }) => section.label;
  trackEntry = (_: number, entry: { control: FormGroup }) =>
    entry.control.get('slug')?.value ?? _;

  isOptionalSetting(slug: any): boolean {
    return OPTIONAL_SETTING_SLUGS.has(slug);
  }

  isMediaSetting(slug: any): boolean {
    return slug in this.mediaSettingSlugs;
  }

  // Opens the shared media picker/uploader and writes the selected item's
  // CDN URL into this row's `value` control — mirrors how
  // new-product.component.ts wires image selection into its form. Locks
  // the picker to videos only for slugs mapped to 'video' (e.g. the
  // homepage reel) and to images only for slugs mapped to 'image' (e.g.
  // the reel's poster frame) — explicit both ways rather than relying on
  // the picker's default.
  chooseFile(item: any) {
    const kind = this.mediaSettingSlugs[item.get('slug')?.value];
    this.dialog
      .open(MediaComponent, {
        disableClose: true,
        width: '80%',
        height: '80%',
        data: {
          ref_type: 'site-settings',
          video_only: kind === 'video',
          image_only: kind === 'image',
          multiple: false,
        },
      })
      .afterClosed()
      .subscribe((res: any) => {
        const selected = res?.[0];
        if (selected?.url) {
          item.get('value')?.setValue(selected.url);
          item.get('value')?.markAsDirty();
        }
      });
  }

  async ngOnInit() {
    await this.fetchSiteSettings();
  }

  fetchSiteSettings({ loading = <boolean>true } = {}) {
    return new Promise((resolve, reject) => {
      if (loading == true) this.spinner.show();
      this.adminService
        .fetchSiteSettings(new URLSearchParams())
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
              this.rebuildSections();

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
        const isOptional = OPTIONAL_SETTING_SLUGS.has(data?.slug);
        return this.formBuilder.group({
          type: [data?.type ?? null],
          label: [data?.label ?? null],
          slug: [data?.slug ?? null, [Validators.required]],
          value: [data?.value ?? null, isOptional ? [] : [Validators.required]],
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
