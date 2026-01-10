import { Directive, ElementRef, Input } from '@angular/core';

@Directive({
  selector: '[Age]',
  standalone: true
})
export class AgeDirective {

  @Input() dob: string = "";

  constructor(private elementRef: ElementRef) {}

  ngOnInit() {
    this.updateAge();
  }

  ngOnChanges(changes: import('@angular/core').SimpleChanges) {
    if ('dob' in changes && !changes['dob'].isFirstChange()) {
      this.updateAge();
    }
  }

  private updateAge(): void {
    const birthDate = new Date(this.dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();

    const m = today.getMonth() - birthDate.getMonth();
    const d = today.getDate() - birthDate.getDate();

    if (m < 0 || (m === 0 && d < 0)) {
      age--;
    }

    this.elementRef.nativeElement.textContent = `${age}`;
  }
}
