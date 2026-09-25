import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService } from 'app/core/services/api.service';
import { HelpersService } from 'app/core/services/helpers.service';

@Component({
  selector: 'app-push-campaigns', imports: [CommonModule, FormsModule],
  templateUrl: './campaigns.component.html',
  styles: [`.campaigns { padding:24px; max-width:1100px } .card { padding:20px; margin:16px 0; border:1px solid #ddd; border-radius:12px } label { display:block; margin:12px 0 } input,textarea,select { display:block; padding:10px; width:100%; max-width:650px; border:1px solid #bbb; border-radius:6px } button { margin:6px; padding:8px 14px } table { width:100% } th,td { text-align:left; padding:10px } .error { color:#b42318 } img { max-width:280px }`],
})
export class CampaignsComponent implements OnInit {
  items: any[] = []; cursor: string | null = null; busy = false; error = '';
  form = { title: '', body: '', image_url: '', route: '/notifications', audience: 'all', customers: '', expires_at: '' };
  selected: any = null; preview: any = null; stats: any = null; confirmed = false; scheduledAt = ''; testCustomer = '';
  constructor(private api: ApiService, public helper: HelpersService) {}
  ngOnInit() { void this.load(); }
  can(action: string) { return this.helper.can(`customer.notification.${action}`); }
  async run(fn: () => Promise<void>) { this.busy = true; this.error = ''; try { await fn(); } catch (e: any) { this.error = e?.error?.message || e?.message || 'The request failed. Please retry.'; } finally { this.busy = false; } }
  async load(more = false) { await this.run(async () => { const r: any = await firstValueFrom(this.api.pushCampaignList(more ? this.cursor : null)); this.items = more ? [...this.items, ...r.data.items] : r.data.items; this.cursor = r.data.next_cursor; }); }
  async create() { await this.run(async () => {
    const { customers, ...form } = this.form;
    const r: any = await firstValueFrom(this.api.pushCampaignCreate({ ...form, expires_at: new Date(form.expires_at).toISOString(), ...(form.audience === 'specific' ? { customer_ids: customers.split(/[\s,]+/).filter(Boolean) } : {}) }));
    this.selected = r.data.campaign; this.preview = null; this.stats = null; this.confirmed = false;
    this.items = [this.selected, ...this.items];
  }); }
  async select(item: any) { this.selected = item; this.preview = null; this.stats = null; this.confirmed = false;
    if (this.can('analytics')) await this.run(async () => { const r: any = await firstValueFrom(this.api.pushCampaignAnalytics(item._id)); this.stats = r.data.stats; });
  }
  async prepare() { await this.run(async () => { const r: any = await firstValueFrom(this.api.pushCampaignAction(this.selected._id, 'preview', {})); this.preview = r.data; this.confirmed = false; }); }
  async action(action: 'send' | 'schedule' | 'cancel' | 'test') { await this.run(async () => {
    if ((action === 'send' || action === 'schedule') && !this.confirmed) throw new Error('Confirm the previewed audience first.');
    const payload = action === 'test' ? { customer_id: this.testCustomer } : action === 'cancel' ? {} : { confirmation: this.preview?.confirmation, ...(action === 'schedule' ? { scheduled_at: new Date(this.scheduledAt).toISOString() } : {}) };
    const r: any = await firstValueFrom(this.api.pushCampaignAction(this.selected._id, action, payload));
    if (r.data.campaign) { this.selected = r.data.campaign; this.items = this.items.map(c => c._id === this.selected._id ? this.selected : c); }
    this.confirmed = false; if (action !== 'test') this.preview = null;
  }); }
}
