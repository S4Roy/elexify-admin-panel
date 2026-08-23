import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import { InventoryService } from 'app/core/services/inventory.service';
import { DialogService } from 'app/core/services/dialog.service';
import { ConfirmDialogData } from 'app/layout/home-layout/includes/confirm-dialog/confirm-dialog.component';

const ROBOTS_OPTIONS = [
  { value: 'index,follow', label: 'Index, Follow (default — recommended)' },
  { value: 'noindex,follow', label: 'No Index, Follow' },
  { value: 'index,nofollow', label: 'Index, No Follow' },
  { value: 'noindex,nofollow', label: 'No Index, No Follow' },
];

@Component({
  selector: 'app-product-seo',
  imports: [
    ReactiveFormsModule,
    NgIf,
    NgFor,
    NgClass,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatCheckboxModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  templateUrl: './product-seo.component.html',
  styleUrl: './product-seo.component.scss',
})
export class ProductSeoComponent implements OnChanges {
  @Input() data: any;

  robotsOptions = ROBOTS_OPTIONS;
  formGroup!: FormGroup;
  loading = false;
  saving = false;
  generating = false;
  regenerating = false;
  loaded = false;

  seo: any = null;
  score: any = null;

  settings: any = {
    title_min_length: 50,
    title_max_length: 60,
    description_min_length: 140,
    description_max_length: 160,
  };
  private settingsLoaded = false;
  private lastProductId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private inventoryService: InventoryService,
    private dialogService: DialogService
  ) {
    this.formGroup = this.fb.group({
      meta_title: [''],
      meta_description: [''],
      meta_keywords: [''],
      focus_keyword: [''],
      canonical_url: [''],
      robots: ['index,follow'],
      schema_enabled: [true],
      og_title: [''],
      og_description: [''],
      og_image: [''],
      twitter_title: [''],
      twitter_description: [''],
      twitter_image: [''],
    });
  }

  get productId(): string | null {
    return this.data?._id ?? null;
  }

  get productName(): string {
    return this.data?.name ?? '';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      if (this.productId && this.productId !== this.lastProductId) {
        this.lastProductId = this.productId;
        this.fetchSeo();
        if (!this.settingsLoaded) {
          this.fetchSettings();
        }
      }
    }
  }

  fetchSettings() {
    this.inventoryService.seoSettingsGet().subscribe({
      next: (res: any) => {
        if (res?.data) {
          this.settings = { ...this.settings, ...res.data };
        }
        this.settingsLoaded = true;
      },
      error: () => {
        this.settingsLoaded = true;
      },
    });
  }

  fetchSeo() {
    if (!this.productId) return;
    this.loading = true;
    this.inventoryService.productSeoGet(this.productId).subscribe({
      next: (res: any) => {
        this.applyResponse(res?.data);
        this.loading = false;
        this.loaded = true;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  applyResponse(data: any) {
    this.seo = data?.seo ?? null;
    this.score = data?.score ?? null;
    if (this.seo) {
      this.formGroup.patchValue({
        meta_title: this.seo.meta_title ?? '',
        meta_description: this.seo.meta_description ?? '',
        meta_keywords: Array.isArray(this.seo.meta_keywords)
          ? this.seo.meta_keywords.join(', ')
          : this.seo.meta_keywords ?? '',
        focus_keyword: this.seo.focus_keyword ?? '',
        canonical_url: this.seo.canonical_url ?? '',
        robots: this.seo.robots ?? 'index,follow',
        schema_enabled: this.seo.schema_enabled ?? true,
        og_title: this.seo.og_title ?? '',
        og_description: this.seo.og_description ?? '',
        og_image: this.seo.og_image ?? '',
        twitter_title: this.seo.twitter_title ?? '',
        twitter_description: this.seo.twitter_description ?? '',
        twitter_image: this.seo.twitter_image ?? '',
      });
    }
  }

  get slug(): string {
    const canonical = this.formGroup?.get('canonical_url')?.value ?? '';
    if (!canonical) return '';
    const parts = String(canonical).split('/').filter(Boolean);
    return parts[parts.length - 1] ?? '';
  }

  get titleLength(): number {
    return (this.formGroup.get('meta_title')?.value ?? '').length;
  }
  get descriptionLength(): number {
    return (this.formGroup.get('meta_description')?.value ?? '').length;
  }

  lengthStatus(
    length: number,
    min: number,
    max: number
  ): 'good' | 'warn' | 'bad' {
    if (length === 0) return 'bad';
    if (length >= min && length <= max) return 'good';
    // "close" to the range on either side
    const margin = Math.max(5, Math.round((max - min) * 0.15));
    if (length < min && length >= min - margin) return 'warn';
    if (length > max && length <= max + margin) return 'warn';
    return 'bad';
  }

  get titleStatus(): 'good' | 'warn' | 'bad' {
    return this.lengthStatus(
      this.titleLength,
      this.settings.title_min_length,
      this.settings.title_max_length
    );
  }
  get descriptionStatus(): 'good' | 'warn' | 'bad' {
    return this.lengthStatus(
      this.descriptionLength,
      this.settings.description_min_length,
      this.settings.description_max_length
    );
  }

  private containsKeyword(haystack: string, keyword: string): boolean {
    if (!keyword || !haystack) return false;
    return haystack.toLowerCase().includes(keyword.trim().toLowerCase());
  }

  get focusKeyword(): string {
    return (this.formGroup.get('focus_keyword')?.value ?? '').trim();
  }

  get keywordInTitle(): boolean {
    return this.containsKeyword(
      this.formGroup.get('meta_title')?.value ?? '',
      this.focusKeyword
    );
  }
  get keywordInDescription(): boolean {
    return this.containsKeyword(
      this.formGroup.get('meta_description')?.value ?? '',
      this.focusKeyword
    );
  }
  get keywordInProductName(): boolean {
    return this.containsKeyword(this.productName, this.focusKeyword);
  }
  get keywordInSlug(): boolean {
    return this.containsKeyword(this.slug.replace(/-/g, ' '), this.focusKeyword);
  }

  scoreChipClass(status: string): string {
    switch (status) {
      case 'Good':
        return 'chip chip-good';
      case 'Needs Improvement':
        return 'chip chip-warn';
      case 'Poor':
        return 'chip chip-bad';
      default:
        return 'chip';
    }
  }

  buildPayload() {
    const raw = this.formGroup.getRawValue();
    return {
      meta_title: raw.meta_title,
      meta_description: raw.meta_description,
      meta_keywords: raw.meta_keywords,
      focus_keyword: raw.focus_keyword,
      canonical_url: raw.canonical_url,
      robots: raw.robots,
      schema_enabled: raw.schema_enabled,
      og_title: raw.og_title,
      og_description: raw.og_description,
      og_image: raw.og_image,
      twitter_title: raw.twitter_title,
      twitter_description: raw.twitter_description,
      twitter_image: raw.twitter_image,
    };
  }

  onSave() {
    if (!this.productId) return;
    this.saving = true;
    this.inventoryService
      .productSeoUpdate(this.productId, this.buildPayload())
      .subscribe({
        next: (res: any) => {
          this.saving = false;
          this.applyResponse(res?.data);
          this.toastr.success(res?.message ?? 'SEO details saved');
        },
        error: () => {
          this.saving = false;
        },
      });
  }

  onGenerate() {
    if (!this.productId) return;
    this.generating = true;
    this.inventoryService.productSeoGenerate(this.productId, false).subscribe({
      next: (res: any) => {
        this.generating = false;
        this.applyResponse(res?.data);
        this.toastr.success(res?.message ?? 'SEO details generated');
      },
      error: () => {
        this.generating = false;
      },
    });
  }

  onRegenerate() {
    if (!this.productId) return;
    const dialogData: ConfirmDialogData = {
      title: 'Regenerate & Replace?',
      message:
        'This will overwrite the current meta title, description and other generated SEO fields — including any values you edited manually. This cannot be undone.',
      cancelText: 'Cancel',
      saveText: 'Regenerate & Replace',
    };
    this.dialogService.confirmDialog(dialogData).subscribe((result: any) => {
      if (!result?.confirm) return;
      this.regenerating = true;
      this.inventoryService
        .productSeoGenerate(this.productId as string, true)
        .subscribe({
          next: (res: any) => {
            this.regenerating = false;
            this.applyResponse(res?.data);
            this.toastr.success(res?.message ?? 'SEO details regenerated');
          },
          error: () => {
            this.regenerating = false;
          },
        });
    });
  }
}
