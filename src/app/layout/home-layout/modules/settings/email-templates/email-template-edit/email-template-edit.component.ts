import { NgIf, NgClass } from '@angular/common';
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import {
  ClassicEditor,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Essentials,
  Paragraph,
  Heading,
  Link,
  BlockQuote,
  Code,
  List,
  TodoList,
  Indent,
  Alignment,
  Font,
  Highlight,
  HorizontalLine,
  Table,
  TableToolbar,
  SpecialCharacters,
  RemoveFormat,
} from 'ckeditor5';
import { ApiService } from 'app/core/services/api.service';
import { HelpersService } from 'app/core/services/helpers.service';
import { SanitizeService } from 'app/core/services/sanitize.service';
import { DialogService } from 'app/core/services/dialog.service';
import { ConfirmDialogData } from '../../../../includes/confirm-dialog/confirm-dialog.component';
import {
  SendTestEmailDialogComponent,
  SendTestEmailDialogData,
} from '../../../../includes/send-test-email-dialog/send-test-email-dialog.component';

@Component({
  selector: 'app-email-template-edit',
  imports: [
    NgIf,
    NgClass,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    RouterModule,
    CKEditorModule,
  ],
  templateUrl: './email-template-edit.component.html',
  styleUrl: './email-template-edit.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class EmailTemplateEditComponent implements OnInit {
  public Editor = ClassicEditor;
  public config = {
    licenseKey: 'GPL',
    plugins: [
      Essentials,
      Paragraph,
      Heading,
      Bold,
      Italic,
      Underline,
      Strikethrough,
      Link,
      BlockQuote,
      Code,
      List,
      Alignment,
      TodoList,
      Table,
      TableToolbar,
      Highlight,
      HorizontalLine,
      SpecialCharacters,
      RemoveFormat,
    ],
    toolbar: [
      'undo',
      'redo',
      '|',
      'heading',
      '|',
      'bold',
      'italic',
      'underline',
      'strikethrough',
      'code',
      '|',
      'link',
      'blockQuote',
      'alignment',
      '|',
      'bulletedList',
      'numberedList',
      'todoList',
      '|',
      'insertTable',
      'horizontalLine',
      'specialCharacters',
      '|',
      'highlight',
      'removeFormat',
    ],
    toolbarShouldNotGroupWhenFull: true,
  };

  action: string | null = null;
  template: any = null;
  loading = true;
  saving = false;
  resetting = false;
  formGroup!: FormGroup;

  previewLoading = false;
  previewSubject: string | null = null;
  previewHtml: string | null = null;
  missingVariables: string[] = [];
  unresolvedFields: string[] = [];
  previewMode: 'desktop' | 'mobile' = 'desktop';

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private dialog: MatDialog,
    private dialogService: DialogService,
    public helperService: HelpersService,
    public sanitizeService: SanitizeService,
  ) {
    this.initFormGroup();
  }

  get isPrivileged(): boolean {
    return this.helperService.can('email_template.manage');
  }

  initFormGroup() {
    this.formGroup = this.fb.group({
      subject: ['', [Validators.required]],
      preheader: [''],
      body: ['', [Validators.required]],
      status: ['active', [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.action = params.get('action');
      if (this.action) {
        this.fetchTemplateDetails();
      }
    });
  }

  fetchTemplateDetails() {
    this.loading = true;
    this.apiService.emailTemplateDetails(this.action!).subscribe({
      next: (res: any) => {
        this.template = res?.data ?? null;
        this.formGroup.patchValue({
          subject: this.template?.subject ?? '',
          preheader: this.template?.preheader ?? '',
          body: this.template?.body ?? '',
          status: this.template?.status ?? 'active',
        });
        if (!this.isPrivileged) {
          this.formGroup.disable();
        }
        this.loading = false;
        this.refreshPreview();
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  onEditorReady(editorInstance: any) {
    // Body content only needs standard formatting for email templates —
    // no inline image upload adapter is wired here (unlike the blogs
    // editor), since template bodies don't need it.
  }

  save() {
    if (!this.isPrivileged || !this.action) return;
    this.formGroup.markAllAsTouched();
    if (this.formGroup.invalid) return;

    this.saving = true;
    const payload = this.formGroup.getRawValue();
    this.apiService.updateEmailTemplate(this.action, payload).subscribe({
      next: (res: any) => {
        this.saving = false;
        this.template = res?.data ?? this.template;
        this.toastr.success(res?.message ?? 'Template updated');
        this.refreshPreview();
      },
      error: () => {
        this.saving = false;
      },
    });
  }

  resetToDefault() {
    if (!this.isPrivileged || !this.action) return;
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
      this.apiService.resetEmailTemplate(this.action!).subscribe({
        next: (res: any) => {
          this.resetting = false;
          this.template = res?.data ?? this.template;
          this.formGroup.patchValue({
            subject: this.template?.subject ?? '',
            preheader: this.template?.preheader ?? '',
            body: this.template?.body ?? '',
            status: this.template?.status ?? 'active',
          });
          this.toastr.success(res?.message ?? 'Template reset to default');
          this.refreshPreview();
        },
        error: () => {
          this.resetting = false;
        },
      });
    });
  }

  sendTestEmail() {
    if (!this.isPrivileged || !this.action) return;
    const dialogData: SendTestEmailDialogData = {
      title: 'Send Test Email',
      message:
        'Sends a real email using safe fixture data (never real customer data) directly via the mail provider.',
    };
    this.dialog
      .open(SendTestEmailDialogComponent, { data: dialogData, disableClose: true })
      .afterClosed()
      .subscribe((result: any) => {
        if (!result?.confirm) return;
        this.apiService
          .sendTestEmailTemplate(this.action!, result.email)
          .subscribe({
            next: (res: any) => {
              this.toastr.success(res?.message ?? 'Test email sent');
            },
            error: () => {},
          });
      });
  }

  refreshPreview() {
    if (!this.action) return;
    this.previewLoading = true;
    const draft = this.formGroup.getRawValue();
    this.apiService.previewEmailTemplate(this.action, draft).subscribe({
      next: (res: any) => {
        this.previewLoading = false;
        const data = res?.data ?? {};
        this.previewSubject = data?.subject ?? null;
        this.previewHtml = data?.html ?? null;
        this.missingVariables = data?.missingVariables ?? [];
        this.unresolvedFields = data?.unresolvedFields ?? [];
      },
      error: () => {
        this.previewLoading = false;
      },
    });
  }

  setPreviewMode(mode: 'desktop' | 'mobile') {
    this.previewMode = mode;
  }

  goBack() {
    this.router.navigateByUrl('/settings/email-templates');
  }
}
