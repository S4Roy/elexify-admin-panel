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
// weight is prefilled with the product-weight total and follows item moves until the admin edits it.
interface DraftPackage { key: number; items: PackLine[]; weight: number | null; weightEdited?: boolean; length: number; width: number; height: number }

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
        [this.draftWeight(draft), draft.length, draft.width, draft.height].every(v => Number.isFinite(Number(v)) && Number(v) > 0)) &&
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
  packageWeight(lines: PackLine[]): number {
    let total = 0;
    for (const line of lines) {
      const weight = Number(this.itemFor(line.order_item_id)?.weight);
      if (!Number.isFinite(weight) || weight <= 0) return 0;
      total += weight * Number(line.quantity);
    }
    return Number(total.toFixed(6));
  }
  draftWeight(draft: DraftPackage): number { return Number(draft.weight) || this.packageWeight(draft.items); }
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
  addPackage() { this.drafts.push({ key: ++this.nextKey, items: [], weight: null, length: 10, width: 10, height: 10 }); }
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
  // Units to move per line, set with the inline stepper (defaults to all
  // units). Keyed by source container + order item.
  moveQuantities: Record<string, number> = {};
  private moveKey(source: string, id: string) { return `${source}:${id}`; }
  private maxFor(line: PackLine, source: string): number {
    return source === 'unpacked' ? this.available(this.itemFor(line.order_item_id)) : line.quantity;
  }
  moveQty(line: PackLine, source: string): number {
    const max = this.maxFor(line, source);
    const chosen = this.moveQuantities[this.moveKey(source, line.order_item_id)];
    return Math.min(max, Math.max(1, Number.isInteger(chosen) ? chosen : max));
  }
  setMoveQty(line: PackLine, source: string, value: number) {
    const max = this.maxFor(line, source);
    const clean = Number.isFinite(value) ? Math.round(value) : max;
    this.moveQuantities[this.moveKey(source, line.order_item_id)] = Math.min(max, Math.max(1, clean));
  }
  stepMoveQty(line: PackLine, source: string, delta: number) {
    this.setMoveQty(line, source, this.moveQty(line, source) + delta);
  }
  /** Drag moves the whole line (standard drag behaviour); use the stepper +
   * Move to… to split units across packages. */
  move(event: CdkDragDrop<PackLine[]>, amount?: number) {
    const source = event.previousContainer.id;
    const target = event.container.id;
    if (source === target || this.busy) return;
    const line: PackLine = event.item.data;
    const maximum = this.maxFor(line, source);
    if (!maximum) return;
    const units = Math.min(maximum, Math.max(1, amount ?? maximum));
    if (source !== 'unpacked') {
      const draft = this.drafts.find(d => `draft-${d.key}` === source);
      const original = draft?.items.find(item => item.order_item_id === line.order_item_id);
      if (!draft || !original) return;
      original.quantity -= units;
      draft.items = draft.items.filter(item => item.quantity > 0);
    }
    if (target !== 'unpacked') {
      const draft = this.drafts.find(d => `draft-${d.key}` === target);
      if (!draft) return;
      const existing = draft.items.find(item => item.order_item_id === line.order_item_id);
      if (existing) existing.quantity += units;
      else draft.items.push({ order_item_id: line.order_item_id, quantity: units });
    }
    // Quantities left over from a previous split would be stale now.
    delete this.moveQuantities[this.moveKey(source, line.order_item_id)];
    delete this.moveQuantities[this.moveKey(target, line.order_item_id)];
    this.prefillWeights();
  }
  /** "Move to…" menu: moves the stepper quantity; "new" creates a package. */
  onMoveSelect(select: HTMLSelectElement, line: PackLine, source: string) {
    let target = select.value;
    select.value = '';
    if (!target) return;
    if (target === 'new') {
      this.addPackage();
      target = `draft-${this.drafts[this.drafts.length - 1].key}`;
    }
    this.moveByButton(line, source, target, this.moveQty(line, source));
  }
  /** One click for the common case: everything remaining into one package. */
  packAll() {
    if (this.busy || this.remainingQuantity === 0) return;
    if (!this.drafts.length) this.addPackage();
    const target = `draft-${this.drafts[this.drafts.length - 1].key}`;
    for (const line of this.sourceLines('unpacked')) this.moveByButton(line, 'unpacked', target);
  }
  prefillWeights() {
    for (const draft of this.drafts) if (!draft.weightEdited) draft.weight = this.packageWeight(draft.items) || null;
  }
  editWeight(draft: DraftPackage, value: number | null) {
    draft.weight = value;
    // Clearing the field hands it back to the calculated total.
    draft.weightEdited = value !== null;
  }
  moveByButton(line: PackLine, source: string, target: string, amount?: number) {
    this.move({ previousContainer: { id: source }, container: { id: target }, item: { data: line } } as CdkDragDrop<PackLine[]>, amount);
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
      weight: this.draftWeight(draft), length: Number(draft.length), width: Number(draft.width), height: Number(draft.height),
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
