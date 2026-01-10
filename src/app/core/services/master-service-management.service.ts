import { Injectable } from '@angular/core';
import { HttpService } from './http.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MasterServiceManagementService {

  constructor(
    private httpService: HttpService,
    private router: Router,
    private toastr: ToastrService
  ) { }

  getServiceManagementList(params:any) { //admin/service/list?page=1&limit=10&sort_order=asc%2Fdesc&sort_by=name%2Fcreated_at
    return this.httpService.get('admin/service/list', params);
  }

  addServiceManagement(payload:any) {
    return this.httpService.postFormData('admin/service/add', payload);
  }

  //admin/service/edit
  editServiceManagement(payload:any) {
    return this.httpService.postFormData('admin/service/edit' ,payload);
  }

  //admin/service/details/1
  getServiceManagementListDetails(id: number,params:any) { 
    return this.httpService.get('admin/service/details' +'/' + id, params);
  }

  //admin/service/delete
  deleteServiceManagementList(payload:any) {
    return this.httpService.post('admin/service/delete' ,payload);
  }

  // AWARDS
  awardList(payload: any){
    return this.httpService.postFormData('admin/award/list', payload);
  }
  addAward(payload: any){
    return this.httpService.postFormData('admin/award/add', payload);
  }
  editAward(payload: any){
    return this.httpService.postFormData('admin/award/edit', payload);
  }

  deleteAward(payload: any){
    return this.httpService.postFormData('admin/award/delete', payload);
  }
}
