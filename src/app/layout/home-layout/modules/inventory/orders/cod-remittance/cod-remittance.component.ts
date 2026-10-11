import { CurrencyPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { InventoryService } from 'app/core/services/inventory.service';

// Courier-collected COD: paid at delivery, then remitted by Shiprocket.
// See elexify-backend services/orderService/codRemittance.js.
const OUTCOME_LABELS: Record<string, string> = {
  ready: 'Matches', short: 'Short paid', excess: 'Over paid', already_recorded: 'Already recorded',
  unmatched: 'No matching order', not_cod: 'Not a COD order', not_delivered: 'Not delivered',
  collected_in_store: 'Collected by our staff', invalid_row: 'Invalid row', failed: 'Failed',
};
const OUTCOME_STYLES: Record<string, string> = {
  ready: 'bg-green-100 text-green-800', short: 'bg-amber-100 text-amber-800', excess: 'bg-amber-100 text-amber-800',
  failed: 'bg-red-100 text-red-800', invalid_row: 'bg-red-100 text-red-800', unmatched: 'bg-red-100 text-red-800',
};

@Component({
  selector: 'app-cod-remittance',
  standalone: true,
  imports: [NgIf, NgFor, FormsModule, DatePipe, CurrencyPipe, RouterLink],
  templateUrl: './cod-remittance.component.html',
})
export class CodRemittanceComponent implements OnInit {
  overdueDays = 10;
  summary: any = null;
  loadingSummary = false;

  selectedFile: File | null = null;
  previewing = false;
  applying = false;
  report: any = null;

  constructor(private inventoryService: InventoryService, private toastr: ToastrService) {}

  ngOnInit(): void {
    this.loadSummary();
  }

  loadSummary(): void {
    this.loadingSummary = true;
    this.inventoryService.codRemittanceSummary(this.overdueDays).subscribe({
      next: (res: any) => { this.summary = res?.data; this.loadingSummary = false; },
      error: () => { this.loadingSummary = false; },
    });
  }

  onFileSelected(event: Event): void {
    this.selectedFile = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.report = null;
  }

  preview(): void {
    if (!this.selectedFile || this.previewing) return;
    this.previewing = true;
    this.inventoryService.importCodRemittance(this.selectedFile, true).subscribe({
      next: (res: any) => { this.report = res?.data; this.previewing = false; },
      error: () => { this.previewing = false; },
    });
  }

  apply(): void {
    if (!this.selectedFile || !this.report?.recordable_rows || this.applying) return;
    this.applying = true;
    this.inventoryService.importCodRemittance(this.selectedFile, false).subscribe({
      next: (res: any) => {
        this.report = res?.data;
        this.applying = false;
        const failed = this.report?.summary?.failed || 0;
        if (failed) this.toastr.warning(`${failed} row(s) could not be recorded — see the report.`);
        else this.toastr.success('Remittance recorded');
        this.loadSummary();
      },
      error: () => { this.applying = false; },
    });
  }

  outcomeLabel(outcome: string): string {
    return OUTCOME_LABELS[outcome] ?? outcome;
  }

  outcomeClass(outcome: string): string {
    return OUTCOME_STYLES[outcome] ?? 'bg-gray-100 text-gray-700';
  }

  get summaryEntries(): { label: string; count: number }[] {
    return Object.entries(this.report?.summary || {}).map(([k, count]) => ({ label: this.outcomeLabel(k), count: count as number }));
  }
}
