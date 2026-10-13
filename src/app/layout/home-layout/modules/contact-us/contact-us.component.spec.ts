import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApiService } from 'app/core/services/api.service';
import { PermissionService } from 'app/core/services/permission.service';
import { of } from 'rxjs';
import { ContactUsComponent } from './contact-us.component';
import { sharedTestProviders, activatedRouteStub } from '../../../../../testing/shared-test-providers';

describe('ContactUsComponent', () => {
  let component: ContactUsComponent;
  let fixture: ComponentFixture<ContactUsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactUsComponent],
      providers: [...sharedTestProviders(), activatedRouteStub()],
    })
    .compileComponents();

    spyOn(TestBed.inject(ApiService), 'contactUsList').and.returnValue(of({ data: { docs: [], page: 1, limit: 50, totalDocs: 0, totalPages: 0 } }) as any);
    fixture = TestBed.createComponent(ContactUsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  it('opens a conversation for read-only users while protecting workflow and delete actions', () => {
    const enquiry = { _id: '507f1f77bcf86cd799439011', name: 'Maya Shah', email: 'maya@example.com', subject: 'Order question', message: '<p>Where is my order?</p>', priority: 'high', status: 'pending' };
    component.item_list = [enquiry];
    const open = spyOn(component, 'updateStatus');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.customer-avatar').textContent.trim()).toBe('MS');
    expect(fixture.nativeElement.querySelector('.ticket-id').textContent.trim()).toBe('CON-99439011');
    expect(fixture.nativeElement.querySelector('.message-preview').textContent).toContain('Where is my order?');
    expect(fixture.nativeElement.querySelector('.status-badge').disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('app-menu')).toBeNull();
    fixture.nativeElement.querySelector('.open-thread').click();
    expect(open).toHaveBeenCalledWith(enquiry);
  });
  it('keeps priority and page size when changing status tabs', () => {
    component.paginationOption.limit = 25;
    component.filterValues['priority'] = 'urgent';
    component.setStatus('pending');
    const params = (TestBed.inject(ApiService).contactUsList as jasmine.Spy).calls.mostRecent().args[0] as URLSearchParams;
    expect(params.get('status')).toBe('pending');
    expect(params.get('priority')).toBe('urgent');
    expect(params.get('limit')).toBe('25');
    expect(params.get('page')).toBe('1');
  });
  it('keeps workflow editing available only with its existing permission', () => {
    TestBed.inject(PermissionService).keys.set(new Set(['contacts.update']));
    const enquiry = { _id: 'ticket1', name: 'Customer', message: 'Hello', status: 'answered' };
    component.item_list = [enquiry];
    const open = spyOn(component, 'updateStatus');
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.status-badge');
    expect(button.classList.contains('status-answered')).toBeTrue();
    button.click();
    expect(open).toHaveBeenCalledWith(enquiry);
  });
  it('marks unsuccessful delivery clearly and preserves private-note labels', () => {
    component.item_list = [{ _id: 'ticket1', name: 'Customer', message: 'Hello', status: 'pending', latest_message: { kind: 'reply', author_name: 'Support', delivery_status: 'failed' } }];
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.send-warning').textContent).toContain('Not sent');
    component.item_list = [{ _id: 'ticket2', name: 'Customer', message: 'Hello', status: 'pending', latest_message: { kind: 'note', author_name: 'Support' } }];
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.private-activity').textContent).toContain('Private note');
  });
});
