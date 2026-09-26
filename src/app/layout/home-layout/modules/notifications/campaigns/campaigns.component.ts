import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Subject, debounceTime, distinctUntilChanged, firstValueFrom, switchMap, takeUntil, of, catchError } from 'rxjs';
import { ApiService } from 'app/core/services/api.service';
import { InventoryService } from 'app/core/services/inventory.service';
import { HelpersService } from 'app/core/services/helpers.service';

// Destinations are limited to the routes the released app accepts
// (safeNotificationRoute in elexify-mobile, validRoute on the server).
type DestinationKind = 'notifications' | 'categories' | 'orders' | 'products' | 'product' | 'security';
const DESTINATIONS: { value: DestinationKind; label: string; icon: string; route?: string }[] = [
  { value: 'notifications', label: 'Notification inbox', icon: 'notifications', route: '/notifications' },
  { value: 'product', label: 'A specific product', icon: 'inventory_2' },
  { value: 'products', label: 'All products', icon: 'storefront', route: '/products' },
  { value: 'categories', label: 'Categories', icon: 'category', route: '/(tabs)/categories' },
  { value: 'orders', label: 'My orders', icon: 'receipt_long', route: '/orders' },
  { value: 'security', label: 'Account security', icon: 'shield', route: '/account/security' },
];
const EXPIRY_PRESETS = [
  { label: '24 hours', hours: 24 },
  { label: '3 days', hours: 72 },
  { label: '7 days', hours: 168 },
  { label: '30 days', hours: 720 },
];
const TITLE_SOFT_LIMIT = 50;
const BODY_SOFT_LIMIT = 150;
const MAX_CUSTOMERS = 100;
const MAX_IMAGE_BYTES = 1024 * 1024;

type CustomerOption = { _id: string; name: string; contact: string; devices: number };
type ProductOption = { slug: string; name: string; image: string | null };

@Component({
  selector: 'app-push-campaigns',
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './campaigns.component.html',
  styleUrl: './campaigns.component.scss',
})
export class CampaignsComponent implements OnInit, OnDestroy {
  readonly destinations = DESTINATIONS;
  readonly expiryPresets = EXPIRY_PRESETS;
  readonly titleSoftLimit = TITLE_SOFT_LIMIT;
  readonly bodySoftLimit = BODY_SOFT_LIMIT;
  readonly maxCustomers = MAX_CUSTOMERS;

  items: any[] = [];
  cursor: string | null = null;
  loadingList = true;
  busy = false;
  uploading = false;
  error = '';
  notice = '';

  form = this.emptyForm();
  selected: any = null;
  preview: any = null;
  stats: any = null;
  confirmed = false;
  scheduledAt = '';
  testCustomer: CustomerOption | null = null;

  productQuery = '';
  productResults: ProductOption[] = [];
  customerQuery = '';
  customerResults: CustomerOption[] = [];
  testQuery = '';
  testResults: CustomerOption[] = [];

