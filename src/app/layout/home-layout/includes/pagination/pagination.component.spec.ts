import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviceDetectorService } from 'app/core/services/device-detector.service';
import { PaginationComponent } from './pagination.component';

describe('PaginationComponent', () => {
  let component: PaginationComponent;
  let fixture: ComponentFixture<PaginationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginationComponent],
      providers: [{ provide: DeviceDetectorService, useValue: { isDesktop: () => true } }],
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

describe('Pagination page sizes', () => {
  let fixture: ComponentFixture<PaginationComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PaginationComponent], providers: [
      { provide: DeviceDetectorService, useValue: { isDesktop: () => true } },
    ] }).compileComponents();
    fixture = TestBed.createComponent(PaginationComponent);
    fixture.componentRef.setInput('pagination', { page: 4, limit: 10, totalDocs: 93, totalPages: 10 });
    fixture.detectChanges();
  });
  it('emits one size change and resets the selected page without a second page request', () => {
    const sizeChange = spyOn(fixture.componentInstance.pageSizeChange, 'emit');
    const pageChange = spyOn(fixture.componentInstance.pageChange, 'emit');
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    select.selectedIndex = Array.from(select.options).findIndex(option => option.textContent?.trim() === '25');
    select.dispatchEvent(new Event('change'));
    expect(sizeChange).toHaveBeenCalledOnceWith(25);
    expect(pageChange).not.toHaveBeenCalled();
    expect(fixture.componentInstance.value).toBe(1);
  });
  it('matches the displayed dropdown value to the returned pagination limit', async () => {
    fixture.componentRef.setInput('pagination', { page: 1, limit: 50, totalDocs: 657, totalPages: 14 });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    expect(select.selectedOptions[0].textContent?.trim()).toBe('50');
    expect(fixture.componentInstance.rangeEnd).toBe(50);
  });
  it('includes an existing custom size and ignores unchanged or invalid selections', () => {
    fixture.componentRef.setInput('pagination', { page: 1, limit: 20, totalDocs: 93, totalPages: 5 });
    fixture.detectChanges();
    expect(fixture.componentInstance.availablePageSizes).toEqual([10, 20, 25, 50, 100]);
    const emit = spyOn(fixture.componentInstance.pageSizeChange, 'emit');
    for (const size of [20, 0, -1, 1000, 'invalid']) fixture.componentInstance.selectPageSize(size);
    expect(emit).not.toHaveBeenCalled();
  });
  it('shows zero to zero for empty lists and keeps the size selector available', () => {
    fixture.componentRef.setInput('pagination', { page: 1, limit: 50, totalDocs: 0, totalPages: 0 });
    fixture.detectChanges();
    expect(fixture.componentInstance.rangeStart).toBe(0);
    expect(fixture.componentInstance.rangeEnd).toBe(0);
    expect(fixture.nativeElement.querySelector('select')).toBeTruthy();
  });
  it('keeps the selector on mobile and clamps the last-page range to the record count', () => {
    spyOn(fixture.componentInstance.device, 'isDesktop').and.returnValue(false);
    fixture.componentRef.setInput('pagination', { page: 4, limit: 25, totalDocs: 93, totalPages: 4 });
    fixture.detectChanges();
    expect(fixture.componentInstance.rangeStart).toBe(76);
    expect(fixture.componentInstance.rangeEnd).toBe(93);
    expect(fixture.nativeElement.querySelector('select')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.pagination-info')).toBeTruthy();
  });
  it('jumps to a valid page once and ignores unchanged, out-of-range or invalid entries', () => {
    const emit = spyOn(fixture.componentInstance.pageChange, 'emit');
    const input: HTMLInputElement = fixture.nativeElement.querySelector('.page-jump input');
    input.value = '7';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(emit).toHaveBeenCalledOnceWith(7);
    fixture.componentInstance.jumpToPage(input);
    expect(emit).toHaveBeenCalledTimes(1);
    for (const value of ['0', '999', 'abc', '1.5', '']) {
      input.value = value;
      fixture.componentInstance.jumpToPage(input);
      expect(input.value).toBe('7');
    }
    expect(emit).toHaveBeenCalledTimes(1);
  });
  it('shows a bounded numbered window and dismisses the jump menu outside the toolbar', () => {
    fixture.componentRef.setInput('pagination', { page: 1, limit: 50, totalDocs: 3018, totalPages: 61 });
    fixture.detectChanges();
    expect(fixture.componentInstance.visiblePages).toEqual([1, 2, 3, '…', 61]);
    const menu: HTMLDetailsElement = fixture.nativeElement.querySelector('details');
    menu.open = true;
    document.body.click();
    expect(menu.open).toBeFalse();
  });
  it('keeps the jump menu open and explains invalid input before navigating', () => {
    const menu: HTMLDetailsElement = fixture.nativeElement.querySelector('details');
    const input: HTMLInputElement = fixture.nativeElement.querySelector('.page-jump input');
    menu.open = true;
    input.value = '999';
    fixture.componentInstance.submitPageJump(input);
    fixture.detectChanges();
    expect(menu.open).toBeTrue();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('between 1 and 10');
    input.value = '7';
    fixture.componentInstance.submitPageJump(input);
    expect(fixture.componentInstance.value).toBe(7);
    expect(menu.open).toBeFalse();
  });
});
