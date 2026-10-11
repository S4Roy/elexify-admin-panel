import { CurrencyPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { InventoryService } from 'app/core/services/inventory.service';

// Phone-first page for own-delivery riders (delivery.run). The backend
// scopes everything to the signed-in rider — see elexify-backend
// services/orderService/packages/deliveryRun.js.
const FAILURE_REASONS = ['Customer not reachable', 'Customer not at home', 'Customer refused delivery', 'Wrong or incomplete address', 'Customer asked to reschedule'];

interface DeliveryForm {
  kind: 'delivered' | 'failed';
  receiverName: string;
  receiverRelation: string;
  codMethod: 'cash' | 'upi';
  codReference: string;
  photo: File | null;
  failureReason: string;
  failureNote: string;
}

@Component({
  selector: 'app-my-deliveries',
  standalone: true,
  imports: [NgIf, NgFor, FormsModule, DatePipe, CurrencyPipe, MatIconModule],
  templateUrl: './my-deliveries.component.html',
})
export class MyDeliveriesComponent implements OnInit {
  open: any[] = [];
  done: any[] = [];
  loading = false;
  saving = false;
  // package_id -> form currently expanded on that card
  forms: Record<string, DeliveryForm> = {};
  readonly failureReasons = FAILURE_REASONS;

  constructor(private inventoryService: InventoryService, private toastr: ToastrService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.inventoryService.myDeliveries().subscribe({
      next: (res: any) => {
        this.open = res?.data?.open ?? [];
        this.done = res?.data?.done ?? [];
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  telLink(phone: string | null): string | null {
    const digits = (phone || '').replace(/[^\d+]/g, '');
    return digits ? `tel:${digits}` : null;
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
      photo: null, failureReason: FAILURE_REASONS[0], failureNote: '',
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
    return f.receiverName.trim().length >= 2 && (d.cod_due <= 0 || f.codMethod !== 'upi' || f.codReference.trim().length >= 3);
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
