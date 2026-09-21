import { Injectable } from '@angular/core';
import { HttpService } from './http.service';

@Injectable({
  providedIn: 'root',
})
export class InventoryService {
  constructor(private httpService: HttpService) {}
  categoryList(params: any) {
    return this.httpService.get(
      `admin/inventory/category/list?${params.toString()}`
    );
  }
  updateCategoryOrder(payload: any) {
    return this.httpService.put(`admin/inventory/category/order`, payload);
  }
  submitCategory(payload: any) {
    if (payload?._id) {
      return this.httpService.put(`admin/inventory/category/edit`, payload);
    } else {
      return this.httpService.post(`admin/inventory/category/add`, payload);
    }
  }
  deleteCategory(payload: any) {
    return this.httpService.delete(`admin/inventory/category/delete`, payload);
  }

  brandList(params: any) {
    return this.httpService.get(
      `admin/inventory/brand/list?${params.toString()}`
    );
  }
  submitBrand(payload: any) {
    if (payload?._id) {
      return this.httpService.putFormData(
        `admin/inventory/brand/edit`,
        payload
      );
    } else {
      return this.httpService.postFormData(
        `admin/inventory/brand/add`,
        payload
      );
    }
  }
  deleteBrand(payload: any) {
    return this.httpService.delete(`admin/inventory/brand/delete`, payload);
  }

  productList(params: any) {
    return this.httpService.get(
      `admin/inventory/product/list?${params.toString()}`
    );
  }
  productBySlug(slug: string) {
    return this.httpService.get(`admin/inventory/product/details/${slug}`);
  }
  productSpecificationList(params: any) {
    return this.httpService.get(
      `admin/inventory/product/specifications?${params.toString()}`
    );
  }
  submitProduct(payload: any, add: boolean = true) {
    if (add) {
      return this.httpService.post(`admin/inventory/product/add`, payload);
    } else {
      return this.httpService.put(`admin/inventory/product/edit`, payload);
    }
  }
  updateProductStatus(payload: any) {
    return this.httpService.put(
      `admin/inventory/product/update-status`,
      payload
    );
  }
  deleteProduct(payload: any) {
    return this.httpService.delete(`admin/inventory/product/delete`, payload);
  }
  deleteProductVariation(payload: any) {
    return this.httpService.delete(
      `admin/inventory/product/variation/delete`,
      payload
    );
  }
  stockTransactions(params: any) {
    return this.httpService.get(
      `admin/inventory/stock/transactions?${params.toString()}`
    );
  }
  submitStock(payload: any, add: boolean = true) {
    if (add) {
      return this.httpService.post(`admin/inventory/stock/add`, payload);
    } else {
      return this.httpService.put(`admin/inventory/product/edit`, payload);
    }
  }
  submitAttribute(payload: any) {
    if (payload?._id) {
      return this.httpService.put(`admin/inventory/attribute/edit`, payload);
    } else {
      return this.httpService.post(`admin/inventory/attribute/add`, payload);
    }
  }
  attributeList(params: any) {
    return this.httpService.get(
      `admin/inventory/attribute/list?${params.toString()}`
    );
  }

