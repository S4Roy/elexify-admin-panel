import { ElementRef } from '@angular/core';
import { NumbersOnlyDirective } from './numbers-only.directive';

describe('NumbersOnlyDirective', () => {
  it('should create an instance', () => {
    const directive = new NumbersOnlyDirective(new ElementRef(document.createElement('input')));
    expect(directive).toBeTruthy();
  });
});
