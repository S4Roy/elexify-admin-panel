import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { HttpService } from 'app/core/services/http.service';

@Component({
  selector: 'app-create-order',
  imports: [CommonModule, FormsModule, MatDialogModule],
  templateUrl: './create-order.component.html',
  styleUrl: './create-order.component.scss',
})
export class CreateOrderComponent {
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
  constructor(private http: HttpService, public dialog: MatDialogRef<CreateOrderComponent>, @Inject(MAT_DIALOG_DATA) data: any) {
    this.customerId = data?.customerId || '';
    if (this.customerId) {
      this.http.get(`admin/inventory/order/create-options?kind=customers&customer_id=${this.customerId}`).subscribe({ next: (r: any) => this.customers = r.data, error: e => this.fail(e) });
      this.loadAddresses();
    } else this.searchCustomers();
  }
  invalidate() { this.quote = null; if (this.submitted) { this.key = crypto.randomUUID(); this.submitted = false; } }
  searchCustomers() {
    this.http.get(`admin/inventory/order/create-options?kind=customers&search=${encodeURIComponent(this.customerSearch)}`).subscribe({ next: (r: any) => this.customers = r.data, error: e => this.fail(e) });
  }
  loadAddresses() {
    this.invalidate(); this.addressId = ''; this.addresses = [];
    const customer = this.customerId;
    if (!customer) return;
    this.http.get(`admin/inventory/order/create-options?customer_id=${customer}`).subscribe({ next: (r: any) => { if (customer === this.customerId) this.addresses = r.data; }, error: e => this.fail(e) });
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