  deleteAttribute(payload: any) {
    return this.httpService.delete(`admin/inventory/attribute/delete`, payload);
  }
  attributeBySlug(slug: string) {
    return this.httpService.get(`admin/inventory/attribute/details/${slug}`);
  }
  mediaList(params: any) {
    return this.httpService.get(`admin/media/list?${params.toString()}`);
  }
  submitMedia(payload: any) {
    if (payload?._id) {
      return this.httpService.putFormData(`admin/media/edit`, payload);
    } else {
      return this.httpService.postFormData(`admin/media/add`, payload);
    }
  }
  deleteMedia(payload: any) {
    return this.httpService.delete(`admin/media/delete`, payload);
  }
  mediaUsage(id: string) {
    return this.httpService.get(`admin/media/${id}/usage`);
  }
  attributeValueList(params: any) {
    return this.httpService.get(
      `admin/inventory/attribute/value-list?${params.toString()}`
    );
  }
  orderList(params: any) {
    return this.httpService.get(
      `admin/inventory/order/list?${params.toString()}`
    );
  }
  // Excel export — same filter/search/sort query params as orderList,
  // optionally scoped to a hand-picked set of order_ids (checkbox selection).
  exportCategories(params: URLSearchParams) {
    return this.httpService.downloadFile(`admin/inventory/category/export?${params.toString()}`);
  }
  exportProducts(params: URLSearchParams) {
    return this.httpService.downloadFile(`admin/inventory/product/export?${params.toString()}`);
  }
  exportOrders(params: URLSearchParams) {
    return this.httpService.downloadFile(`admin/inventory/order/export?${params.toString()}`);
  }
  // Typeahead source for the Orders list's "Customer" filter — a small,
  // ungated endpoint (routes/admin/inventory/order.js "/customer-options")
  // separate from create-options, since viewing/filtering orders shouldn't
  // require the order-creation permission that endpoint is gated behind.
  orderCustomerOptions(search: string) {
    const params = new URLSearchParams({ search: search || '' });
    return this.httpService.get(`admin/inventory/order/customer-options?${params.toString()}`);
  }
  sendToShipRocket(payload: any) {
    return this.httpService.post(`admin/inventory/order/shipping`, payload);
  }
  packageList(orderId: string) {
    return this.httpService.get(
      `admin/inventory/order/package/list?order_id=${orderId}`
    );
  }
  retryPackage(payload: any) {
    return this.httpService.post(`admin/inventory/order/package/retry`, payload);
  }
  cancelPackage(payload: any) {
    return this.httpService.post(`admin/inventory/order/package/cancel`, payload);
  }
  cancelOrder(payload: any) {
    return this.httpService.post(`admin/inventory/order/cancel`, payload);
  }
  // Superadmin-only override — bypasses the normal cancellation eligibility
  // rules. See elexify-backend routes/admin/inventory/order.js "/cancel/force".
  forceCancelOrder(payload: { order_id: string; reason: string }) {
    return this.httpService.post(`admin/inventory/order/cancel/force`, payload);
  }
  // Undoes a cancellation back to "processing" — refused server-side if a
  // refund already went through. See routes/admin/inventory/order.js "/reopen".
  reopenOrder(payload: { order_id: string; reason: string }) {
    return this.httpService.post(`admin/inventory/order/reopen`, payload);
  }
  recordManualPayment(payload: any) {
    return this.httpService.post('admin/inventory/order/payment/manual', payload);
  }
  updateOrderStatus(payload: { order_id: string; expected_status: string; status: string; reason: string }) {
    return this.httpService.post(`admin/inventory/order/status`, payload);
  }
  // order_ids is a comma-separated string of order ObjectIds — the backend
  // (routes/admin/inventory/order.js "/status/bulk") splits and validates
  // it. Each order is evaluated independently server-side, so this can
  // partially succeed; see the `summary`/`results` shape in the response.
  bulkUpdateOrderStatus(payload: { order_ids: string; status: string; reason: string }) {
    return this.httpService.post(`admin/inventory/order/status/bulk`, payload);
  }
  // Links an order to a Shiprocket order booked out-of-band (verified live
  // against Shiprocket server-side before anything is saved) instead of a
  // bare "packed" label with nothing behind it. Single-order only.
  registerExternalPackage(payload: { order_id: string; shiprocket_order_id: string; reason: string }) {
    return this.httpService.post(`admin/inventory/order/package/register-external`, payload);
  }
  // Resyncs an order that's already linked to Shiprocket from a live
  // lookup (for when the webhook missed or was delayed) — does not
  // establish a new link, see registerExternalPackage for that.
  syncShiprocketStatus(payload: { order_id: string; channel_id?: string; package_ids?: string[] }) {
    return this.httpService.post(`admin/inventory/order/sync-shiprocket-status`, payload);
  }
  // Shiprocket export reconciliation: upload -> audit (dry run, zero
  // writes) -> review -> apply. See services/orderService/
  // reconcileShiprocketOrderStatus.js on the backend for the matching
  // logic and controllers/admin/inventory/order/reconciliation/*.js for
  // the three endpoints below.
  auditReconciliation(file: File, mode = 'live_delivered') {
    return this.httpService.postFormData(`admin/inventory/order/reconciliation/audit`, { file, mode });
  }
  applyReconciliation(payload: { audit_id: string; confirmation: string }) {
    return this.httpService.post(`admin/inventory/order/reconciliation/apply`, payload);
  }
  fetchReconciliationDetails(auditId: string) {
    return this.httpService.post('admin/inventory/order/reconciliation/fetch-details', { audit_id: auditId });
  }
  listReconciliationAudits() {
    return this.httpService.get(`admin/inventory/order/reconciliation/list`, {});
  }
  retryRefund(payload: any) {
    return this.httpService.post(
      `admin/inventory/order/refund/retry`,
      payload
    );
  }
  returnRequests(params: URLSearchParams) {
    return this.httpService.get(`admin/inventory/order/returns?${params.toString()}`);
  }
  reviewReturn(payload: any) {
    return this.httpService.post(`admin/inventory/order/returns/review`, payload);
  }
  receiveReturn(returnRequestId: string) {
    return this.httpService.post(`admin/inventory/order/returns/receive`, { return_request_id: returnRequestId });
  }
  inspectReturn(payload: any) {
    return this.httpService.post(`admin/inventory/order/returns/inspect`, payload);
  }
  completeManualReturnRefund(payload: any) {
    return this.httpService.post(`admin/inventory/order/returns/manual-refund/complete`, payload);
  }
  returnOperation(payload: any) {
    return this.httpService.post(`admin/inventory/order/returns/operation`, payload);
  }
  updateReturnPickup(payload: any) {
    return this.httpService.post(`admin/inventory/order/returns/pickup`, payload);
  }
  downloadInvoice(orderId: string) {
    return this.httpService.downloadFile(
      `admin/inventory/order/invoice?order_id=${orderId}`
    );
  }
  zohoInvoiceStatus(orderId: string) {
    return this.httpService.get(
      `admin/inventory/order/invoice/zoho?order_id=${encodeURIComponent(orderId)}`
    );
  }
  syncZohoInvoice(orderId: string) {
    return this.httpService.post(`admin/inventory/order/invoice/zoho/sync`, {
      order_id: orderId,
    });
  }
  orderDetails(params: any) {
    return this.httpService.get(
      `admin/inventory/order/details?${params.toString()}`
    );
  }
  pickedItemBySku(params: any) {
    return this.httpService.get(
      `admin/inventory/order/picked-item-by-sku?${params.toString()}`
    );
  }
  orderStats(params: any) {
    return this.httpService.get(
      `admin/inventory/order/stats?${params.toString()}`
    );
  }
  productStats(params: any) {
    return this.httpService.get(
      `admin/inventory/product/stats?${params.toString()}`
    );
  }
  orderTrend(params: any) {
    return this.httpService.get(
      `admin/inventory/order/trend?${params.toString()}`
    );
  }
  orderPerformance(params: any) {
    return this.httpService.get(
      `admin/inventory/order/performance?${params.toString()}`
    );
  }
  orderLeaderboard(params: any) {
    return this.httpService.get(
      `admin/inventory/order/leaderboard?${params.toString()}`
    );
  }
  orderGeoStats(params: any) {
    return this.httpService.get(
      `admin/inventory/order/geo-stats?${params.toString()}`
    );
  }

