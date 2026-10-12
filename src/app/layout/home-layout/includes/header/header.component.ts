import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { HelpersService } from '../../../../core/services/helpers.service';
import { DialogService } from '../../../../core/services/dialog.service';
import { ConfirmDialogData } from '../confirm-dialog/confirm-dialog.component';
import { AuthService } from '../../../../core/services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { ChangePasswordComponent } from './change-password/change-password.component';
import { NotificationsComponent } from './notifications/notifications.component';
import { ApiService } from 'app/core/services/api.service';
import { MatBadgeModule } from '@angular/material/badge';
import { DeviceDetectorService } from 'app/core/services/device-detector.service';
import { NavService } from 'app/core/services/nav.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { debounceTime, Subject, takeUntil } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { ThemeService } from '../../../../core/services/theme.service';
@Component({
  selector: 'app-header',
  imports: [
    NgIf,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    MatBadgeModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatButtonModule,
    RouterLink,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  public searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  total_unread_record: any = null;
  userDetails: any = null;
  searchTerm = '';

  constructor(
    public helperService: HelpersService,
    private dialogService: DialogService,
    private authService: AuthService,
    private apiService: ApiService,
    private dialog: MatDialog,
    public device: DeviceDetectorService,
    public navService: NavService,
    public themeService: ThemeService
  ) {
    this.userDetails = this.helperService.userDetails();
    // this.fetchNotificationList()
  }
  ngOnInit(): void {
    // Keep the box in step with the shared term (cleared on page change,
    // or still set when this header is re-created by another layout).
    this.helperService.searchKey$.pipe(takeUntil(this.destroy$)).subscribe((term) => {
      if ((term || '') !== this.searchTerm.trim()) this.searchTerm = term || '';
    });
    this.searchSubject
      .pipe(debounceTime(300))
      .subscribe((term: string) => {
        this.helperService.updateSearchTerm(term);
      });
  }

  get deliveryOnly(): boolean {
    return this.helperService.permissions.isDeliveryOnly();
  }
  get canOpenSettings(): boolean {
    return this.helperService.permissions.canRoute('/settings');
  }

  onSearchChange(event: any): void {
    this.searchSubject.next(event?.target?.value ?? '');
  }
  clearSearch(): void {
    this.searchTerm = '';
    this.searchSubject.next('');
  }
  signOut(): void {
    const dialogData: ConfirmDialogData = {
      title: 'Are you sure?',
      message: 'You want to sign out?',
      saveText: 'Sign Out',
      cancelText: 'Cancel',
    };
    this.dialogService.confirmDialog(dialogData).subscribe((result: any) => {
      if (result?.confirm) {
        this.authService.userLogout();
      }
    });
  }
  changePassword() {
    this.dialog
      .open(ChangePasswordComponent, {
        data: { userDetails: this.userDetails },
        disableClose: true,
      })
      .afterClosed()
      .subscribe((res: any) => {
        if (res) {
        }
      });
  }
  showNotifications() {
    this.dialog
      .open(NotificationsComponent, {
        data: { userDetails: this.userDetails },
        disableClose: true,
      })
      .afterClosed()
      .subscribe((res: any) => {
        if (res) {
          this.fetchNotificationList();
        }
      });
  }
  fetchNotificationList() {
    let params: URLSearchParams = new URLSearchParams();
   
  }
  toggleMenu() {
    this.navService.toggleMenu();
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.searchSubject.complete();
  }
}
