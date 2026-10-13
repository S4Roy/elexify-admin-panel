import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiService } from './api.service';
import { HttpService } from './http.service';

describe('Customer account pagination requests', () => {
  let api: ApiService;
  let http: HttpTestingController;
  let baseUrl: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
    baseUrl = TestBed.inject(HttpService).BASE_URL;
  });

  afterEach(() => http.verify());

  it('sends the selected device page to the backend', () => {
    api.customerSessions('customer-id', 2).subscribe();

    const request = http.expectOne(`${baseUrl}admin/customers/customer-id/sessions?page=2`);
    expect(request.request.method).toBe('GET');
    request.flush({ data: { docs: [], page: 2 } });
  });

  it('sends the selected authentication history page to the backend', () => {
    api.customerAuthEvents('customer-id', 3).subscribe();

    const request = http.expectOne(`${baseUrl}admin/customers/customer-id/auth-events?page=3`);
    expect(request.request.method).toBe('GET');
    request.flush({ data: { docs: [], page: 3 } });
  });

  it('defaults devices to the first page', () => {
    api.customerSessions('customer-id').subscribe();

    http.expectOne(`${baseUrl}admin/customers/customer-id/sessions?page=1`).flush({ data: { docs: [] } });
  });
  it('sends selected page sizes while retaining existing default request URLs', () => {
    api.customerSessions('customer-id', 1, 25).subscribe();
    http.expectOne(`${baseUrl}admin/customers/customer-id/sessions?page=1&limit=25`).flush({ data: {} });
    api.customerAuthEvents('customer-id', 1, 50).subscribe();
    http.expectOne(`${baseUrl}admin/customers/customer-id/auth-events?page=1&limit=50`).flush({ data: {} });
    api.contactUsThread('contact-id', 1, 100).subscribe();
    http.expectOne(`${baseUrl}admin/contact-us/contact-id/thread?page=1&limit=100`).flush({ data: {} });
  });
});
