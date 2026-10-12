import { TestBed } from '@angular/core/testing';
import { HelpersService } from './helpers.service';
import { AuthService } from './auth.service';
import { HttpService } from './http.service';

describe('HelpersService search term', () => {
  let service: HelpersService;
  let emitted: string[];
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: {} }, { provide: HttpService, useValue: {} }] });
    service = TestBed.inject(HelpersService);
    emitted = [];
    service.searchKey$.subscribe(term => emitted.push(term));
  });

  it('starts empty, skips repeats and clears for the next page', () => {
    service.updateSearchTerm(' Sujeet ');
    service.updateSearchTerm('Sujeet');
    service.clearSearchTerm();
    service.clearSearchTerm();
    // The same word can be searched again after a page change.
    service.updateSearchTerm('Sujeet');
    expect(emitted).toEqual(['', 'Sujeet', '', 'Sujeet']);
  });
});
