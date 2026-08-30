import { ElementRef } from '@angular/core';
import { AgeDirective } from './age.directive';

describe('AgeDirective', () => {
  it('should create an instance', () => {
    const directive = new AgeDirective(new ElementRef(document.createElement('input')));
    expect(directive).toBeTruthy();
  });
});
