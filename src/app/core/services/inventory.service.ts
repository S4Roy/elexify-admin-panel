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
  sendToShipRocket(payload: any) {
    return this.httpService.post(`admin/inventory/order/shipping`, payload);
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
}
