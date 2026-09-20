import { Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from './auth.service';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import PaginationOptions from '../models/PaginationOptions';

@Injectable({
  providedIn: 'root',
})
export class HelpersService {
  private viewport = new BehaviorSubject<any>({});
  viewport$ = this.viewport.asObservable();
  private formGroup = new BehaviorSubject<any>({});
  private pageData = new BehaviorSubject<any>({});
  private nextClick = new BehaviorSubject<any>({});
  private backUrl = new BehaviorSubject<any>({});
  private breadcrumbs = new BehaviorSubject<any>([]);
  breadcrumbs$ = this.breadcrumbs.asObservable();
  private searchKey = new BehaviorSubject<any>([]);
  searchKey$ = this.searchKey.asObservable();
  // Lets any list page register a "Filters" button (with an active-filter
  // count badge) that renders on the right side of the shared breadcrumb
  // bar, and lets that same page know when it was clicked — keeps the
  // filter drawer trigger common/reusable instead of duplicated per page.
  readonly secondaryLink = new BehaviorSubject<{ label: string; icon: string; url: string } | null>(null);
  private filterButton = new BehaviorSubject<{ count: number } | null>(null);
  filterButton$ = this.filterButton.asObservable();
  private filterButtonClick = new Subject<void>();
  filterButtonClick$ = this.filterButtonClick.asObservable();
  // Same pattern as the Filters button — lets a list page register an
  // "Add New" action that renders on the breadcrumb bar instead of each
  // page floating its own button over its table.
  private actionButton = new BehaviorSubject<{
    label: string;
    icon?: string;
  } | null>(null);
  actionButton$ = this.actionButton.asObservable();
  private actionButtonClick = new Subject<void>();
  actionButtonClick$ = this.actionButtonClick.asObservable();
  // Same pattern as Add New — lets a list page register an "Export" action
  // (e.g. Orders' export-to-Excel) on the shared breadcrumb bar instead of
  // floating its own button over the table.
  private exportAction = new BehaviorSubject<{
    label: string;
    icon?: string;
  } | null>(null);
  exportAction$ = this.exportAction.asObservable();
  private exportActionClick = new Subject<void>();
  exportActionClick$ = this.exportActionClick.asObservable();
  // Lets a list page register a view-mode switch (e.g. Tree/Table) plus a
  // small set of secondary actions (e.g. Expand all/Collapse all) that
  // render on the same breadcrumb-bar row as Add New/Filters, instead of
  // the page floating its own separate toolbar row underneath.
  private viewToggle = new BehaviorSubject<{
    options: { value: string; label: string; icon?: string }[];
    active: string;
    extraActions?: { key: string; label: string; icon?: string }[];
  } | null>(null);
  viewToggle$ = this.viewToggle.asObservable();
  private viewToggleChange = new Subject<string>();
  viewToggleChange$ = this.viewToggleChange.asObservable();
  private viewToggleAction = new Subject<string>();
  viewToggleAction$ = this.viewToggleAction.asObservable();
  // Lets a list page register a bulk-selection toolbar (e.g. "3 selected —
  // Update status — Clear") that renders on the breadcrumb bar beside Add
  // New/Filters while 1+ rows are checked, instead of the page floating
  // its own separate toolbar row underneath the table.
  private selectionAction = new BehaviorSubject<{
    count: number;
    label: string;
    icon?: string;
  } | null>(null);
  selectionAction$ = this.selectionAction.asObservable();
  private selectionActionClick = new Subject<void>();
  selectionActionClick$ = this.selectionActionClick.asObservable();
  private selectionClear = new Subject<void>();
  selectionClear$ = this.selectionClear.asObservable();
  constructor(private authService: AuthService) {}
  setSelectionAction(config: { count: number; label: string; icon?: string } | null) {
    this.selectionAction.next(config);
  }
  clearSelectionAction() {
    this.selectionAction.next(null);
  }
  triggerSelectionActionClick() {
    this.selectionActionClick.next();
  }
  triggerSelectionClear() {
    this.selectionClear.next();
  }
  setViewToggle(config: {
    options: { value: string; label: string; icon?: string }[];
    active: string;
    extraActions?: { key: string; label: string; icon?: string }[];
  }) {
    this.viewToggle.next(config);
  }
  clearViewToggle() {
    this.viewToggle.next(null);
  }
  triggerViewToggleChange(value: string) {
    this.viewToggleChange.next(value);
  }
  triggerViewToggleAction(key: string) {
    this.viewToggleAction.next(key);
  }
  setFilterButton(count: number = 0) {
    this.filterButton.next({ count });
  }
  clearFilterButton() {
    this.filterButton.next(null);
  }
  triggerFilterButtonClick() {
    this.filterButtonClick.next();
  }
  setActionButton(config: { label: string; icon?: string }) {
    this.actionButton.next(config);
  }
  clearActionButton() {
    this.actionButton.next(null);
  }
  triggerActionButtonClick() {
    this.actionButtonClick.next();
  }
  setExportAction(config: { label: string; icon?: string } | null) {
    this.exportAction.next(config);
  }
  clearExportAction() {
    this.exportAction.next(null);
  }
  triggerExportActionClick() {
    this.exportActionClick.next();
  }
  updateSearchTerm(searchKey: string) {
    this.searchKey.next(searchKey.trim());
  }
  updateBreadCrumbs(data: any) {
    this.breadcrumbs.next(data);
  }
  updateNext(data: any) {
    this.nextClick.next(data);
  }
  updateBackUrl(data: any) {
    this.backUrl.next(data);
  }
  updateformGroup(data: any) {
    this.formGroup.next(data);
  }
  setPageData(data: any): void {
    this.pageData.next(data);
  }
  getPageData(page_type: any): Observable<any> {
    return this.pageData.asObservable();
  }
  getNext(): Observable<any> {
    return this.nextClick.asObservable();
  }
  getBackUrl(): Observable<any> {
    return this.backUrl.asObservable();
  }
  getFormGroup(): Observable<any> {
    return this.formGroup.asObservable();
  }
  role() {
    let userData = this.authService.getUserData();
    if (userData !== null) {
      let parseData = JSON.parse(userData);
      // The login response stores a flat `role` string on the user object
      // (see adminLogin.js: `role: user.role`) — there is no `userRoles`
      // array anywhere in the API. The old `userRoles[0].name` lookup below
      // always returned '' for every admin regardless of actual role.
      return parseData?.role ?? parseData?.userRoles?.[0]?.name ?? '';
    } else {
      return null;
    }
  }
  role_id() {
    let userData = this.authService.getUserData();
    if (userData !== null) {
      let parseData = JSON.parse(userData);
      if (!parseData?.user_role_id) {
        return '';
      }
      let roleId = parseData?.user_role_id ?? null;
      return roleId;
    } else {
      return null;
    }
  }
  CompanyAccountId() {
    let userData = this.authService.getUserData();
    if (userData !== null) {
      let parseData = JSON.parse(userData);

      let CompanyAccountId = parseData?.companyAccountId ?? null;
      return CompanyAccountId;
    } else {
      return null;
    }
  }
  userId() {
    let userData = this.authService.getUserData();
    if (userData !== null) {
      let parseData = JSON.parse(userData);

      let userId = parseData?.userId ?? null;
      return userId;
    } else {
      return null;
    }
  }
  userEmail() {
    let userData = this.authService.getUserData();
    if (userData !== null) {
      let parseData = JSON.parse(userData);
      let email = parseData?.email ?? null;
      return email;
    } else {
      return null;
    }
  }
  approvalLevel() {
    let userData = this.authService.getUserData();
    if (userData !== null) {
      let parseData = JSON.parse(userData);
      let approvalLevel = parseData?.approvalLevel ?? null;
      return approvalLevel;
    } else {
      return null;
    }
  }
  userDetails() {
    let userData = this.authService.getUserData();
    if (userData !== null) {
      let parseData = JSON.parse(userData);
      return parseData;
    } else {
      return null;
    }
  }
  updateViewPort(data: any) {
    this.viewport.next(data);
  }
  makeSortPayload(items: any[], pagination: PaginationOptions) {
    const pageIndex = Number(pagination?.page || 1) - 1;
    const pageLimit = Number(pagination?.limit || 20);
    const base = pageIndex * pageLimit;

    return items.map((item, index) => ({
      _id: item._id,
      sort_order: base + index + 1, // absolute index across all pages
    }));
  }
}
