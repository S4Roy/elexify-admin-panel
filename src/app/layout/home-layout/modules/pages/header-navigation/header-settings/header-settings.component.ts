import { PermissionDirective } from 'app/core/directives/permission.directive';
import { NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'app/core/services/auth.service';
import { DialogService } from 'app/core/services/dialog.service';
import { NavigationService } from 'app/core/services/navigation.service';
import { ConfirmDialogData } from 'app/layout/home-layout/includes/confirm-dialog/confirm-dialog.component';
import { environment } from '../../../../../../../environments/environment';
import { MediaComponent } from 'app/layout/home-layout/modules/settings/media/media.component';

@Component({
  selector: 'app-header-settings',
  standalone: true,
  imports: [PermissionDirective,
    NgIf,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTooltipModule,
  ],
  templateUrl: './header-settings.component.html',
  styleUrl: './header-settings.component.scss',
})
export class HeaderSettingsComponent implements OnInit {
  storefrontUrl = environment.STOREFRONT_URL ?? '';
  doc: any = null;
  loading = false;
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private navigationService: NavigationService,
    private dialogService: DialogService,
    private authService: AuthService,
    private dialog: MatDialog
  ) {
    this.buildForm({});
  }

  ngOnInit() {
    this.fetch();
  }

  fetch() {
    this.loading = true;
    this.navigationService.headerConfigGet().subscribe({
      next: (res: any) => {
        this.doc = res?.data ?? res;
        this.buildForm(this.doc?.draft ?? {});
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  buildForm(draft: any) {
    this.form = this.fb.group({
      logo: this.fb.group({
        image: [draft?.logo?.image ?? null],
        alt_text: [draft?.logo?.alt_text ?? ''],
        link: [draft?.logo?.link ?? '/'],
      }),
      logo_mobile: this.fb.group({
        image: [draft?.logo_mobile?.image ?? null],
        alt_text: [draft?.logo_mobile?.alt_text ?? ''],
      }),
      layout: [draft?.layout ?? 'classic'],
      sticky: [draft?.sticky ?? true],
      sticky_shrink_on_scroll: [draft?.sticky_shrink_on_scroll ?? false],
      hide_on_scroll_down: [draft?.hide_on_scroll_down ?? false],
      height_px: [draft?.height_px ?? 80],
      height_mobile_px: [draft?.height_mobile_px ?? 64],
      background: this.fb.group({
        type: [draft?.background?.type ?? 'color'],
        color: [draft?.background?.color ?? '#ffffff'],
      }),
      visibility: this.fb.group({
        show_topbar: [draft?.visibility?.show_topbar ?? true],
        show_search: [draft?.visibility?.show_search ?? true],
        show_wishlist: [draft?.visibility?.show_wishlist ?? true],
        show_account: [draft?.visibility?.show_account ?? true],
        show_cart: [draft?.visibility?.show_cart ?? true],
      }),
      cta_button: this.fb.group({
        enabled: [draft?.cta_button?.enabled ?? false],
        label: [draft?.cta_button?.label ?? ''],
        link: [draft?.cta_button?.link ?? ''],
        style: [draft?.cta_button?.style ?? 'primary'],
      }),
      search: this.fb.group({
        enabled: [draft?.search?.enabled ?? true],
        placeholder: [draft?.search?.placeholder ?? 'Search products...'],
        min_chars: [draft?.search?.min_chars ?? 2],
      }),
    });
  }

  get logoGroup(): FormGroup {
    return this.form.get('logo') as FormGroup;
  }

  get logoMobileGroup(): FormGroup {
    return this.form.get('logo_mobile') as FormGroup;
  }

  chooseLogo(field: 'logo' | 'logo_mobile') {
    const group = field === 'logo' ? this.logoGroup : this.logoMobileGroup;
    const currentId = group.get('image')?.value;
    this.dialog
      .open(MediaComponent, {
        disableClose: true,
        width: '80%',
        height: '80%',
        data: {
          ref_type: 'header_navigation',
          multiple: false,
          image_only: true,
          selectedFiles: currentId ? [{ _id: currentId }] : [],
        },
      })
      .afterClosed()
      .subscribe((res: any) => {
        const file = res?.[0];
        if (!file) return;
        group.patchValue({ image: file._id });
      });
  }

  clearLogo(field: 'logo' | 'logo_mobile') {
    const group = field === 'logo' ? this.logoGroup : this.logoMobileGroup;
    group.patchValue({ image: null });
  }

  // ── Save ──────────────────────────────────────────────────────────────
  save() {
    this.form.disable();
    this.navigationService.headerConfigUpdate(this.form.getRawValue()).subscribe({
      next: (res: any) => {
        this.form.enable();
        this.doc = res?.data ?? res;
        this.buildForm(this.doc?.draft ?? {});
        this.toastr.success('Header settings saved successfully');
      },
      error: () => {
        this.form.enable();
      },
    });
  }

  // ── Publish / unpublish ───────────────────────────────────────────────
  publish() {
    const dialogData: ConfirmDialogData = {
      title: 'Publish header settings?',
      message:
        'This copies the current draft to the live storefront. Visitors will immediately see these changes.',
      cancelText: 'Cancel',
      saveText: 'Publish',
    };
    this.dialogService.confirmDialog(dialogData).subscribe((result: any) => {
      if (result?.confirm) {
        this.navigationService.headerConfigPublish().subscribe({
          next: (res: any) => {
            this.toastr.success('Header settings published successfully');
            this.doc = res?.data ?? res;
            this.buildForm(this.doc?.draft ?? {});
          },
          error: () => {},
        });
      }
    });
  }

  unpublish() {
    const dialogData: ConfirmDialogData = {
      title: 'Unpublish header settings?',
      message:
        'The public site will fall back to defaults for the header until it is republished.',
      cancelText: 'Cancel',
      saveText: 'Unpublish',
    };
    this.dialogService.confirmDialog(dialogData).subscribe((result: any) => {
      if (result?.confirm) {
        this.navigationService.headerConfigUnpublish().subscribe({
          next: (res: any) => {
            this.toastr.success('Header settings unpublished');
            this.doc = res?.data ?? res;
            this.buildForm(this.doc?.draft ?? {});
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
