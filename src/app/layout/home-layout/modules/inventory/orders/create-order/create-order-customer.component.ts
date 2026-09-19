import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { NgSelectModule } from '@ng-select/ng-select';
import { ApiService } from 'app/core/services/api.service';

@Component({
  selector: 'app-create-order-customer',
  imports: [CommonModule, FormsModule, MatDialogModule, NgSelectModule],
  template: `
    <form #form="ngForm" (ngSubmit)="save()">
      <h2 mat-dialog-title>Add customer</h2>
      <mat-dialog-content>
        <p class="hint">Create a customer profile and use it for this order. Provide an email or mobile number.</p>
        <fieldset [disabled]="saving">
          <label for="new-customer-name">Full name *</label>
          <input id="new-customer-name" name="name" [(ngModel)]="value.name" required minlength="2" maxlength="100" autocomplete="name">
          <label for="new-customer-email">Email</label>
          <input id="new-customer-email" name="email" [(ngModel)]="value.email" type="email" email maxlength="254" autocomplete="email">
          <div class="phone-grid"><div><label for="new-customer-code">Calling code</label>
            <ng-select labelForId="new-customer-code" name="phone_code" [(ngModel)]="value.phone_code" [disabled]="saving || loading" [loading]="loading" [clearable]="false" [required]="!!value.mobile">
              <ng-option *ngFor="let c of countries" [value]="c.phone_code">+{{ c.phone_code }} {{ c.name }}</ng-option>
            </ng-select></div><div><label for="new-customer-mobile">Mobile</label>
            <input id="new-customer-mobile" name="mobile" [(ngModel)]="value.mobile" type="tel" pattern="[0-9]{6,15}" maxlength="15" autocomplete="tel-national"></div></div>
        </fieldset>
        <p *ngIf="error" role="alert" class="error">{{ error }}</p>
        <button *ngIf="optionsError" type="button" (click)="loadCountries()">Retry calling codes</button>
      </mat-dialog-content>
      <mat-dialog-actions align="end"><button type="button" [disabled]="saving" (click)="dialog.close()">Cancel</button><button class="primary" type="submit" [disabled]="form.invalid || saving || (!value.email.trim() && !value.mobile.trim()) || (!!value.mobile && (loading || optionsError))">{{ saving ? 'Saving…' : 'Create customer' }}</button></mat-dialog-actions>
    </form>`,
  styles: [`:host{display:block}fieldset{border:0;padding:0;margin:0}label{display:block;font-size:12px;font-weight:600;margin:12px 0 5px}input{width:100%;height:36px;padding:8px 10px;border:1px solid #dbe1ea;border-radius:6px;box-sizing:border-box}.phone-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.hint{font-size:12px;color:#64748b}button{border:1px solid #dbe1ea;padding:8px 12px;border-radius:6px;margin-left:8px}.primary{background:#3563e9;color:white}button:disabled{opacity:.5}.error{color:#b91c1c;font-size:12px;margin-top:12px}`],
})
export class CreateOrderCustomerComponent {
  value = { name: '', email: '', phone_code: '91', mobile: '' };
  countries: any[] = [];
  saving = false; loading = false; optionsError = false; error = '';
  constructor(private api: ApiService, public dialog: MatDialogRef<CreateOrderCustomerComponent>) { this.loadCountries(); }
  loadCountries() {
    this.loading = true; this.optionsError = false;
    this.api.getCountries().subscribe({ next: (r: any) => { this.countries = (r.data || []).map((c: any) => ({ ...c, phone_code: String(c.phone_code) })); this.loading = false; }, error: () => { this.loading = false; this.optionsError = true; } });
  }
  save() {
    if (this.saving || this.value.name.trim().length < 2 || (!this.value.email.trim() && !this.value.mobile.trim())) return;
    this.saving = true; this.error = ''; this.dialog.disableClose = true;
    const payload = { name: this.value.name.trim(), status: 'active', ...(this.value.email.trim() ? { email: this.value.email.trim() } : {}), ...(this.value.mobile.trim() ? { mobile: this.value.mobile.trim(), phone_code: this.value.phone_code } : {}) };
    this.api.addCustomer(payload).subscribe({ next: (r: any) => this.dialog.close(r.data), error: (e: any) => { this.saving = false; this.dialog.disableClose = false; this.error = e?.error?.message || 'Unable to create customer. Check the details and try again.'; } });
  }
}
