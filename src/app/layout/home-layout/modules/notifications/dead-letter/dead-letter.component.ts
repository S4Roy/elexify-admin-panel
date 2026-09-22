import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'app/core/services/api.service';
import { HelpersService } from 'app/core/services/helpers.service';
import { DialogService } from 'app/core/services/dialog.service';
import { ConfirmDialogData } from '../../../includes/confirm-dialog/confirm-dialog.component';
import * as Global from 'app/global';
import PaginationOptions from 'app/core/models/PaginationOptions';
import { PaginationComponent } from '../../../includes/pagination/pagination.component';
import { EmptyStateComponent } from '../../../includes/empty-state/empty-state.component';

@Component({
  selector: 'app-dead-letter',
  imports: [NgIf, NgFor, DatePipe, PaginationComponent, EmptyStateComponent],
  templateUrl: './dead-letter.component.html',
  styleUrl: './dead-letter.component.scss',
})
export class DeadLetterComponent implements OnInit {
  itemList: any[] = [];
  paginationOption: PaginationOptions;
  retryingId: string | null = null;

  constructor(
    private apiService: ApiService,
    private toastr: ToastrService,
    private dialogService: DialogService,
    public helperService: HelpersService,
  ) {
    this.paginationOption = Global.resetPaginationOptions();
  }

  ngOnInit(): void {
    this.fetchList();
  }

  get isPrivileged(): boolean {
    return this.helperService.can('customer.notification.retry');
  }

  fetchList() {
    const params = new URLSearchParams();
    if (this.paginationOption.limit) {
      params.set('limit', String(this.paginationOption.limit));
    }
    if (this.paginationOption.page) {
      params.set('page', String(this.paginationOption.page));
    }
    this.apiService.notificationDeadLetter(params).subscribe({
      next: (res: any) => {
        this.itemList = res?.data?.docs ?? [];
        this.paginationOption = { ...res?.data };
      },
      error: () => {},
    });
  }

  onPageChange(page: number) {
    this.paginationOption.page = page;
    this.fetchList();
  }

  retry(item: any) {
    const dialogData: ConfirmDialogData = {
      title: 'Retry this notification?',
      message: `Retry sending the "${item?.event}" notification via ${item?.channel}?`,
      cancelText: 'Cancel',
      saveText: 'Retry',
    };
    this.dialogService.confirmDialog(dialogData).subscribe((result: any) => {
      if (!result?.confirm) return;
      this.retryingId = item?._id;
      this.apiService.retryNotification(item._id).subscribe({
        next: () => {
          this.retryingId = null;
          this.toastr.success('Notification queued for retry');
          this.fetchList();
        },
        error: () => {
          this.retryingId = null;
        },
      });
    });
  }
}
