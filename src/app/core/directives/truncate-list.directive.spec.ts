import { DomSanitizer } from '@angular/platform-browser';
import { TruncateListDirective } from './truncate-list.directive';

describe('TruncateListDirective', () => {
  it('should create an instance', () => {
    const sanitizer = jasmine.createSpyObj<DomSanitizer>('DomSanitizer', ['bypassSecurityTrustHtml']);
    const directive = new TruncateListDirective(sanitizer);
    expect(directive).toBeTruthy();
  });
});
