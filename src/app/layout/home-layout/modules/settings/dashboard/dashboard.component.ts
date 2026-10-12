import { NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { RouterCardComponent } from 'app/layout/home-layout/includes/router-card/router-card.component';
import { HelpersService } from 'app/core/services/helpers.service';
import { SETTINGS_SECTIONS } from 'app/core/services/settings-sections';

@Component({
  selector: 'app-dashboard',
  imports: [NgFor, NgIf, RouterCardComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  // Keep this overview in the same order as the Settings sidebar.
  readonly nav_list = SETTINGS_SECTIONS;

  constructor(private helpersService: HelpersService) {}

  canAccess(item: { router_path: string }): boolean {
    return this.helpersService.permissions.canRoute(item.router_path);
  }
}
