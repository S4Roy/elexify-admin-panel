import { TestBed } from '@angular/core/testing';

import { InventoryService } from './inventory.service';
import { sharedTestProviders } from '../../../testing/shared-test-providers';

describe('InventoryService', () => {
  let service: InventoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...sharedTestProviders()] });
    service = TestBed.inject(InventoryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
