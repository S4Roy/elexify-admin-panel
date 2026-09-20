import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterModule,
} from '@angular/router';
import { filter } from 'rxjs';
import { HelpersService } from '../../../../core/services/helpers.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-breadcums',
  imports: [AsyncPipe, NgFor, RouterModule, NgIf, MatIconModule],
  templateUrl: './breadcums.component.html',
  styleUrl: './breadcums.component.scss',
})
export class BreadcumsComponent {
  breadcrumbs: any = [];
  settingsOutlet: boolean = false;
  usersOutlet : boolean =false;
  filterButton: { count: number } | null = null;
  actionButton: { label: string; icon?: string } | null = null;
  selectionAction: { count: number; label: string; icon?: string } | null = null;
  viewToggle: {
    options: { value: string; label: string; icon?: string }[];
    active: string;
    extraActions?: { key: string; label: string; icon?: string }[];
  } | null = null;
  constructor(public helperService: HelpersService) {
    this.helperService.breadcrumbs$.subscribe((res: any) => {

      this.breadcrumbs = res;
      this.settingsOutlet = this.breadcrumbs.some((item: any) => item?.label === "Settings");
      this.usersOutlet = this.breadcrumbs.some((item: any) => item?.label === "Users");
    });
    this.helperService.filterButton$.subscribe((res) => {
      this.filterButton = res;
    });
    this.helperService.actionButton$.subscribe((res) => {
      this.actionButton = res;
    });
    this.helperService.selectionAction$.subscribe((res) => {
      this.selectionAction = res;
    });
    this.helperService.viewToggle$.subscribe((res) => {
      this.viewToggle = res;
    });
  }
  openFilters() {
    this.helperService.triggerFilterButtonClick();
  }
  triggerAction() {
    this.helperService.triggerActionButtonClick();
  }
  triggerSelectionAction() {
    this.helperService.triggerSelectionActionClick();
  }
  clearSelection() {
    this.helperService.triggerSelectionClear();
  }
  selectViewOption(value: string) {
    this.helperService.triggerViewToggleChange(value);
  }
  triggerViewAction(key: string) {
    this.helperService.triggerViewToggleAction(key);
  }
}