  tagList(params: any) {
    return this.httpService.get(
      `admin/inventory/tag/list?${params.toString()}`
    );
  }
  submitTag(payload: any) {
    if (payload?._id) {
      return this.httpService.putFormData(`admin/inventory/tag/edit`, payload);
    } else {
      return this.httpService.postFormData(`admin/inventory/tag/add`, payload);
    }
  }
  deleteTag(payload: any) {
    return this.httpService.delete(`admin/inventory/tag/delete`, payload);
  }
  classificationList(params: any) {
    return this.httpService.get(
      `admin/inventory/classification/list?${params.toString()}`
    );
  }
  submitClassification(payload: any) {
    if (payload?._id) {
      return this.httpService.putFormData(
        `admin/inventory/classification/edit`,
        payload
      );
    } else {
      return this.httpService.postFormData(
        `admin/inventory/classification/add`,
        payload
      );
    }
  }
  deleteClassification(payload: any) {
    return this.httpService.delete(
      `admin/inventory/classification/delete`,
      payload
    );
  }
  couponUsage(params: URLSearchParams) {
    return this.httpService.get(`admin/inventory/coupon/usage?${params.toString()}`);
  }

  couponList(params: any) {
    return this.httpService.get(
      `admin/inventory/coupon/list?${params.toString()}`
    );
  }
  submitCoupon(payload: any) {
    if (payload?._id) {
      return this.httpService.put(`admin/inventory/coupon/edit`, payload);
    } else {
      return this.httpService.post(`admin/inventory/coupon/add`, payload);
    }
  }
  deleteCoupon(payload: any) {
    return this.httpService.delete(`admin/inventory/coupon/delete`, payload);
  }

