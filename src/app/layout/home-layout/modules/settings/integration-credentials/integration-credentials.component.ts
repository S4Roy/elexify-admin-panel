import { NgFor, NgIf, TitleCasePipe, DatePipe, KeyValuePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'app/core/services/api.service';
import { ReasonDialogComponent } from '../../../includes/reason-dialog/reason-dialog.component';

interface CredentialField { configured: boolean; masked: string | null; secret: boolean; }
interface IntegrationItem {
  provider: string; label: string; enabled: boolean; configured: boolean;
  fields: Record<string, CredentialField>; last_tested_at: string | null;
  last_test_status: 'success' | 'failed' | null; last_test_message: string | null;
}

@Component({
  selector: 'app-integration-credentials',
  imports: [NgFor, NgIf, FormsModule, MatIconModule, TitleCasePipe, DatePipe, KeyValuePipe, RouterLink],
  templateUrl: './integration-credentials.component.html',
  styleUrl: './integration-credentials.component.scss',
})
export class IntegrationCredentialsComponent implements OnInit {
  integrations: IntegrationItem[] = [];
  drafts: Record<string, Record<string, string>> = {};
  busy: Record<string, boolean> = {};
  loading = true;
  show: Record<string, boolean> = {};

  constructor(private api: ApiService, private toastr: ToastrService, private dialog: MatDialog) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.api.integrationCredentialList().subscribe({
      next: (res: any) => {
        this.integrations = res?.data ?? [];
        for (const item of this.integrations) this.drafts[item.provider] ??= {};
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  save(item: IntegrationItem): void {
    this.busy[item.provider] = true;
    const credentials = Object.fromEntries(Object.entries(this.drafts[item.provider] || {}).filter(([, value]) => value?.trim()));
    this.api.updateIntegrationCredential(item.provider, { enabled: item.enabled, credentials }).subscribe({
      next: () => { this.toastr.success(`${item.label} credentials updated`); this.drafts[item.provider] = {}; this.busy[item.provider] = false; this.load(); },
      error: () => { this.busy[item.provider] = false; },
    });
  }

  test(item: IntegrationItem): void {
    this.busy[item.provider] = true;
    this.api.testIntegrationCredential(item.provider).subscribe({
      next: (res: any) => { this.toastr.success(res?.message || 'Connection verified'); this.busy[item.provider] = false; this.load(); },
      error: () => { this.busy[item.provider] = false; this.load(); },
    });
  }

  clear(item: IntegrationItem): void {
    this.dialog.open(ReasonDialogComponent, {
      disableClose: true,
      data: {
        title: `Remove ${item.label} managed credentials?`,
        message: 'The application will return to environment-based configuration. Any cached access token will be invalidated.',
        reasonLabel: 'Reason for removal', minLength: 10, confirmText: 'Remove credentials',
      },
    }).afterClosed().subscribe((result) => {
      if (!result?.confirm) return;
      this.busy[item.provider] = true;
      this.api.clearIntegrationCredential(item.provider, result.reason).subscribe({
        next: () => { this.toastr.success('Managed credentials removed'); this.busy[item.provider] = false; this.load(); },
        error: () => { this.busy[item.provider] = false; },
      });
    });
  }

  fieldLabel(key: string): string { return key.replaceAll('_', ' '); }
}
