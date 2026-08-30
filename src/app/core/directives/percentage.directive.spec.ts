import { ElementRef } from '@angular/core';
import { PercentageDirective } from './percentage.directive';

describe('PercentageDirective', () => {
  it('should create an instance', () => {
    const directive = new PercentageDirective(new ElementRef(document.createElement('input')));
    expect(directive).toBeTruthy();
  });
});
