import { TestBed } from '@angular/core/testing';

import { SettingsService } from './settings.service';
import { sharedTestProviders } from '../../../testing/shared-test-providers';

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...sharedTestProviders()] });
    service = TestBed.inject(SettingsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
