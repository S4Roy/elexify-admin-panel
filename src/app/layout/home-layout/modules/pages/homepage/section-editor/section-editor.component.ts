import { NgFor, NgIf, NgSwitch, NgSwitchCase, NgTemplateOutlet } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, Optional } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgSelectModule } from '@ng-select/ng-select';
import { Editor, NgxEditorModule } from 'ngx-editor';
import { ToastrService } from 'ngx-toastr';
import * as Global from 'app/global';
import { InventoryService } from 'app/core/services/inventory.service';
import { MediaComponent } from '../../../settings/media/media.component';

export interface SectionEditorData {
  type: string;
  section?: any;
}

// Icon keys the storefront maps 1:1 to lucide-react icons — kept as a fixed
// list so admins can't type an arbitrary string that has no matching icon
// on the storefront side.
const TRUST_BADGE_ICONS: string[] = [
  'store',
  'truck',
  'shield',
  'card',
  'zap',
  'gift',
  'tag',
  'package',
  'headset',
  'clock',
];

const PRODUCT_SOURCE_MODES: { value: string; label: string; hint: string }[] = [
  { value: 'manual', label: 'Manual', hint: 'Hand-pick specific products' },
  {
    value: 'category',
    label: 'Category',
    hint: 'Pull products from a single category',
  },
  { value: 'latest', label: 'Latest', hint: 'Most recently added products' },
  {
    value: 'bestseller',
    label: 'Best Seller',
    hint: 'Products flagged as best sellers',
  },
  {
    value: 'discounted',
    label: 'Discounted',
    hint: 'Products currently on sale',
  },
  {
    value: 'featured',
    label: 'Featured',
    hint: 'Products flagged as featured',
  },
];

const CATEGORY_SOURCE_MODES: { value: string; label: string; hint: string }[] = [
  { value: 'manual', label: 'Manual', hint: 'Hand-pick specific categories' },
  { value: 'all', label: 'All', hint: 'Show every active category' },
];

const HERO_LAYOUTS: { value: string; label: string; hint: string }[] = [
  {
    value: 'split',
    label: 'Split (preview card + main slide)',
    hint: 'Wide screens show a preview card beside the main slide. Needs 2+ slides.',
  },
  { value: 'full', label: 'Full width', hint: 'One full-width slider at every screen size.' },
];

// Recommended creative sizes — must match the aspect ratios the storefront
// renders (HeroSection / PromoBannersSection), or images get cropped.
const PROMO_LAYOUTS: { value: string; label: string; max: number; sizes: string }[] = [
  { value: 'strip', label: 'Full-width strip (1 banner)', max: 1, sizes: 'Desktop 1920×480 (4:1) · Mobile 1080×540 (2:1)' },
  { value: 'grid_2', label: '2 across', max: 2, sizes: '1200×675 (16:9) for both desktop and mobile' },
  { value: 'grid_3', label: '3 across (swipe row on phones)', max: 3, sizes: '1200×900 (4:3)' },
  { value: 'grid_4', label: '4 across (swipe row on phones)', max: 4, sizes: '1000×1000 (1:1)' },
  { value: 'feature_left', label: '1 large + 2 small', max: 3, sizes: 'Banner 1: 1200×1200 (1:1) · Banners 2–3: 1200×600 (2:1)' },
];

const TEXT_POSITIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];

const TEXT_THEMES = [
  { value: 'light', label: 'Light text (for dark images)' },
  { value: 'dark', label: 'Dark text (for light images)' },
];

// Same rule as the backend's safeLink: a site path or an https:// URL.
const LINK_PATTERN = /^(\/[^\s]*|https:\/\/[^\s]+)$/;

const TRANSITION_DIRECTIONS: { value: string; label: string }[] = [
  { value: 'auto', label: 'Auto (follows Next/Back/dot clicked)' },
  { value: 'ltr', label: 'Left to Right' },
  { value: 'rtl', label: 'Right to Left' },
];

