import { ElementRef } from '@angular/core';
import { AutofocusDirective } from './autofocus.directive';

describe('AutofocusDirective', () => {
  it('should create an instance', () => {
    const directive = new AutofocusDirective(new ElementRef(document.createElement('input')));
    expect(directive).toBeTruthy();
  });
});
