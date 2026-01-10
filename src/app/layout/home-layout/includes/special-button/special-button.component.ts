import { NgIf } from '@angular/common';
import { Component, Input, SimpleChanges } from '@angular/core';

@Component({
  selector: 'special-button',
  imports: [NgIf],
  templateUrl: './special-button.component.html',
  styleUrl: './special-button.component.scss',
})
export class SpecialButtonComponent {
  // Accept truthy/falsy values; convert to boolean
  @Input('ask_for_price') ask_for_price: boolean | null = false;
  @Input('enable_enquiry') enable_enquiry: boolean | null = false;

  // internal normalized flags used in template
  askForPrice = false;
  enableEnquiry = false;

  ngOnChanges(changes: SimpleChanges) {
    // Normalize values to boolean (handles undefined/null/"true"/1 etc.)
    this.askForPrice = this.toBoolean(this.ask_for_price);
    this.enableEnquiry = this.toBoolean(this.enable_enquiry);
  }

  private toBoolean(v: any): boolean {
    if (v === true || v === 'true' || v === 1 || v === '1') return true;
    if (v === false || v === 'false' || v === 0 || v === '0') return false;
    return !!v;
  }
}
