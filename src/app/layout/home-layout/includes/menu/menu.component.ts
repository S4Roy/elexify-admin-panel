import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule } from '@angular/router';
import { DialogService } from '../../../../core/services/dialog.service';
import { ConfirmDialogData } from '../confirm-dialog/confirm-dialog.component';
import { SettingsService } from '../../../../core/services/settings.service';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [MatMenuModule, MatButtonModule, MatIconModule, RouterModule],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
})
export class MenuComponent {
  @Input() modalItem: any = null;
  @Input() edit: any = null;
  @Input() modalButtonText: any = null;
  @Input() modalButtonIcon: any = null;
  @Input() delete: any = null;
  @Input() details: any = null;
  @Input() stockItem: any = null;
  @Output() deleteItem = new EventEmitter<any>();
  @Output() initModal = new EventEmitter<any>();
  @Output() initStockModal = new EventEmitter<any>();
  constructor(
    private dialogService: DialogService,
    private settingService: SettingsService
  ) {}
  onDelete() {
    const dialogData: ConfirmDialogData = {
      title: 'Are you sure?',
      message: "You won't be able to revert this!",
      cancelText: 'Cancel',
      saveText: 'Delete',
    };
    this.dialogService.confirmDialog(dialogData).subscribe((result: any) => {
      if (result?.confirm) {
        this.deleteItem.next(this.delete);
      }
    });
  }
}
