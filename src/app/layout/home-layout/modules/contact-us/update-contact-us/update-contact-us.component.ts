import { NgFor, NgIf, DatePipe, UpperCasePipe } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from 'app/core/services/api.service';
import { PermissionService } from 'app/core/services/permission.service';
import { PaginationComponent } from '../../../includes/pagination/pagination.component';
import { Subject, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-update-contact-us',
  imports: [MatDialogModule, MatFormFieldModule, MatInputModule, NgFor, NgIf, DatePipe,
    UpperCasePipe, ReactiveFormsModule, MatSelectModule, MatButtonModule, MatIconModule, PaginationComponent],
  templateUrl: './update-contact-us.component.html',
  styleUrl: './update-contact-us.component.scss',
})
export class UpdateContactUsComponent implements OnInit, OnDestroy {
  formGroup!: FormGroup;
  composer!: FormGroup;
  saving = false;
  sending = false;
  loading = false;
  error = '';
  threadError = '';
  sendError = '';
  changed = false;
  messages: any[] = [];
  pagination: any = null;
  page = 1;
  mode: 'reply' | 'note' = 'reply';
  private requestId: string | null = null;
  private attemptedContent = '';
  private attemptedMode = '';
  private destroy$ = new Subject<void>();
  get canEdit(): boolean { return this.access.can('contacts.update'); }
  get reference(): string { return 'CON-' + String(this.data._id).toUpperCase(); }
  get canReply(): boolean { return !!this.data.email && !['archived', 'spam'].includes(this.data.status); }
  get phoneLink(): string { return 'tel:' + String(this.data?.phone || '').replace(/[^+0-9]/g, ''); }
  get timeline(): any[] {
    const legacy = this.page === this.pagination?.totalPages || !this.pagination?.totalDocs ? (this.data.notes || []) : [];
    return [...legacy, ...this.messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }
  constructor(private fb: FormBuilder, @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<UpdateContactUsComponent>, private apiService: ApiService,
    public access: PermissionService, private toastr: ToastrService) {}
  ngOnInit(): void {
    this.formGroup = this.fb.group({ _id: [this.data._id, Validators.required],
      status: [this.data.status, Validators.required], priority: [this.data.priority || 'normal', Validators.required] });
    this.composer = this.fb.group({ content: ['', [Validators.required, Validators.maxLength(10000)]] });
    if (!this.canEdit) this.formGroup.disable();
    this.mode = this.canReply ? 'reply' : 'note';
    this.loadThread();
  }
  loadThread(page = 1): void {
    this.page = page;
    this.loading = true;
    this.formGroup.disable({ emitEvent: false });
    this.threadError = '';
    this.apiService.contactUsThread(this.data._id, page).pipe(takeUntil(this.destroy$)).subscribe({
      next: res => {
        if (page !== this.page) return;
        this.data = res.data.contact;
        this.messages = res.data.messages.docs;
        this.pagination = { ...res.data.messages };
        if (!this.formGroup.dirty) {
          this.formGroup.patchValue({ status: this.data.status, priority: this.data.priority || 'normal' });
          this.formGroup.markAsPristine();
        }
        this.loading = false;
        if (this.canEdit) this.formGroup.enable({ emitEvent: false });
      },
      error: () => { if (page === this.page) { this.loading = false; this.threadError = 'Unable to load the conversation. Please retry.'; } },
    });
  }
  setMode(mode: 'reply' | 'note'): void {
    if (this.sending) return;
    this.mode = mode;
    this.sendError = '';
  }
  onSubmit(): void {
    if (this.saving || this.sending || !this.canEdit || this.loading || this.threadError) return;
    this.formGroup.markAllAsTouched();
    if (this.formGroup.invalid) return;
    this.saving = true;
    this.formGroup.disable({ emitEvent: false });
    this.error = '';
    this.dialogRef.disableClose = true;
    this.apiService.updateContactUsStatus(this.formGroup.getRawValue()).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.changed = true; this.saving = false; this.dialogRef.disableClose = false;
        this.formGroup.markAsPristine(); this.toastr.success('Enquiry updated'); this.loadThread(this.page); },
      error: () => { this.saving = false; this.formGroup.enable({ emitEvent: false }); this.dialogRef.disableClose = false; this.error = 'Unable to save. Refresh the conversation and try again.'; },
    });
  }
  send(): void {
    if (this.sending || this.saving || this.loading || this.threadError || !this.canEdit || (this.mode === 'reply' && !this.canReply)) return;
    const content = String(this.composer.value.content || '').trim();
    this.composer.markAllAsTouched();
    if (!content || this.composer.invalid) return;
    if (!this.requestId || this.attemptedContent !== content || this.attemptedMode !== this.mode) {
      this.requestId = crypto.randomUUID();
      this.attemptedContent = content;
      this.attemptedMode = this.mode;
    }
    this.sending = true;
    this.formGroup.disable({ emitEvent: false });
    this.sendError = '';
    this.dialogRef.disableClose = true;
    this.apiService.addContactUsMessage(this.data._id, { request_id: this.requestId, kind: this.mode, content })
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: res => {
          this.changed = true;
          this.sending = false;
          this.dialogRef.disableClose = false;
          const delivery = res.data.delivery_status;
          if (delivery === 'failed') {
            this.sendError = 'Email was not sent. Check SMTP settings, then send again.';
            this.requestId = null;
          } else if (delivery === 'unknown' || delivery === 'sending') {
            this.sendError = 'Sending could not be confirmed. Check the support mailbox before sending another reply.';
          } else {
            this.composer.reset({ content: '' });
            this.requestId = null;
            this.toastr.success(this.mode === 'note' ? 'Internal remark added' : 'Reply accepted by the mail server');
          }
          this.loadThread();
        },
        error: () => { this.sending = false; this.formGroup.enable({ emitEvent: false }); this.dialogRef.disableClose = false;
          this.sendError = 'Unable to complete the request. Your draft is preserved. Retry the same draft to check its send status.'; },
      });
  }
  close(): void { if (!this.saving && !this.sending) this.dialogRef.close(this.changed); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
