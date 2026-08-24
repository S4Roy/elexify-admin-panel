import { Injectable } from '@angular/core';
import { HttpService } from './http.service';

@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  constructor(private httpService: HttpService) {}

  // ── Top bar ───────────────────────────────────────────────────────────
  topBarGet() {
    return this.httpService.get(`admin/topbar`);
  }
  topBarUpdate(payload: any) {
    return this.httpService.put(`admin/topbar`, payload);
  }
  topBarPublish() {
    return this.httpService.post(`admin/topbar/publish`, {});
  }
  topBarUnpublish() {
    return this.httpService.post(`admin/topbar/unpublish`, {});
  }
  topBarPreview() {
    return this.httpService.get(`admin/topbar/preview`);
  }

  // ── Header config ─────────────────────────────────────────────────────
  headerConfigGet() {
    return this.httpService.get(`admin/header-config`);
  }
  headerConfigUpdate(payload: any) {
    return this.httpService.put(`admin/header-config`, payload);
  }
  headerConfigPublish() {
    return this.httpService.post(`admin/header-config/publish`, {});
  }
  headerConfigUnpublish() {
    return this.httpService.post(`admin/header-config/unpublish`, {});
  }
  headerConfigPreview() {
    return this.httpService.get(`admin/header-config/preview`);
  }

  // ── Menus ─────────────────────────────────────────────────────────────
  menuList(params: URLSearchParams) {
    return this.httpService.get(`admin/navigation-menu/list?${params.toString()}`);
  }
  submitMenu(payload: any) {
    return payload?._id
      ? this.httpService.put(`admin/navigation-menu/edit`, payload)
      : this.httpService.post(`admin/navigation-menu/add`, payload);
  }
  deleteMenu(payload: { _id: string }) {
    return this.httpService.delete(`admin/navigation-menu/delete`, payload);
  }
  publishMenu(id: string) {
    return this.httpService.post(`admin/navigation-menu/${id}/publish`, {});
  }
  unpublishMenu(id: string) {
    return this.httpService.post(`admin/navigation-menu/${id}/unpublish`, {});
  }
  previewMenu(id: string) {
    return this.httpService.get(`admin/navigation-menu/${id}/preview`);
  }
  generateDefaultMenus() {
    return this.httpService.post(`admin/navigation-menu/generate-defaults`, {});
  }

  // ── Menu items ────────────────────────────────────────────────────────
  menuItemList(menuId: string) {
    return this.httpService.get(`admin/navigation-menu/${menuId}/items`);
  }
  submitMenuItem(menuId: string, payload: any) {
    return payload?._id
      ? this.httpService.put(
          `admin/navigation-menu/${menuId}/items/${payload._id}`,
          payload
        )
      : this.httpService.post(`admin/navigation-menu/${menuId}/items`, payload);
  }
  deleteMenuItem(menuId: string, id: string) {
    return this.httpService.delete(`admin/navigation-menu/${menuId}/items/${id}`, {});
  }
  reorderMenuItems(
    menuId: string,
    payload: { items: { id: string; parent_id: string | null; order: number }[] }
  ) {
    return this.httpService.post(
      `admin/navigation-menu/${menuId}/items/reorder`,
      payload
    );
  }

  // ── Combined draft preview ───────────────────────────────────────────
  combinedPreview() {
    return this.httpService.get(`admin/navigation/preview`);
  }
}
