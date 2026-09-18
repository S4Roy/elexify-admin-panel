import { CommonModule } from '@angular/common';
import { Component, Inject, Optional } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { InventoryService } from 'app/core/services/inventory.service';
import { ApiService } from 'app/core/services/api.service';
import { DialogService } from 'app/core/services/dialog.service';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface PackLine { order_item_id: string; quantity: number }
interface DraftPackage { key: number; items: PackLine[]; weight: number; length: number; width: number; height: number }

@Component({
  selector: 'app-order-shipping',
  imports: [CommonModule, FormsModule, DragDropModule, MatDialogModule],
  templateUrl: './order-shipping.component.html',
  styleUrl: './order-shipping.component.scss',
})
export class OrderShippingComponent {
  order: any;
  packages: any[] = [];
  drafts: DraftPackage[] = [];
  pickupLocations: any[] = [];
  pickupLocation = '';
  loading = true;
  loadingPackages = true;
  pickupError = '';
  error = '';
  busy = false;
  confirmingShipment = false;
  busyPackageId: string | null = null;
  anyChangeMade = false;
  private nextKey = 0;

  constructor(
    @Optional() public dialogRef: MatDialogRef<OrderShippingComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any,
    private inventoryService: InventoryService,
    private api: ApiService,
    private dialogService: DialogService,
    private toastr: ToastrService,
  ) {}

  ngOnInit() {
    this.loadOrder();
    this.loadPackages();
    this.loadPickupLocations();
  }

  get orderId(): string { return String(this.data?.item?._id || this.order?._id || ''); }
  get orderItems(): any[] { return this.order?.order_items || []; }
  get totalQuantity(): number { return this.orderItems.reduce((n, item) => n + Number(item.quantity || 0), 0); }
  get draftQuantity(): number { return this.drafts.reduce((n, draft) => n + this.quantity(draft.items), 0); }
  get packedQuantity(): number { return this.orderItems.reduce((n, item) => n + Number(item.packed_quantity || 0), 0) + this.draftQuantity; }
  get remainingQuantity(): number { return Math.max(0, this.totalQuantity - this.packedQuantity); }
  get canCreate(): boolean {
    return !this.busy && !this.confirmingShipment && !this.loading && !this.loadingPackages && !this.error &&
      this.drafts.length > 0 && this.remainingQuantity === 0 &&
      this.drafts.every(draft => this.quantity(draft.items) > 0 &&
        [draft.weight, draft.length, draft.width, draft.height].every(v => Number.isFinite(Number(v)) && Number(v) > 0)) &&
      this.orderItems.every(item => this.available(item) === 0);
  }
  get dropIds(): string[] { return ['unpacked', ...this.drafts.map(d => `draft-${d.key}`)]; }

  quantity(lines: PackLine[]): number { return lines.reduce((n, line) => n + Number(line.quantity || 0), 0); }
  available(item: any): number {
    const allocated = this.drafts.reduce((n, draft) => n + (draft.items.find(line => line.order_item_id === String(item._id))?.quantity || 0), 0);
    return Math.max(0, Number(item.unpacked_quantity ?? item.quantity ?? 0) - allocated);
  }
  itemFor(id: string): any { return this.orderItems.find(item => String(item._id) === String(id)); }
  value(lines: PackLine[]): number {
    return lines.reduce((n, line) => n + Number(this.itemFor(line.order_item_id)?.unit_price || 0) * line.quantity, 0);
  }
  draftName(index: number): string { return `Package ${Math.max(0, ...this.packages.map(p => Number(p.package_number) || 0)) + index + 1}`; }

