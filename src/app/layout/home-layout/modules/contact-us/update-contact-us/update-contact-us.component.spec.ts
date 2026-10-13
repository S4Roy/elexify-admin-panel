import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { ApiService } from 'app/core/services/api.service';
import { PermissionService } from 'app/core/services/permission.service';
import { UpdateContactUsComponent } from './update-contact-us.component';
import { sharedTestProviders, matDialogDataProvider, matDialogRefStub } from '../../../../../../testing/shared-test-providers';

describe('Contact enquiry conversation', () => {
  let component: UpdateContactUsComponent;
  let fixture: ComponentFixture<UpdateContactUsComponent>;
  let api: jasmine.SpyObj<ApiService>;
  let editAllowed: boolean;
  const contact = { _id: '123456789012345678901234', name: 'Customer', email: 'customer@example.com', message: 'Original question', status: 'pending', priority: 'normal', created_at: '2026-10-12T10:00:00Z' };
  beforeEach(async () => {
    editAllowed = true;
    api = jasmine.createSpyObj('ApiService', ['contactUsThread', 'addContactUsMessage', 'updateContactUsStatus']);
    api.contactUsThread.and.returnValue(of({ data: { contact: { ...contact }, messages: { docs: [], page: 1, limit: 20, totalDocs: 0, totalPages: 1 } } }));
    api.addContactUsMessage.and.returnValue(of({ data: { kind: 'reply', delivery_status: 'sent' } }));
    api.updateContactUsStatus.and.returnValue(of({ status: 'success' }));
    await TestBed.configureTestingModule({
      imports: [UpdateContactUsComponent],
      providers: [...sharedTestProviders(), matDialogDataProvider({ ...contact }), matDialogRefStub(),
        { provide: ApiService, useValue: api }, { provide: PermissionService, useValue: { can: () => editAllowed } }],
    }).compileComponents();
    fixture = TestBed.createComponent(UpdateContactUsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  it('loads the thread and retains the original customer message', () => {
    expect(api.contactUsThread).toHaveBeenCalledWith(contact._id, 1, 20);
    expect(fixture.nativeElement.textContent).toContain('Original question');
  });
  it('sends a customer reply and clears the draft after acceptance', () => {
    component.composer.setValue({ content: 'Your answer' });
    component.send();
    expect(api.addContactUsMessage).toHaveBeenCalledWith(contact._id, jasmine.objectContaining({ kind: 'reply', content: 'Your answer' }));
    expect(component.composer.value.content).toBe('');
    expect(component.changed).toBeTrue();
  });
  it('saves an internal remark using the private message type', () => {
    component.setMode('note');
    component.composer.setValue({ content: 'Private investigation' });
    api.addContactUsMessage.and.returnValue(of({ data: { kind: 'note' } }));
    component.send();
    expect(api.addContactUsMessage).toHaveBeenCalledWith(contact._id, jasmine.objectContaining({ kind: 'note', content: 'Private investigation' }));
  });
  it('reuses the request ID after a connection failure to prevent duplicate emails', () => {
    api.addContactUsMessage.and.returnValue(throwError(() => new Error('Connection lost')));
    component.composer.setValue({ content: 'Your answer' });
    component.send();
    component.send();
    const calls = api.addContactUsMessage.calls.allArgs();
    expect(calls[0][1].request_id).toBe(calls[1][1].request_id);
    expect(component.composer.value.content).toBe('Your answer');
    expect(component.sendError).toContain('draft is preserved');
  });
  it('keeps an unconfirmed reply visible without automatically resending', () => {
    api.addContactUsMessage.and.returnValue(of({ data: { delivery_status: 'unknown' } }));
    component.composer.setValue({ content: 'Your answer' });
    component.send();
    expect(component.sendError).toContain('could not be confirmed');
    expect(api.addContactUsMessage).toHaveBeenCalledTimes(1);
    expect(component.composer.value.content).toBe('Your answer');
  });
  it('prevents sending for staff with view access only', () => {
    editAllowed = false;
    component.composer.setValue({ content: 'Should not send' });
    component.send();
    fixture.detectChanges();
    expect(api.addContactUsMessage).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.composer-section')).toBeNull();
  });
  it('blocks customer replies to archived enquiries but permits private remarks', () => {
    component.data.status = 'archived';
    component.composer.setValue({ content: 'Review note' });
    component.send();
    expect(api.addContactUsMessage).not.toHaveBeenCalled();
    component.setMode('note');
    component.send();
    expect(api.addContactUsMessage).toHaveBeenCalledTimes(1);
  });
  it('requests the selected conversation page', () => {
    component.loadThread(2);
    expect(api.contactUsThread).toHaveBeenCalledWith(contact._id, 2, 20);
  });
  it('saves workflow changes without closing the conversation', () => {
    component.formGroup.patchValue({ status: 'pending', priority: 'urgent' });
    component.onSubmit();
    expect(api.updateContactUsStatus).toHaveBeenCalledWith({ _id: contact._id, status: 'pending', priority: 'urgent' });
    expect(TestBed.inject(MatDialogRef).close).not.toHaveBeenCalled();
  });
});
