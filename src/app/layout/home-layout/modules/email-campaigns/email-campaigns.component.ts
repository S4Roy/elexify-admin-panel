import { ErrorStateMatcher } from '@angular/material/core';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { ClassicEditor, Essentials, Paragraph, Heading, Bold, Italic, Link, List, BlockQuote, Image, ImageInsertViaUrl, ImageToolbar, ImageTextAlternative } from 'ckeditor5';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { HttpService } from 'app/core/services/http.service';
import { PermissionService } from 'app/core/services/permission.service';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { PaginationComponent } from '../../includes/pagination/pagination.component';

@Component({
  selector: 'app-email-campaigns',
  imports: [CKEditorModule, CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, PaginationComponent],
  templateUrl: './email-campaigns.component.html', styleUrl: './email-campaigns.component.scss'
})
export class EmailCampaignsComponent implements OnInit, OnDestroy {
  readonly Editor = ClassicEditor;
  readonly editorConfig = {
    licenseKey: 'GPL',
    plugins: [Essentials, Paragraph, Heading, Bold, Italic, Link, List, BlockQuote, Image, ImageInsertViaUrl, ImageToolbar, ImageTextAlternative],
    toolbar: ['undo', 'redo', '|', 'heading', 'bold', 'italic', '|', 'link', 'bulletedList', 'numberedList', 'blockQuote', 'insertImageViaUrl'],
    image: { toolbar: ['imageTextAlternative'] },
    link: { defaultProtocol: 'https://' },
    placeholder: 'Tell your subscribers about your latest collection or offer…',
  };
  campaigns: any[] = [];
  pagination: any = { page: 1, limit: 25 };
  recipients: any[] = [];
  recipientPagination: any = { page: 1, limit: 25 };
  selected: any = null;
  stats: Record<string, number> = {};
  preview: SafeHtml | null = null;
  previewMode: 'desktop' | 'mobile' = 'desktop';
  readonly testEmailErrorState: ErrorStateMatcher = { isErrorState: control => Boolean(control?.invalid && control?.touched) };
  audienceCount = 0;
  confirmation: any = null;
  cancelConfirmation = false;
  loading = false;
  busy = false;
  error = '';
  message = '';
  private destroy$ = new Subject<void>();
  private sequence = 0;
  form;
  testEmail;
  schedule;
  readonly sources = ['all', 'web', 'mobile', 'api', 'widget', 'other'];
  readonly outcomes = ['accepted', 'failed', 'unknown', 'skipped', 'pending', 'sending'];
  constructor(private fb: FormBuilder, private http: HttpService, public access: PermissionService, private sanitizer: DomSanitizer) {
    this.form = this.fb.nonNullable.group({ name: ['', [Validators.required, Validators.maxLength(120)]], subject: ['', [Validators.required, Validators.maxLength(200), Validators.pattern(/^[^\r\n]+$/)]],
      preheader: ['', Validators.maxLength(200)], source: ['all', Validators.required], body: ['', [Validators.required, Validators.maxLength(50000)]] });
    this.testEmail = this.fb.nonNullable.control('', [Validators.required, Validators.email]);
    this.schedule = this.fb.nonNullable.control('');
  }
  get canCreate(): boolean { return this.access.can('customer.notification.create'); }
  get canSend(): boolean { return this.access.can('customer.notification.send'); }
  get editable(): boolean { return this.canCreate && (!this.selected || this.selected.status === 'draft'); }
  get saved(): boolean { return !!this.selected && !this.form.dirty; }
  ngOnInit(): void {
    this.refresh();
    if (!this.canCreate) this.form.disable({ emitEvent: false });
    this.form.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => { this.preview = null; this.confirmation = null; });
  }
  refresh(page = this.pagination.page): void {
    this.loading = true;
    this.http.get(`admin/email-campaigns?page=${page}&limit=${this.pagination.limit}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: res => { this.campaigns = res.data.docs; this.pagination = res.data; this.loading = false; },
      error: () => { this.loading = false; this.error = 'Unable to load campaigns. Please retry.'; }
    });
  }
  newDraft(): void {
    if (this.busy || this.form.dirty) return;
    this.sequence++;
    this.selected = null; this.preview = null; this.confirmation = null; this.cancelConfirmation = false;
    this.stats = {}; this.recipients = []; this.error = ''; this.message = '';
    this.form.enable(); this.form.reset({ name: '', subject: '', preheader: '', body: '', source: 'all' });
  }
  discard(): void {
    if (this.busy) return;
    this.form.markAsPristine();
    if (this.selected) this.open(this.selected); else this.newDraft();
  }
  open(campaign: any): void {
    if (this.busy || this.form.dirty) return;
    const seq = ++this.sequence;
    this.busy = true; this.error = ''; this.message = ''; this.confirmation = null; this.cancelConfirmation = false;
    forkJoin({ detail: this.http.get(`admin/email-campaigns/${campaign._id}`), preview: this.http.get(`admin/email-campaigns/${campaign._id}/preview`) })
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: res => {
          if (seq !== this.sequence) return;
          this.selected = res.detail.data.campaign; this.stats = res.detail.data.stats;
          this.form.reset({ name: this.selected.name, subject: this.selected.subject, preheader: this.selected.preheader, source: this.selected.source, body: this.selected.body });
          if (this.editable) this.form.enable(); else this.form.disable();
          // HTML comes from the backend allowlist renderer and is isolated in a sandboxed iframe.
          this.preview = this.sanitizer.bypassSecurityTrustHtml(res.preview.data.html);
          this.audienceCount = res.preview.data.audience_count; this.busy = false;
          this.loadRecipients(1);
        }, error: error => { this.busy = false; this.setError(error); }
      });
  }
  save(): void {
    this.form.markAllAsTouched();
    if (this.busy || !this.editable || this.form.invalid) return;
    this.busy = true; this.error = ''; this.message = '';
    const data = this.form.getRawValue();
    this.form.disable({ emitEvent: false });
    const request = this.selected ? this.http.put(`admin/email-campaigns/${this.selected._id}`, { ...data, revision: this.selected.revision }) : this.http.post('admin/email-campaigns', data);
    request.pipe(takeUntil(this.destroy$)).subscribe({ next: res => { this.busy = false; this.form.markAsPristine(); this.open(res.data); this.refresh(); }, error: error => { this.busy = false; this.setError(error); } });
  }
  sendTest(): void {
    if (this.busy || !this.saved || this.testEmail.invalid || !this.canCreate) return;
    this.busy = true; this.error = ''; this.message = '';
    this.http.post(`admin/email-campaigns/${this.selected._id}/test`, { email: this.testEmail.value }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.busy = false; this.message = 'Test email accepted by the mail server. Check your mailbox before sending.'; }, error: error => { this.busy = false; this.setError(error); }
    });
  }
  prepare(): void {
    if (this.busy || !this.saved || !this.canSend || this.selected.status !== 'draft') return;
    this.busy = true; this.error = ''; this.message = '';
    this.http.post(`admin/email-campaigns/${this.selected._id}/prepare`, {}).pipe(takeUntil(this.destroy$)).subscribe({
      next: res => { this.busy = false; this.confirmation = res.data; }, error: error => { this.busy = false; this.setError(error); }
    });
  }
  queue(): void {
    if (this.busy || !this.confirmation || !this.saved) return;
    const date = this.schedule.value ? new Date(this.schedule.value) : null;
    if (date && (!this.access.can('customer.notification.schedule') || !Number.isFinite(date.getTime()) || date.getTime() <= Date.now())) { this.error = 'Choose a future time to schedule this campaign.'; return; }
    this.busy = true; this.error = '';
    this.http.post(`admin/email-campaigns/${this.selected._id}/queue`, { token: this.confirmation.token, revision: this.confirmation.revision, ...(date && { scheduled_at: date.toISOString() }) })
      .pipe(takeUntil(this.destroy$)).subscribe({ next: res => { this.busy = false; this.confirmation = null; this.open(res.data); this.refresh(); }, error: error => { this.busy = false; this.confirmation = null; this.setError(error); } });
  }
  cancel(): void {
    if (this.busy || !this.cancelConfirmation || !this.access.can('customer.notification.cancel')) return;
    this.busy = true; this.error = '';
    this.http.post(`admin/email-campaigns/${this.selected._id}/cancel`, {}).pipe(takeUntil(this.destroy$)).subscribe({
      next: res => { this.busy = false; this.cancelConfirmation = false; this.open(res.data); this.refresh(); }, error: error => { this.busy = false; this.setError(error); }
    });
  }
  loadRecipients(page: number): void {
    if (!this.selected) return;
    const selectedId = this.selected._id;
    this.http.get(`admin/email-campaigns/${selectedId}/recipients?page=${page}&limit=${this.recipientPagination.limit}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: res => { if (this.selected?._id !== selectedId) return; this.recipients = res.data.docs; this.recipientPagination = res.data; }, error: () => { this.error = 'Unable to load recipient results. Refresh to retry.'; }
    });
  }
  private setError(error: any): void { if (this.editable) this.form.enable({ emitEvent: false }); this.error = error?.error?.message || 'The request could not be completed. Refresh the campaign before retrying.'; }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
