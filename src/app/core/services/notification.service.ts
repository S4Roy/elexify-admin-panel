import { Injectable } from '@angular/core';
import { HttpService } from './http.service';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private notification = new BehaviorSubject<any>({});

  constructor(private httpService: HttpService) {}
  setCount(data: any) {
    this.notification.next(data);
  }
  getCount(): Observable<any> {
    return this.notification.asObservable();
  }
  getNotifications(payload: any) {
    return this.httpService.getList(
      `api/Notification/GetNotification/${payload?.userid}`,
      payload
    );
  }
  getNotificationsCount(payload: any) {
    return this.httpService.getList(
      `api/Notification/GetNotificationCount/${payload?.userid}`,
      payload
    );
  }
  assignedEmployeeCount(payload: any) {
    return this.httpService.getList(
      `api/User/assignedEmployeeCount`,
      payload
    );
  }
}
