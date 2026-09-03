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
}
