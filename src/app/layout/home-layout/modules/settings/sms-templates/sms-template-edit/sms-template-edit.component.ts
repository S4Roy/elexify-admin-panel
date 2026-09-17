import { NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'app/core/services/api.service';
import { HelpersService } from 'app/core/services/helpers.service';
import { DialogService } from 'app/core/services/dialog.service';
import { ConfirmDialogData } from '../../../../includes/confirm-dialog/confirm-dialog.component';

const PLACEHOLDER = '{#VAR#}';

@Component({
  selector: 'app-sms-template-edit',
  imports: [
    NgIf,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    RouterModule,
  ],
  templateUrl: './sms-template-edit.component.html',
  styleUrl: './sms-template-edit.component.scss',
})
export class SmsTemplateEditComponent implements OnInit {
  event: string | null = null;
  template: any = null;
  loading = true;
  saving = false;
  resetting = false;
  formGroup!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private dialogService: DialogService,
    public helperService: HelpersService,
  ) {
    this.initFormGroup();
  }

  get isPrivileged(): boolean {
    const role = this.helperService.role();
    return role === 'superadmin' || role === 'manager';
  }

  // The `{#VAR#}` placeholder count in `message` must match `variables`'s
  // length exactly, or the live send will fill the wrong number of
  // positional slots into whatever's actually registered on the Fast2SMS
  // DLT portal. Computed client-side — no API round-trip needed.
  get placeholderCount(): number {
    const message: string = this.formGroup?.get('message')?.value || '';
    return message.split(PLACEHOLDER).length - 1;
  }

  get variablesList(): string[] {
    const raw: string = this.formGroup?.get('variablesText')?.value || '';
    return raw
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }

  get variableCountMismatch(): boolean {
    return this.placeholderCount !== this.variablesList.length;
  }

  initFormGroup() {
    this.formGroup = this.fb.group({
      category: [''],
      message: ['', [Validators.required]],
      variablesText: [''],
      dlt_message_id: ['', [Validators.required]],
      sender_id: [''],
      is_unicode: [false],
      status: ['active', [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.event = params.get('event');
      if (this.event) {
        this.fetchTemplateDetails();
      }
    });
  }

  private patchForm() {
    this.formGroup.patchValue({
      category: this.template?.category ?? '',
      message: this.template?.message ?? '',
      variablesText: (this.template?.variables ?? []).join(', '),
      dlt_message_id: this.template?.dlt_message_id ?? '',
      sender_id: this.template?.sender_id ?? '',
      is_unicode: !!this.template?.is_unicode,
      status: this.template?.status ?? 'active',
    });
    if (!this.isPrivileged) {
      this.formGroup.disable();
    }
  }

  fetchTemplateDetails() {
    this.loading = true;
    this.apiService.smsTemplateDetails(this.event!).subscribe({
      next: (res: any) => {
        this.template = res?.data ?? null;
        this.patchForm();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  save() {
    if (!this.isPrivileged || !this.event) return;
    this.formGroup.markAllAsTouched();
    if (this.formGroup.invalid) return;

    this.saving = true;
    const raw = this.formGroup.getRawValue();
    const payload = {
      category: raw.category,
      message: raw.message,
      variables: this.variablesList,
      dlt_message_id: raw.dlt_message_id,
      sender_id: raw.sender_id || null,
      is_unicode: raw.is_unicode,
      status: raw.status,
    };
    this.apiService.updateSmsTemplate(this.event, payload).subscribe({
      next: (res: any) => {
        this.saving = false;
        this.template = res?.data ?? this.template;
        this.patchForm();
        this.toastr.success(res?.message ?? 'Template updated');
      },
      error: () => {
        this.saving = false;
      },
    });
  }

  resetToDefault() {
    if (!this.isPrivileged || !this.event) return;
    const dialogData: ConfirmDialogData = {
      title: 'Reset to default?',
      message:
        'This will discard any customization and re-apply the code-owned default content for this template. This cannot be undone.',
      cancelText: 'Cancel',
      saveText: 'Reset',
    };
    this.dialogService.confirmDialog(dialogData).subscribe((result: any) => {
      if (!result?.confirm) return;
      this.resetting = true;
      this.apiService.resetSmsTemplate(this.event!).subscribe({
        next: (res: any) => {
          this.resetting = false;
          this.template = res?.data ?? this.template;
          this.patchForm();
          this.toastr.success(res?.message ?? 'SMS template reset to default');
        },
        error: () => {
          this.resetting = false;
        },
      });
    });
  }

  goBack() {
    this.router.navigateByUrl('/settings/sms-templates');
  }
}
