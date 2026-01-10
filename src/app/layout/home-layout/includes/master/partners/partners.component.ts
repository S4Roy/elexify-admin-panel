import { NgFor } from '@angular/common';
import { Component } from '@angular/core';
import { MenuComponent } from '../../menu/menu.component';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { NewPartnerComponent } from './new-partner/new-partner.component';

@Component({
  selector: 'app-partners',
  imports: [MenuComponent, NgFor, MatIconModule],
  templateUrl: './partners.component.html',
  styleUrl: './partners.component.scss',
})
export class PartnersComponent {
  constructor(private dialog: MatDialog) { }
  addItem(data: any = null) {
    this.dialog
      .open(NewPartnerComponent, {
        data: data,
        disableClose: true,
      })
      .afterClosed()
      .subscribe((res: any) => {
        
      });
  }
}
