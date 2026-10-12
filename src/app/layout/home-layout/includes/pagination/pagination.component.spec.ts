import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaginationComponent } from './pagination.component';

describe('PaginationComponent', () => {
  let component: PaginationComponent;
  let fixture: ComponentFixture<PaginationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PaginationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows controls and requests the next page for six records at five per page', () => {
    fixture.componentRef.setInput('pagination', {
      page: 1, limit: 5, totalDocs: 6, totalPages: 2,
    });
    fixture.detectChanges();
    const pageChange = spyOn(component.pageChange, 'emit');
    const nextButton: HTMLButtonElement = fixture.nativeElement.querySelector('[matTooltip="Next Page"]');

    expect(nextButton).toBeTruthy();
    expect(nextButton.disabled).toBeFalse();
    nextButton.click();

    expect(pageChange).toHaveBeenCalledWith(2);
  });

  it('hides controls when all records fit on one page', () => {
    fixture.componentRef.setInput('pagination', {
      page: 1, limit: 5, totalDocs: 5, totalPages: 1,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.pagination-controls')).toBeNull();
  });
});
