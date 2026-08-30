import { ElementRef } from '@angular/core';
import { AmountNumberDirective } from './amount-number.directive';

describe('AmountNumberDirective', () => {
  it('should create an instance', () => {
    const directive = new AmountNumberDirective(new ElementRef(document.createElement('input')));
    expect(directive).toBeTruthy();
  });
});
