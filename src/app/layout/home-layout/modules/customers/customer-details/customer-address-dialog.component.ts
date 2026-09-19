import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';
import { ApiService } from 'app/core/services/api.service';

@Component({
  selector: 'app-customer-address-dialog',
  imports: [CurrencyPipe, NgFor, NgIf, FormsModule, MatDialogModule, NgSelectModule],
  template: `
    <form #form="ngForm" (ngSubmit)="save()" class="p-6">
      <h2 class="text-xl font-bold">{{ data.orderId ? 'Edit order ' + data.addressKind + ' address' : data.create ? 'Add delivery address' : 'Edit customer address' }}</h2>
      <p *ngIf="!data.orderId && !data.create" class="mt-2 text-sm text-gray-600">Changes apply to future orders. Your name, reason and changes will be recorded in the audit trail.</p>
      <p *ngIf="data.create" class="mt-2 text-sm text-gray-600">Save a delivery address to this customer’s address book and select it for the order.</p>
      <p *ngIf="data.orderId" class="mt-2 text-sm text-gray-600">This updates the selected address on order #{{ data.orderNumber }}. The customer’s saved addresses and other orders stay unchanged. Your changes and reason are recorded.</p>
      <p class="mt-2 text-xs text-gray-500">Address lines must use English letters, numbers, spaces and common punctuation.</p>
      <fieldset [disabled]="saving" class="mt-5 grid sm:grid-cols-2 gap-4">
        <label *ngFor="let field of textFields" class="block text-sm" [class.sm:col-span-2]="field.key === 'address_line_1'">
          {{ field.label }}{{ field.required ? ' *' : '' }}
          <input [name]="field.key" [(ngModel)]="value[field.key]" [type]="field.type || 'text'"
            [required]="field.required" [minlength]="field.min || 0" [maxlength]="field.max"
            class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
        </label>
        <div class="text-sm">
          <label for="address-calling-code">Calling code *</label>
          <ng-select class="mt-1" labelForId="address-calling-code" name="phone_code"
            [items]="callingCodes" bindLabel="label" bindValue="code"
            [(ngModel)]="value.phone_code" [searchable]="true" [clearable]="false"
            [loading]="optionsLoading" [disabled]="saving || optionsLoading || optionsError"
            placeholder="Select calling code" notFoundText="No active calling codes found" required>
          </ng-select>
        </div>
        <label class="block text-sm">Phone number *
          <input name="phone" type="tel" [(ngModel)]="value.phone" required minlength="6" maxlength="14"
            pattern="[0-9]{6,14}" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
        </label>
        <div class="text-sm">
          <label for="address-country">Country *</label>
          <ng-select class="mt-1" labelForId="address-country" name="country"
            [items]="countries" bindLabel="name" bindValue="id" [(ngModel)]="value.country"
            (ngModelChange)="changeCountry()" [searchable]="true" [clearable]="false"
            [loading]="optionsLoading" [disabled]="saving || optionsLoading || optionsError"
            placeholder="Select country" required></ng-select>
        </div>
        <div class="text-sm">
          <label for="address-state">State / province *</label>
          <ng-select class="mt-1" labelForId="address-state" name="state"
            [items]="states" bindLabel="name" bindValue="id" [(ngModel)]="value.state"
            [searchable]="true" [clearable]="false" [loading]="optionsLoading"
            [disabled]="saving || optionsLoading || optionsError || !value.country"
            placeholder="Select state" required></ng-select>
        </div>
        <div *ngIf="!data.orderId" class="text-sm">
          <label for="address-type">Address type</label>
          <ng-select class="mt-1" labelForId="address-type" name="address_type"
            [items]="types" [(ngModel)]="value.address_type" [clearable]="false"
            [disabled]="saving" required></ng-select>
        </div>
        <div *ngIf="!data.orderId && !data.create" class="text-sm">
          <label for="address-purpose">Purpose</label>
          <ng-select class="mt-1" labelForId="address-purpose" name="purpose"
            [items]="purposes" bindLabel="label" bindValue="value" [(ngModel)]="value.purpose"
            [clearable]="false" [disabled]="saving" required></ng-select>
        </div>
        <label *ngIf="!data.create" class="block text-sm sm:col-span-2">Reason for correction *
          <textarea name="reason" [(ngModel)]="value.reason" required minlength="10" maxlength="500" rows="2"
            placeholder="Explain the customer's requested correction (at least 10 characters)"
            class="mt-1 w-full rounded-lg border p-2"></textarea>
        </label>
      </fieldset>
      <label *ngIf="data.orderId" class="mt-4 flex gap-2 rounded-lg bg-amber-50 p-3 text-sm">
        <input type="checkbox" name="charges_confirmed" [(ngModel)]="chargesConfirmed" [disabled]="saving" required>
        <span>I reviewed the address change and approve keeping the existing shipping charge ({{ data.shipping | currency:data.currency }}) and order total ({{ data.grandTotal | currency:data.currency }}). This change does not collect or refund money.</span>
      </label>
      <p *ngIf="!addressLinesValid" role="alert" class="mt-3 text-sm text-red-700">Address lines must use English letters (A-Z), numbers, spaces and common punctuation only.</p>
      <p *ngIf="error" role="alert" class="mt-3 text-sm text-red-700">{{ error }}</p>
      <button *ngIf="optionsError" type="button" (click)="loadOptions()" class="mt-2 text-sm underline">Retry loading countries and states</button>
      <div class="mt-6 flex justify-end gap-3">
        <button type="button" [disabled]="saving" (click)="dialogRef.close()" class="rounded-lg border px-4 py-2">Cancel</button>
        <button type="submit" [disabled]="form.invalid || !addressLinesValid || (data.orderId && !chargesConfirmed) || saving || optionsLoading || optionsError || !value.state || (!data.create && value.reason.trim().length < 10)"
          class="rounded-lg bg-primary px-4 py-2 text-white disabled:opacity-50">{{ saving ? 'Saving…' : 'Save address' }}</button>
      </div>
    </form>
  `,
})
export class CustomerAddressDialogComponent implements OnInit, OnDestroy {
  textFields = [
    { key: 'full_name', label: 'Recipient name', required: true, min: 2, max: 100 },
    { key: 'email', label: 'Address contact email', required: false, max: 254, type: 'email' },
    { key: 'address_line_1', label: 'Address line 1', required: true, min: 5, max: 200 },
    { key: 'address_line_2', label: 'Address line 2', required: false, max: 200 },
    { key: 'land_mark', label: 'Landmark', required: false, max: 100 },
    { key: 'city_name', label: 'City / town', required: true, max: 100 },
    { key: 'postcode', label: 'Postal code', required: true, min: 2, max: 20 },
  ];
  types = ['home', 'office', 'billing', 'shipping', 'other'];
  purposes = [{ label: 'Shipping', value: 'shipping' }, { label: 'Billing', value: 'billing' }, { label: 'Both', value: 'both' }];
  value: any;
  countries: any[] = [];
  callingCodes: { code: string; label: string }[] = [];
  states: any[] = [];
  saving = false;
  chargesConfirmed = false;
  optionsLoading = false;
  optionsError = false;
  error = '';
  private destroy$ = new Subject<void>();
  private optionsRequest = 0;