  private productSearch$ = new Subject<string>();
  private customerSearch$ = new Subject<string>();
  private testSearch$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private api: ApiService,
    private inventory: InventoryService,
    public helper: HelpersService,
  ) {}

  ngOnInit() {
    void this.load();
    this.search(this.productSearch$, (q) => this.findProducts(q), (r) => (this.productResults = r));
    this.search(this.customerSearch$, (q) => this.findCustomers(q), (r) => (this.customerResults = r));
    this.search(this.testSearch$, (q) => this.findCustomers(q), (r) => (this.testResults = r));
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  can(action: string) {
    return this.helper.can(`customer.notification.${action}`);
  }

  // ---- form helpers -------------------------------------------------------

  private emptyForm() {
    return {
      title: '',
      body: '',
      image_url: '',
      destination: 'notifications' as DestinationKind,
      product: null as ProductOption | null,
      audience: 'all' as 'all' | 'specific',
      customers: [] as CustomerOption[],
      expiryHours: 168 as number | null,
      expires_at: '',
    };
  }

  get route(): string {
    if (this.form.destination === 'product') return this.form.product ? `/products/${this.form.product.slug}` : '';
    return DESTINATIONS.find((d) => d.value === this.form.destination)?.route ?? '/notifications';
  }

  get destinationLabel(): string {
    if (this.form.destination === 'product') return this.form.product?.name ?? 'Choose a product';
    return DESTINATIONS.find((d) => d.value === this.form.destination)?.label ?? '';
  }

  get expiryDate(): Date | null {
    if (this.form.expiryHours) return new Date(Date.now() + this.form.expiryHours * 3600000);
    return this.form.expires_at ? new Date(this.form.expires_at) : null;
  }

  get formProblem(): string {
    if (!this.form.title.trim()) return 'Add a title.';
    if (!this.form.body.trim()) return 'Add a message.';
    if (this.form.image_url && !/^https:\/\//i.test(this.form.image_url)) return 'The image link must start with https://';
    if (!this.route) return 'Choose the product customers should open.';
    if (this.form.audience === 'specific' && !this.form.customers.length) return 'Add at least one customer.';
    const expiry = this.expiryDate;
    if (!expiry || isNaN(expiry.getTime())) return 'Choose when the campaign expires.';
    if (expiry.getTime() <= Date.now()) return 'The expiry must be in the future.';
    if (expiry.getTime() > Date.now() + 90 * 86400000) return 'The expiry can be at most 90 days away.';
    return '';
  }

  setDestination(value: DestinationKind) {
    this.form.destination = value;
    if (value !== 'product') {
      this.form.product = null;
      this.productQuery = '';
      this.productResults = [];
    }
  }

  setExpiry(hours: number | null) {
    this.form.expiryHours = hours;
    if (hours === null && !this.form.expires_at) {
      this.form.expires_at = this.localInput(new Date(Date.now() + 7 * 86400000));
    }
  }

  resetForm() {
    this.form = this.emptyForm();
    this.productQuery = '';
    this.productResults = [];
    this.customerQuery = '';
    this.customerResults = [];
  }

  private localInput(date: Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  // ---- image upload -------------------------------------------------------

  async onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      this.error = 'Use a JPG, PNG or WebP image.';
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      this.error = 'Keep the image under 1 MB so it loads quickly on phones.';
      return;
    }
    this.uploading = true;
    this.error = '';
    try {
      const r: any = await firstValueFrom(this.inventory.submitMedia({ file, ref_type: 'push_campaigns' }));
      this.form.image_url = r?.data?.url ?? '';
      if (!this.form.image_url) throw new Error('Upload finished without an image link.');
    } catch (e: any) {
      this.error = e?.error?.message || e?.message || 'The image upload failed. Please retry.';
    } finally {
      this.uploading = false;
    }
  }

  // ---- search pickers -----------------------------------------------------

  private search<T>(source: Subject<string>, find: (q: string) => Promise<T[]>, apply: (r: T[]) => void) {
    source
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((q) => (q.trim().length < 2 ? of([] as T[]) : find(q.trim()).catch(() => [] as T[]))),
        catchError(() => of([] as T[])),
        takeUntil(this.destroy$),
      )
      .subscribe(apply);
  }

  onProductQuery(q: string) { this.productSearch$.next(q); }
  onCustomerQuery(q: string) { this.customerSearch$.next(q); }
  onTestQuery(q: string) { this.testSearch$.next(q); }

  private async findProducts(q: string): Promise<ProductOption[]> {
    const params = new URLSearchParams({ search_key: q, status: 'active', limit: '8', page: '1' });
    const r: any = await firstValueFrom(this.inventory.productList(params));
    return (r?.data?.docs ?? [])
      .filter((p: any) => p?.slug && /^[A-Za-z0-9_-]+$/.test(p.slug))
      .map((p: any) => ({ slug: p.slug, name: p.name, image: p.images?.[0]?.url ?? null }));
  }

  private async findCustomers(q: string): Promise<CustomerOption[]> {
    const params = new URLSearchParams({ search_key: q, status: 'active', limit: '8', page: '1' });
    const r: any = await firstValueFrom(this.api.customerList(params));
    return (r?.data?.docs ?? []).map((c: any) => ({
      _id: c._id,
      name: c.name || 'Unnamed customer',
      contact: [c.mobile ? `${c.phone_code ?? ''} ${c.mobile}`.trim() : '', c.email].filter(Boolean).join(' · '),
      devices: c.push_device_count ?? 0,
    }));
  }

  pickProduct(product: ProductOption) {
    this.form.product = product;
    this.productQuery = '';
    this.productResults = [];
  }

  addCustomer(customer: CustomerOption) {
    if (!this.form.customers.some((c) => c._id === customer._id) && this.form.customers.length < MAX_CUSTOMERS) {
      this.form.customers = [...this.form.customers, customer];
    }
    this.customerQuery = '';
    this.customerResults = [];
  }

  removeCustomer(id: string) {
    this.form.customers = this.form.customers.filter((c) => c._id !== id);
  }

  pickTestCustomer(customer: CustomerOption) {
    this.testCustomer = customer;
    this.testQuery = '';
    this.testResults = [];
  }

  // ---- API ---------------------------------------------------------------

  private async run(fn: () => Promise<void>) {
    this.busy = true;
    this.error = '';
    this.notice = '';
    try {
      await fn();
    } catch (e: any) {
      this.error = e?.error?.message || e?.message || 'The request failed. Please retry.';
    } finally {
      this.busy = false;
    }
  }

  async load(more = false) {
    if (!more) this.loadingList = true;
    await this.run(async () => {
      const r: any = await firstValueFrom(this.api.pushCampaignList(more ? this.cursor : null));
      this.items = more ? [...this.items, ...r.data.items] : r.data.items;
      this.cursor = r.data.next_cursor;
    });
    this.loadingList = false;
  }

  async create() {
    const problem = this.formProblem;
    if (problem) {
      this.error = problem;
      return;
    }
    await this.run(async () => {
      const f = this.form;
      const r: any = await firstValueFrom(
        this.api.pushCampaignCreate({
          title: f.title.trim(),
          body: f.body.trim(),
          image_url: f.image_url.trim(),
          route: this.route,
          audience: f.audience,
          expires_at: this.expiryDate!.toISOString(),
          ...(f.audience === 'specific' ? { customer_ids: f.customers.map((c) => c._id) } : {}),
        }),
      );
      this.items = [r.data.campaign, ...this.items];
      this.resetForm();
      await this.openCampaign(r.data.campaign);
      this.notice = 'Draft created. Check the audience below, then send or schedule it.';
    });
  }

  async openCampaign(item: any) {
    this.selected = item;
    this.preview = null;
    this.stats = null;
    this.confirmed = false;
    this.scheduledAt = '';
    this.testCustomer = null;
    if (item.status !== 'DRAFT' && this.can('analytics')) {
      try {
        const r: any = await firstValueFrom(this.api.pushCampaignAnalytics(item._id));
        this.stats = r.data.stats;
      } catch {
        this.stats = null;
      }
    }
    setTimeout(() => document.getElementById('campaign-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  closeCampaign() {
    this.selected = null;
  }

  async prepare() {
    await this.run(async () => {
      const r: any = await firstValueFrom(this.api.pushCampaignAction(this.selected._id, 'preview', {}));
      this.preview = r.data;
      this.confirmed = false;
    });
  }

  async action(action: 'send' | 'schedule' | 'cancel' | 'test') {
    if ((action === 'send' || action === 'schedule') && !this.confirmed) {
      this.error = 'Confirm the message and audience first.';
      return;
    }
    if (action === 'send' && !window.confirm(`Send "${this.selected.title}" to ${this.preview?.recipient_count} customers now? This can't be undone.`)) return;
    if (action === 'cancel' && !window.confirm('Cancel this campaign? Sends already in progress may still finish.')) return;
    await this.run(async () => {
      const payload =
        action === 'test'
          ? { customer_id: this.testCustomer?._id }
          : action === 'cancel'
            ? {}
            : {
                confirmation: this.preview?.confirmation,
                ...(action === 'schedule' ? { scheduled_at: new Date(this.scheduledAt).toISOString() } : {}),
              };
      const r: any = await firstValueFrom(this.api.pushCampaignAction(this.selected._id, action, payload));
      if (r.data.campaign) {
        this.selected = r.data.campaign;
        this.items = this.items.map((c) => (c._id === this.selected._id ? this.selected : c));
      }
      this.confirmed = false;
      if (action !== 'test') this.preview = null;
      this.notice =
        action === 'test'
          ? `Test sent to ${this.testCustomer?.name}.`
          : action === 'send'
            ? 'Campaign is sending. Results appear here as customers receive it.'
            : action === 'schedule'
              ? 'Campaign scheduled.'
              : 'Campaign cancelled.';
    });
  }

  get minSchedule() {
    return this.localInput(new Date(Date.now() + 5 * 60000));
  }

  statusClass(status: string) {
    return (status || '').toLowerCase();
  }

  readRate(stats: any) {
    return stats?.requested ? Math.round((stats.read / stats.requested) * 100) : 0;
  }

  trackById(_: number, item: any) {
    return item._id;
  }
}
