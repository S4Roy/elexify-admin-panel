import { Component, Inject, Optional } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ToastrService } from 'ngx-toastr';

export interface NewAnnouncementData {
  announcement?: any | null;
}

@Component({
  selector: 'app-new-announcement',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './new-announcement.component.html',
  styleUrl: './new-announcement.component.scss',
})
export class NewAnnouncementComponent {
  formGroup: FormGroup;
  isEdit: boolean;

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: NewAnnouncementData,
    @Optional() private dialogRef: MatDialogRef<NewAnnouncementComponent>
  ) {
    const a = this.data?.announcement;
    this.isEdit = !!a?._id;
    this.formGroup = this.fb.group({
      message: [a?.message ?? ''],
      icon: [a?.icon ?? ''],
      link: [a?.link ?? ''],
      target: [a?.target ?? '_self'],
      desktop_content: [a?.desktop_content ?? ''],
      mobile_content: [a?.mobile_content ?? ''],
      dismissible: [a?.dismissible ?? true],
      enabled: [a?.enabled ?? true],
      schedule_start: [this.toDatetimeLocal(a?.schedule?.startAt)],
      schedule_end: [this.toDatetimeLocal(a?.schedule?.endAt)],
    });
  }

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

  onSubmit() {
    const raw = this.formGroup.getRawValue();
    if (!raw.message?.trim()) {
      this.toastr.error('Message is required');
      return;
    }
    const payload: any = {
      ...(this.data?.announcement ?? {}),
      message: raw.message,
      icon: raw.icon || '',
      link: raw.link || '',
      target: raw.target || '_self',
      desktop_content: raw.desktop_content || '',
      mobile_content: raw.mobile_content || '',
      dismissible: raw.dismissible ?? true,
      enabled: raw.enabled ?? true,
      schedule: {
        startAt: this.fromDatetimeLocal(raw.schedule_start),
        endAt: this.fromDatetimeLocal(raw.schedule_end),
      },
    };
    this.dialogRef?.close(payload);
  }

  closeDialog() {
    this.dialogRef?.close();
  }
}
