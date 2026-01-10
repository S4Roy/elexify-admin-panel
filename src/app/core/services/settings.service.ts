import { Injectable } from '@angular/core';
import { HttpService } from './http.service';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private scrollPosition: number | null = null;

  constructor(private httpService: HttpService) {}

  setScrollPosition(position: number | null) {
    this.scrollPosition = position;
  }

  getScrollPosition(): number | null {
    return this.scrollPosition;
  }
  faqCategoryList(params: URLSearchParams) {
    return this.httpService.get(`admin/faq/category/list?${params.toString()}`);
  }
  userTypeList(params: URLSearchParams) {
    return this.httpService.get(`admin/user/type?${params.toString()}`);
  }
  submitFaqCategory(payload: any) {
    if (payload?.id) {
      return this.httpService.post('admin/faq/category/edit', payload);
    } else {
      return this.httpService.post('admin/faq/category/add', payload);
    }
  }
  deleteFaqCategory(payload: any) {
    return this.httpService.post('admin/faq/category/delete', payload);
  }
  faqList(params: URLSearchParams) {
    return this.httpService.get(`admin/faq/list?${params.toString()}`);
  }
  submitFAQ(payload: any) {
    if (payload?.id) {
      return this.httpService.post('admin/faq/edit', payload);
    } else {
      return this.httpService.post('admin/faq/add', payload);
    }
  }
  deleteFAQ(payload: any) {
    return this.httpService.post('admin/faq/delete', payload);
  }
  siteInfoDetails() {
    return this.httpService.get(`admin/setting/site-info/details`);
  }
  updateSiteInfoDetails(payload: any) {
    return this.httpService.postFormData(
      `admin/setting/save/site-info`,
      payload
    );
  }
  pageDetails(params: URLSearchParams) {
    return this.httpService.get(
      `admin/setting/cms/page/details?${params.toString()}`
    );
  }
  updatePageDetails(payload: any) {
    return this.httpService.post(
      `admin/setting/cms/page/${payload?.page_id ? 'edit' : 'add'}`,
      payload
    );
  }
  userList(params: URLSearchParams) {
    return this.httpService.get(`admin/user/list?${params.toString()}`);
  }
  submitUser(payload: any) {
    if (payload?.id) {
      return this.httpService.post('admin/user/edit', payload);
    } else {
      return this.httpService.post('admin/user/add', payload);
    }
  }
  deleteUser(payload: any) {
    return this.httpService.post('admin/user/delete', payload);
  }
  userDetails(id: string) {
    return this.httpService.get(`admin/user/details/${id.toString()}`);
  }

  teamList(params: URLSearchParams) {
    return this.httpService.get(`admin/team/list?${params.toString()}`);
  }
  submitTeamMember(payload: any) {
    if (payload?.id) {
      return this.httpService.postFormData('admin/team/edit', payload);
    } else {
      return this.httpService.postFormData('admin/team/add', payload);
    }
  }
  deleteTeamMember(payload: any) {
    return this.httpService.post('admin/team/delete', payload);
  }
  teamMemberDetails(id: string) {
    return this.httpService.get(`admin/team/details/${id.toString()}`);
  }

  contactPurposeList(params: URLSearchParams) {
    return this.httpService.get(
      `admin/contact-purpose/lists?${params.toString()}`
    );
  }
  submitContactPurpose(payload: any) {
    if (payload?.id) {
      return this.httpService.post('admin/contact-purpose/edit', payload);
    } else {
      return this.httpService.post('admin/contact-purpose/add', payload);
    }
  }
  deleteContactPurpose(payload: any) {
    return this.httpService.post('admin/contact-purpose/delete', payload);
  }

  contactPurposeDetails(id: string) {
    return this.httpService.get(
      `admin/contact-purpose/details/${id.toString()}`
    );
  }
  userChangePassword(payload: any) {
    return this.httpService.post('admin/user/change-password', payload);
  }

  blogList(params: URLSearchParams) {
    return this.httpService.get(`admin/blog/list?${params.toString()}`);
  }
  submitBlog(payload: any) {
    if (payload?.id) {
      return this.httpService.postFormData('admin/blog/edit', payload);
    } else {
      return this.httpService.postFormData('admin/blog/add', payload);
    }
  }
  deleteBlog(payload: any) {
    return this.httpService.post('admin/blog/delete', payload);
  }
  blogDetails(id: string) {
    return this.httpService.get(`admin/blog/details/${id.toString()}`);
  }
  menuList() {
    return this.httpService.get(`admin/user/menu`);
  }
  roleList(params: URLSearchParams) {
    return this.httpService.get(`admin/role/list?${params.toString()}`);
  }
  permissionList(params: URLSearchParams) {
    return this.httpService.get(
      `admin/role/permission-list?${params.toString()}`
    );
  }
  updatePermissions(payload: any) {
    return this.httpService.post('admin/role/permission-edit', payload);
  }
  customPageDetails(params: URLSearchParams) {
    return this.httpService.get(
      `admin/setting/cms/custom-page/details?${params.toString()}`
    );
  }
  customPageList(params: URLSearchParams) {
    return this.httpService.get(
      `admin/setting/cms/custom-page?${params.toString()}`
    );
  }
  submitCustomPage(payload: any) {
    return this.httpService.post(
      `admin/setting/cms/custom-page/${payload?.page_id ? 'edit' : 'add'}`,
      payload
    );
  }
  updateCustomPageStatus(payload: any) {
    return this.httpService.post(
      'admin/setting/cms/custom-page/status-change',
      payload
    );
  }
  deleteCustomPage(payload: any) {
    return this.httpService.post(
      'admin/setting/cms/custom-page/delete',
      payload
    );
  }
  credentialsCategoryList(params: URLSearchParams) {
    return this.httpService.get(
      `admin/credential/category/list?${params.toString()}`
    );
  }
  submitCredentialCategory(payload: any) {
    if (payload?.id) {
      return this.httpService.post('admin/credential/category/edit', payload);
    } else {
      return this.httpService.post('admin/credential/category/add', payload);
    }
  }
  deleteCredentialCategory(payload: any) {
    return this.httpService.post('admin/credential/category/delete', payload);
  }

  credentialsCertificateList(params: URLSearchParams) {
    return this.httpService.get(
      `admin/credential/certificate/list?${params.toString()}`
    );
  }
  submitCredentialCertificate(payload: any) {
    if (payload?.id) {
      return this.httpService.post(
        'admin/credential/certificate/edit',
        payload
      );
    } else {
      return this.httpService.post('admin/credential/certificate/add', payload);
    }
  }
  deleteCredentialCertificate(payload: any) {
    return this.httpService.post(
      'admin/credential/certificate/delete',
      payload
    );
  }
  credentialList(params: URLSearchParams) {
    return this.httpService.get(`admin/credential/list?${params.toString()}`);
  }
  submitCredential(payload: any) {
    if (payload?.id) {
      return this.httpService.postFormData('admin/credential/edit', payload);
    } else {
      return this.httpService.postFormData('admin/credential/add', payload);
    }
  }
  deleteCredential(payload: any) {
    return this.httpService.post('admin/credential/delete', payload);
  }
  checkPermission(payload: any) {
    return this.httpService.post('admin/role-permission/check', payload);
  }
}
