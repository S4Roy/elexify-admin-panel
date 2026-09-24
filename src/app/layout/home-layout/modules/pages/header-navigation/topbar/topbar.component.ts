import { inject as injectAccess } from '@angular/core';
import { PermissionService } from 'app/core/services/permission.service';
import { PermissionDirective } from 'app/core/directives/permission.directive';
import { NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
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
import { NavigationService } from 'app/core/services/navigation.service';
import { ConfirmDialogData } from 'app/layout/home-layout/includes/confirm-dialog/confirm-dialog.component';
import { environment } from '../../../../../../../environments/environment';
import { NewAnnouncementComponent } from './new-announcement/new-announcement.component';

@Component({
  selector: 'app-topbar-settings',
  standalone: true,
  imports: [PermissionDirective,
    NgFor,
    NgIf,
    DragDropModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatSlideToggleModule,
    MatTooltipModule,
    ReactiveFormsModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarSettingsComponent implements OnInit {
  readonly accessControl = injectAccess(PermissionService);
  storefrontUrl = environment.STOREFRONT_URL ?? '';
  doc: any = null;
  announcements: any[] = [];
  loading = false;
  savingSettings = false;

  // Must mirror the backend TopBar SettingsSchema defaults.
  private readonly defaultSettings = {
    display_mode: 'marquee',
    speed: 'normal',
    pause_on_hover: true,
    closeable: true,
    dismiss_days: 1,
    separator: '•',
    background_color: '',
    text_color: '',
  };
  private readonly hex = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
  settingsForm: FormGroup;

  constructor(
    private toastr: ToastrService,
    private navigationService: NavigationService,
    private dialogService: DialogService,
    private authService: AuthService,
    private dialog: MatDialog,
    private fb: FormBuilder
  ) {
    this.settingsForm = this.fb.group({
      display_mode: [this.defaultSettings.display_mode],
      speed: [this.defaultSettings.speed],
      pause_on_hover: [this.defaultSettings.pause_on_hover],
      closeable: [this.defaultSettings.closeable],
      dismiss_days: [
        this.defaultSettings.dismiss_days,
        [Validators.required, Validators.min(0), Validators.max(365)],
      ],
      separator: [this.defaultSettings.separator, Validators.maxLength(8)],
      background_color: ['', Validators.pattern(this.hex)],
      text_color: ['', Validators.pattern(this.hex)],
    });
  }

  ngOnInit() {
    this.fetch();
  }

  fetch() {
    this.loading = true;
    this.navigationService.topBarGet().subscribe({
      next: (res: any) => {
        this.doc = res?.data ?? res;
        this.syncAnnouncements();
        this.syncSettings();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  syncSettings() {
    const s = { ...this.defaultSettings, ...(this.doc?.settings ?? {}) };
    this.settingsForm.reset({
      ...s,
      background_color: s.background_color ?? '',
      text_color: s.text_color ?? '',
    });
    if (!this.accessControl.can('topbar.update')) this.settingsForm.disable();
  }

  saveSettings() {
    if (this.settingsForm.invalid) {
      this.settingsForm.markAllAsTouched();
      return;
    }
    const v = this.settingsForm.getRawValue();
    this.savingSettings = true;
    this.navigationService
      .topBarUpdate({
        settings: {
          ...v,
          dismiss_days: Number(v.dismiss_days),
          background_color: v.background_color || null,
          text_color: v.text_color || null,
        },
      })
      .subscribe({
        next: (res: any) => {
          this.savingSettings = false;
          this.doc = res?.data ?? res;
          this.syncSettings();
          this.toastr.success('Display settings saved. Publish to make them live.');
        },
        error: () => {
          this.savingSettings = false;
          this.toastr.error('Failed to save display settings');
        },
      });
  }

  /** Native color picker → hex text field (the text field allows "blank = theme default"). */
  pickColor(control: 'background_color' | 'text_color', event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.settingsForm.get(control)?.setValue(value);
    this.settingsForm.get(control)?.markAsDirty();
  }

  clearColor(control: 'background_color' | 'text_color') {
    this.settingsForm.get(control)?.setValue('');
    this.settingsForm.get(control)?.markAsDirty();
  }

  swatch(control: 'background_color' | 'text_color', fallback: string) {
    const v = this.settingsForm.get(control)?.value;
    return this.hex.test(v || '') ? v : fallback;
  }

  syncAnnouncements() {
    this.announcements = [...(this.doc?.announcements ?? [])].sort(
      (a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)
    );
  }

  persist(onSuccess?: () => void) {
    this.navigationService
      .topBarUpdate({
        announcements: this.announcements,
        contact_items: this.doc?.contact_items ?? [],
      })
      .subscribe({
        next: (res: any) => {
          this.doc = res?.data ?? res;
          this.syncAnnouncements();
          onSuccess?.();
        },
        error: () => {
          this.toastr.error('Failed to save announcements');
          this.fetch();
        },
      });
  }

  // ── Add / edit ────────────────────────────────────────────────────────
  addAnnouncement() {
    this.openEditor(null);
  }

  editAnnouncement(item: any) {
    this.openEditor(item);
  }

  openEditor(announcement: any | null) {
    this.dialog
      .open(NewAnnouncementComponent, {
        data: { announcement },
        disableClose: true,
      })
      .afterClosed()
      .subscribe((res: any) => {
        if (!res) return;
        if (announcement) {
          const idx = this.announcements.findIndex((a) => a === announcement);
          if (idx > -1) this.announcements[idx] = res;
        } else {
          this.announcements.push({
            ...res,
            order: this.announcements.length,
          });
        }
        this.persist(() => this.toastr.success('Announcement saved successfully'));
      });
  }

  // ── Enable / disable ─────────────────────────────────────────────────
  toggleEnabled(item: any) {
    const previous = item.enabled;
    item.enabled = !item.enabled;
    this.persist();
  }

  // ── Delete ────────────────────────────────────────────────────────────
  deleteAnnouncement(item: any) {
    const dialogData: ConfirmDialogData = {
      title: 'Are you sure?',
      message: `Delete "${item.message || 'this announcement'}"? This cannot be undone.`,
      cancelText: 'Cancel',
      saveText: 'Delete',
    };
    this.dialogService.confirmDialog(dialogData).subscribe((result: any) => {
      if (result?.confirm) {
        this.announcements = this.announcements.filter((a) => a !== item);
        this.persist(() => this.toastr.success('Announcement deleted successfully'));
      }
    });
  }

  // ── Reorder ───────────────────────────────────────────────────────────
  drop(event: CdkDragDrop<any[]>) {
    if (event.previousIndex === event.currentIndex) return;
    moveItemInArray(this.announcements, event.previousIndex, event.currentIndex);
    this.announcements.forEach((a, i) => (a.order = i));
    this.persist();
  }

  // ── Publish / unpublish ───────────────────────────────────────────────
  publish() {
    const dialogData: ConfirmDialogData = {
      title: 'Publish top bar?',
      message:
        'This copies the current draft to the live storefront. Visitors will immediately see these changes.',
      cancelText: 'Cancel',
      saveText: 'Publish',
    };
    this.dialogService.confirmDialog(dialogData).subscribe((result: any) => {
      if (result?.confirm) {
        this.navigationService.topBarPublish().subscribe({
          next: (res: any) => {
            this.toastr.success('Top bar published successfully');
            this.doc = res?.data ?? res;
            this.syncAnnouncements();
            this.syncSettings();
          },
          error: () => {},
        });
      }
    });
  }

  unpublish() {
    const dialogData: ConfirmDialogData = {
      title: 'Unpublish top bar?',
      message: 'The public site will stop showing the top bar until it is republished.',
      cancelText: 'Cancel',
      saveText: 'Unpublish',
    };
    this.dialogService.confirmDialog(dialogData).subscribe((result: any) => {
      if (result?.confirm) {
        this.navigationService.topBarUnpublish().subscribe({
          next: (res: any) => {
            this.toastr.success('Top bar unpublished');
            this.doc = res?.data ?? res;
            this.syncAnnouncements();
          },
          error: () => {},
        });
      }
    });
  }

  // ── Preview ───────────────────────────────────────────────────────────
  openPreview() {
    const token = this.authService.getUserToken();
    window.open(`${this.storefrontUrl}/preview/navigation?token=${token}`, '_blank');
  }
}
