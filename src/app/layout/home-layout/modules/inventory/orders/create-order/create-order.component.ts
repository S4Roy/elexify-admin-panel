import { Subject, Subscription, debounceTime, takeUntil } from 'rxjs';
import { CustomerAddressDialogComponent } from '../../../customers/customer-details/customer-address-dialog.component';
import { CreateOrderCustomerComponent } from './create-order-customer.component';
import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { HttpService } from 'app/core/services/http.service';

@Component({
  selector: 'app-create-order',
  imports: [CommonModule, FormsModule, MatDialogModule, NgSelectModule],
  templateUrl: './create-order.component.html',
  styleUrl: './create-order.component.scss',
})
export class CreateOrderComponent implements OnDestroy {
  private destroy$ = new Subject<void>();
  private lookupSearch = { customers: new Subject<void>(), addresses: new Subject<void>() };
  lookup = {
    customers: { term: '', page: 0, total: 0, more: false, loading: false, error: '', version: 0, request: null as Subscription | null },
    addresses: { term: '', page: 0, total: 0, more: false, loading: false, error: '', version: 0, request: null as Subscription | null },
  };
  readonly serverSearch = () => true;
  searchLookup(kind: 'customers' | 'addresses', term: string) {
    const state = this.lookup[kind];
    state.term = term.slice(0, 100); state.version++; state.request?.unsubscribe();
    state.loading = true; state.error = ''; state.page = 0; state.more = false; state.total = 0;
    const selectedId = kind === 'customers' ? this.customerId : this.addressId;
    this[kind] = this[kind].filter(record => record._id === selectedId);
    this.lookupSearch[kind].next();
  }
  fetchLookup(kind: 'customers' | 'addresses', append = false) {
    const state = this.lookup[kind];
    if (append && (state.loading || !state.more)) return;
    if (kind === 'addresses' && !this.customerId) { state.loading = false; return; }
    state.request?.unsubscribe();
    const version = ++state.version;
    const page = append ? state.page + 1 : 1;
    const customerId = this.customerId;
    state.loading = true; state.error = '';
    const params = new URLSearchParams({ page: String(page), limit: '20', search: state.term });
    if (kind === 'customers') params.set('kind', 'customers'); else params.set('customer_id', customerId);
    state.request = this.http.get(`admin/inventory/order/create-options?${params}`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r: any) => {
        if (version !== state.version || (kind === 'addresses' && customerId !== this.customerId)) return;
        const current = this[kind];
        const selectedId = kind === 'customers' ? this.customerId : this.addressId;
        const selected = current.find(record => record._id === selectedId);
        const records = [...(append ? current : selected ? [selected] : []), ...r.data];
        this[kind] = [...new Map(records.map(record => [record._id, record])).values()];
        state.page = page; state.total = r.pagination.total; state.more = r.pagination.has_more; state.loading = false;
      },
      error: () => { if (version === state.version) { state.loading = false; state.error = 'Unable to load results. Try again.'; } },
    });
  }
  ngOnDestroy() {
    this.destroy$.next(); this.destroy$.complete();
    this.lookup.customers.request?.unsubscribe(); this.lookup.addresses.request?.unsubscribe();
  }
  customers: any[] = []; products: any[] = []; addresses: any[] = []; lines: any[] = [];
  customerId = ''; addressId = ''; customerSearch = ''; productSearch = '';
  paymentMethod = 'cod'; note = ''; quote: any = null; busy = false; error = '';
  productsSearched = false;
  get unitCount() { return this.lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0); }
  get selectedAddress() { return this.addresses.find(a => a._id === this.addressId); }
  cataloguePrice(product: any): number {
    const regular = Number(product.regular_price);
    const sale = product.sale_price;
    return sale != null && sale !== '' && Number(sale) >= 0 && Number(sale) < regular ? Number(sale) : regular;
  }
  private key = crypto.randomUUID();
  private submitted = false;
  constructor(private dialogs: MatDialog, private http: HttpService, public dialog: MatDialogRef<CreateOrderComponent>, @Inject(MAT_DIALOG_DATA) data: any) {
    for (const kind of ['customers', 'addresses'] as const) this.lookupSearch[kind].pipe(debounceTime(300), takeUntil(this.destroy$)).subscribe(() => this.fetchLookup(kind));
    this.customerId = data?.customerId || '';
    if (this.customerId) {
      const selectedId = this.customerId;
      this.http.get(`admin/inventory/order/create-options?kind=customers&customer_id=${selectedId}`).pipe(takeUntil(this.destroy$)).subscribe({ next: (r: any) => {
        if (this.customerId === selectedId) this.customers = [...new Map([...this.customers, ...r.data].map(c => [c._id, c])).values()];
      }, error: e => this.fail(e) });
      this.searchCustomers();
      this.loadAddresses();
    } else this.searchCustomers();
  }
  addCustomer() {
    if (this.busy) return;
    this.dialogs.open(CreateOrderCustomerComponent, { width: '540px', maxWidth: '94vw', maxHeight: '90vh', ariaLabelledBy: 'new-customer-title' }).afterClosed().subscribe(customer => {
      if (!customer?._id) return;
      this.customers = [customer, ...this.customers.filter(c => c._id !== customer._id)];
      this.customerId = customer._id;
      this.loadAddresses();
    });
  }
  addAddress() {
    if (this.busy || !this.customerId) return;
    const customerId = this.customerId;
    const customer = this.customers.find(c => c._id === customerId);
    this.dialogs.open(CustomerAddressDialogComponent, { width: '740px', maxWidth: '94vw', maxHeight: '94vh', data: {
      create: true, customerId, address: { full_name: customer?.name, email: customer?.email,
        phone: customer?.mobile, phone_code: customer?.phone_code || '91', country: 101, address_type: 'home', purpose: 'both' },
    } }).afterClosed().subscribe(address => {
      if (!address?._id || customerId !== this.customerId) return;
      this.addresses = [address, ...this.addresses];
      this.addressId = address._id;
      this.invalidate();
    });
  }
  invalidate() { this.quote = null; if (this.submitted) { this.key = crypto.randomUUID(); this.submitted = false; } }
  searchCustomers() { this.fetchLookup('customers'); }
  loadAddresses() {
    this.invalidate(); this.addressId = ''; this.addresses = [];
    const state = this.lookup.addresses;
    state.request?.unsubscribe(); state.version++; state.term = ''; state.page = 0;
    state.total = 0; state.more = false; state.loading = false; state.error = '';
    if (this.customerId) this.fetchLookup('addresses');
  }
  searchProducts() {
    this.productsSearched = true;
    this.http.get(`admin/inventory/order/create-options?kind=products&search=${encodeURIComponent(this.productSearch)}`).subscribe({ next: (r: any) => this.products = r.data, error: e => this.fail(e) });
  }
  add(product: any) {
    this.invalidate();
    const existing = this.lines.find(l => l.product_id === product.product_id && l.variation_id === product.variation_id);
    if (existing) existing.quantity++; else this.lines.push({ ...product, quantity: 1 });
  }
  remove(index: number) { this.lines.splice(index, 1); this.invalidate(); }
  get valid() { return !!this.customerId && !!this.addressId && this.lines.length > 0 && this.lines.every(l => Number.isInteger(l.quantity) && l.quantity > 0 && l.quantity <= 10000); }
  payload() { return { customer_id: this.customerId, address_id: this.addressId, payment_method: this.paymentMethod, note: this.note, idempotency_key: this.key, items: this.lines.map(l => ({ product_id: l.product_id, variation_id: l.variation_id, quantity: l.quantity })) }; }
  review() {
    if (!this.valid || this.busy) return;
    this.busy = true; this.error = ''; this.dialog.disableClose = true;
    this.http.post('admin/inventory/order/quote', this.payload()).subscribe({ next: (r: any) => { this.quote = r.data; this.busy = false; this.dialog.disableClose = false; }, error: e => this.fail(e) });
  }
  create() {
    if (!this.valid || !this.quote || this.busy) return;
    this.busy = true; this.submitted = true; this.error = ''; this.dialog.disableClose = true;
    this.http.post('admin/inventory/order/place', { ...this.payload(), expected_total: this.quote.grand_total }).subscribe({ next: (r: any) => this.dialog.close(r.data.order), error: e => this.fail(e) });
  }
  private fail(error: any) { this.busy = false; this.dialog.disableClose = false; this.error = error?.error?.message || 'Unable to complete this action. Please try again.'; }
}
