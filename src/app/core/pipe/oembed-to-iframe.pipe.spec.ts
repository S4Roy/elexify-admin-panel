import { DomSanitizer } from '@angular/platform-browser';
import { OembedToIframePipe } from './oembed-to-iframe.pipe';

describe('OembedToIframePipe', () => {
  it('create an instance', () => {
    const sanitizer = jasmine.createSpyObj<DomSanitizer>('DomSanitizer', ['bypassSecurityTrustHtml']);
    const pipe = new OembedToIframePipe(sanitizer);
    expect(pipe).toBeTruthy();
  });
});