  shippingClassList(params: any) {
    return this.httpService.get(
      `admin/shipping/class/list?${params.toString()}`
    );
  }
  submitShippingClass(payload: any) {
    if (payload?._id) {
      return this.httpService.put(`admin/shipping/class/edit`, payload);
    } else {
      return this.httpService.post(`admin/shipping/class/add`, payload);
    }
  }
  deleteShippingClass(payload: any) {
    return this.httpService.delete(`admin/shipping/class/delete`, payload);
  }

  shippingZoneList(params: any) {
    return this.httpService.get(
      `admin/shipping/zone/list?${params.toString()}`
    );
  }
  submitShippingZone(payload: any) {
    if (payload?._id) {
      return this.httpService.put(`admin/shipping/zone/edit`, payload);
    } else {
      return this.httpService.post(`admin/shipping/zone/add`, payload);
    }
  }
  deleteShippingZone(payload: any) {
    return this.httpService.delete(`admin/shipping/zone/delete`, payload);
  }

  shippingRateList(params: any) {
    return this.httpService.get(
      `admin/shipping/rate/list?${params.toString()}`
    );
  }
  submitShippingRate(payload: any) {
    if (payload?._id) {
      return this.httpService.put(`admin/shipping/rate/edit`, payload);
    } else {
      return this.httpService.post(`admin/shipping/rate/add`, payload);
    }
  }
  deleteShippingRate(payload: any) {
    return this.httpService.delete(`admin/shipping/rate/delete`, payload);
  }

  shippingSettingsGet() {
    return this.httpService.get(`admin/shipping/settings`);
  }
  shippingSettingsUpdate(payload: any) {
    return this.httpService.put(`admin/shipping/settings/edit`, payload);
  }

  productSeoGet(productId: string) {
    return this.httpService.get(`admin/seo/product/${productId}`);
  }
  productSeoUpdate(productId: string, payload: any) {
    return this.httpService.put(`admin/seo/product/${productId}`, payload);
  }
  productSeoGenerate(productId: string, overwrite: boolean = false) {
    return this.httpService.post(`admin/seo/product/${productId}/generate`, {
      overwrite,
    });
  }
  productSeoBulkGenerate(payload: any) {
    return this.httpService.post(`admin/seo/product/bulk-generate`, payload);
  }
  productSeoReport(params: URLSearchParams) {
    return this.httpService.get(
      `admin/seo/product/report?${params.toString()}`
    );
  }
  productSeoDuplicates() {
    return this.httpService.get(`admin/seo/product/duplicates`);
  }

  seoSettingsGet() {
    return this.httpService.get(`admin/seo/settings`);
  }
  seoSettingsUpdate(payload: any) {
    return this.httpService.put(`admin/seo/settings`, payload);
  }

  homeGet() {
    return this.httpService.get(`admin/home`);
  }
  homeUpdate(payload: any) {
    return this.httpService.put(`admin/home`, payload);
  }
  homeAddSection(payload: any) {
    return this.httpService.post(`admin/home/sections`, payload);
  }
  homeUpdateSection(id: string, payload: any) {
    return this.httpService.put(`admin/home/sections/${id}`, payload);
  }
  homeRemoveSection(id: string) {
    return this.httpService.delete(`admin/home/sections/${id}`);
  }
  homeReorder(order: string[]) {
    return this.httpService.post(`admin/home/reorder`, { order });
  }
  homePreview() {
    return this.httpService.get(`admin/home/preview`);
  }
  homePublish() {
    return this.httpService.post(`admin/home/publish`, {});
  }
  homeUnpublish() {
    return this.httpService.post(`admin/home/unpublish`, {});
  }
}
