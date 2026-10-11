import { TestBed } from '@angular/core/testing';

import { InventoryService } from './inventory.service';
import { HttpService } from './http.service';
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

  // HttpService.get's second argument is Angular request options, not a
  // query — queries must be in the URL or they are sent as "0=o&1=v…".
  it('puts COD remittance and rider cash queries in the URL', () => {
    const get = spyOn(TestBed.inject(HttpService), 'get').and.stub();
    service.codRemittanceSummary(10);
    service.riderCashPending({ rider_user_id: '507f1f77bcf86cd799439011' });
    service.riderCashPending({ rider_name: 'Ravi Kumar' });
    expect(get.calls.allArgs()).toEqual([
      ['admin/inventory/order/cod-remittance/summary?overdue_days=10'],
      ['admin/inventory/order/rider-cash/pending?rider_user_id=507f1f77bcf86cd799439011'],
      ['admin/inventory/order/rider-cash/pending?rider_name=Ravi+Kumar'],
    ]);
  });

  it('posts delivery code resends to the admin and rider endpoints', () => {
    const post = spyOn(TestBed.inject(HttpService), 'post').and.stub();
    service.resendDeliveryOtp('p1');
    service.riderResendOtp('p1');
    expect(post.calls.allArgs()).toEqual([
      ['admin/inventory/order/package/p1/resend-otp', {}],
      ['admin/delivery/p1/resend-otp', {}],
    ]);
  });
});