@Component({
  selector: 'app-section-editor',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NgFor,
    NgIf,
    NgSwitch,
    NgSwitchCase,
    NgTemplateOutlet,
    MatButtonModule,
    MatDialogModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSliderModule,
    MatTooltipModule,
    NgSelectModule,
    NgxEditorModule,
  ],
  templateUrl: './section-editor.component.html',
  styleUrl: './section-editor.component.scss',
})
export class SectionEditorComponent implements OnInit, OnDestroy {
  Global = Global;
  formGroup!: FormGroup;
  type: string;
  isEdit: boolean;
  editor!: Editor;

  iconOptions = TRUST_BADGE_ICONS;
  productSourceModes = PRODUCT_SOURCE_MODES;
  categorySourceModes = CATEGORY_SOURCE_MODES;
  transitionDirections = TRANSITION_DIRECTIONS;
  heroLayouts = HERO_LAYOUTS;
  promoLayouts = PROMO_LAYOUTS;
  textPositions = TEXT_POSITIONS;
  textThemes = TEXT_THEMES;

  products: any[] = [];
  categories: any[] = [];

  constructor(
    private fb: FormBuilder,
    private inventoryService: InventoryService,
    private dialog: MatDialog,
    private toastr: ToastrService,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: SectionEditorData,
    @Optional() private dialogRef: MatDialogRef<SectionEditorComponent>
  ) {
    this.type = this.data?.type;
    this.isEdit = !!this.data?.section?._id;
    if (this.type === 'content_section') {
      this.editor = new Editor();
    }
    this.initForm();
  }

  ngOnInit(): void {
    if (this.type === 'product_section' || this.type === 'category_section') {
      this.fetchCategories();
    }
    if (this.type === 'product_section') {
      this.fetchProducts();
    }
    if (this.type === 'hero' || this.type === 'promo_banners') {
      this.loadImagePreviews();
    }
  }

  /** Saved slides/banners store media ids only — fetch their URLs in one call for previews. */
  loadImagePreviews() {
    const groups = (this.type === 'hero' ? this.slides : this.banners).controls as FormGroup[];
    const ids = new Set<string>();
    groups.forEach((g) =>
      ['desktop', 'mobile'].forEach((f) => {
        const id = g.get(`${f}_image`)?.value;
        if (id && !g.get(`${f}_image_preview`)?.value) ids.add(id);
      })
    );
    if (!ids.size) return;
    const params = new URLSearchParams({
      id_includes: [...ids].join(','),
      limit: String(ids.size),
    });
    this.inventoryService.mediaList(params).subscribe({
      next: (res: any) => {
        const urls = new Map<string, string>(
          (res?.data?.docs ?? []).map((m: any) => [String(m._id), m.url])
        );
        groups.forEach((g) =>
          ['desktop', 'mobile'].forEach((f) => {
            const url = urls.get(String(g.get(`${f}_image`)?.value));
            if (url) g.get(`${f}_image_preview`)?.setValue(url, { emitEvent: false });
          })
        );
      },
      error: () => {},
    });
  }

  clearBannerImage(group: FormGroup, field: 'desktop' | 'mobile') {
    group.patchValue({ [`${field}_image`]: null, [`${field}_image_preview`]: null });
    group.markAsDirty();
  }

  /** Preview box aspect for a promo banner, matching the storefront tile. */
  promoAspect(index: number): string {
    switch (this.promoLayout.value) {
      case 'strip':
        return '4 / 1';
      case 'grid_3':
        return '4 / 3';
      case 'grid_4':
        return '1 / 1';
      case 'feature_left':
        return index === 0 ? '1 / 1' : '2 / 1';
      default:
        return '16 / 9';
    }
  }

  ngOnDestroy(): void {
    this.editor?.destroy();
  }

  get typeLabel(): string {
    return Global.humanize(this.type ?? '');
  }

  get productSourceModeHint(): string {
    const value = this.formGroup?.get('source_mode')?.value;
    return this.productSourceModes.find((m) => m.value === value)?.hint ?? '';
  }

