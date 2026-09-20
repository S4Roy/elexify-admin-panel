import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ZohoBooksService } from 'app/core/services/zoho-books.service';
import { HelpersService } from 'app/core/services/helpers.service';

@Component({
  selector: 'app-zoho-books',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './zoho-books.component.html',
  styles: [`:host { display:block; max-width:1100px; margin:auto; padding:24px; }
    section { background:white; border:1px solid #e2e8f0; border-radius:12px; padding:20px; margin:18px 0; }
    h1 { font-size:24px; font-weight:600; } h2 { font-size:18px; font-weight:600; margin-bottom:12px; }
    label { display:block; margin:12px 0; } input, select, textarea { border:1px solid #94a3b8; border-radius:6px; padding:8px; margin:4px; max-width:100%; }
    textarea { display:block; width:100%; } button { background:#0f172a; color:white; padding:8px 14px; border-radius:6px; margin:4px; }
    button:disabled { opacity:.45; } table { width:100%; text-align:left; } td,th { padding:8px; border-bottom:1px solid #e2e8f0; overflow-wrap:anywhere; }
    .error { color:#b91c1c; } .muted { color:#475569; } .scroll { overflow:auto; }`],
})
export class ZohoBooksComponent implements OnInit {
  connection: any = null;
  counts: any[] = [];
  organizations: any[] = [];
  jobs: any[] = [];
  logs: any[] = [];
  busy = false;
  error = '';
  region = 'in';
  organizationId = '';
  enabled = false;
  taxMap = '{}';
  kind = 'item';
  ids = '';
  page = 1;
  total = 0;
  filter = '';
  logPage = 1;
  reason = '';
  accountingId = '';
  accountingKind = 'item';
  hsn = '';
  unit = '';
  taxId = '';
  gstin = '';
  gstTreatment = 'consumer';

  constructor(private api: ZohoBooksService, private route: ActivatedRoute, private router: Router,
    private toastr: ToastrService, private helpers: HelpersService) {}

  get canConfigure() { return this.helpers.role() === 'superadmin'; }

  ngOnInit(): void {
    const query = this.route.snapshot.queryParamMap;
    const code = query.get('code');
    const state = query.get('state');
    if (code || query.has('error')) {
      void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
      if (code && state) this.run(this.api.callback(state, code), () => this.load());
      else { this.error = 'Zoho authorization was cancelled or rejected.'; this.load(); }
    } else this.load();
  }

  run(request: Observable<any>, success: (response: any) => void): void {
    if (this.busy) return;
    this.busy = true;
    this.error = '';
    request.pipe(finalize(() => this.busy = false)).subscribe({
      next: success,
      error: response => this.error = response?.error?.message || 'Request failed. Refresh and try again.',
    });
  }

  load(): void {
    this.api.status().subscribe({ next: response => {
      this.connection = response.data.connection;
      this.counts = response.data.counts;
      this.region = this.connection?.region || 'in';
      this.organizationId = this.connection?.organization_id || '';
      this.enabled = !!this.connection?.enabled;
      this.taxMap = JSON.stringify(this.connection?.tax_map || {}, null, 2);
      if (this.connection?.connected) {
        if (this.canConfigure) this.api.organizations().subscribe({ next: result => this.organizations = result.data, error: () => this.error = 'Could not load organizations.' });
      }
      if (this.connection?.organization_id) { this.loadJobs(); this.loadLogs(); }
    }, error: () => this.error = 'Unable to load Zoho connection status.' });
  }

  connect(): void { this.run(this.api.connect(this.region), response => window.location.assign(response.data.url)); }
  disconnect(): void { this.run(this.api.disconnect(this.reason), () => { this.reason = ''; this.load(); }); }
  save(): void {
    let taxMap;
    try { taxMap = JSON.parse(this.taxMap); } catch { this.error = 'Tax mappings must be valid JSON.'; return; }
    this.run(this.api.configure({ organization_id: this.organizationId, enabled: this.enabled, tax_map: taxMap }), () => { this.toastr.success('Configuration saved'); this.load(); });
  }
  sync(): void {
    const ids = [...new Set(this.ids.split(/[\s,]+/).filter(Boolean))];
    if (!ids.length || ids.length > 100 || ids.some(id => !/^[a-f0-9]{24}$/i.test(id))) { this.error = 'Enter 1–100 valid local record IDs.'; return; }
    this.run(this.api.sync(this.kind, ids), () => { this.toastr.success('Synchronization queued'); this.loadJobs(); });
  }
  retry(id: string): void { this.run(this.api.retry(id), () => this.loadJobs()); }
  loadJobs(): void {
    this.api.jobs(this.page, this.filter).subscribe({ next: response => { this.jobs = response.data.jobs; this.total = response.data.total; }, error: () => this.error = 'Unable to load sync jobs.' });
  }
  loadLogs(): void { this.api.logs(this.logPage).subscribe({ next: response => this.logs = response.data, error: () => this.error = 'Unable to load integration logs.' }); }
  saveAccounting(): void {
    const metadata = this.accountingKind === 'contact' ? { ...(this.gstin ? { gstin: this.gstin } : {}), gst_treatment: this.gstTreatment } :
      { ...(this.hsn ? { hsn_sac: this.hsn } : {}), ...(this.unit ? { accounting_unit: this.unit } : {}), ...(this.taxId ? { zoho_tax_id: this.taxId } : {}) };
    this.run(this.api.accounting({ kind: this.accountingKind, id: this.accountingId, ...metadata }), () => this.toastr.success('Accounting metadata saved'));
  }
}
