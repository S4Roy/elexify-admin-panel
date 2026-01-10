import { Injectable } from '@angular/core';
import { HttpService } from './http.service';
import { Router } from '@angular/router';
import * as CryptoJS from 'crypto-js';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment.prod';

@Injectable({
  providedIn: 'root',
})
export class MasterService {
  constructor(
    private httpService: HttpService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  // Enquiry List Page
  getLatestEnquiryList(params: any) {
    return this.httpService.get('admin/dashboard/latest-enquiries', params);
  }
  getLatestAnnouncementList(params: any) {
    return this.httpService.get('admin/dashboard/latest-announcement', params);
  }

  //  sec_1/hero section
  addHeroSectionData(payload: any) {
    return this.httpService.postFormData(
      'admin/home/section/save/hero',
      payload
    );
  }
  getHeroSectionData(params: any) {
    return this.httpService.get('admin/home/section/info/hero', params);
  }
  updateHeroSectionData(id: number, payload: any) {
    // return this.httpService.post('admin/dashboard/latest-announcement' + id + '/', payload);
  }
  deleteHeroSectionData(payload: any) {
    return this.httpService.post('admin/home/section/delete/hero', payload);
  }

  // sec_2/about-anctpl
  addSection_2_Data(payload: any) {
    return this.httpService.postFormData(
      'admin/home/section/save/about-anctpl',
      payload
    );
  }
  getAbout_anctplData(params: any) {
    return this.httpService.get('admin/home/section/info/about-anctpl', params);
  }
  updateSection_2_Data(id: number, payload: any) {
    //return this.httpService.post('admin/dashboard/latest-announcement' + id + '/', payload);
  }

  // sec_3/more-about-anctpl
  addSection_3_Data(payload: any) {
    return this.httpService.postFormData(
      'admin/home/section/save/more-about-anctpl',
      payload
    );
  }
  getMore_about_anctplData(params: any) {
    return this.httpService.get(
      'admin/home/section/info/more-about-anctpl',
      params
    );
  }

  // AwardCertificate / Media
  getAwardCertificateList(params: any) {
    return this.httpService.get(
      'admin/home/section/info/award-certificate',
      params
    );
  }
  addAwardCertificate(payload: any) {
    return this.httpService.post(
      'admin/home/section/save/award-certificate',
      payload
    );
  }

  // services
  getPopularServiceList(params: any) {
    return this.httpService.get(
      'admin/home/section/info/popular-service',
      params
    );
  }
  addPopularServices(payload: any) {
    return this.httpService.post(
      'admin/home/section/save/popular-service',
      payload
    );
  }

  // SuccessStories
  getSuccessStoryList(params: any) {
    return this.httpService.get(
      'admin/home/section/info/success-story',
      params
    );
  }
  addSuccessStory(payload: any) {
    return this.httpService.post(
      'admin/home/section/save/success-story',
      payload
    );
  }

  // Our Progress
  getProgressList(params: any) {
    return this.httpService.get('admin/home/section/info/our-progress', params);
  }
  addProgress(payload: any) {
    return this.httpService.post(
      'admin/home/section/save/our-progress',
      payload
    );
  }

  // career /home/section/info/career
  getCareerList(params: any) {
    return this.httpService.get('admin/home/section/info/career', params);
  }
  addCareer(payload: any) {
    return this.httpService.postFormData(
      'admin/home/section/save/career',
      payload
    );
  }

  //admin/gallery-list
  getGalleryList(params: any) {
    return this.httpService.get('admin/gallery-list', params);
  }
  getBlogList(params: any) {
    return this.httpService.get('admin/blog-list', params);
  }
  getServicesList(params: any) {
    return this.httpService.get('admin/service-list', params);
  }

  // sats1
  getSatsList(params: any) {
    return this.httpService.get(
      'admin/home/section/info/about-airindia-sats',
      params
    );
  }

  saveSatsData(payload: any) {
    return this.httpService.post(
      'admin/home/section/save/about-airindia-sats',
      payload
    );
  }

  // more sats
  getMoreSatsList(params: any) {
    return this.httpService.get(
      'admin/home/section/info/more-about-airindia-sats',
      params
    );
  }

  saveMoreSatsData(payload: any) {
    return this.httpService.post(
      'admin/home/section/save/more-about-airindia-sats',
      payload
    );
  }

  // Testimonials
  getTestimonialsList(params: any) {
    return this.httpService.get('admin/home/section/info/news-event', params);
  }
  saveTestimonials(payload: any) {
    return this.httpService.post('admin/home/section/save/news-event', payload);
  }
  deleteMoreSatsData(payload: any) {
    return this.httpService.post(
      'admin/home/section/delete/more-about-airindia-sats/image',
      payload
    );
  }

  //admin/news-list

  getAwardList(params: any) {
    return this.httpService.get('admin/award-list', params);
  }

  getNewsList(params: any) {
    return this.httpService.get('admin/news-list', params);
  }

  getClientList(params: any) {
    return this.httpService.get('admin/client-list', params);
  }

  //  getServiceManagementList(params:any)  { //admin/service/list?page=1&limit=10&sort_order=asc%2Fdesc&sort_by=name%2Fcreated_at
  //     return this.httpService.get('admin/service/list', params);
  //   }

  newsList(params: any) {
    return this.httpService.get(`admin/news/list?${params.toString()}`);
  }
  deleteNews(payload: any) {
    return this.httpService.post(`admin/news/delete`, payload);
  }  
  awardList(params: any) {
    return this.httpService.get(`admin/award/list?${params.toString()}`);
  }
  deleteAward(payload: any) {
    return this.httpService.post(`admin/award/delete`, payload);
  }
  serviceList(params: any) {
    return this.httpService.get(`admin/service/list?${params.toString()}`);
  }
  deleteService(payload: any) {
    return this.httpService.post(`admin/service/delete`, payload);
  }
  enquiryList(params: any) {
    return this.httpService.get(`admin/inquiry/list?${params.toString()}`);
  }
  deleteEnquiry(payload: any) {
    return this.httpService.post(`admin/inquiry/delete`, payload);
  }  
  clienteleList(params: any) {
    return this.httpService.get(`admin/clientele/list?${params.toString()}`);
  }
  announcementType() {
    return this.httpService.get(`admin/announcement-type`);
  }
  deleteClientele(payload: any) {
    return this.httpService.post(`admin/clientele/delete`, payload);
  }
  latestAnnouncementList(params: any) {
    return this.httpService.get(`admin/dashboard/latest-announcement?${params.toString()}`);
  }
  contentApprovalList(params: any) {
    return this.httpService.get(`admin/content-approval/list?${params.toString()}`);
  }
  contentApprovalDetails(id: any) {
    return this.httpService.get(`admin/content-approval/details/${id.toString()}`);
  }
  contentApprovalChangeRequestStatus(payload:any){
    return this.httpService.post(`admin/content-approval/change-request-status`, payload);
  }
  activityList(params: any) {
    return this.httpService.get(`admin/activity/list?${params.toString()}`);
  }
  activityDetails(id: any) {
    return this.httpService.get(`admin/activity/details/${id.toString()}`);
  }
}
