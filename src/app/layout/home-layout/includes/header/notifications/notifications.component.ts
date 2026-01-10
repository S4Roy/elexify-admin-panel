import { NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import PaginationOptions from 'app/core/models/PaginationOptions';
import { ApiService } from 'app/core/services/api.service';
import { AuthService } from 'app/core/services/auth.service';
import { DialogService } from 'app/core/services/dialog.service';
import { HelpersService } from 'app/core/services/helpers.service';
import * as Global from 'app/global';
import { PaginationComponent } from '../../pagination/pagination.component';
import { MatTooltipModule } from '@angular/material/tooltip';
@Component({
  selector: 'app-notifications',
  imports: [
    NgIf,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    NgFor,
    PaginationComponent,
    MatTooltipModule,
  ],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss',
})
export class NotificationsComponent {
  Global = Global;
  total_unread_record: any = null;
  userDetails: any = null;
  item_list: any = [];
  paginationOption: PaginationOptions;

  constructor(
    public helperService: HelpersService,
    private dialogRef: MatDialogRef<NotificationsComponent>,
    private authService: AuthService,
    private apiService: ApiService,
    private dialog: MatDialog
  ) {
    this.paginationOption = Global.resetPaginationOptions();

    this.userDetails = this.helperService.userDetails();
    this.fetchNotificationList();
  }

  notificationMarkAsRead(item: any) {}
  notificationMarkAllAsRead() {}
  fetchNotificationList() {
    let params: URLSearchParams = new URLSearchParams();
    if (this.paginationOption.page) {
      params.set('page', String(this.paginationOption.page));
    }
  }
  parseJson(json: any) {
    try {
      const parsedData = JSON.parse(json);
      return [parsedData]; // Wrap the object in an array
    } catch (error) {
      console.error('Invalid JSON string:', error);
      return []; // Return an empty array on error
    }
  }
  onPageChange(data: any) {
    this.paginationOption.page = data;
    this.fetchNotificationList();
  }
  close() {
    this.dialogRef.close(true);
  }
}
