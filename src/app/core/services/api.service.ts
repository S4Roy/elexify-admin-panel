import { Injectable } from '@angular/core';
import { HttpService } from './http.service';
import { Params } from '@angular/router';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  constructor(private httpService: HttpService) {}

  customerList(params: any) {
    return this.httpService.get(`admin/customer/list?${params.toString()}`);
  }
  getPage(slug: string) {
    return this.httpService.get(`admin/page/details/${slug.toString()}`);
  }
  submitPageContent(payload: any) {
    return this.httpService.post(`admin/page/add`, payload);
  }
  currencyList(params: any) {
    return this.httpService.get(`admin/currency/list?${params.toString()}`);
  }
  updateCurrencyStatus(payload: any) {
    return this.httpService.put(`admin/currency/edit`, payload);
  }
  submitTestimonial(payload: any) {
    return this.httpService.post(`admin/testimonial/add`, payload);
  }
  testimonialList(params: any) {
    return this.httpService.get(`admin/testimonial/list?${params.toString()}`);
  }
  updateTestimonialStatus(payload: any) {
    return this.httpService.put(`admin/testimonial/edit`, payload);
  }
  deleteTestimonial(payload: any) {
    return this.httpService.delete(`admin/testimonial/delete`, payload);
  }

  submitFaq(payload: any) {
    return this.httpService.post(`admin/faq/add`, payload);
  }

  faqList(params: any) {
    return this.httpService.get(`admin/faq/list?${params.toString()}`);
  }

  deleteFaq(payload: any) {
    return this.httpService.delete(`admin/faq/delete`, payload);
  }

  consultationList(params: any) {
    return this.httpService.get(`admin/consultation/list?${params.toString()}`);
  }

  bannerList(params: any) {
    return this.httpService.get(`admin/banner/list?${params.toString()}`);
  }
  submitBanner(payload: any) {
    if (payload?._id) {
      return this.httpService.putFormData(`admin/banner/edit`, payload);
    } else {
      return this.httpService.postFormData(`admin/banner/add`, payload);
    }
  }
  deleteBanner(payload: any) {
    return this.httpService.delete(`admin/banner/delete`, payload);
  }

  blogList(params: any) {
    return this.httpService.get(`admin/blog/list?${params.toString()}`);
  }
  submiBlog(payload: any) {
    if (payload?._id) {
      return this.httpService.put(`admin/blog/edit`, payload);
    } else {
      return this.httpService.post(`admin/blog/add`, payload);
    }
  }
  deleteBlog(payload: any) {
    return this.httpService.delete(`admin/blog/delete`, payload);
  }
  ratingList(params: any) {
    return this.httpService.get(`admin/rating/list?${params.toString()}`);
  }
  updateRatingStatus(payload: any) {
    return this.httpService.put(`admin/rating/edit`, payload);
  }
  deleteRating(payload: any) {
    return this.httpService.delete(`admin/rating/delete`, payload);
  }
  updateSiteSettings(payload: any) {
    return this.httpService.put(`admin/settings/edit`, payload);
  }
  fetchSiteSettings(params: any) {
    return this.httpService.get(`admin/settings?${params.toString()}`);
  }
  contactUsList(params: any) {
    return this.httpService.get(`admin/contact-us/list?${params.toString()}`);
  }
  updateContactUsStatus(payload: any) {
    return this.httpService.put(`admin/contact-us/edit`, payload);
  }
  deleteContactUs(payload: any) {
    return this.httpService.delete(`admin/contact-us/delete`, payload);
  }

  subscriberList(params: any) {
    return this.httpService.get(`admin/subscriber/list?${params.toString()}`);
  }
  updateSubscriberStatus(payload: any) {
    return this.httpService.put(`admin/subscriber/edit`, payload);
  }
  deleteSubscriber(payload: any) {
    return this.httpService.delete(`admin/subscriber/delete`, payload);
  }

  specificationList(params: any) {
    return this.httpService.get(
      `admin/master/specification/list?${params.toString()}`,
    );
  }
  submitSpecification(payload: any) {
    if (payload?._id) {
      return this.httpService.put(`admin/master/specification/edit`, payload);
    } else {
      return this.httpService.post(`admin/master/specification/add`, payload);
    }
  }
  deleteSpecification(payload: any) {
    return this.httpService.delete(
      `admin/master/specification/delete`,
      payload,
    );
  }
  updateSpecSortOrder(payload: any) {
    return this.httpService.put(`admin/master/specification/order`, payload);
  }

  enquiryList(params: any) {
    return this.httpService.get(`admin/enquiry/list?${params.toString()}`);
  }
  updateEnquiryStatus(payload: any) {
    return this.httpService.put(`admin/enquiry/edit`, payload);
  }
  deleteEnquiry(payload: any) {
    return this.httpService.delete(`admin/enquiry/delete`, payload);
  }

  countryList(params: any) {
    return this.httpService.get(`admin/country/list?${params.toString()}`);
  }
  updateCountryStatus(payload: any) {
    return this.httpService.put(`admin/country/edit`, payload);
  }
  stateList(params: any) {
    return this.httpService.get(`admin/state/list?${params.toString()}`);
  }
  updateStateStatus(payload: any) {
    return this.httpService.put(`admin/state/edit`, payload);
  }
  cityList(params: any) {
    return this.httpService.get(`admin/city/list?${params.toString()}`);
  }
  updateCityStatus(payload: any) {
    return this.httpService.put(`admin/city/edit`, payload);
  }
  pincodeList(params: any) {
    return this.httpService.get(`admin/pincode/list?${params.toString()}`);
  }
  updatePincode(payload: any) {
    return this.httpService.put(`admin/pincode/edit`, payload);
  }
  addPincode(payload: any) {
    return this.httpService.post(`admin/pincode/add`, payload);
  }
  getCountries() {
    return this.httpService.get(`site/common/countries`);
  }

  addCustomer(payload: any) {
    return this.httpService.post(`admin/customer/add`, payload);
  }

  editCustomer(payload: any) {
    return this.httpService.put(`admin/customer/edit`, payload);
  }
  updateCustomerStatus(payload: any) {
    return this.httpService.patch(`admin/customer/change-status`, payload);
  }

  // --- Phase 2: customer profile / notification preferences ---
  customerDetails(id: string) {
    return this.httpService.get(`admin/customers/${id}/details`);
  }
  notificationPreferences(id: string) {
    return this.httpService.get(`admin/customers/${id}/notification-preferences`);
  }
  updateNotificationPreferences(id: string, payload: any) {
    return this.httpService.patch(
      `admin/customers/${id}/notification-preferences`,
      payload,
    );
  }
  verificationOverride(id: string, payload: any) {
    return this.httpService.post(
      `admin/customers/${id}/verification-override`,
      payload,
    );
  }

  // --- Phase 2: notifications ---
  notificationHistory(params: any) {
    return this.httpService.get(`admin/notifications/history?${params.toString()}`);
  }
  notificationDeadLetter(params: any) {
    return this.httpService.get(
      `admin/notifications/dead-letter?${params.toString()}`,
    );
  }
  retryNotification(jobId: string) {
    return this.httpService.post(`admin/notifications/${jobId}/retry`, {});
  }
  notificationSummary(range: string) {
    return this.httpService.get(`admin/notifications/summary?range=${range}`);
  }

  // --- Operations: webhook audit log ---
  webhookLogs(params: URLSearchParams) {
    return this.httpService.get(`admin/operations/webhook-logs?${params.toString()}`);
  }
  webhookLogDetails(id: string) {
    return this.httpService.get(`admin/operations/webhook-logs/${id}`);
  }

  // --- Email Templates ---
  emailTemplateList(params?: URLSearchParams) {
    const query = params?.toString();
    return this.httpService.get(
      `admin/email-templates${query ? `?${query}` : ''}`,
    );
  }
  emailTemplateDetails(action: string) {
    return this.httpService.get(`admin/email-templates/${action}`);
  }
  updateEmailTemplate(action: string, payload: any) {
    return this.httpService.put(`admin/email-templates/${action}`, payload);
  }
  resetEmailTemplate(action: string) {
    return this.httpService.post(`admin/email-templates/${action}/reset`, {
      confirm: true,
    });
  }
  previewEmailTemplate(action: string, draft: any = {}) {
    return this.httpService.post(
      `admin/email-templates/${action}/preview`,
      draft,
    );
  }
  sendTestEmailTemplate(action: string, email: string) {
    return this.httpService.post(
      `admin/email-templates/${action}/send-test`,
      { email },
    );
  }
  runEmailTemplateSeed(type: 'seed' | 'upgrade') {
    return this.httpService.post(`admin/email-templates/seed-run`, { type });
  }

  // --- SMS Templates ---
  smsTemplateList(params?: URLSearchParams) {
    const query = params?.toString();
    return this.httpService.get(
      `admin/sms-templates${query ? `?${query}` : ''}`,
    );
  }
  smsTemplateDetails(event: string) {
    return this.httpService.get(`admin/sms-templates/${event}`);
  }
  updateSmsTemplate(event: string, payload: any) {
    return this.httpService.put(`admin/sms-templates/${event}`, payload);
  }
  resetSmsTemplate(event: string) {
    return this.httpService.post(`admin/sms-templates/${event}/reset`, {
      confirm: true,
    });
  }

  // --- Data Operations (Seeder / Migration / Backfill / Repair registry) ---
  dataOperationList() {
    return this.httpService.get(`admin/data-operations`);
  }
  dataOperationDetail(key: string) {
    return this.httpService.get(`admin/data-operations/${key}`);
  }
  dataOperationHealth(key: string) {
    return this.httpService.get(`admin/data-operations/${key}/health`);
  }
  dataOperationDryRun(key: string) {
    return this.httpService.post(`admin/data-operations/${key}/dry-run`, {});
  }
  runDataOperation(key: string, confirmation?: string) {
    return this.httpService.post(`admin/data-operations/${key}/run`, {
      confirmation,
    });
  }
  dataOperationExecutionList(params?: URLSearchParams) {
    const query = params?.toString();
    return this.httpService.get(
      `admin/data-operations/executions${query ? `?${query}` : ''}`,
    );
  }
  dataOperationExecutionDetail(executionId: string) {
    return this.httpService.get(
      `admin/data-operations/executions/${executionId}`,
    );
  }
  dataOperationExecutionLogs(executionId: string) {
    return this.httpService.get(
      `admin/data-operations/executions/${executionId}/logs`,
    );
  }

  // Third-party credentials are write-only: these APIs return configuration
  // metadata and masks, never plaintext secrets.
  integrationCredentialList() {
    return this.httpService.get(`admin/integration-credentials`);
  }
  updateIntegrationCredential(provider: string, payload: any) {
    return this.httpService.put(`admin/integration-credentials/${provider}`, payload);
  }
  testIntegrationCredential(provider: string) {
    return this.httpService.post(`admin/integration-credentials/${provider}/test`, {});
  }
  clearIntegrationCredential(provider: string, reason: string) {
    return this.httpService.delete(`admin/integration-credentials/${provider}`, { reason });
  }
  shiprocketPickupLocations() {
    return this.httpService.get(`admin/integration-credentials/shiprocket/pickup-locations`);
  }
}
