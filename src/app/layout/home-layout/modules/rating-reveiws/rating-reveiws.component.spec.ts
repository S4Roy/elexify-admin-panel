import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApiService } from 'app/core/services/api.service';
import { PermissionService } from 'app/core/services/permission.service';
import { of } from 'rxjs';
import { RatingReveiwsComponent } from './rating-reveiws.component';
import { sharedTestProviders, activatedRouteStub } from '../../../../../testing/shared-test-providers';

describe('RatingReveiwsComponent', () => {
  let component: RatingReveiwsComponent;
  let fixture: ComponentFixture<RatingReveiwsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RatingReveiwsComponent],
      providers: [...sharedTestProviders(), activatedRouteStub()],
    })
    .compileComponents();

    spyOn(TestBed.inject(ApiService), 'ratingList').and.returnValue(of({ data: { docs: [], page: 1, limit: 20, totalDocs: 0, totalPages: 0 } }) as any);
    fixture = TestBed.createComponent(RatingReveiwsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  it('renders stars, verified purchase and a clear empty-review state without inventing review text', () => {
    component.item_list = [{ _id: 'review1', user: { name: 'Dileep Nishad' }, product: { name: 'Cooling fan' }, verified_purchase: true, rating: 4, status: 'approved', description: null }];
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.customer-avatar').textContent.trim()).toBe('DN');
    expect(fixture.nativeElement.querySelectorAll('thead th').length).toBe(5);
    expect(fixture.nativeElement.querySelector('.rating-display').closest('td')).toBe(fixture.nativeElement.querySelector('.no-review').closest('td'));
    expect(fixture.nativeElement.querySelector('.pagination-embedded')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.rating-display').getAttribute('aria-label')).toBe('4 out of 5 stars');
    expect(fixture.nativeElement.querySelectorAll('.rating-stars mat-icon').length).toBe(5);
    expect(fixture.nativeElement.querySelector('.verified-badge')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.no-review').textContent).toContain('No written review');
    expect(fixture.nativeElement.querySelector('.review-status').disabled).toBeTrue();
  });
  it('preserves status moderation for users with edit permission', () => {
    TestBed.inject(PermissionService).keys.set(new Set(['ratings.update']));
    const review = { _id: 'review1', user: { name: 'Customer' }, product: { name: 'Fan' }, rating: 5, status: 'pending', title: 'Great fan', description: 'Works well' };
    component.item_list = [review];
    const update = spyOn(component, 'updateStatus');
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.review-status');
    expect(button.classList.contains('status-pending')).toBeTrue();
    button.click();
    expect(update).toHaveBeenCalledWith(review);
  });
  it('uses the selected page size and preserves filters in the list request', () => {
    component.paginationOption.limit = 50;
    component.paginationOption.page = 2;
    component.filterValues['verified_purchase'] = 'true';
    component.filterOption.status = 'approved';
    component.fetchRating();
    const params = (TestBed.inject(ApiService).ratingList as jasmine.Spy).calls.mostRecent().args[0] as URLSearchParams;
    expect(params.get('limit')).toBe('50');
    expect(params.get('page')).toBe('2');
    expect(params.get('verified_purchase')).toBe('true');
    expect(params.get('status')).toBe('approved');
  });
  it('does not show missing or invalid ratings as zero stars', () => {
    for (const value of [null, undefined, '', 0, 'bad', 6]) expect(component.ratingValue(value)).toBeNull();
    expect(component.ratingValue('4')).toBe(4);
  });
  it('uses status shortcuts without losing other active filters or the selected page size', () => {
    component.paginationOption.limit = 50;
    component.filterValues['verified_purchase'] = 'true';
    component.selectReviewStatus('pending');
    const params = (TestBed.inject(ApiService).ratingList as jasmine.Spy).calls.mostRecent().args[0] as URLSearchParams;
    expect(params.get('status')).toBe('pending');
    expect(params.get('limit')).toBe('50');
    expect(params.get('page')).toBe('1');
    expect(params.get('verified_purchase')).toBe('true');
    expect(component.selectedReviewStatus).toBe('pending');
  });
});
