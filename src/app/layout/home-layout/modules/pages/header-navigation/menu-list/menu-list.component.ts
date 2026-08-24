import { NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import * as Global from 'app/global';
import { DialogService } from 'app/core/services/dialog.service';
import { NavigationService } from 'app/core/services/navigation.service';
import { ConfirmDialogData } from 'app/layout/home-layout/includes/confirm-dialog/confirm-dialog.component';
import { PaginationComponent } from 'app/layout/home-layout/includes/pagination/pagination.component';
import { EmptyStateComponent } from 'app/layout/home-layout/includes/empty-state/empty-state.component';
import PaginationOptions from 'app/core/models/PaginationOptions';

// Slugs the Phase C storefront looks for by convention. Suggested (not
// enforced) so admins land on the right slug for the three "special" menu
// containers, without blocking creation of any other slug for future use.
const SUGGESTED_SLUGS = ['main-menu', 'mobile-menu', 'footer-menu'];

function slugify(value: string): string {
  return (value ?? '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Component({
  selector: 'app-menu-list',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    ReactiveFormsModule,
    PaginationComponent,
    EmptyStateComponent,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
  ],
  templateUrl: './menu-list.component.html',
  styleUrl: './menu-list.component.scss',
})
export class MenuListComponent implements OnInit {
  Global = Global;
  suggestedSlugs = SUGGESTED_SLUGS;
  item_list: any[] = [];
  paginationOption: PaginationOptions;
  loading = false;

  showForm = false;
  editingItem: any = null;
  formGroup: FormGroup;
  slugTouched = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private toastr: ToastrService,
    private navigationService: NavigationService,
    private dialogService: DialogService
  ) {
    this.paginationOption = Global.resetPaginationOptions();
    this.formGroup = this.fb.group({
      name: [''],
      slug: [''],
      description: [''],
    });
  }

  ngOnInit(): void {
    this.fetch();
  }

  fetch() {
    this.loading = true;
    const params = new URLSearchParams();
    if (this.paginationOption.page) {
      params.set('page', String(this.paginationOption.page));
    }
    this.navigationService.menuList(params).subscribe({
      next: (res: any) => {
        this.item_list = res?.data?.docs ?? [];
        this.paginationOption = { ...this.paginationOption, ...res?.data };
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  onPageChange(page: number) {
    this.paginationOption.page = page;
    this.fetch();
  }

  // ── Create / rename ───────────────────────────────────────────────────
  openCreateForm() {
    this.editingItem = null;
    this.slugTouched = false;
    this.formGroup.reset({ name: '', slug: '', description: '' });
    this.showForm = true;
  }

  openEditForm(item: any) {
    this.editingItem = item;
    this.slugTouched = true;
    this.formGroup.reset({
      name: item.name,
      slug: item.slug,
      description: item.description ?? '',
    });
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.editingItem = null;
  }

  applySuggestedSlug(slug: string) {
    this.formGroup.patchValue({ slug });
    this.slugTouched = true;
  }

  onNameChange() {
    if (this.slugTouched) return;
    const name = this.formGroup.get('name')?.value ?? '';
    this.formGroup.patchValue({ slug: slugify(name) }, { emitEvent: false });
  }

  onSlugInput() {
    this.slugTouched = true;
  }

  submitForm() {
    const raw = this.formGroup.getRawValue();
    if (!raw.name?.trim()) {
      this.toastr.error('Name is required');
      return;
    }
    const payload: any = {
      name: raw.name,
      slug: slugify(raw.slug || raw.name),
      description: raw.description || '',
    };
    if (this.editingItem?._id) {
      payload._id = this.editingItem._id;
    }
    this.formGroup.disable();
    this.navigationService.submitMenu(payload).subscribe({
      next: (res: any) => {
        this.formGroup.enable();
        this.toastr.success(
          this.editingItem ? 'Menu updated successfully' : 'Menu created successfully'
        );
        this.closeForm();
        this.fetch();
      },
      error: () => {
        this.formGroup.enable();
      },
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────
  deleteMenu(item: any) {
    const dialogData: ConfirmDialogData = {
      title: 'Are you sure?',
      message: `Delete "${item.name}"? Its items will be deleted as well. This cannot be undone.`,
      cancelText: 'Cancel',
      saveText: 'Delete',
    };
    this.dialogService.confirmDialog(dialogData).subscribe((result: any) => {
      if (result?.confirm) {
        this.navigationService.deleteMenu({ _id: item._id }).subscribe({
          next: () => {
            this.toastr.success('Menu deleted successfully');
            this.fetch();
          },
          error: () => {},
        });
      }
    });
  }

  // ── Publish / unpublish ───────────────────────────────────────────────
  publish(item: any) {
    const dialogData: ConfirmDialogData = {
      title: 'Publish menu?',
      message: `This copies "${item.name}"'s current draft to the live storefront.`,
      cancelText: 'Cancel',
      saveText: 'Publish',
    };
    this.dialogService.confirmDialog(dialogData).subscribe((result: any) => {
      if (result?.confirm) {
        this.navigationService.publishMenu(item._id).subscribe({
          next: () => {
            this.toastr.success('Menu published successfully');
            this.fetch();
          },
          error: () => {},
        });
      }
    });
  }

  unpublish(item: any) {
    const dialogData: ConfirmDialogData = {
      title: 'Unpublish menu?',
      message: `The storefront will stop rendering "${item.name}" until it is republished.`,
      cancelText: 'Cancel',
      saveText: 'Unpublish',
    };
    this.dialogService.confirmDialog(dialogData).subscribe((result: any) => {
      if (result?.confirm) {
        this.navigationService.unpublishMenu(item._id).subscribe({
          next: () => {
            this.toastr.success('Menu unpublished');
            this.fetch();
          },
          error: () => {},
        });
      }
    });
  }

  // ── Navigate ──────────────────────────────────────────────────────────
  openBuilder(item: any) {
    this.router.navigate(['/pages/header-navigation/menus', item._id]);
  }

  // ── Generate industry-standard defaults ─────────────────────────────────
  generatingDefaults = false;

  generateDefaults() {
    const dialogData: ConfirmDialogData = {
      title: 'Generate default menus?',
      message:
        'Creates and publishes standard Main, Mobile, and Footer menus (Home, Shop, Track Order, About Us, Contact Us, policy links, etc). Any menu that already has items is left untouched.',
      cancelText: 'Cancel',
      saveText: 'Generate',
    };
    this.dialogService.confirmDialog(dialogData).subscribe((result: any) => {
      if (!result?.confirm) return;
      this.generatingDefaults = true;
      this.navigationService.generateDefaultMenus().subscribe({
        next: (res: any) => {
          this.generatingDefaults = false;
          const created = (res?.data ?? []).filter((r: any) => r.status === 'created');
          const skipped = (res?.data ?? []).filter((r: any) => r.status === 'skipped');
          this.toastr.success(
            created.length
              ? `Generated: ${created.map((r: any) => r.slug).join(', ')}${skipped.length ? ` (skipped ${skipped.map((r: any) => r.slug).join(', ')} — already has items)` : ''}`
              : 'All standard menus already have items — nothing to generate'
          );
          this.fetch();
        },
        error: () => {
          this.generatingDefaults = false;
        },
      });
    });
  }
}
