import { CurrencyPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { InventoryService } from 'app/core/services/inventory.service';

// COD cash our own riders are holding, and recording a handover at the
// office. See elexify-backend services/orderService/riderCash.js.
interface PendingOrder { _id: string; id: string; amount: number; collected_at: string; currency: string; selected: boolean }

@Component({
  selector: 'app-rider-cash',
  standalone: true,
  imports: [NgIf, NgFor, FormsModule, DatePipe, CurrencyPipe, RouterLink],
  templateUrl: './rider-cash.component.html',
})
export class RiderCashComponent implements OnInit {
  summary: any = null;
  loading = false;

  // Rider whose handover is being recorded
  active: any = null;
  pending: PendingOrder[] = [];
  amountReceived: number | null = null;
  note = '';
  saving = false;

  constructor(private inventoryService: InventoryService, private toastr: ToastrService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.inventoryService.riderCashSummary().subscribe({
      next: (res: any) => { this.summary = res?.data; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  private riderRef(rider: any) {
    return rider.rider_user_id ? { rider_user_id: String(rider.rider_user_id) } : { rider_name: rider.rider_name };
  }

  startHandover(rider: any): void {
    this.active = rider;
    this.pending = [];
    this.note = '';
    this.inventoryService.riderCashPending(this.riderRef(rider)).subscribe((res: any) => {
      this.pending = (res?.data ?? []).map((o: any) => ({ ...o, selected: true }));
      this.amountReceived = this.selectedTotal;
    });
  }

  cancel(): void {
    this.active = null;
  }

  get selectedTotal(): number {
    return Math.round(this.pending.filter(o => o.selected).reduce((s, o) => s + o.amount, 0) * 100) / 100;
  }

  get difference(): number {
    return Math.round(((this.amountReceived ?? 0) - this.selectedTotal) * 100) / 100;
  }

  get allSelected(): boolean {
    return this.pending.length > 0 && this.pending.every(o => o.selected);
  }

  toggleAll(selected: boolean): void {
    this.pending.forEach(o => (o.selected = selected));
    this.amountReceived = this.selectedTotal;
  }

  get canSave(): boolean {
    return !this.saving && this.pending.some(o => o.selected) && this.amountReceived != null && this.amountReceived >= 0 &&
      (this.difference === 0 || this.note.trim().length >= 3);
  }

  save(): void {
    if (!this.canSave) return;
    this.saving = true;
    this.inventoryService.riderCashReceive({
      ...this.riderRef(this.active),
      order_ids: this.pending.filter(o => o.selected).map(o => o._id),
      amount_received: this.amountReceived,
      note: this.note.trim() || null,
    }).subscribe({
      next: () => {
        this.saving = false;
        this.toastr.success(this.difference === 0 ? 'Cash received' : 'Cash received with a difference recorded');
        this.active = null;
        this.load();
      },
      error: () => { this.saving = false; },
    });
  }
}