  get categorySourceModeHint(): string {
    const value = this.formGroup?.get('cat_source_mode')?.value;
    return this.categorySourceModes.find((m) => m.value === value)?.hint ?? '';
  }

  // ── Init ───────────────────────────────────────────────────────────────
  initForm() {
    const section = this.data?.section;
    const config = section?.config ?? {};

    this.formGroup = this.fb.group({
      title: [section?.title ?? ''],
      subtitle: [section?.subtitle ?? ''],
      enabled: [section?.enabled ?? true],
      schedule_start: [this.toDatetimeLocal(section?.schedule?.startAt)],
      schedule_end: [this.toDatetimeLocal(section?.schedule?.endAt)],
    });

    switch (this.type) {
      case 'hero':
        this.formGroup.addControl('layout', this.fb.control(config.layout ?? 'split'));
        this.formGroup.addControl(
          'slides',
          this.fb.array((config.slides ?? []).map((s: any) => this.newSlide(s)))
        );
        this.formGroup.addControl('autoplay', this.fb.control(config.autoplay ?? true));
        this.formGroup.addControl(
          'autoplay_interval_ms',
          this.fb.control(config.autoplay_interval_ms ?? 4000, [
            Validators.min(1000),
            Validators.max(20000),
          ])
        );
        this.formGroup.addControl(
          'autoplay_pause_on_hover',
          this.fb.control(config.autoplay_pause_on_hover ?? true)
        );
        this.formGroup.addControl(
          'left_autoplay',
          this.fb.control(config.left_autoplay ?? true)
        );
        this.formGroup.addControl(
          'left_autoplay_interval_ms',
          this.fb.control(config.left_autoplay_interval_ms ?? 4000, [
            Validators.min(1000),
            Validators.max(20000),
          ])
        );
        this.formGroup.addControl(
          'transition_direction',
          this.fb.control(config.transition_direction ?? 'auto')
        );
        break;
      case 'product_section':
        this.formGroup.addControl(
          'source_mode',
          this.fb.control(config.source_mode ?? 'latest', Validators.required)
        );
        this.formGroup.addControl(
          'product_ids',
          this.fb.control(config.product_ids ?? [])
        );
        this.formGroup.addControl(
          'category_id',
          this.fb.control(config.category_id ?? null)
        );
        this.formGroup.addControl(
          'limit',
          this.fb.control(config.limit ?? 10, [
            Validators.required,
            Validators.min(1),
          ])
        );
        this.formGroup.addControl('sort_by', this.fb.control(config.sort_by ?? null));
        this.formGroup.addControl(
          'sort_order',
          this.fb.control(config.sort_order ?? null)
        );
        this.formGroup.addControl(
          'view_all_link',
          this.fb.control(config.view_all_link ?? '')
        );
        this.formGroup.addControl(
          'countdown_end_at',
          this.fb.control(this.toDatetimeLocal(config.countdown_end_at))
        );
        this.formGroup.addControl(
          'badge_icon',
          this.fb.control(config.badge_icon ?? '')
        );
        break;
      case 'category_section':
        this.formGroup.addControl(
          'cat_source_mode',
          this.fb.control(config.source_mode ?? 'manual', Validators.required)
        );
        this.formGroup.addControl(
          'category_ids',
          this.fb.control(config.category_ids ?? [])
        );
        this.formGroup.addControl(
          'cat_limit',
          this.fb.control(config.limit ?? 6, [
            Validators.required,
            Validators.min(1),
          ])
        );
        break;
      case 'trust_badges':
        this.formGroup.addControl(
          'items',
          this.fb.array((config.items ?? []).map((i: any) => this.newTrustBadge(i)))
        );
        break;
      case 'promo_banners':
        this.formGroup.addControl('promo_layout', this.fb.control(config.layout ?? 'grid_2'));
        this.formGroup.addControl(
          'banners',
          this.fb.array((config.items ?? []).map((b: any) => this.newPromoBanner(b)))
        );
        break;
      case 'cta_banner':
        this.formGroup.addControl(
          'cta_heading',
          this.fb.control(config.heading ?? '')
        );
        this.formGroup.addControl(
          'cta_description',
          this.fb.control(config.description ?? '')
        );
        this.formGroup.addControl(
          'button_label',
          this.fb.control(config.button_label ?? '')
        );
        this.formGroup.addControl(
          'button_link',
          this.fb.control(config.button_link ?? '')
        );
        this.formGroup.addControl(
          'show_newsletter_panel',
          this.fb.control(config.show_newsletter_panel ?? true)
        );
        break;
      case 'content_section':
        this.formGroup.addControl(
          'content_heading',
          this.fb.control(config.heading ?? '')
        );
        this.formGroup.addControl('body', this.fb.control(config.body ?? ''));
        break;
    }
  }

