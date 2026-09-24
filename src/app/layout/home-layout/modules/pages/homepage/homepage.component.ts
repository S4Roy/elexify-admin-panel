import { inject as injectAccess } from '@angular/core';
import { PermissionService } from 'app/core/services/permission.service';
import { PermissionDirective } from 'app/core/directives/permission.directive';
import { NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'app/core/services/auth.service';
import { DialogService } from 'app/core/services/dialog.service';
import { InventoryService } from 'app/core/services/inventory.service';
import { ConfirmDialogData } from 'app/layout/home-layout/includes/confirm-dialog/confirm-dialog.component';
import { environment } from '../../../../../../environments/environment';
import {
  SectionEditorComponent,
  SectionEditorData,
} from './section-editor/section-editor.component';

interface SectionTypeDef {
  type: string;
  label: string;
  icon: string;
}

const SECTION_TYPES: SectionTypeDef[] = [
  { type: 'hero', label: 'Hero Banner', icon: 'view_carousel' },
  { type: 'product_section', label: 'Product Section', icon: 'view_module' },
  { type: 'category_section', label: 'Category Section', icon: 'category' },
  { type: 'trust_badges', label: 'Trust Badges', icon: 'verified_user' },
  { type: 'promo_banners', label: 'Promo Banners', icon: 'dashboard' },
  { type: 'cta_banner', label: 'CTA Banner', icon: 'campaign' },
  { type: 'content_section', label: 'Content Section', icon: 'article' },
];

@Component({
  selector: 'app-homepage',
  standalone: true,
  imports: [PermissionDirective,
    NgFor,
    NgIf,
    ReactiveFormsModule,
    DragDropModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatSlideToggleModule,
    MatTooltipModule,
  ],
  templateUrl: './homepage.component.html',
  styleUrl: './homepage.component.scss',
})
export class HomepageComponent implements OnInit {
  readonly accessControl = injectAccess(PermissionService);
  sectionTypes = SECTION_TYPES;
  storefrontUrl = environment.STOREFRONT_URL ?? '';

  homeDoc: any = null;
  sections: any[] = [];
  loading: boolean = false;

  seoFormGroup!: FormGroup;
  showSeoPanel: boolean = false;

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private toastr: ToastrService,
    private inventoryService: InventoryService,
    private dialogService: DialogService,
    private authService: AuthService
  ) {
    this.seoFormGroup = this.fb.group({
      meta_title: [''],
      meta_description: [''],
    });
  }

  ngOnInit(): void {
    this.fetchHome();
  }

  fetchHome() {
    this.loading = true;
    this.inventoryService.homeGet().subscribe({
      next: (res: any) => {
        this.homeDoc = res?.data ?? res;
        this.syncSections();
        this.seoFormGroup.patchValue({
          meta_title: this.homeDoc?.seo?.meta_title ?? '',
          meta_description: this.homeDoc?.seo?.meta_description ?? '',
        });
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  syncSections() {
    this.sections = [...(this.homeDoc?.sections ?? [])].sort(
      (a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)
    );
  }

  typeDef(type: string): SectionTypeDef {
    return (
      this.sectionTypes.find((t) => t.type === type) ?? {
        type,
        label: type,
        icon: 'widgets',
      }
    );
  }

  isScheduled(section: any): boolean {
    return !!(section?.schedule?.startAt || section?.schedule?.endAt);
  }

  // ── Add / edit section ────────────────────────────────────────────────
  addSection(type: string) {
    this.openSectionEditor({ type });
  }

  editSection(section: any) {
    this.openSectionEditor({ type: section.type, section });
  }

  openSectionEditor(data: SectionEditorData) {
    this.dialog
      .open(SectionEditorComponent, {
        data,
        // Banner editors carry large image previews side by side.
        width: data?.type === 'hero' || data?.type === 'promo_banners' ? '1200px' : '800px',
        maxWidth: '96vw',
        maxHeight: '94vh',
        disableClose: true,
      })
      .afterClosed()
      .subscribe((res: any) => {
        if (res) {
          this.homeDoc = res;
          this.syncSections();
        }
      });
  }

  // ── Enable / disable ─────────────────────────────────────────────────
  toggleEnabled(section: any) {
    const previous = section.enabled;
    section.enabled = !section.enabled;
    this.inventoryService
      .homeUpdateSection(section._id, { enabled: section.enabled })
      .subscribe({
        next: (res: any) => {
          this.homeDoc = res?.data ?? res;
          this.syncSections();
        },
        error: () => {
          section.enabled = previous;
          this.toastr.error('Failed to update section');
        },
      });
  }

  // ── Delete ────────────────────────────────────────────────────────────
  deleteSection(section: any) {
    const dialogData: ConfirmDialogData = {
      title: 'Are you sure?',
      message: `Delete "${
        section.title || this.typeDef(section.type).label
      }"? This cannot be undone.`,
      cancelText: 'Cancel',
      saveText: 'Delete',
    };
    this.dialogService.confirmDialog(dialogData).subscribe((result: any) => {
      if (result?.confirm) {
        this.inventoryService.homeRemoveSection(section._id).subscribe({
          next: (res: any) => {
            this.toastr.success('Section deleted successfully');
            this.homeDoc = res?.data ?? res;
            this.syncSections();
          },
          error: () => {},
        });
      }
    });
  }

  // ── Reorder ───────────────────────────────────────────────────────────
  drop(event: CdkDragDrop<any[]>) {
    if (event.previousIndex === event.currentIndex) return;
    moveItemInArray(this.sections, event.previousIndex, event.currentIndex);
    const order = this.sections.map((s) => s._id);
    this.inventoryService.homeReorder(order).subscribe({
      next: (res: any) => {
        this.homeDoc = res?.data ?? res;
        this.syncSections();
      },
      error: () => {
        this.toastr.error('Failed to reorder sections');
        this.fetchHome();
      },
    });
  }

  // ── SEO panel ─────────────────────────────────────────────────────────
  toggleSeoPanel() {
    this.showSeoPanel = !this.showSeoPanel;
  }

  saveSeo() {
    this.seoFormGroup.disable();
    this.inventoryService.homeUpdate(this.seoFormGroup.getRawValue()).subscribe({
      next: (res: any) => {
        this.seoFormGroup.enable();
        this.homeDoc = res?.data ?? res;
        this.toastr.success('Homepage SEO saved successfully');
        this.showSeoPanel = false;
      },
      error: () => {
        this.seoFormGroup.enable();
      },
    });
  }

  // ── Publish / unpublish ───────────────────────────────────────────────
  publish() {
    const dialogData: ConfirmDialogData = {
      title: 'Publish homepage?',
      message:
        'This copies the current draft to the live storefront. Visitors will immediately see these changes.',
      cancelText: 'Cancel',
      saveText: 'Publish',
    };
    this.dialogService.confirmDialog(dialogData).subscribe((result: any) => {
      if (result?.confirm) {
        this.inventoryService.homePublish().subscribe({
          next: (res: any) => {
            this.toastr.success('Homepage published successfully');
            this.homeDoc = res?.data ?? res;
            this.syncSections();
          },
          error: () => {},
        });
      }
    });
  }

  unpublish() {
    const dialogData: ConfirmDialogData = {
      title: 'Unpublish homepage?',
      message:
        'The public site will show nothing on the homepage until it is republished.',
      cancelText: 'Cancel',
      saveText: 'Unpublish',
    };
    this.dialogService.confirmDialog(dialogData).subscribe((result: any) => {
      if (result?.confirm) {
        this.inventoryService.homeUnpublish().subscribe({
          next: (res: any) => {
            this.toastr.success('Homepage unpublished');
            this.homeDoc = res?.data ?? res;
            this.syncSections();
          },
          error: () => {},
        });
      }
    });
  }

  // ── Preview ───────────────────────────────────────────────────────────
  openPreview() {
    const token = this.authService.getUserToken();
    window.open(`${this.storefrontUrl}/preview/home?token=${token}`, '_blank');
  }
}
