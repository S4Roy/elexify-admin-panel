import { NgFor, NgIf } from '@angular/common';
import { Component, Inject, OnInit, Optional } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { NgSelectModule } from '@ng-select/ng-select';
import { InventoryService } from 'app/core/services/inventory.service';
import { SettingsService } from 'app/core/services/settings.service';
import { MediaComponent } from 'app/layout/home-layout/modules/settings/media/media.component';

export interface MegaMenuEditorData {
  content?: any | null;
}

const LINK_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'internal_page', label: 'Internal Page' },
  { value: 'product', label: 'Product' },
  { value: 'category', label: 'Category' },
  { value: 'collection', label: 'Collection' },
  { value: 'blog', label: 'Blog' },
  { value: 'custom_url', label: 'Custom URL' },
  { value: 'external_url', label: 'External URL' },
];

const REFERENCE_TYPES = ['internal_page', 'product', 'category', 'collection', 'blog'];
const MANUAL_REFERENCE_TYPES = ['internal_page', 'collection'];

@Component({
  selector: 'app-mega-menu-editor',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    NgSelectModule,
  ],
  templateUrl: './mega-menu-editor.component.html',
  styleUrl: './mega-menu-editor.component.scss',
})
export class MegaMenuEditorComponent implements OnInit {
  linkTypeOptions = LINK_TYPE_OPTIONS;
  formGroup: FormGroup;

  products: any[] = [];
  categories: any[] = [];
  blogs: any[] = [];

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private inventoryService: InventoryService,
    private settingsService: SettingsService,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: MegaMenuEditorData,
    @Optional() private dialogRef: MatDialogRef<MegaMenuEditorComponent>
  ) {
    const content = this.data?.content;
    this.formGroup = this.fb.group({
      layout: [content?.layout ?? 'columns'],
      columns: this.fb.array(
        (content?.columns ?? []).map((c: any) => this.newColumn(c))
      ),
      promo_image: [content?.promo?.image ?? null],
      promo_heading: [content?.promo?.heading ?? ''],
      promo_subtext: [content?.promo?.subtext ?? ''],
      promo_link: [content?.promo?.link ?? ''],
    });
  }

  ngOnInit(): void {
    this.fetchProducts();
    this.fetchCategories();
    this.fetchBlogs();
  }

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

  fetchBlogs() {
    this.settingsService.blogList(new URLSearchParams({ all: 'true' })).subscribe({
      next: (res: any) => (this.blogs = res?.data?.docs ?? res?.data ?? []),
      error: () => {},
    });
  }

  // ── Columns ───────────────────────────────────────────────────────────
  get columns(): FormArray {
    return this.formGroup.get('columns') as FormArray;
  }

  newColumn(value: any = null): FormGroup {
    return this.fb.group({
      heading: [value?.heading ?? ''],
      links: this.fb.array((value?.links ?? []).map((l: any) => this.newLink(l))),
    });
  }

  addColumn() {
    this.columns.push(this.newColumn());
  }

  removeColumn(index: number) {
    this.columns.removeAt(index);
  }

  linksOf(columnIndex: number): FormArray {
    return this.columns.at(columnIndex).get('links') as FormArray;
  }

  // ── Links ─────────────────────────────────────────────────────────────
  newLink(value: any = null): FormGroup {
    return this.fb.group({
      label: [value?.label ?? ''],
      type: [value?.type ?? 'custom_url'],
      reference_id: [value?.reference_id ?? null],
      custom_url: [value?.custom_url ?? ''],
      badge_text: [value?.badge?.text ?? ''],
      badge_color: [value?.badge?.color ?? ''],
    });
  }

  addLink(columnIndex: number) {
    this.linksOf(columnIndex).push(this.newLink());
  }

  removeLink(columnIndex: number, linkIndex: number) {
    this.linksOf(columnIndex).removeAt(linkIndex);
  }

  linkNeedsReference(link: FormGroup): boolean {
    return REFERENCE_TYPES.includes(link.get('type')?.value);
  }

  linkNeedsManualReference(link: FormGroup): boolean {
    return MANUAL_REFERENCE_TYPES.includes(link.get('type')?.value);
  }

  linkNeedsUrl(link: FormGroup): boolean {
    return !REFERENCE_TYPES.includes(link.get('type')?.value);
  }

  referenceItemsFor(link: FormGroup): any[] {
    const type = link.get('type')?.value;
    if (type === 'product') return this.products;
    if (type === 'category') return this.categories;
    if (type === 'blog') return this.blogs;
    return [];
  }

  referenceBindLabelFor(link: FormGroup): string {
    return link.get('type')?.value === 'blog' ? 'title' : 'name';
  }

  asFormGroup(control: any): FormGroup {
    return control as FormGroup;
  }

  // ── Promo tile ────────────────────────────────────────────────────────
  choosePromoImage() {
    const currentId = this.formGroup.get('promo_image')?.value;
    this.dialog
      .open(MediaComponent, {
        disableClose: true,
        width: '80%',
        height: '80%',
        data: {
          ref_type: 'mega_menus',
          multiple: false,
          image_only: true,
          selectedFiles: currentId ? [{ _id: currentId }] : [],
        },
      })
      .afterClosed()
      .subscribe((res: any) => {
        const file = res?.[0];
        if (!file) return;
        this.formGroup.patchValue({ promo_image: file._id });
      });
  }

  clearPromoImage() {
    this.formGroup.patchValue({ promo_image: null });
  }

  // ── Submit ────────────────────────────────────────────────────────────
  onSubmit() {
    const raw = this.formGroup.getRawValue();
    const content = {
      layout: raw.layout || 'columns',
      columns: raw.columns.map((c: any, ci: number) => ({
        heading: c.heading || '',
        order: ci,
        links: c.links.map((l: any, li: number) => ({
          label: l.label || '',
          type: l.type,
          reference_id: REFERENCE_TYPES.includes(l.type) ? l.reference_id : null,
          custom_url: REFERENCE_TYPES.includes(l.type) ? null : l.custom_url,
          order: li,
          badge: l.badge_text ? { text: l.badge_text, color: l.badge_color || '' } : null,
        })),
      })),
      promo: {
        image: raw.promo_image || null,
        heading: raw.promo_heading || '',
        subtext: raw.promo_subtext || '',
        link: raw.promo_link || '',
        order: 0,
      },
    };
    this.dialogRef?.close(content);
  }

  closeDialog() {
    this.dialogRef?.close();
  }
}