  // ── Hero slides ────────────────────────────────────────────────────────
  get slides(): FormArray {
    return this.formGroup.get('slides') as FormArray;
  }

  newSlide(value: any = null): FormGroup {
    return this.fb.group({
      desktop_image: [value?.desktop_image ?? null],
      desktop_image_preview: [null as string | null],
      mobile_image: [value?.mobile_image ?? null],
      mobile_image_preview: [null as string | null],
      heading: [value?.heading ?? ''],
      description: [value?.description ?? ''],
      primary_cta_label: [value?.primary_cta?.label ?? ''],
      primary_cta_link: [value?.primary_cta?.link ?? ''],
      secondary_cta_label: [value?.secondary_cta?.label ?? ''],
      secondary_cta_link: [value?.secondary_cta?.link ?? ''],
      ...this.presentationControls({ text_position: 'center', ...value }),
      overlay_opacity: [
        value?.overlay_opacity ?? 0.4,
        [Validators.min(0), Validators.max(1)],
      ],
      enabled: [value?.enabled ?? true],
      schedule_start: [this.toDatetimeLocal(value?.schedule?.startAt)],
      schedule_end: [this.toDatetimeLocal(value?.schedule?.endAt)],
    });
  }

  addSlide() {
    this.slides.push(this.newSlide());
  }

  removeSlide(index: number) {
    this.slides.removeAt(index);
  }

