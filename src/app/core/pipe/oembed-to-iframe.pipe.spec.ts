import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { OembedToIframePipe } from './oembed-to-iframe.pipe';

describe('OembedToIframePipe', () => {
  it('create an instance', () => {
    const sanitizer = jasmine.createSpyObj<DomSanitizer>('DomSanitizer', ['bypassSecurityTrustHtml']);
    const pipe = new OembedToIframePipe(sanitizer);
    expect(pipe).toBeTruthy();
  });

  // Regression coverage for a real vulnerability: this pipe used to call
  // bypassSecurityTrustHtml() on the entire input string, so any
  // <script>/onerror payload saved into CKEditor-authored content (e.g. a
  // blog post) would execute unsanitized wherever [innerHTML] renders it.
  // Uses the app's real DomSanitizer (not a spy) so these assertions exercise
  // actual sanitization, not a mocked bypass.
  describe('sanitization (real DomSanitizer)', () => {
    let pipe: OembedToIframePipe;

    beforeEach(() => {
      TestBed.configureTestingModule({});
      pipe = new OembedToIframePipe(TestBed.inject(DomSanitizer));
    });

    const rendered = (html: string): string => {
      const safe = pipe.transform(html);
      const div = document.createElement('div');
      // Mirrors what [innerHTML]="... | oembedToIframe" actually does with
      // the SafeHtml value in a real component template.
      div.innerHTML = (safe as any)?.changingThisBreaksApplicationSecurity ?? '';
      return div.innerHTML;
    };

    it('strips a <script> tag', () => {
      const out = rendered('<p>hello</p><script>alert(1)</script>');
      expect(out).not.toContain('<script');
      expect(out).not.toContain('alert(1)');
    });

    it('strips an onerror event-handler attribute', () => {
      const out = rendered('<img src="x" onerror="alert(1)">');
      expect(out.toLowerCase()).not.toContain('onerror');
    });

    it('neutralizes a javascript: URL', () => {
      // Angular's sanitizer defangs a disallowed URL scheme by prefixing it
      // with "unsafe:" (e.g. href="unsafe:javascript:alert(1)") rather than
      // deleting the text - the invariant that matters is that the browser
      // can never navigate through it as a live javascript: URL.
      const out = rendered('<a href="javascript:alert(1)">click</a>');
      expect(out.toLowerCase()).not.toContain('href="javascript:');
      expect(out.toLowerCase()).toContain('unsafe:javascript:');
    });

    it('strips an SVG/script event-handler payload', () => {
      const out = rendered('<svg onload="alert(1)"></svg>');
      expect(out.toLowerCase()).not.toContain('onload');
    });

    it('still renders a legitimate YouTube <oembed> as a trusted iframe', () => {
      const out = rendered('<oembed url="https://youtu.be/dQw4w9WgXcQ"></oembed>');
      expect(out).toContain('<iframe');
      expect(out).toContain('youtube.com/embed/dQw4w9WgXcQ');
    });
  });
});