  loadOrder() {
    if (!this.orderId) { this.loading = false; this.error = 'Order was not found.'; return; }
    this.loading = true;
    const params = new URLSearchParams({ _id: this.orderId });
    this.inventoryService.orderList(params).subscribe({
      next: (res: any) => { this.order = res?.data; this.loading = false; },
      error: (err: any) => { this.loading = false; this.error = err?.error?.message || 'Could not load order items.'; },
    });
  }
  loadPackages() {
    if (!this.orderId) return;
    this.loadingPackages = true;
    this.inventoryService.packageList(this.orderId).subscribe({
      next: (res: any) => { this.packages = res?.data?.packages || []; this.loadingPackages = false; },
      error: (err: any) => { this.loadingPackages = false; this.error = err?.error?.message || 'Could not load packages.'; },
    });
  }
  loadPickupLocations() {
    forkJoin({
      credentials: this.api.integrationCredentialList().pipe(catchError(() => of(null))),
      locations: this.api.shiprocketPickupLocations().pipe(catchError(err => of({ error: err }))),
    }).subscribe(({ credentials, locations }: any) => {
      if (locations?.error) { this.pickupError = 'Could not load pickup addresses. The configured default will be used.'; return; }
      this.pickupLocations = locations?.data || [];
      const preferred = (credentials?.data || []).find((entry: any) => entry.provider === 'shiprocket')?.fields?.pickup_location?.value;
      this.pickupLocation = this.pickupLocations.find(loc => loc.pickup_location === preferred)?.pickup_location || this.pickupLocations[0]?.pickup_location || '';
    });
  }
  addPackage() { this.drafts.push({ key: ++this.nextKey, items: [], weight: 0.5, length: 10, width: 10, height: 10 }); }
  removePackage(draft: DraftPackage) {
    const count = this.quantity(draft.items);
    this.dialogService.confirmDialog({
      title: 'Remove package?',
      message: `Remove this package? Its ${count} ${count === 1 ? 'item' : 'items'} will return to Unpacked Items.`,
      cancelText: 'Keep Package',
      saveText: 'Remove Package',
    }).subscribe((result: any) => {
      if (result?.confirm && !this.busy) this.drafts = this.drafts.filter(item => item !== draft);
    });
  }
  sourceLines(source: string): PackLine[] {
    if (source === 'unpacked') return this.orderItems.filter(item => this.available(item) > 0)
      .map(item => ({ order_item_id: String(item._id), quantity: this.available(item) }));
    return this.drafts.find(draft => `draft-${draft.key}` === source)?.items || [];
  }
  move(event: CdkDragDrop<PackLine[]>) {
    const source = event.previousContainer.id;
    const target = event.container.id;
    if (source === target) return;
    const line: PackLine = event.item.data;
    const maximum = source === 'unpacked' ? this.available(this.itemFor(line.order_item_id)) : line.quantity;
    if (!maximum) return;
    let amount = maximum;
    if (maximum > 1) {
      const answer = window.prompt(`How many units to move? (1–${maximum})`, String(maximum));
      if (answer === null) return;
      amount = Number(answer);
      if (!Number.isInteger(amount) || amount < 1 || amount > maximum) { this.toastr.error(`Enter a whole quantity from 1 to ${maximum}.`); return; }
    }
    if (source !== 'unpacked') {
      const draft = this.drafts.find(d => `draft-${d.key}` === source)!;
      const original = draft.items.find(item => item.order_item_id === line.order_item_id)!;
      original.quantity -= amount;
      draft.items = draft.items.filter(item => item.quantity > 0);
    }
    if (target !== 'unpacked') {
      const draft = this.drafts.find(d => `draft-${d.key}` === target)!;
      const existing = draft.items.find(item => item.order_item_id === line.order_item_id);
      if (existing) existing.quantity += amount;
      else draft.items.push({ order_item_id: line.order_item_id, quantity: amount });
    }
  }
  moveByButton(line: PackLine, source: string, target: string) {
    this.move({ previousContainer: { id: source }, container: { id: target }, item: { data: line } } as CdkDragDrop<PackLine[]>);
  }
  createShipments() {
    if (!this.canCreate) return;
    const count = this.drafts.length;
    this.confirmingShipment = true;
    this.dialogService.confirmDialog({
      title: 'Create Shiprocket shipments?',
      message: `Create ${count} separate ${count === 1 ? 'shipment' : 'shipments'} for order #${this.order?.id || this.orderId}? Each package will receive its own Shiprocket shipment and AWB.`,
      cancelText: 'Cancel',
      saveText: 'Create Shipments',
    }).subscribe((result: any) => {
      this.confirmingShipment = false;
      if (!result?.confirm || !this.canCreate) return;
      this.error = '';
      this.busy = true;
      this.submitNext();
    });
  }
  private submitNext() {
    const draft = this.drafts[0];
    if (!draft) { this.busy = false; this.toastr.success('Shipments created.'); this.loadOrder(); this.loadPackages(); return; }
    this.inventoryService.sendToShipRocket({
      _id: this.orderId, items: draft.items.map(line => ({ ...line })), pickup_location: this.pickupLocation || undefined,
      weight: Number(draft.weight), length: Number(draft.length), width: Number(draft.width), height: Number(draft.height),
    }).subscribe({
      next: () => { this.anyChangeMade = true; this.drafts.shift(); this.submitNext(); },
      error: (err: any) => {
        this.busy = false;
        this.error = err?.error?.message || 'Shipment creation failed. Review the package and retry.';
        // A failed provider call may still have allocated the package. Refresh before another submission.
        this.drafts = [];
        this.loadOrder(); this.loadPackages();
      },
    });
  }
  retryPackage(pkg: any) {
    this.busyPackageId = pkg._id;
    this.inventoryService.retryPackage({ package_id: pkg._id }).subscribe({
      next: () => { this.busyPackageId = null; this.anyChangeMade = true; this.loadOrder(); this.loadPackages(); },
      error: (err: any) => { this.busyPackageId = null; this.error = err?.error?.message || 'Retry failed.'; },
    });
  }
  cancelPackage(pkg: any) {
    this.dialogService.confirmDialog({
      title: `Cancel Package ${pkg.package_number}?`,
      message: 'Its items will return to Unpacked Items after cancellation.',
      cancelText: 'Keep Package',
      saveText: 'Cancel Package',
    }).subscribe((result: any) => {
      if (!result?.confirm || this.busyPackageId) return;
      this.busyPackageId = pkg._id;
      this.inventoryService.cancelPackage({ package_id: pkg._id }).subscribe({
        next: () => { this.busyPackageId = null; this.anyChangeMade = true; this.drafts = []; this.loadOrder(); this.loadPackages(); },
        error: (err: any) => { this.busyPackageId = null; this.error = err?.error?.message || 'Cancellation failed.'; },
      });
    });
  }
  close() { this.dialogRef?.close(this.anyChangeMade); }
}