  constructor(
    public dialogRef: MatDialogRef<CustomerAddressDialogComponent>,
    private api: ApiService,
    @Inject(MAT_DIALOG_DATA) public data: { create?: boolean; customerId?: string; address: any; orderId?: string; orderNumber?: string; addressKind?: string; expectedUpdatedAt?: string | null; shipping?: number; grandTotal?: number; currency?: string },
  ) {
    this.value = { phone: data.address.phone || '', phone_code: String(data.address.phone_code || '').replace(/[^0-9]/g, ''), country: data.address.country, state: data.address.state,
      address_type: data.address.address_type || 'home', purpose: data.address.purpose || 'both', reason: '',
      expected_updated_at: (data.orderId ? data.expectedUpdatedAt : data.address.updated_at) || null };
    for (const field of this.textFields) this.value[field.key] = data.address[field.key] || '';
  }

  ngOnInit(): void { this.loadOptions(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
  changeCountry(): void { this.value.state = null; this.states = []; this.loadOptions(); }

  loadOptions(): void {
    const request = ++this.optionsRequest;
    this.optionsLoading = true;
    this.optionsError = false;
    this.error = '';
    const options = this.data.orderId ? this.api.orderAddressOptions(this.value.country)
      : this.api.customerAddressOptions(this.data.customerId!, this.value.country);
    options.pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        if (request !== this.optionsRequest) return;
        this.countries = res.data.countries;
        this.callingCodes = this.countries
          .map(c => ({ code: String(c.phone_code || '').replace(/[^0-9]/g, ''), name: c.name }))
          .filter(c => /^[0-9]{1,4}$/.test(c.code))
          .map(c => ({ code: c.code, label: `${c.name} (+${c.code})` }));
        if (!this.callingCodes.some(c => c.code === this.value.phone_code)) this.value.phone_code = null;
        this.states = res.data.states;
        if (!this.countries.some(c => c.id === this.value.country)) this.value.country = null;
        if (!this.states.some(s => s.id === this.value.state)) this.value.state = null;
        this.optionsLoading = false;
      },
      error: () => {
        if (request !== this.optionsRequest) return;
        this.optionsLoading = false; this.optionsError = true;
        this.error = 'Unable to load countries and states. Retry to continue.';
      },
    });
  }

  get addressLinesValid(): boolean {
    const invalid = /[^A-Za-z0-9 .,\/#&()'":+\-]/;
    return !invalid.test(this.value.address_line_1 || '') && !invalid.test(this.value.address_line_2 || '');
  }

  save(): void {
    if (!this.addressLinesValid || (this.data.orderId && !this.chargesConfirmed) || !this.callingCodes.some(c => c.code === this.value.phone_code) || this.saving || this.optionsLoading || this.optionsError || !this.value.state || (!this.data.create && this.value.reason.trim().length < 10)) return;
    this.saving = true;
    this.error = '';
    this.dialogRef.disableClose = true;
    const { reason, expected_updated_at, ...createFields } = this.value;
    const request = this.data.create ? this.api.createCustomerAddress(this.data.customerId!, createFields) : this.data.orderId ? this.api.updateOrderAddress({ ...this.value,
      order_id: this.data.orderId, address_kind: this.data.addressKind,
      expected_address_id: this.data.address._id, charges_confirmed: this.chargesConfirmed,
    }) : this.api.editCustomerAddress(this.data.customerId!, this.data.address._id, this.value);
    request.pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => { this.saving = false; this.dialogRef.close(this.data.create ? res.data : true); },
      error: (err: any) => {
        this.saving = false;
        this.dialogRef.disableClose = false;
        this.error = err?.error?.message || 'Unable to save address. Check the details and try again.';
      },
    });
  }
}
