import { ElementRef, Renderer2 } from '@angular/core';
import { ReadMoreClampDirective } from './read-more-clamp.directive';

describe('ReadMoreClampDirective', () => {
  it('should create an instance', () => {
    const renderer = jasmine.createSpyObj<Renderer2>('Renderer2', ['setStyle', 'setProperty', 'appendChild', 'removeChild', 'createElement', 'createText']);
    const directive = new ReadMoreClampDirective(new ElementRef(document.createElement('div')), renderer);
    expect(directive).toBeTruthy();
  });
});
