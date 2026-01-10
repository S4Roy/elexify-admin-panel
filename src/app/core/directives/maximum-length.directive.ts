import { Directive, Input, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[minMax]',
  standalone: true,
})
export class MinMaxDirective {
  @Input() public min?: number;
  @Input() public max?: number;

  constructor(private ref: ElementRef<HTMLInputElement>) {}

  @HostListener('input', ['$event'])
  public onInput(): void {
    const el = this.ref.nativeElement;
    let val = parseFloat(el.value);

    // Skip if not a number
    if (isNaN(val)) return;

    if (this.max !== undefined && val > this.max) {
      el.value = this.max.toString();
    } else if (this.min !== undefined && val < this.min) {
      el.value = this.min.toString();
    }
  }
}
