import { NgFor, NgIf } from '@angular/common';
import { Component, Inject, OnInit, Optional } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
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
import { NgSelectModule } from '@ng-select/ng-select';
import { ToastrService } from 'ngx-toastr';
import { InventoryService } from 'app/core/services/inventory.service';
import { SettingsService } from 'app/core/services/settings.service';
import { NavigationService } from 'app/core/services/navigation.service';
import {
  MegaMenuEditorComponent,
  MegaMenuEditorData,
} from '../mega-menu-editor/mega-menu-editor.component';

export interface MenuItemEditorData {
  menuId: string;
  item?: any | null;
  parentId?: string | null;
  order?: number;
}

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'internal_page', label: 'Internal Page' },
  { value: 'product', label: 'Product' },
  { value: 'category', label: 'Category' },
  { value: 'collection', label: 'Collection' },
  { value: 'blog', label: 'Blog' },
  { value: 'custom_url', label: 'Custom URL' },
  { value: 'external_url', label: 'External URL' },
  { value: 'mega_menu', label: 'Mega Menu' },
  { value: 'dropdown', label: 'Dropdown (group only)' },
  { value: 'cta', label: 'Call to Action' },
];

const REFERENCE_TYPES = ['internal_page', 'product', 'category', 'collection', 'blog'];
const URL_TYPES = ['custom_url', 'external_url', 'cta'];
// These two reference types have no dedicated list endpoint available to
// this app yet, so they fall back to a plain ObjectId text input instead of
// an ng-select picker.
const MANUAL_REFERENCE_TYPES = ['internal_page', 'collection'];

@Component({
  selector: 'app-menu-item-editor',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    NgSelectModule,
  ],
  templateUrl: './menu-item-editor.component.html',
  styleUrl: './menu-item-editor.component.scss',
})
export class MenuItemEditorComponent implements OnInit {
  typeOptions = TYPE_OPTIONS;
  formGroup: FormGroup;
  isEdit: boolean;
  megaMenuContent: any = null;

  products: any[] = [];
  categories: any[] = [];
  blogs: any[] = [];

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private dialog: MatDialog,
    private inventoryService: InventoryService,
    private settingsService: SettingsService,
    private navigationService: NavigationService,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: MenuItemEditorData,
    @Optional() private dialogRef: MatDialogRef<MenuItemEditorComponent>
  ) {
    const item = this.data?.item;
    this.isEdit = !!item?._id;
    this.megaMenuContent = item?.mega_menu_content ?? null;
    this.formGroup = this.fb.group({
      type: [item?.type ?? 'custom_url'],
      label: [item?.label ?? ''],
      icon: [item?.icon ?? ''],
      badge_text: [item?.badge?.text ?? ''],
      badge_color: [item?.badge?.color ?? ''],
      reference_id: [item?.reference_id ?? null],
      custom_url: [item?.custom_url ?? ''],
      target: [item?.target ?? '_self'],
      enabled: [item?.enabled ?? true],
      schedule_start: [this.toDatetimeLocal(item?.schedule?.startAt)],
      schedule_end: [this.toDatetimeLocal(item?.schedule?.endAt)],
    });
  }

  ngOnInit(): void {
    this.fetchProducts();
    this.fetchCategories();
    this.fetchBlogs();
  }

  get typeValue(): string {
    return this.formGroup.get('type')?.value;
  }

  get needsReference(): boolean {
    return REFERENCE_TYPES.includes(this.typeValue);
  }

  get needsManualReference(): boolean {
    return MANUAL_REFERENCE_TYPES.includes(this.typeValue);
  }

  get needsUrl(): boolean {
    return URL_TYPES.includes(this.typeValue);
  }

  get isMegaMenu(): boolean {
    return this.typeValue === 'mega_menu';
  }

  get referenceItems(): any[] {
    if (this.typeValue === 'product') return this.products;
    if (this.typeValue === 'category') return this.categories;
    if (this.typeValue === 'blog') return this.blogs;
    return [];
  }

  get referenceBindLabel(): string {
    return this.typeValue === 'blog' ? 'title' : 'name';
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

  // ── Mega menu content ────────────────────────────────────────────────
  configureMegaMenu() {
    this.dialog
      .open<MegaMenuEditorComponent, MegaMenuEditorData, any>(MegaMenuEditorComponent, {
        data: { content: this.megaMenuContent },
        width: '900px',
        maxWidth: '95vw',
        disableClose: true,
      })
      .afterClosed()
      .subscribe((res: any) => {
        if (res) this.megaMenuContent = res;
      });
  }

  get megaMenuSummary(): string {
    const cols = this.megaMenuContent?.columns?.length ?? 0;
    const hasPromo = !!this.megaMenuContent?.promo?.heading;
    if (!cols && !hasPromo) return 'Not configured yet';
    return `${cols} column${cols === 1 ? '' : 's'}${hasPromo ? ' + promo tile' : ''}`;
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
  onSubmit() {
    const raw = this.formGroup.getRawValue();
    if (!raw.label?.trim()) {
      this.toastr.error('Label is required');
      return;
    }
    if (this.needsReference && !raw.reference_id) {
      this.toastr.error('A reference is required for this type');
      return;
    }
    if (this.needsUrl && !raw.custom_url?.trim()) {
      this.toastr.error('A URL is required for this type');
      return;
    }

    const payload: any = {
      type: raw.type,
      label: raw.label,
      icon: raw.icon || '',
      badge: raw.badge_text ? { text: raw.badge_text, color: raw.badge_color || '' } : null,
      reference_id: this.needsReference ? raw.reference_id : null,
      custom_url: this.needsUrl ? raw.custom_url : null,
      target: raw.target || '_self',
      enabled: raw.enabled ?? true,
      schedule: {
        startAt: this.fromDatetimeLocal(raw.schedule_start),
        endAt: this.fromDatetimeLocal(raw.schedule_end),
      },
      mega_menu_content: this.isMegaMenu ? this.megaMenuContent ?? {} : undefined,
    };

    if (this.isEdit) {
      payload._id = this.data.item._id;
    } else {
      payload.parent_id = this.data?.parentId ?? null;
      payload.order = this.data?.order ?? 0;
    }

    this.formGroup.disable();
    this.navigationService.submitMenuItem(this.data.menuId, payload).subscribe({
      next: (res: any) => {
        this.formGroup.enable();
        this.toastr.success(
          this.isEdit ? 'Menu item updated successfully' : 'Menu item added successfully'
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
