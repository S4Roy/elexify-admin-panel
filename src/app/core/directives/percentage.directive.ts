import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  standalone:true,
 selector: '[percentage]'
})
export class PercentageDirective {
 // Allow decimal numbers and negative values
 private regex: RegExp = new RegExp(/^\d{0,2}(\.\d{0,2})?$/g);
 // Allow key codes for special events. Reflect :
 // Backspace, tab, end, home
 private specialKeys: Array<string> = ['Backspace', 'Tab', 'End', 'Home', 'ArrowLeft', 'ArrowRight', 'Del', 'Delete'];

 constructor(private el: ElementRef) {
 }

 @HostListener('keydown', ['$event'])
 onKeyDown(event: KeyboardEvent) {
    // Allow Backspace, tab, end, and home keys
    if (this.specialKeys.indexOf(event.key) !== -1) {
      return;
    }
    let current: string = this.el.nativeElement.value;
    const position = this.el.nativeElement.selectionStart;
    const next: string = [current.slice(0, position), event.key == 'Decimal' ? '.' : event.key, current.slice(position)].join('');
    if (next && !String(next).match(this.regex)) {
      event.preventDefault();
    }
 }

 @HostListener('blur', ['$event'])
 onBlur(event: FocusEvent) {
    // Convert the input value to a percentage and ensure it's within the range of 0 to 100
    let value = this.el.nativeElement.value;
    if (value) {
      let decimalValue = parseFloat(value) / 100;
      if (decimalValue > 1) {
        this.el.nativeElement.value = '100';
      } else if (decimalValue < 0) {
        this.el.nativeElement.value = '0';
      }
    }
 }
}
