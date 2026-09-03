import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { InventoryService } from 'app/core/services/inventory.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-returns',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './returns.component.html',
  styleUrl: './returns.component.scss',
})
export class ReturnsComponent implements OnInit {
  requests: any[] = [];
  loading = true;
  status = '';
  busyId: string | null = null;
  notes: Record<string, string> = {};
  inspection: Record<string, Record<string, { accepted_quantity: number; disposition: 'restock' | 'damaged'; note: string }>> = {};
  settlementReferences: Record<string, string> = {};

  constructor(private inventory: InventoryService, private toastr: ToastrService) {}
  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    const params = new URLSearchParams({ page: '1', limit: '100' });
    if (this.status) params.set('status', this.status);
    this.inventory.returnRequests(params).subscribe({
      next: (response: any) => { this.requests = response?.data?.docs ?? []; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  review(request: any, action: 'approve' | 'reject'): void {
    const note = (this.notes[request._id] || '').trim();
    if (action === 'reject' && !note) {
      this.toastr.error('A rejection reason is required.');
      return;
    }
    this.busyId = request._id;
    this.inventory.reviewReturn({ return_request_id: request._id, action, note }).subscribe({
      next: (response: any) => { this.toastr.success(response?.message); this.busyId = null; this.load(); },
      error: () => { this.busyId = null; },
    });
  }

  receive(request: any): void {
    this.busyId = request._id;
    this.inventory.receiveReturn(request._id).subscribe({
      next: (response: any) => { this.toastr.success(response?.message); this.busyId = null; this.load(); },
      error: () => { this.busyId = null; },
    });
  }

  inspectionFor(request: any, item: any) {
    this.inspection[request._id] ??= {};
    this.inspection[request._id][item._id] ??= { accepted_quantity: item.quantity, disposition: 'restock', note: '' };
    return this.inspection[request._id][item._id];
  }

  submitInspection(request: any): void {
    const items = request.items.map((item: any) => ({ return_item_id: item._id, ...this.inspectionFor(request, item) }));
    const invalid = items.some((item: any, index: number) => item.accepted_quantity < 0 || item.accepted_quantity > request.items[index].quantity);
    if (invalid) { this.toastr.error('Accepted quantities must be within the requested quantities.'); return; }
    this.busyId = request._id;
    this.inventory.inspectReturn({ return_request_id: request._id, items, note: this.notes[request._id] || '' }).subscribe({
      next: (response: any) => { this.toastr.success(response?.message); this.busyId = null; this.load(); },
      error: () => { this.busyId = null; },
    });
  }

  completeManualRefund(request: any): void {
    const reference = (this.settlementReferences[request._id] || '').trim();
    if (!reference) { this.toastr.error('Enter the bank, PayPal, or cash settlement reference.'); return; }
    this.busyId = request._id;
    this.inventory.completeManualReturnRefund({ return_request_id: request._id, reference, note: this.notes[request._id] || '' }).subscribe({
      next: (response: any) => { this.toastr.success(response?.message); this.busyId = null; this.load(); },
      error: () => { this.busyId = null; },
    });
  }
}
