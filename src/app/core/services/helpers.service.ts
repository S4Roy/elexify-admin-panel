import { Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from './auth.service';
import { BehaviorSubject, Observable } from 'rxjs';
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
  constructor(private authService: AuthService) {}
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
      if (!parseData?.userRoles?.length) {
        return '';
      }
      let user_role = parseData?.userRoles[0]?.name ?? null;
      return user_role;
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
