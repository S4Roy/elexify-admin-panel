import { CurrencyPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { InventoryService } from 'app/core/services/inventory.service';
import { HelpersService } from 'app/core/services/helpers.service';

// Phone-first page for own-delivery riders (delivery.run). The backend
// scopes everything to the signed-in rider — see elexify-backend
// services/orderService/packages/deliveryRun.js.
// New assignments show up without the rider tapping Refresh.
const AUTO_REFRESH_MS = 2 * 60_000;
const FAILURE_REASONS = ['Customer not reachable', 'Customer not at home', 'Customer refused delivery', 'Wrong or incomplete address', 'Customer asked to reschedule'];

interface DeliveryForm {
  kind: 'delivered' | 'failed';
  receiverName: string;
  receiverRelation: string;
  codMethod: 'cash' | 'upi';
  codReference: string;
  photo: File | null;
  otp: string;
  failureReason: string;
  failureNote: string;
}

@Component({
  selector: 'app-my-deliveries',
  standalone: true,
  imports: [NgIf, NgFor, FormsModule, DatePipe, CurrencyPipe, MatIconModule],
  templateUrl: './my-deliveries.component.html',
})
export class MyDeliveriesComponent implements OnInit, OnDestroy {
  open: any[] = [];
  done: any[] = [];
  cashInHand: { amount: number; order_count: number } | null = null;
  loading = false;
  saving = false;
  loaded = false;
  updatedAt: Date | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  // package_id -> form currently expanded on that card
  forms: Record<string, DeliveryForm> = {};
  readonly failureReasons = FAILURE_REASONS;

  constructor(private inventoryService: InventoryService, private toastr: ToastrService, private helpers: HelpersService) {}

  ngOnInit(): void {
    this.load();
    this.timer = setInterval(() => this.autoRefresh(), AUTO_REFRESH_MS);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  // Coming back to the tab (e.g. after a call) shows the latest list.
  @HostListener('document:visibilitychange')
  onVisible(): void {
    if (document.visibilityState === 'visible') this.autoRefresh();
  }

  // Never reload under an open form — the rider may be mid-entry.
  private autoRefresh(): void {
    if (document.visibilityState === 'visible' && !this.loading && !this.saving && !Object.keys(this.forms).length) this.load();
  }

  get firstName(): string {
    return String(this.helpers.userDetails()?.name || '').trim().split(/\s+/)[0] || '';
  }

  get codToCollect(): number {
    return Math.round(this.open.reduce((sum, d) => sum + (d.cod_due > 0 ? d.cod_due : 0), 0) * 100) / 100;
  }

  load(): void {
    this.loading = true;
    this.inventoryService.myDeliveries().subscribe({
      next: (res: any) => {
        this.open = res?.data?.open ?? [];
        this.done = res?.data?.done ?? [];
        this.cashInHand = res?.data?.cash_in_hand ?? null;
        this.loading = false;
        this.loaded = true;
        this.updatedAt = new Date();
      },
      error: () => { this.loading = false; },
    });
  }

  telLink(phone: string | null): string | null {
    const digits = (phone || '').replace(/[^\d+]/g, '');
    return digits ? `tel:${digits}` : null;
  }

  // WhatsApp needs the number with country code and no "+".
  whatsappLink(phone: string | null): string | null {
    let digits = (phone || '').replace(/\D/g, '');
    if (digits.length === 10) digits = `91${digits}`;
    return digits.length >= 11 ? `https://wa.me/${digits}` : null;
  }

  mapsLink(a: any): string | null {
    if (!a) return null;
    const query = a.latitude != null && a.longitude != null
      ? `${a.latitude},${a.longitude}`
      : [a.line1, a.line2, a.landmark, a.city, a.postcode].filter(Boolean).join(', ');
    return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
  }

  startForm(d: any, kind: 'delivered' | 'failed'): void {
    this.forms[d.package_id] = {
      kind, receiverName: d.address?.name || '', receiverRelation: 'Self', codMethod: 'cash', codReference: '',
      photo: null, otp: '', failureReason: FAILURE_REASONS[0], failureNote: '',
    };
  }

  cancelForm(d: any): void {
    delete this.forms[d.package_id];
  }

  onPhoto(d: any, event: Event): void {
    this.forms[d.package_id].photo = (event.target as HTMLInputElement).files?.[0] ?? null;
  }

  canSubmit(d: any): boolean {
    const f = this.forms[d.package_id];
    if (!f || this.saving) return false;
    if (f.kind === 'failed') return true;
    return f.receiverName.trim().length >= 2 && (!f.otp || /^\d{4}$/.test(f.otp)) && (d.cod_due <= 0 || f.codMethod !== 'upi' || f.codReference.trim().length >= 3);
  }

  resending: Record<string, boolean> = {};

  resendCode(d: any): void {
    this.resending[d.package_id] = true;
    this.inventoryService.riderResendOtp(d.package_id).subscribe({
      next: () => { this.resending[d.package_id] = false; this.toastr.success('New code sent to the customer'); this.load(); },
      error: () => { this.resending[d.package_id] = false; },
    });
  }

  submit(d: any): void {
    const f = this.forms[d.package_id];
    if (!this.canSubmit(d)) return;
    this.saving = true;
    const request$ = f.kind === 'failed'
      ? this.inventoryService.riderFailedAttempt(d.package_id, [f.failureReason, f.failureNote.trim()].filter(Boolean).join(' — '))
      : this.inventoryService.riderDelivered(d.package_id, {
          receiver_name: f.receiverName.trim(),
          receiver_relation: f.receiverRelation.trim(),
          ...(d.cod_due > 0 ? { cod_method: f.codMethod, cod_amount: String(d.cod_due), cod_reference: f.codReference.trim() } : {}),
          ...(f.photo ? { photo: f.photo } : {}),
          ...(f.otp ? { otp: f.otp } : {}),
        });
    request$.subscribe({
      next: () => {
        this.saving = false;
        this.toastr.success(f.kind === 'failed' ? 'Failed attempt recorded' : `Order ${d.order_number} delivered`);
        delete this.forms[d.package_id];
        this.load();
      },
      error: () => { this.saving = false; },
    });
  }
}