  /** Swap an entry with its neighbour — order is saved as the array index. */
  move(array: FormArray, index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= array.length) return;
    const control = array.at(index);
    array.removeAt(index);
    array.insert(target, control);
    array.markAsDirty();
  }

  /** Fields shared by hero slides and promo banners. */
  presentationControls(value: any = null) {
    return {
      link: [value?.link ?? '', Validators.pattern(LINK_PATTERN)],
      alt_text: [value?.alt_text ?? '', Validators.maxLength(150)],
      eyebrow: [value?.eyebrow ?? '', Validators.maxLength(40)],
      text_position: [value?.text_position ?? null],
      text_theme: [value?.text_theme ?? 'light'],
    };
  }

  presentationPayload(v: any) {
    return {
      link: v.link?.trim() || '',
      alt_text: v.alt_text?.trim() || '',
      eyebrow: v.eyebrow?.trim() || '',
      ...(v.text_position ? { text_position: v.text_position } : {}),
      text_theme: v.text_theme || 'light',
    };
  }

  // ── Promo banners ─────────────────────────────────────────────────────
  get banners(): FormArray {
    return this.formGroup.get('banners') as FormArray;
  }

  get promoLayout() {
    const value = this.formGroup?.get('promo_layout')?.value;
    return this.promoLayouts.find((l) => l.value === value) ?? this.promoLayouts[1];
  }

  newPromoBanner(value: any = null): FormGroup {
    return this.fb.group({
      desktop_image: [value?.desktop_image ?? null],
      desktop_image_preview: [null as string | null],
      mobile_image: [value?.mobile_image ?? null],
      mobile_image_preview: [null as string | null],
      heading: [value?.heading ?? '', Validators.maxLength(80)],
      subheading: [value?.subheading ?? '', Validators.maxLength(150)],
      cta_label: [value?.cta_label ?? '', Validators.maxLength(40)],
      ...this.presentationControls({ text_position: 'left', ...value }),
      overlay_opacity: [value?.overlay_opacity ?? 0.35, [Validators.min(0), Validators.max(1)]],
      enabled: [value?.enabled ?? true],
      schedule_start: [this.toDatetimeLocal(value?.schedule?.startAt)],
      schedule_end: [this.toDatetimeLocal(value?.schedule?.endAt)],
    });
  }

  addPromoBanner() {
    if (this.banners.length >= 8) return;
    this.banners.push(this.newPromoBanner());
  }

  removePromoBanner(index: number) {
    this.banners.removeAt(index);
  }

  chooseSlideImage(index: number, field: 'desktop' | 'mobile') {
    this.chooseBannerImage(this.slides.at(index) as FormGroup, field);
  }

  chooseBannerImage(slideGroup: FormGroup, field: 'desktop' | 'mobile') {
    const currentId = slideGroup.get(
      field === 'desktop' ? 'desktop_image' : 'mobile_image'
    )?.value;
    this.dialog
      .open(MediaComponent, {
        disableClose: true,
        width: '80%',
        height: '80%',
        data: {
          ref_type: 'banners',
          multiple: false,
          image_only: true,
          selectedFiles: currentId ? [{ _id: currentId }] : [],
        },
      })
      .afterClosed()
      .subscribe((res: any) => {
        const file = res?.[0];
        if (!file) return;
        if (field === 'desktop') {
          slideGroup.patchValue({
            desktop_image: file._id,
            desktop_image_preview: file.url ?? null,
          });
        } else {
          slideGroup.patchValue({
            mobile_image: file._id,
            mobile_image_preview: file.url ?? null,
          });
        }
      });
  }

  // ── Trust badge items ─────────────────────────────────────────────────
  get items(): FormArray {
    return this.formGroup.get('items') as FormArray;
  }

  newTrustBadge(value: any = null): FormGroup {
    return this.fb.group({
      icon: [value?.icon ?? this.iconOptions[0], Validators.required],
      label: [value?.label ?? ''],
      sub: [value?.sub ?? ''],
    });
  }

  addTrustBadge() {
    this.items.push(this.newTrustBadge());
  }

  removeTrustBadge(index: number) {
    this.items.removeAt(index);
  }

  // ── Dropdown data ─────────────────────────────────────────────────────
  fetchProducts() {
    this.inventoryService
      .productList(new URLSearchParams({ all: 'true' }))
      .subscribe({
        next: (res: any) => (this.products = res?.data ?? []),
        error: () => {},
      });
  }

  fetchCategories() {
    this.inventoryService
      .categoryList(new URLSearchParams({ all: 'true' }))
      .subscribe({
        next: (res: any) => (this.categories = res?.data ?? []),
        error: () => {},
      });
  }

  // ── Date helpers ──────────────────────────────────────────────────────
  toDatetimeLocal(iso?: string | null): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  }

  fromDatetimeLocal(val?: string | null): string | null {
    if (!val) return null;
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  // ── Submit ────────────────────────────────────────────────────────────
  buildConfig(raw: any): any {
    switch (this.type) {
      case 'hero':
        return {
          layout: raw.layout ?? 'split',
          autoplay: raw.autoplay ?? true,
          autoplay_interval_ms: raw.autoplay_interval_ms ?? 4000,
          autoplay_pause_on_hover: raw.autoplay_pause_on_hover ?? true,
          left_autoplay: raw.left_autoplay ?? true,
          left_autoplay_interval_ms: raw.left_autoplay_interval_ms ?? 4000,
          transition_direction: raw.transition_direction ?? 'auto',
          slides: (raw.slides ?? []).map((s: any, i: number) => ({
            desktop_image: s.desktop_image || null,
            mobile_image: s.mobile_image || null,
            heading: s.heading || '',
            description: s.description || '',
            primary_cta: {
              label: s.primary_cta_label || '',
              link: s.primary_cta_link || '',
            },
            secondary_cta: {
              label: s.secondary_cta_label || '',
              link: s.secondary_cta_link || '',
            },
            ...this.presentationPayload(s),
            overlay_opacity: s.overlay_opacity ?? 0.4,
            order: i,
            enabled: s.enabled ?? true,
            schedule: {
              startAt: this.fromDatetimeLocal(s.schedule_start),
              endAt: this.fromDatetimeLocal(s.schedule_end),
            },
          })),
        };
      case 'product_section':
        return {
          source_mode: raw.source_mode,
          product_ids: raw.source_mode === 'manual' ? raw.product_ids ?? [] : [],
          category_id: raw.source_mode === 'category' ? raw.category_id : null,
          limit: raw.limit ?? 10,
          sort_by: raw.sort_by || null,
          sort_order: raw.sort_order || null,
          view_all_link: raw.view_all_link || '',
          countdown_end_at: this.fromDatetimeLocal(raw.countdown_end_at),
          badge_icon: raw.badge_icon || '',
        };
      case 'category_section':
        return {
          source_mode: raw.cat_source_mode,
          category_ids:
            raw.cat_source_mode === 'manual' ? raw.category_ids ?? [] : [],
          limit: raw.cat_limit ?? 6,
        };
      case 'trust_badges':
        return {
          items: (raw.items ?? []).map((i: any) => ({
            icon: i.icon,
            label: i.label || '',
            sub: i.sub || '',
          })),
        };
      case 'promo_banners':
        return {
          layout: raw.promo_layout ?? 'grid_2',
          items: (raw.banners ?? []).map((b: any, i: number) => ({
            desktop_image: b.desktop_image || null,
            mobile_image: b.mobile_image || null,
            heading: b.heading?.trim() || '',
            subheading: b.subheading?.trim() || '',
            cta_label: b.cta_label?.trim() || '',
            ...this.presentationPayload(b),
            overlay_opacity: b.overlay_opacity ?? 0.35,
            order: i,
            enabled: b.enabled ?? true,
            schedule: {
              startAt: this.fromDatetimeLocal(b.schedule_start),
              endAt: this.fromDatetimeLocal(b.schedule_end),
            },
          })),
        };
      case 'cta_banner':
        return {
          heading: raw.cta_heading || '',
          description: raw.cta_description || '',
          button_label: raw.button_label || '',
          button_link: raw.button_link || '',
          show_newsletter_panel: raw.show_newsletter_panel ?? true,
        };
      case 'content_section':
        return {
          heading: raw.content_heading || '',
          body: raw.body || '',
        };
      default:
        return {};
    }
  }

  onSubmit() {
    this.formGroup.markAllAsTouched();
    if (this.formGroup.invalid) {
      Global.scrollToQuery('.is-invalid');
      return;
    }
    const raw = this.formGroup.getRawValue();
    if (this.type === 'promo_banners') {
      const missing = (raw.banners ?? []).findIndex(
        (b: any) => !b.desktop_image && !b.mobile_image
      );
      if (missing > -1) {
        this.toastr.error(`Banner ${missing + 1} needs an image`);
        return;
      }
    }
    const payload: any = {
      title: raw.title || null,
      subtitle: raw.subtitle || null,
      enabled: raw.enabled,
      schedule: {
        startAt: this.fromDatetimeLocal(raw.schedule_start),
        endAt: this.fromDatetimeLocal(raw.schedule_end),
      },
      config: this.buildConfig(raw),
    };
    if (!this.isEdit) {
      payload.type = this.type;
    }

    this.formGroup.disable();
    const request$ = this.isEdit
      ? this.inventoryService.homeUpdateSection(this.data.section._id, payload)
      : this.inventoryService.homeAddSection(payload);

    request$.subscribe({
      next: (res: any) => {
        this.toastr.success(
          this.isEdit ? 'Section updated successfully' : 'Section added successfully'
        );
        this.dialogRef?.close(res?.data ?? res);
      },
      error: () => {
        this.formGroup.enable();
      },
    });
  }

  closeDialog() {
    this.dialogRef?.close();
  }
}
